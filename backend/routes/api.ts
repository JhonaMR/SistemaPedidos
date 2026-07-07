import { Router } from 'express';
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

// API Health Check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

// Load all data
router.get('/data', async (req, res) => {
  try {
    const data = await getAllData();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Error al leer los datos de los JSON locales', details: err.message });
  }
});

// Save Clientes
router.post('/clientes', async (req, res) => {
  try {
    const { clientes } = req.body;
    if (!Array.isArray(clientes)) {
      return res.status(400).json({ error: 'Formato incorrecto. Se requiere un array de clientes.' });
    }
    await saveClientes(clientes);
    res.json({ success: true, count: clientes.length });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al guardar clientes', details: err.message });
  }
});

// Save Pedidos
router.post('/pedidos', async (req, res) => {
  try {
    const { pedidos } = req.body;
    if (!Array.isArray(pedidos)) {
      return res.status(400).json({ error: 'Formato incorrecto. Se requiere un array de pedidos.' });
    }
    await savePedidos(pedidos);
    res.json({ success: true, count: pedidos.length });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al guardar pedidos', details: err.message });
  }
});

// Save Deleted Pedidos
router.post('/deleted-pedidos', async (req, res) => {
  try {
    const { deletedPedidos } = req.body;
    if (!Array.isArray(deletedPedidos)) {
      return res.status(400).json({ error: 'Formato incorrecto. Se requiere un array de pedidos eliminados.' });
    }
    await saveDeletedPedidos(deletedPedidos);
    res.json({ success: true, count: deletedPedidos.length });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al guardar pedidos eliminados', details: err.message });
  }
});

// Save Backups
router.post('/backups', async (req, res) => {
  try {
    const { backups } = req.body;
    if (!Array.isArray(backups)) {
      return res.status(400).json({ error: 'Formato incorrecto. Se requiere un array de backups.' });
    }
    await saveBackups(backups);
    res.json({ success: true, count: backups.length });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al guardar backups de pedidos', details: err.message });
  }
});

// Save Vendedor Config
router.post('/vendedor', async (req, res) => {
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
router.post('/prendas', async (req, res) => {
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
router.post('/usuarios', async (req, res) => {
  try {
    const { usuarios } = req.body;
    if (!Array.isArray(usuarios)) {
      return res.status(400).json({ error: 'Formato incorrecto. Se requiere un array de usuarios.' });
    }
    await saveUsuarios(usuarios);
    res.json({ success: true, count: usuarios.length });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al guardar usuarios', details: err.message });
  }
});
// Save Campanas
router.post('/campanas', async (req, res) => {
  try {
    const { campanas } = req.body;
    if (!Array.isArray(campanas)) {
      return res.status(400).json({ error: 'Formato incorrecto. Se requiere un array de campañas.' });
    }
    await saveCampanas(campanas);
    res.json({ success: true, count: campanas.length });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al guardar campañas', details: err.message });
  }
});

// Save Campanas Referencias Mapping
router.post('/campanas-referencias', async (req, res) => {
  try {
    const { campanasReferencias } = req.body;
    if (!campanasReferencias || typeof campanasReferencias !== 'object') {
      return res.status(400).json({ error: 'Formato incorrecto. Se requiere un mapa de campañas y referencias.' });
    }
    await saveCampanasReferencias(campanasReferencias);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al guardar referencias de campaña', details: err.message });
  }
});

// Sincronización en lote desde móviles (Offline-First)
router.post('/pedidos/sync-batch', async (req, res) => {
  try {
    const { pedidos, clientes } = req.body;
    
    if (!Array.isArray(pedidos) || !Array.isArray(clientes)) {
      return res.status(400).json({ error: 'Formato incorrecto. Se requieren arrays de pedidos y clientes.' });
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
    const pedidosActuales = data.pedidos || [];
    const pedidosMap = new Map(pedidosActuales.map(p => [p.id, p]));
    const nuevosPedidosIds: string[] = [];

    pedidos.forEach(p => {
      if (!pedidosMap.has(p.id)) {
        pedidosMap.set(p.id, p);
        nuevosPedidosIds.push(p.id);
      }
    });

    await savePedidos(Array.from(pedidosMap.values()));

    res.json({
      success: true,
      syncedOrderIds: nuevosPedidosIds,
      syncedClientIds: nuevosClientesIds
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Error durante la sincronización en lote', details: err.message });
  }
});

export default router;
