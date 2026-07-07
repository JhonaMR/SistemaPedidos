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
  const pedidos = await safeReadFile(DB_PATHS.pedidos, '[]');
  const deletedPedidos = await safeReadFile(DB_PATHS.deletedPedidos, '[]');
  const backups = await safeReadFile(DB_PATHS.backups, '[]');
  const vendedor = await safeReadFile(DB_PATHS.vendedor, '{"nombre": "Lina Pulgarin", "codigo": "V-102"}');
  const prendas = await safeReadFile(DB_PATHS.prendas, '[]');
  const defaultUsuarios = '[{"id":"usr_sop","nombre":"Usuario Soporte","usuario":"SOP","clave":"9999","rol":"soporte","esPrimeraVez":false,"activo":true},{"id":"usr_gen","nombre":"Usuario General","usuario":"GEN","clave":"1234","rol":"general","esPrimeraVez":true,"activo":true}]';
  const usuarios = await safeReadFile(DB_PATHS.usuarios, defaultUsuarios);

  const defaultCampanas = '["Campaña Colegios 2026", "Campaña Primavera 2026", "Campaña Otoño/Invierno 2026", "Campaña Dotaciones Básicas"]';
  const defaultCampanasRefs = '{"Campaña Colegios 2026":["p1","p2","p3","p4","p5","p6","p7"],"Campaña Primavera 2026":["p1","p2","p3","p4","p5","p6","p7"],"Campaña Otoño/Invierno 2026":["p1","p2","p3","p4","p5","p6","p7"],"Campaña Dotaciones Básicas":["p1","p2","p3","p4","p5","p6","p7"]}';
  const campanas = await safeReadFile(DB_PATHS.campanas, defaultCampanas);
  const campanasReferencias = await safeReadFile(DB_PATHS.campanasReferencias, defaultCampanasRefs);

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

export async function saveCampanas(campanas: string[]) {
  return safeWriteFile(DB_PATHS.campanas, campanas);
}

export async function saveCampanasReferencias(campanasReferencias: Record<string, string[]>) {
  return safeWriteFile(DB_PATHS.campanasReferencias, campanasReferencias);
}
