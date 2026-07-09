import fs from 'fs/promises';
import { DB_PATHS } from '../config';

// Helper to safely read file or return default
async function safeReadFile(filePath: string, defaultContent: string) {
  try {
    await fs.access(filePath);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    // If file does not exist, return default parsed
    return JSON.parse(defaultContent);
  }
}

// Helper to safely write file
async function safeWriteFile(filePath: string, data: any) {
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`Error writing to ${filePath}:`, err);
    throw err;
  }
}

export async function getAllData() {
  const clientes = await safeReadFile(DB_PATHS.clientes, '[]');
  let pedidos = await safeReadFile(DB_PATHS.pedidos, '[]');
  const deletedPedidos = await safeReadFile(DB_PATHS.deletedPedidos, '[]');

  // Clean up legacy idLocal from active database
  let shouldSavePedidos = false;
  if (Array.isArray(pedidos)) {
    pedidos = pedidos.map((p: any) => {
      if (p.idLocal !== undefined) {
        delete p.idLocal;
        shouldSavePedidos = true;
      }
      return p;
    });
  }

  // Auto-heal legacy ASYNC- orders in the active database
  let hasAsyncOrders = false;
  if (Array.isArray(pedidos)) {
    hasAsyncOrders = pedidos.some((p: any) => p.numeroPedido && p.numeroPedido.startsWith('ASYNC-'));
  }

  if (hasAsyncOrders) {
    shouldSavePedidos = true;
    const maxCorrelativos = new Map<string, number>();
    
    // 1. Scan for existing max sequential numbers
    pedidos.forEach((p: any) => {
      if (p.numeroPedido && !p.numeroPedido.startsWith('ASYNC-')) {
        const parts = p.numeroPedido.split('-');
        const prefijo = parts[0] || '01';
        const corr = parseInt(parts[1], 10);
        if (!isNaN(corr)) {
          const maxVal = maxCorrelativos.get(prefijo) || 0;
          if (corr > maxVal) {
            maxCorrelativos.set(prefijo, corr);
          }
        }
      }
    });

    // 2. Assign numbers to ASYNC orders sequentially
    pedidos = pedidos.map((p: any) => {
      if (p.numeroPedido && p.numeroPedido.startsWith('ASYNC-')) {
        const parts = p.numeroPedido.split('-');
        const prefijoVendedor = parts[1] || '01';
        const nextCorr = (maxCorrelativos.get(prefijoVendedor) || 0) + 1;
        maxCorrelativos.set(prefijoVendedor, nextCorr);
        const paddedNum = String(nextCorr).padStart(3, '0');
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
  const backups = await safeReadFile(DB_PATHS.backups, '[]');
  const vendedor = await safeReadFile(DB_PATHS.vendedor, '{"nombre": "Lina Pulgarin", "codigo": "V-102"}');
  const prendas = await safeReadFile(DB_PATHS.prendas, '[]');
  const defaultUsuarios = '[{"id":"usr_sop","nombre":"Usuario Soporte","usuario":"SOP","clave":"9999","rol":"soporte","esPrimeraVez":false,"activo":true},{"id":"usr_gen","nombre":"Usuario General","usuario":"GEN","clave":"1234","rol":"general","esPrimeraVez":true,"activo":true}]';
  const usuarios = await safeReadFile(DB_PATHS.usuarios, defaultUsuarios);

  const defaultCampanas = '[{"nombre":"Inicio de año","anio":2026,"numero":1},{"nombre":"Madres","anio":2026,"numero":2},{"nombre":"Vacaciones","anio":2026,"numero":3},{"nombre":"Temporada","anio":2026,"numero":4}]';
  const defaultCampanasRefs = '{"Inicio de año 2026":["p1","p2","p3","p4","p5","p6","p7"],"Madres 2026":["p1","p2","p3","p4","p5","p6","p7"],"Vacaciones 2026":["p1","p2","p3","p4","p5","p6","p7"],"Temporada 2026":["p1","p2","p3","p4","p5","p6","p7"]}';
  let campanas = await safeReadFile(DB_PATHS.campanas, defaultCampanas);
  const campanasReferencias = await safeReadFile(DB_PATHS.campanasReferencias, defaultCampanasRefs);

  // Migrate if it's an array of strings (old database schema)
  if (Array.isArray(campanas) && campanas.length > 0 && typeof campanas[0] === 'string') {
    campanas = campanas.map((c: string) => {
      const match = c.match(/\d{4}/);
      const anio = match ? parseInt(match[0], 10) : 2026;
      const cleanName = c.replace(new RegExp(`\\s*${anio}\\s*`, 'g'), '').trim();
      const norm = cleanName.toLowerCase();
      
      let numero = 1;
      if (norm.includes('inicio')) numero = 1;
      else if (norm.includes('madre')) numero = 2;
      else if (norm.includes('vacacio') || norm.includes('vacac')) numero = 3;
      else if (norm.includes('temporad')) numero = 4;
      else numero = 5;

      return { nombre: cleanName, anio, numero };
    });
    // Write back the migrated version to keep it persistent
    await safeWriteFile(DB_PATHS.campanas, campanas);
  }

  return { clientes, pedidos, deletedPedidos, backups, vendedor, prendas, usuarios, campanas, campanasReferencias };
}

export async function saveClientes(clientes: any[]) {
  return safeWriteFile(DB_PATHS.clientes, clientes);
}

export async function savePedidos(pedidos: any[]) {
  return safeWriteFile(DB_PATHS.pedidos, pedidos);
}

export async function saveDeletedPedidos(deletedPedidos: any[]) {
  return safeWriteFile(DB_PATHS.deletedPedidos, deletedPedidos);
}

export async function saveBackups(backups: any[]) {
  return safeWriteFile(DB_PATHS.backups, backups);
}

export async function saveVendedor(vendedor: any) {
  return safeWriteFile(DB_PATHS.vendedor, vendedor);
}

export async function savePrendas(prendas: any[]) {
  return safeWriteFile(DB_PATHS.prendas, prendas);
}

export async function saveUsuarios(usuarios: any[]) {
  return safeWriteFile(DB_PATHS.usuarios, usuarios);
}

export async function saveCampanas(campanas: any[]) {
  return safeWriteFile(DB_PATHS.campanas, campanas);
}

export async function saveCampanasReferencias(campanasReferencias: Record<string, string[]>) {
  return safeWriteFile(DB_PATHS.campanasReferencias, campanasReferencias);
}
