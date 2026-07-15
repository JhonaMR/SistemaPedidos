// backend/server.ts
import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import path2 from "path";

// backend/routes/api.ts
import { Router } from "express";
import jwt2 from "jsonwebtoken";
import bcrypt2 from "bcryptjs";
import { rateLimit } from "express-rate-limit";
import { z as z2 } from "zod";

// backend/config.ts
import path from "path";
var PORT = process.env.PORT || 5050;
var NODE_ENV = process.env.NODE_ENV || "development";
var DB_DIR = path.join(process.cwd(), "db_json");
var DB_PATHS = {
  clientes: path.join(DB_DIR, "clientes.json"),
  pedidos: path.join(DB_DIR, "pedidos.json"),
  deletedPedidos: path.join(DB_DIR, "deleted_pedidos.json"),
  backups: path.join(DB_DIR, "backups.json"),
  vendedor: path.join(DB_DIR, "vendedor.json"),
  prendas: path.join(DB_DIR, "prendas.json"),
  usuarios: path.join(DB_DIR, "usuarios.json"),
  campanas: path.join(DB_DIR, "campanas.json"),
  campanasReferencias: path.join(DB_DIR, "campanas_referencias.json")
};
var FOTOS_REFERENCIAS_DIR = path.join(process.cwd(), "public", "fotos_referencias");
var JWT_SECRET = process.env.JWT_SECRET || "arare_secreto_super_seguro_2026";

// backend/middleware/authMiddleware.ts
import jwt from "jsonwebtoken";
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Acceso no autorizado. Se requiere token de sesi\xF3n." });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inv\xE1lido o expirado." });
  }
}

// backend/schemas/validationSchemas.ts
import { z } from "zod";
var ClienteSchema = z.object({
  id: z.string(),
  codigoCliente: z.string().min(1, "El c\xF3digo del cliente es requerido"),
  nombre: z.string().min(1, "El nombre es requerido"),
  documentoIdentidad: z.string().min(1, "El documento de identidad es requerido"),
  telefono: z.string(),
  correo: z.string(),
  direccion: z.string(),
  ciudad: z.string(),
  notas: z.string().optional().nullable(),
  fechaRegistro: z.string(),
  limiteFacturacion: z.string().optional().nullable()
});
var ItemPedidoSchema = z.object({
  id: z.string(),
  prendaRef: z.string(),
  nombrePrenda: z.string(),
  categoria: z.string(),
  talla: z.string(),
  novedad: z.string().optional().nullable(),
  cantidad: z.number().int().positive("La cantidad debe ser mayor que 0"),
  precioUnitario: z.number().nonnegative(),
  total: z.number().nonnegative(),
  tallasDetalle: z.record(z.string(), z.number().int().nonnegative()).optional().nullable()
});
var PedidoSchema = z.object({
  id: z.string(),
  numeroPedido: z.string(),
  clienteId: z.string(),
  clienteNombre: z.string(),
  clienteTelefono: z.string(),
  vendedorNombre: z.string(),
  items: z.array(ItemPedidoSchema),
  subtotal: z.number().nonnegative(),
  porcentajeDescuento: z.number().nonnegative(),
  montoDescuento: z.number().nonnegative(),
  total: z.number().nonnegative(),
  estado: z.enum(["Pendiente", "Procesado", "Activo", "Completo", "Cancelado"]),
  notas: z.string().optional().nullable(),
  fecha: z.string(),
  fechaEntregaEstimada: z.string(),
  fechaLimiteDespacho: z.string().optional().nullable(),
  campana: z.string().optional().nullable(),
  facturacionFE: z.number().nonnegative().optional().nullable(),
  facturacionRM: z.number().nonnegative().optional().nullable(),
  fechaCancelado: z.string().optional().nullable(),
  motivoCancelado: z.string().optional().nullable(),
  fechaEliminacion: z.string().optional().nullable(),
  editado: z.boolean().optional().nullable(),
  backupOf: z.string().optional().nullable(),
  backupFecha: z.string().optional().nullable(),
  esBackup: z.boolean().optional().nullable()
});
var UsuarioSchema = z.object({
  id: z.string(),
  nombre: z.string().min(1, "El nombre es requerido"),
  usuario: z.string().length(3, "El usuario debe tener exactamente 3 letras"),
  clave: z.string().optional().nullable(),
  rol: z.enum(["general", "soporte"]),
  esPrimeraVez: z.boolean(),
  activo: z.boolean().optional().nullable(),
  idVendedor: z.string().optional().nullable()
});
var CampanaSchema = z.object({
  nombre: z.string().min(1, "El nombre de la campa\xF1a es requerido"),
  anio: z.number().int().positive(),
  numero: z.number().int().positive()
});

// backend/services/dbService.ts
import fs from "fs/promises";
import bcrypt from "bcryptjs";

// backend/services/lockService.ts
var Mutex = class {
  constructor() {
    this.queue = Promise.resolve();
  }
  async acquire() {
    let release = () => {
    };
    const nextPromise = new Promise((resolve) => {
      release = resolve;
    });
    const currentQueue = this.queue;
    this.queue = this.queue.then(() => nextPromise);
    await currentQueue;
    return release;
  }
};
var FileLockManager = class {
  constructor() {
    this.locks = /* @__PURE__ */ new Map();
  }
  getMutex(filePath) {
    let mutex = this.locks.get(filePath);
    if (!mutex) {
      mutex = new Mutex();
      this.locks.set(filePath, mutex);
    }
    return mutex;
  }
  /**
   * Ejecuta una función asíncrona de manera exclusiva para una ruta de archivo.
   * Garantiza que no haya lecturas/escrituras simultáneas en el mismo archivo.
   */
  async runExclusive(filePath, callback) {
    const mutex = this.getMutex(filePath);
    const release = await mutex.acquire();
    try {
      return await callback();
    } finally {
      release();
    }
  }
};
var lockManager = new FileLockManager();

// backend/services/dbService.ts
async function safeReadFile(filePath, defaultContent) {
  return lockManager.runExclusive(filePath, async () => {
    try {
      await fs.access(filePath);
      const data = await fs.readFile(filePath, "utf-8");
      return JSON.parse(data);
    } catch (err) {
      return JSON.parse(defaultContent);
    }
  });
}
async function safeWriteFile(filePath, data) {
  return lockManager.runExclusive(filePath, async () => {
    try {
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
      return true;
    } catch (err) {
      console.error(`Error writing to ${filePath}:`, err);
      throw err;
    }
  });
}
async function getAllData() {
  const clientes = await safeReadFile(DB_PATHS.clientes, "[]");
  let pedidos = await safeReadFile(DB_PATHS.pedidos, "[]");
  const deletedPedidos = await safeReadFile(DB_PATHS.deletedPedidos, "[]");
  let shouldSavePedidos = false;
  if (Array.isArray(pedidos)) {
    pedidos = pedidos.map((p) => {
      if (p.idLocal !== void 0) {
        delete p.idLocal;
        shouldSavePedidos = true;
      }
      return p;
    });
  }
  let hasAsyncOrders = false;
  if (Array.isArray(pedidos)) {
    hasAsyncOrders = pedidos.some((p) => p.numeroPedido && p.numeroPedido.startsWith("ASYNC-"));
  }
  if (hasAsyncOrders) {
    shouldSavePedidos = true;
    const maxCorrelativos = /* @__PURE__ */ new Map();
    pedidos.forEach((p) => {
      if (p.numeroPedido && !p.numeroPedido.startsWith("ASYNC-")) {
        const parts = p.numeroPedido.split("-");
        const prefijo = parts[0] || "01";
        const corr = parseInt(parts[1], 10);
        if (!isNaN(corr)) {
          const maxVal = maxCorrelativos.get(prefijo) || 0;
          if (corr > maxVal) {
            maxCorrelativos.set(prefijo, corr);
          }
        }
      }
    });
    pedidos = pedidos.map((p) => {
      if (p.numeroPedido && p.numeroPedido.startsWith("ASYNC-")) {
        const parts = p.numeroPedido.split("-");
        const prefijoVendedor = parts[1] || "01";
        const nextCorr = (maxCorrelativos.get(prefijoVendedor) || 0) + 1;
        maxCorrelativos.set(prefijoVendedor, nextCorr);
        const paddedNum = String(nextCorr).padStart(3, "0");
        return {
          ...p,
          numeroPedido: `${prefijoVendedor}-${paddedNum}`
        };
      }
      return p;
    });
  }
  if (shouldSavePedidos) {
    await safeWriteFile(DB_PATHS.pedidos, pedidos);
  }
  const backups = await safeReadFile(DB_PATHS.backups, "[]");
  const vendedor = await safeReadFile(DB_PATHS.vendedor, '{"nombre": "Lina Pulgarin", "codigo": "V-102"}');
  const prendas = await safeReadFile(DB_PATHS.prendas, "[]");
  const defaultUsuarios = '[{"id":"usr_sop","nombre":"Usuario Soporte","usuario":"SOP","clave":"9999","rol":"soporte","esPrimeraVez":false,"activo":true},{"id":"usr_gen","nombre":"Usuario General","usuario":"GEN","clave":"1234","rol":"general","esPrimeraVez":true,"activo":true}]';
  let usuarios = await safeReadFile(DB_PATHS.usuarios, defaultUsuarios);
  let hasPlaintextPINs = false;
  if (Array.isArray(usuarios)) {
    usuarios = await Promise.all(
      usuarios.map(async (u) => {
        if (u.clave && /^\d{4}$/.test(u.clave)) {
          const hash = await bcrypt.hash(u.clave, 10);
          hasPlaintextPINs = true;
          return { ...u, clave: hash };
        }
        return u;
      })
    );
    if (hasPlaintextPINs) {
      console.log("[Security Auto-Heal] Plaintext PINs detected in database. Encrypting with bcrypt...");
      await safeWriteFile(DB_PATHS.usuarios, usuarios);
    }
  }
  const defaultCampanas = '[{"nombre":"Inicio de a\xF1o","anio":2026,"numero":1},{"nombre":"Madres","anio":2026,"numero":2},{"nombre":"Vacaciones","anio":2026,"numero":3},{"nombre":"Temporada","anio":2026,"numero":4}]';
  const defaultCampanasRefs = '{"Inicio de a\xF1o 2026":["p1","p2","p3","p4","p5","p6","p7"],"Madres 2026":["p1","p2","p3","p4","p5","p6","p7"],"Vacaciones 2026":["p1","p2","p3","p4","p5","p6","p7"],"Temporada 2026":["p1","p2","p3","p4","p5","p6","p7"]}';
  let campanas = await safeReadFile(DB_PATHS.campanas, defaultCampanas);
  const campanasReferencias = await safeReadFile(DB_PATHS.campanasReferencias, defaultCampanasRefs);
  if (Array.isArray(campanas) && campanas.length > 0 && typeof campanas[0] === "string") {
    campanas = campanas.map((c) => {
      const match = c.match(/\d{4}/);
      const anio = match ? parseInt(match[0], 10) : 2026;
      const cleanName = c.replace(new RegExp(`\\s*${anio}\\s*`, "g"), "").trim();
      const norm = cleanName.toLowerCase();
      let numero = 1;
      if (norm.includes("inicio")) numero = 1;
      else if (norm.includes("madre")) numero = 2;
      else if (norm.includes("vacacio") || norm.includes("vacac")) numero = 3;
      else if (norm.includes("temporad")) numero = 4;
      else numero = 5;
      return { nombre: cleanName, anio, numero };
    });
    await safeWriteFile(DB_PATHS.campanas, campanas);
  }
  return { clientes, pedidos, deletedPedidos, backups, vendedor, prendas, usuarios, campanas, campanasReferencias };
}
async function saveClientes(clientes) {
  return safeWriteFile(DB_PATHS.clientes, clientes);
}
async function savePedidos(pedidos) {
  return safeWriteFile(DB_PATHS.pedidos, pedidos);
}
async function saveDeletedPedidos(deletedPedidos) {
  return safeWriteFile(DB_PATHS.deletedPedidos, deletedPedidos);
}
async function saveBackups(backups) {
  return safeWriteFile(DB_PATHS.backups, backups);
}
async function saveVendedor(vendedor) {
  return safeWriteFile(DB_PATHS.vendedor, vendedor);
}
async function savePrendas(prendas) {
  return safeWriteFile(DB_PATHS.prendas, prendas);
}
async function saveUsuarios(usuarios) {
  return safeWriteFile(DB_PATHS.usuarios, usuarios);
}
async function saveCampanas(campanas) {
  return safeWriteFile(DB_PATHS.campanas, campanas);
}
async function saveCampanasReferencias(campanasReferencias) {
  return safeWriteFile(DB_PATHS.campanasReferencias, campanasReferencias);
}

// backend/routes/api.ts
var router = Router();
var loginLimiter = rateLimit({
  windowMs: 60 * 1e3,
  // 1 minute
  max: 5,
  // Limit each IP to 5 requests per minute
  message: { error: "Demasiados intentos de inicio de sesi\xF3n. Por favor, intente de nuevo en un minuto." },
  standardHeaders: true,
  legacyHeaders: false
});
router.get("/health", (req, res) => {
  res.json({ status: "ok", serverTime: (/* @__PURE__ */ new Date()).toISOString() });
});
router.post("/auth/login", loginLimiter, async (req, res) => {
  try {
    const { usuario, clave } = req.body;
    if (!usuario || !clave) {
      return res.status(400).json({ error: "Usuario y clave son requeridos." });
    }
    const cleanUser = String(usuario).trim().toUpperCase();
    const cleanPin = String(clave).trim();
    const data = await getAllData();
    const foundUser = data.usuarios.find((u) => u.usuario.toUpperCase() === cleanUser);
    if (!foundUser) {
      return res.status(401).json({ error: "Usuario o clave incorrectos." });
    }
    if (foundUser.activo === false) {
      return res.status(403).json({ error: "Este usuario se encuentra inhabilitado. Contacte a Soporte." });
    }
    const match = await bcrypt2.compare(cleanPin, foundUser.clave);
    if (!match) {
      return res.status(401).json({ error: "Usuario o clave incorrectos." });
    }
    const token = jwt2.sign(
      {
        id: foundUser.id,
        usuario: foundUser.usuario,
        nombre: foundUser.nombre,
        rol: foundUser.rol,
        idVendedor: foundUser.idVendedor
      },
      JWT_SECRET,
      { expiresIn: "30d" }
    );
    const { clave: _, ...userWithoutPassword } = foundUser;
    res.json({
      success: true,
      token,
      user: userWithoutPassword
    });
  } catch (err) {
    res.status(500).json({ error: "Error al iniciar sesi\xF3n", details: err.message });
  }
});
router.get("/data", authMiddleware, async (req, res) => {
  try {
    const data = await getAllData();
    const safeUsuarios = data.usuarios.map(({ clave, ...u }) => u);
    res.json({
      ...data,
      usuarios: safeUsuarios
    });
  } catch (err) {
    res.status(500).json({ error: "Error al leer los datos de los JSON locales", details: err.message });
  }
});
router.post("/clientes", authMiddleware, async (req, res) => {
  try {
    const { clientes } = req.body;
    const parsed = z2.array(ClienteSchema).safeParse(clientes);
    if (!parsed.success) {
      return res.status(400).json({ error: "Estructura de clientes inv\xE1lida", details: parsed.error.format() });
    }
    const data = await getAllData();
    const existingMap = new Map(data.clientes.map((c) => [c.id, c]));
    clientes.forEach((c) => {
      existingMap.set(c.id, c);
    });
    const merged = Array.from(existingMap.values());
    await saveClientes(merged);
    res.json({ success: true, count: merged.length });
  } catch (err) {
    res.status(500).json({ error: "Error al guardar clientes", details: err.message });
  }
});
function getSiguienteCorrelativo(prefijoVendedor, pedidosConsolidados, maxCorrelativosPorVendedor) {
  if (maxCorrelativosPorVendedor.has(prefijoVendedor)) {
    const next2 = maxCorrelativosPorVendedor.get(prefijoVendedor) + 1;
    maxCorrelativosPorVendedor.set(prefijoVendedor, next2);
    return next2;
  }
  const pedidosVendedor = pedidosConsolidados.filter(
    (p) => p.numeroPedido && p.numeroPedido.startsWith(`${prefijoVendedor}-`) && !p.numeroPedido.startsWith("ASYNC-")
  );
  let maxCorr = 0;
  if (pedidosVendedor.length > 0) {
    const correlativos = pedidosVendedor.map((p) => {
      const parts = p.numeroPedido.split("-");
      const corr = parseInt(parts[1], 10);
      return isNaN(corr) ? 0 : corr;
    });
    maxCorr = Math.max(...correlativos);
  }
  const next = maxCorr + 1;
  maxCorrelativosPorVendedor.set(prefijoVendedor, next);
  return next;
}
router.post("/pedidos", authMiddleware, async (req, res) => {
  try {
    const { pedidos } = req.body;
    const parsed = z2.array(PedidoSchema).safeParse(pedidos);
    if (!parsed.success) {
      return res.status(400).json({ error: "Estructura de pedidos inv\xE1lida", details: parsed.error.format() });
    }
    const data = await getAllData();
    const existingMap = new Map(data.pedidos.map((p) => [p.id, p]));
    const maxCorrelativosPorVendedor = /* @__PURE__ */ new Map();
    pedidos.forEach((p) => {
      const isNew = !existingMap.has(p.id);
      const pedidoParaGuardar = { ...p };
      if (isNew) {
        if (pedidoParaGuardar.numeroPedido && pedidoParaGuardar.numeroPedido.startsWith("ASYNC-")) {
          const parts = pedidoParaGuardar.numeroPedido.split("-");
          const prefijoVendedor = parts[1] || "01";
          const siguienteCorr = getSiguienteCorrelativo(prefijoVendedor, Array.from(existingMap.values()), maxCorrelativosPorVendedor);
          const paddedNum = String(siguienteCorr).padStart(3, "0");
          pedidoParaGuardar.numeroPedido = `${prefijoVendedor}-${paddedNum}`;
        }
        existingMap.set(p.id, pedidoParaGuardar);
      } else {
        const existingPedido = existingMap.get(p.id);
        if (pedidoParaGuardar.numeroPedido && pedidoParaGuardar.numeroPedido.startsWith("ASYNC-") && existingPedido && existingPedido.numeroPedido && !existingPedido.numeroPedido.startsWith("ASYNC-")) {
          pedidoParaGuardar.numeroPedido = existingPedido.numeroPedido;
        }
        existingMap.set(p.id, { ...existingPedido, ...pedidoParaGuardar });
      }
    });
    const activeIds = new Set(Array.from(existingMap.keys()));
    const serverDeletedPedidos = data.deletedPedidos || [];
    const finalDeleted = serverDeletedPedidos.filter((p) => !activeIds.has(p.id));
    await saveDeletedPedidos(finalDeleted);
    const deletedIds = new Set(finalDeleted.map((p) => p.id));
    const merged = Array.from(existingMap.values()).filter((p) => !deletedIds.has(p.id));
    await savePedidos(merged);
    res.json({ success: true, count: merged.length });
  } catch (err) {
    res.status(500).json({ error: "Error al guardar pedidos", details: err.message });
  }
});
router.post("/deleted-pedidos", authMiddleware, async (req, res) => {
  try {
    const { deletedPedidos } = req.body;
    const user = req.user;
    const parsed = z2.array(PedidoSchema).safeParse(deletedPedidos);
    if (!parsed.success) {
      return res.status(400).json({ error: "Estructura de pedidos eliminados inv\xE1lida", details: parsed.error.format() });
    }
    const data = await getAllData();
    let serverDeletedPedidos = data.deletedPedidos || [];
    if (user) {
      if (user.rol === "soporte") {
        serverDeletedPedidos = deletedPedidos;
      } else {
        const otherSellersDeleted = serverDeletedPedidos.filter((p) => p.vendedorNombre !== user.nombre);
        serverDeletedPedidos = [...otherSellersDeleted, ...deletedPedidos];
      }
    } else {
      const existingMap = new Map(serverDeletedPedidos.map((p) => [p.id, p]));
      deletedPedidos.forEach((p) => {
        existingMap.set(p.id, p);
      });
      serverDeletedPedidos = Array.from(existingMap.values());
    }
    const activeIds = new Set((data.pedidos || []).map((p) => p.id));
    const finalDeleted = serverDeletedPedidos.filter((p) => !activeIds.has(p.id));
    await saveDeletedPedidos(finalDeleted);
    const deletedIds = new Set(finalDeleted.map((p) => p.id));
    const activePedidos = data.pedidos.filter((p) => !deletedIds.has(p.id));
    await savePedidos(activePedidos);
    res.json({ success: true, count: finalDeleted.length });
  } catch (err) {
    res.status(500).json({ error: "Error al guardar pedidos eliminados", details: err.message });
  }
});
router.post("/backups", authMiddleware, async (req, res) => {
  try {
    const { backups } = req.body;
    const parsed = z2.array(PedidoSchema).safeParse(backups);
    if (!parsed.success) {
      return res.status(400).json({ error: "Estructura de backups inv\xE1lida", details: parsed.error.format() });
    }
    const data = await getAllData();
    const existingMap = new Map(data.backups.map((p) => [p.id, p]));
    backups.forEach((p) => {
      existingMap.set(p.id, p);
    });
    const merged = Array.from(existingMap.values());
    await saveBackups(merged);
    res.json({ success: true, count: merged.length });
  } catch (err) {
    res.status(500).json({ error: "Error al guardar backups de pedidos", details: err.message });
  }
});
router.post("/vendedor", authMiddleware, async (req, res) => {
  try {
    const vendedor = req.body;
    if (!vendedor || typeof vendedor.nombre !== "string") {
      return res.status(400).json({ error: "Datos del vendedor inv\xE1lidos." });
    }
    await saveVendedor(vendedor);
    res.json({ success: true, vendedor });
  } catch (err) {
    res.status(500).json({ error: "Error al guardar configuraci\xF3n del vendedor", details: err.message });
  }
});
router.post("/prendas", authMiddleware, async (req, res) => {
  try {
    const { prendas } = req.body;
    if (!Array.isArray(prendas)) {
      return res.status(400).json({ error: "Formato incorrecto. Se requiere un array de prendas." });
    }
    await savePrendas(prendas);
    res.json({ success: true, count: prendas.length });
  } catch (err) {
    res.status(500).json({ error: "Error al guardar prendas del cat\xE1logo", details: err.message });
  }
});
router.post("/usuarios", authMiddleware, async (req, res) => {
  try {
    const { usuarios } = req.body;
    const parsed = z2.array(UsuarioSchema).safeParse(usuarios);
    if (!parsed.success) {
      return res.status(400).json({ error: "Estructura de usuarios inv\xE1lida", details: parsed.error.format() });
    }
    const currentUser = req.user;
    const data = await getAllData();
    const existingMap = new Map(data.usuarios.map((u) => [u.id, u]));
    const isSupport = currentUser.rol === "soporte";
    for (const u of usuarios) {
      const existing = existingMap.get(u.id);
      if (!existing) {
        if (!isSupport) {
          return res.status(403).json({ error: "Acceso denegado. Solo soporte puede crear usuarios." });
        }
      } else {
        if (!isSupport) {
          if (u.id !== currentUser.id) {
            if (u.nombre !== existing.nombre || u.usuario !== existing.usuario || u.rol !== existing.rol || u.esPrimeraVez !== existing.esPrimeraVez || (u.activo ?? null) !== (existing.activo ?? null) || (u.idVendedor ?? null) !== (existing.idVendedor ?? null)) {
              return res.status(403).json({ error: "Acceso denegado. No puedes modificar la cuenta de otros usuarios." });
            }
          } else {
            if (u.rol !== existing.rol || u.activo !== existing.activo || u.usuario !== existing.usuario) {
              return res.status(403).json({ error: "Acceso denegado. No puedes modificar tu propio rol o estado activo." });
            }
          }
        }
      }
    }
    const hashedUsuarios = await Promise.all(
      usuarios.map(async (u) => {
        const existing = existingMap.get(u.id);
        let clave = u.clave;
        if (clave && /^\d{4}$/.test(clave)) {
          clave = await bcrypt2.hash(clave, 10);
        } else if (!clave && existing) {
          clave = existing.clave;
        }
        return { ...u, clave };
      })
    );
    hashedUsuarios.forEach((u) => {
      existingMap.set(u.id, u);
    });
    const merged = Array.from(existingMap.values());
    await saveUsuarios(merged);
    res.json({ success: true, count: merged.length });
  } catch (err) {
    res.status(500).json({ error: "Error al guardar usuarios", details: err.message });
  }
});
router.post("/campanas", authMiddleware, async (req, res) => {
  try {
    const { campanas } = req.body;
    const parsed = z2.array(CampanaSchema).safeParse(campanas);
    if (!parsed.success) {
      return res.status(400).json({ error: "Estructura de campa\xF1as inv\xE1lida", details: parsed.error.format() });
    }
    const data = await getAllData();
    const existingMap = new Map(data.campanas.map((c) => [`${c.nombre} ${c.anio}`, c]));
    campanas.forEach((c) => {
      existingMap.set(`${c.nombre} ${c.anio}`, c);
    });
    const merged = Array.from(existingMap.values());
    await saveCampanas(merged);
    res.json({ success: true, count: merged.length });
  } catch (err) {
    res.status(500).json({ error: "Error al guardar campa\xF1as", details: err.message });
  }
});
router.post("/campanas-referencias", authMiddleware, async (req, res) => {
  try {
    const { campanasReferencias } = req.body;
    const parsed = z2.record(z2.string(), z2.array(z2.string())).safeParse(campanasReferencias);
    if (!parsed.success) {
      return res.status(400).json({ error: "Estructura de mapeo de campa\xF1as inv\xE1lida", details: parsed.error.format() });
    }
    await saveCampanasReferencias(campanasReferencias);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Error al guardar referencias de campa\xF1a", details: err.message });
  }
});
router.post("/pedidos/sync-batch", authMiddleware, async (req, res) => {
  try {
    const { pedidos, clientes, deletedPedidos } = req.body;
    const user = req.user;
    const parsedPedidos = z2.array(PedidoSchema).safeParse(pedidos);
    const parsedClientes = z2.array(ClienteSchema).safeParse(clientes);
    const parsedDeleted = deletedPedidos ? z2.array(PedidoSchema).safeParse(deletedPedidos) : { success: true };
    if (!parsedPedidos.success || !parsedClientes.success || !parsedDeleted.success) {
      const details = {
        pedidos: parsedPedidos.success ? null : parsedPedidos.error.format(),
        clientes: parsedClientes.success ? null : parsedClientes.error.format(),
        deletedPedidos: parsedDeleted.success ? null : parsedDeleted.error?.format()
      };
      return res.status(400).json({ error: "Estructura de datos de sincronizaci\xF3n inv\xE1lida", details });
    }
    const data = await getAllData();
    const clientesActuales = data.clientes || [];
    const clientesMap = new Map(clientesActuales.map((c) => [c.id, c]));
    const nuevosClientesIds = [];
    clientes.forEach((c) => {
      if (!clientesMap.has(c.id)) {
        clientesMap.set(c.id, {
          ...c,
          codigoCliente: c.codigoCliente || "000"
        });
        nuevosClientesIds.push(c.id);
      }
    });
    await saveClientes(Array.from(clientesMap.values()));
    const pedidosActuales = data.pedidos || [];
    const pedidosMap = new Map(pedidosActuales.map((p) => [p.id, p]));
    const nuevosPedidosIds = [];
    const maxCorrelativosPorVendedor = /* @__PURE__ */ new Map();
    pedidos.forEach((p) => {
      const isNew = !pedidosMap.has(p.id);
      const pedidoParaGuardar = { ...p };
      if (isNew) {
        if (pedidoParaGuardar.numeroPedido && pedidoParaGuardar.numeroPedido.startsWith("ASYNC-")) {
          const parts = pedidoParaGuardar.numeroPedido.split("-");
          const prefijoVendedor = parts[1] || "01";
          const siguienteCorr = getSiguienteCorrelativo(prefijoVendedor, Array.from(pedidosMap.values()), maxCorrelativosPorVendedor);
          const paddedNum = String(siguienteCorr).padStart(3, "0");
          pedidoParaGuardar.numeroPedido = `${prefijoVendedor}-${paddedNum}`;
        }
        pedidosMap.set(p.id, pedidoParaGuardar);
        nuevosPedidosIds.push(p.id);
      } else {
        const existingPedido = pedidosMap.get(p.id);
        if (pedidoParaGuardar.numeroPedido && pedidoParaGuardar.numeroPedido.startsWith("ASYNC-") && existingPedido && existingPedido.numeroPedido && !existingPedido.numeroPedido.startsWith("ASYNC-")) {
          pedidoParaGuardar.numeroPedido = existingPedido.numeroPedido;
        }
        pedidosMap.set(p.id, { ...existingPedido, ...pedidoParaGuardar });
        nuevosPedidosIds.push(p.id);
      }
    });
    let serverDeletedPedidos = data.deletedPedidos || [];
    if (Array.isArray(deletedPedidos) && user) {
      if (user.rol === "soporte") {
        serverDeletedPedidos = deletedPedidos;
      } else {
        const otherSellersDeleted = serverDeletedPedidos.filter((p) => p.vendedorNombre !== user.nombre);
        serverDeletedPedidos = [...otherSellersDeleted, ...deletedPedidos];
      }
    }
    const activeIds = new Set(Array.from(pedidosMap.keys()));
    const finalDeleted = serverDeletedPedidos.filter((p) => !activeIds.has(p.id));
    await saveDeletedPedidos(finalDeleted);
    const deletedIds = new Set(finalDeleted.map((p) => p.id));
    const mergedPedidos = Array.from(pedidosMap.values()).filter((p) => !deletedIds.has(p.id));
    await savePedidos(mergedPedidos);
    const freshData = await getAllData();
    res.json({
      success: true,
      syncedOrderIds: nuevosPedidosIds,
      syncedClientIds: nuevosClientesIds,
      ...freshData
    });
  } catch (err) {
    res.status(500).json({ error: "Error durante la sincronizaci\xF3n en lote", details: err.message });
  }
});
var api_default = router;

// backend/server.ts
var isProd = NODE_ENV === "production";
async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));
  app.use("/fotos_referencias", express.static(FOTOS_REFERENCIAS_DIR));
  app.use("/api", api_default);
  if (!isProd) {
    const reactPlugin = (await import("@vitejs/plugin-react")).default;
    const tailwindPlugin = (await import("@tailwindcss/vite")).default;
    const vite = await createViteServer({
      configFile: false,
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== "true",
        watch: process.env.DISABLE_HMR === "true" ? null : {
          ignored: ["**/db_json/**", "**/fotos_referencias/**"]
        }
      },
      appType: "spa",
      plugins: [reactPlugin(), tailwindPlugin()],
      resolve: {
        alias: {
          "@": path2.resolve(process.cwd(), ".")
        }
      }
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path2.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path2.join(process.cwd(), "dist", "index.html"));
    });
  }
  app.listen(PORT, () => {
    console.log(`[Toma Pedido Backend] Server running in ${NODE_ENV} mode at http://localhost:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("[Toma Pedido Backend] Failed to start server:", err);
});
