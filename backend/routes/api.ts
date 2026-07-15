import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { JWT_SECRET } from '../config';
import { authMiddleware } from '../middleware/authMiddleware';
import {
  ClienteSchema,
  PedidoSchema,
  UsuarioSchema,
  CampanaSchema
} from '../schemas/validationSchemas';
import {
  getAllData,
  saveClientes,
  savePedidos,
  saveDeletedPedidos,
  saveBackups,
  saveVendedor,
  savePrendas,
  saveUsuarios,
  saveCampanas,
  saveCampanasReferencias
} from '../services/dbService';

const router = Router();

// Limit login attempts
const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Limit each IP to 5 requests per minute
  message: { error: 'Demasiados intentos de inicio de sesión. Por favor, intente de nuevo en un minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// API Health Check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

// Authenticate user
router.post('/auth/login', loginLimiter, async (req, res) => {
  try {
    const { usuario, clave } = req.body;
    if (!usuario || !clave) {
      return res.status(400).json({ error: 'Usuario y clave son requeridos.' });
    }

    const cleanUser = String(usuario).trim().toUpperCase();
    const cleanPin = String(clave).trim();

    const data = await getAllData();
    const foundUser = data.usuarios.find((u: any) => u.usuario.toUpperCase() === cleanUser);

    if (!foundUser) {
      return res.status(401).json({ error: 'Usuario o clave incorrectos.' });
    }

    if (foundUser.activo === false) {
      return res.status(403).json({ error: 'Este usuario se encuentra inhabilitado. Contacte a Soporte.' });
    }

    const match = await bcrypt.compare(cleanPin, foundUser.clave);
    if (!match) {
      return res.status(401).json({ error: 'Usuario o clave incorrectos.' });
    }

    const token = jwt.sign(
      {
        id: foundUser.id,
        usuario: foundUser.usuario,
        nombre: foundUser.nombre,
        rol: foundUser.rol,
        idVendedor: foundUser.idVendedor
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    const { clave: _, ...userWithoutPassword } = foundUser;
    res.json({
      success: true,
      token,
      user: userWithoutPassword
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al iniciar sesión', details: err.message });
  }
});

// Load all data
router.get('/data', authMiddleware, async (req, res) => {
  try {
    const data = await getAllData();
    // Exclude password hashes from response
    const safeUsuarios = data.usuarios.map(({ clave, ...u }: any) => u);
    res.json({
      ...data,
      usuarios: safeUsuarios
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al leer los datos de los JSON locales', details: err.message });
  }
});

// Save Clientes
router.post('/clientes', authMiddleware, async (req, res) => {
  try {
    const { clientes } = req.body;
    const parsed = z.array(ClienteSchema).safeParse(clientes);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Estructura de clientes inválida', details: parsed.error.format() });
    }
    const data = await getAllData();
    const existingMap = new Map(data.clientes.map(c => [c.id, c]));
    clientes.forEach(c => {
      existingMap.set(c.id, c);
    });
    const merged = Array.from(existingMap.values());
    await saveClientes(merged);
    res.json({ success: true, count: merged.length });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al guardar clientes', details: err.message });
  }
});

// Helper to assign next sequential number for a salesperson prefix
function getSiguienteCorrelativo(
  prefijoVendedor: string,
  pedidosConsolidados: any[],
  maxCorrelativosPorVendedor: Map<string, number>
) {
  if (maxCorrelativosPorVendedor.has(prefijoVendedor)) {
    const next = maxCorrelativosPorVendedor.get(prefijoVendedor)! + 1;
    maxCorrelativosPorVendedor.set(prefijoVendedor, next);
    return next;
  }
  
  const pedidosVendedor = pedidosConsolidados.filter(p => 
    p.numeroPedido && 
    p.numeroPedido.startsWith(`${prefijoVendedor}-`) &&
    !p.numeroPedido.startsWith('ASYNC-')
  );
  
  let maxCorr = 0;
  if (pedidosVendedor.length > 0) {
    const correlativos = pedidosVendedor.map(p => {
      const parts = p.numeroPedido.split('-');
      const corr = parseInt(parts[1], 10);
      return isNaN(corr) ? 0 : corr;
    });
    maxCorr = Math.max(...correlativos);
  }
  
  const next = maxCorr + 1;
  maxCorrelativosPorVendedor.set(prefijoVendedor, next);
  return next;
}

// Save Pedidos
router.post('/pedidos', authMiddleware, async (req, res) => {
  try {
    const { pedidos } = req.body;
    const parsed = z.array(PedidoSchema).safeParse(pedidos);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Estructura de pedidos inválida', details: parsed.error.format() });
    }
    const data = await getAllData();
    const existingMap = new Map((data.pedidos as any[]).map(p => [p.id, p]));
    
    const maxCorrelativosPorVendedor = new Map<string, number>();
    
    pedidos.forEach(p => {
      const isNew = !existingMap.has(p.id);
      const pedidoParaGuardar = { ...p };

      if (isNew) {
        if (pedidoParaGuardar.numeroPedido && pedidoParaGuardar.numeroPedido.startsWith('ASYNC-')) {
          const parts = pedidoParaGuardar.numeroPedido.split('-');
          const prefijoVendedor = parts[1] || '01';
          const siguienteCorr = getSiguienteCorrelativo(prefijoVendedor, Array.from(existingMap.values()), maxCorrelativosPorVendedor);
          const paddedNum = String(siguienteCorr).padStart(3, '0');
          pedidoParaGuardar.numeroPedido = `${prefijoVendedor}-${paddedNum}`;
        }
        existingMap.set(p.id, pedidoParaGuardar);
      } else {
        const existingPedido = existingMap.get(p.id);
        if (pedidoParaGuardar.numeroPedido && pedidoParaGuardar.numeroPedido.startsWith('ASYNC-') && existingPedido && existingPedido.numeroPedido && !existingPedido.numeroPedido.startsWith('ASYNC-')) {
          pedidoParaGuardar.numeroPedido = existingPedido.numeroPedido;
        }
        existingMap.set(p.id, { ...existingPedido, ...pedidoParaGuardar });
      }
    });

    // Clean up cross-references:
    // 1. Remove active orders from the deleted list (restores)
    const activeIds = new Set(Array.from(existingMap.keys()));
    const serverDeletedPedidos = data.deletedPedidos || [];
    const finalDeleted = serverDeletedPedidos.filter((p: any) => !activeIds.has(p.id));
    await saveDeletedPedidos(finalDeleted);

    // 2. Remove deleted orders from the active list (deletions)
    const deletedIds = new Set(finalDeleted.map((p: any) => p.id));
    const merged = Array.from(existingMap.values()).filter((p: any) => !deletedIds.has(p.id));
    
    await savePedidos(merged);
    res.json({ success: true, count: merged.length });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al guardar pedidos', details: err.message });
  }
});

// Save Deleted Pedidos
router.post('/deleted-pedidos', authMiddleware, async (req, res) => {
  try {
    const { deletedPedidos } = req.body;
    const user = (req as any).user;
    const parsed = z.array(PedidoSchema).safeParse(deletedPedidos);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Estructura de pedidos eliminados inválida', details: parsed.error.format() });
    }
    const data = await getAllData();
    let serverDeletedPedidos = data.deletedPedidos || [];
    
    if (user) {
      if (user.rol === 'soporte') {
        serverDeletedPedidos = deletedPedidos;
      } else {
        const otherSellersDeleted = serverDeletedPedidos.filter((p: any) => p.vendedorNombre !== user.nombre);
        serverDeletedPedidos = [...otherSellersDeleted, ...deletedPedidos];
      }
    } else {
      // Fallback (retrocompatibility)
      const existingMap = new Map(serverDeletedPedidos.map((p: any) => [p.id, p]));
      deletedPedidos.forEach(p => {
        existingMap.set(p.id, p);
      });
      serverDeletedPedidos = Array.from(existingMap.values());
    }

    // Clean up cross-references:
    // 1. Remove active orders from the deleted list (restores)
    const activeIds = new Set((data.pedidos || []).map((p: any) => p.id));
    const finalDeleted = serverDeletedPedidos.filter((p: any) => !activeIds.has(p.id));
    await saveDeletedPedidos(finalDeleted);

    // 2. Remove deleted orders from the active list (deletions)
    const deletedIds = new Set(finalDeleted.map((p: any) => p.id));
    const activePedidos = (data.pedidos as any[]).filter((p: any) => !deletedIds.has(p.id));
    await savePedidos(activePedidos);

    res.json({ success: true, count: finalDeleted.length });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al guardar pedidos eliminados', details: err.message });
  }
});

// Save Backups
router.post('/backups', authMiddleware, async (req, res) => {
  try {
    const { backups } = req.body;
    const parsed = z.array(PedidoSchema).safeParse(backups);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Estructura de backups inválida', details: parsed.error.format() });
    }
    const data = await getAllData();
    const existingMap = new Map(data.backups.map(p => [p.id, p]));
    backups.forEach(p => {
      existingMap.set(p.id, p);
    });
    const merged = Array.from(existingMap.values());
    await saveBackups(merged);
    res.json({ success: true, count: merged.length });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al guardar backups de pedidos', details: err.message });
  }
});

// Save Vendedor Config
router.post('/vendedor', authMiddleware, async (req, res) => {
  try {
    const vendedor = req.body;
    if (!vendedor || typeof vendedor.nombre !== 'string') {
      return res.status(400).json({ error: 'Datos del vendedor inválidos.' });
    }
    await saveVendedor(vendedor);
    res.json({ success: true, vendedor });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al guardar configuración del vendedor', details: err.message });
  }
});

// Save Prenda Catalog References
router.post('/prendas', authMiddleware, async (req, res) => {
  try {
    const { prendas } = req.body;
    if (!Array.isArray(prendas)) {
      return res.status(400).json({ error: 'Formato incorrecto. Se requiere un array de prendas.' });
    }
    await savePrendas(prendas);
    res.json({ success: true, count: prendas.length });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al guardar prendas del catálogo', details: err.message });
  }
});

// Save Usuarios
router.post('/usuarios', authMiddleware, async (req, res) => {
  try {
    const { usuarios } = req.body;
    const parsed = z.array(UsuarioSchema).safeParse(usuarios);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Estructura de usuarios inválida', details: parsed.error.format() });
    }

    const currentUser = (req as any).user;
    const data = await getAllData();
    const existingMap = new Map<string, any>(data.usuarios.map((u: any) => [u.id, u]));
    const isSupport = currentUser.rol === 'soporte';

    for (const u of usuarios) {
      const existing = existingMap.get(u.id);
      if (!existing) {
        if (!isSupport) {
          return res.status(403).json({ error: 'Acceso denegado. Solo soporte puede crear usuarios.' });
        }
      } else {
        if (!isSupport) {
          if (u.id !== currentUser.id) {
            if (
              u.nombre !== existing.nombre ||
              u.usuario !== existing.usuario ||
              u.rol !== existing.rol ||
              u.esPrimeraVez !== existing.esPrimeraVez ||
              (u.activo ?? null) !== (existing.activo ?? null) ||
              (u.idVendedor ?? null) !== (existing.idVendedor ?? null)
            ) {
              return res.status(403).json({ error: 'Acceso denegado. No puedes modificar la cuenta de otros usuarios.' });
            }
          } else {
            if (u.rol !== existing.rol || u.activo !== existing.activo || u.usuario !== existing.usuario) {
              return res.status(403).json({ error: 'Acceso denegado. No puedes modificar tu propio rol o estado activo.' });
            }
          }
        }
      }
    }

    const hashedUsuarios = await Promise.all(
      usuarios.map(async (u: any) => {
        const existing = existingMap.get(u.id);
        let clave = u.clave;
        if (clave && /^\d{4}$/.test(clave)) {
          clave = await bcrypt.hash(clave, 10);
        } else if (!clave && existing) {
          clave = existing.clave;
        }
        return { ...u, clave };
      })
    );

    hashedUsuarios.forEach(u => {
      existingMap.set(u.id, u);
    });

    const merged = Array.from(existingMap.values());
    await saveUsuarios(merged);
    res.json({ success: true, count: merged.length });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al guardar usuarios', details: err.message });
  }
});

// Save Campanas
router.post('/campanas', authMiddleware, async (req, res) => {
  try {
    const { campanas } = req.body;
    const parsed = z.array(CampanaSchema).safeParse(campanas);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Estructura de campañas inválida', details: parsed.error.format() });
    }
    const data = await getAllData();
    const existingMap = new Map(data.campanas.map(c => [`${c.nombre} ${c.anio}`, c]));
    campanas.forEach(c => {
      existingMap.set(`${c.nombre} ${c.anio}`, c);
    });
    const merged = Array.from(existingMap.values());
    await saveCampanas(merged);
    res.json({ success: true, count: merged.length });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al guardar campañas', details: err.message });
  }
});

// Save Campanas Referencias Mapping
router.post('/campanas-referencias', authMiddleware, async (req, res) => {
  try {
    const { campanasReferencias } = req.body;
    const parsed = z.record(z.string(), z.array(z.string())).safeParse(campanasReferencias);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Estructura de mapeo de campañas inválida', details: parsed.error.format() });
    }
    await saveCampanasReferencias(campanasReferencias);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al guardar referencias de campaña', details: err.message });
  }
});

// Sincronización en lote desde móviles (Offline-First)
router.post('/pedidos/sync-batch', authMiddleware, async (req, res) => {
  try {
    const { pedidos, clientes, deletedPedidos } = req.body;
    const user = (req as any).user;
    
    const parsedPedidos = z.array(PedidoSchema).safeParse(pedidos);
    const parsedClientes = z.array(ClienteSchema).safeParse(clientes);
    const parsedDeleted = deletedPedidos ? z.array(PedidoSchema).safeParse(deletedPedidos) : { success: true };

    if (!parsedPedidos.success || !parsedClientes.success || !parsedDeleted.success) {
      const details = {
        pedidos: parsedPedidos.success ? null : parsedPedidos.error.format(),
        clientes: parsedClientes.success ? null : parsedClientes.error.format(),
        deletedPedidos: parsedDeleted.success ? null : (parsedDeleted as any).error?.format()
      };
      return res.status(400).json({ error: 'Estructura de datos de sincronización inválida', details });
    }

    const data = await getAllData();

    // 1. Procesar Clientes Offline
    const clientesActuales = data.clientes || [];
    const clientesMap = new Map(clientesActuales.map(c => [c.id, c]));
    const nuevosClientesIds: string[] = [];

    clientes.forEach(c => {
      if (!clientesMap.has(c.id)) {
        clientesMap.set(c.id, {
          ...c,
          codigoCliente: c.codigoCliente || '000'
        });
        nuevosClientesIds.push(c.id);
      }
    });

    await saveClientes(Array.from(clientesMap.values()));

    // 2. Procesar Pedidos Offline
    const pedidosActuales = (data.pedidos as any[]) || [];
    const pedidosMap = new Map<string, any>(pedidosActuales.map(p => [p.id, p]));
    const nuevosPedidosIds: string[] = [];

    const maxCorrelativosPorVendedor = new Map<string, number>();

    pedidos.forEach(p => {
      const isNew = !pedidosMap.has(p.id);
      const pedidoParaGuardar = { ...p };

      if (isNew) {
        if (pedidoParaGuardar.numeroPedido && pedidoParaGuardar.numeroPedido.startsWith('ASYNC-')) {
          const parts = pedidoParaGuardar.numeroPedido.split('-');
          const prefijoVendedor = parts[1] || '01';
          const siguienteCorr = getSiguienteCorrelativo(prefijoVendedor, Array.from(pedidosMap.values()), maxCorrelativosPorVendedor);
          const paddedNum = String(siguienteCorr).padStart(3, '0');
          pedidoParaGuardar.numeroPedido = `${prefijoVendedor}-${paddedNum}`;
        }
        pedidosMap.set(p.id, pedidoParaGuardar);
        nuevosPedidosIds.push(p.id);
      } else {
        const existingPedido = pedidosMap.get(p.id);
        if (pedidoParaGuardar.numeroPedido && pedidoParaGuardar.numeroPedido.startsWith('ASYNC-') && existingPedido && existingPedido.numeroPedido && !existingPedido.numeroPedido.startsWith('ASYNC-')) {
          pedidoParaGuardar.numeroPedido = existingPedido.numeroPedido;
        }
        pedidosMap.set(p.id, { ...existingPedido, ...pedidoParaGuardar });
        nuevosPedidosIds.push(p.id);
      }
    });

    // 3. Procesar Pedidos Eliminados Offline
    let serverDeletedPedidos = data.deletedPedidos || [];
    if (Array.isArray(deletedPedidos) && user) {
      if (user.rol === 'soporte') {
        serverDeletedPedidos = deletedPedidos;
      } else {
        const otherSellersDeleted = serverDeletedPedidos.filter((p: any) => p.vendedorNombre !== user.nombre);
        serverDeletedPedidos = [...otherSellersDeleted, ...deletedPedidos];
      }
    }

    // 4. Consolidar Pedidos Activos y Eliminados (Evitar colisiones cruzadas)
    const activeIds = new Set(Array.from(pedidosMap.keys()));
    const finalDeleted = serverDeletedPedidos.filter((p: any) => !activeIds.has(p.id));
    await saveDeletedPedidos(finalDeleted);

    const deletedIds = new Set(finalDeleted.map((p: any) => p.id));
    const mergedPedidos = Array.from(pedidosMap.values()).filter((p: any) => !deletedIds.has(p.id));
    await savePedidos(mergedPedidos);

    // Get the final fully-merged fresh server database state to return to client
    const freshData = await getAllData();

    res.json({
      success: true,
      syncedOrderIds: nuevosPedidosIds,
      syncedClientIds: nuevosClientesIds,
      ...freshData
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Error durante la sincronización en lote', details: err.message });
  }
});

// GET nuevos pedidos (para integraciones como n8n)
router.get('/pedidos/nuevos', authMiddleware, async (req, res) => {
  try {
    const { desde } = req.query;
    const data = await getAllData();
    const pedidos = data.pedidos || [];

    let desdeMs: number;

    if (desde) {
      const numerico = Number(desde);
      if (!isNaN(numerico)) {
        desdeMs = numerico;
      } else {
        const parsedDate = Date.parse(desde as string);
        if (isNaN(parsedDate)) {
          return res.status(400).json({ error: 'El parámetro "desde" tiene un formato inválido (debe ser un timestamp o fecha válida).' });
        }
        desdeMs = parsedDate;
      }
    } else {
      // Por defecto, últimas 24 horas
      desdeMs = Date.now() - 24 * 60 * 60 * 1000;
    }

    const nuevosPedidos = pedidos.filter((p: any) => {
      if (p.esBackup) return false;

      let pedidoMs: number | null = null;
      if (typeof p.id === 'string') {
        const parts = p.id.split('_');
        if (parts.length >= 2) {
          const ts = parseInt(parts[1], 10);
          if (!isNaN(ts)) {
            pedidoMs = ts;
          }
        }
      }

      if (!pedidoMs && p.fecha) {
        pedidoMs = new Date(p.fecha).getTime();
      }

      return pedidoMs && pedidoMs > desdeMs;
    });

    res.json({
      success: true,
      count: nuevosPedidos.length,
      pedidos: nuevosPedidos
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al consultar nuevos pedidos', details: err.message });
  }
});

export default router;

