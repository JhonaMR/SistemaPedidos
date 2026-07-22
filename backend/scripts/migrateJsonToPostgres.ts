import fs from 'fs/promises';
import path from 'path';
import { initDatabaseSchema, pool } from '../services/dbConnection';
import { DB_PATHS } from '../config';
import {
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

async function safeReadJson(filePath: string, defaultContent: string = '[]'): Promise<any> {
  try {
    await fs.access(filePath);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    return JSON.parse(defaultContent);
  }
}

async function runMigration() {
  console.log('[Migration Script] Starting migration process...');

  // 1. Determine brand from arguments
  const args = process.argv.slice(2);
  const brandArg = args.find(arg => arg.startsWith('--brand='));
  const brand = brandArg ? brandArg.split('=')[1].toLowerCase() : 'plow';

  if (brand !== 'plow' && brand !== 'melas') {
    console.error(`[Migration Script] Error: Invalid brand "${brand}". Supported brands: plow, melas.`);
    process.exit(1);
  }

  console.log(`[Migration Script] Brand target selected: "${brand.toUpperCase()}"`);

  // 2. Initialize database schemas
  try {
    await initDatabaseSchema();
  } catch (err) {
    console.error('[Migration Script] Schema initialization failed. Make sure PostgreSQL is running.');
    process.exit(1);
  }

  // 3. Migrate common entities (Users & Clients) for both brands
  console.log('[Migration Script] Migrating Users...');
  const usuarios = await safeReadJson(DB_PATHS.usuarios, '[]');
  if (usuarios.length > 0) {
    await saveUsuarios(usuarios);
    console.log(`[Migration Script] Migrated ${usuarios.length} users successfully.`);
  } else {
    console.log('[Migration Script] No users to migrate (using system defaults).');
  }

  console.log('[Migration Script] Migrating Clients...');
  const clientes = await safeReadJson(DB_PATHS.clientes, '[]');
  if (clientes.length > 0) {
    await saveClientes(clientes);
    console.log(`[Migration Script] Migrated ${clientes.length} clients successfully.`);
  } else {
    console.log('[Migration Script] No clients to migrate.');
  }

  // 4. Migrate brand-specific catalog & orders ONLY if brand is 'plow'
  if (brand === 'plow') {
    console.log('[Migration Script] Brand is Plow: Migrating full catalog, orders, and campaigns...');

    console.log('[Migration Script] Migrating Catalog (Prendas)...');
    const prendas = await safeReadJson(DB_PATHS.prendas, '[]');
    if (prendas.length > 0) {
      await savePrendas(prendas);
      console.log(`[Migration Script] Migrated ${prendas.length} garments in catalog successfully.`);
    }

    console.log('[Migration Script] Migrating Active Orders...');
    const pedidos = await safeReadJson(DB_PATHS.pedidos, '[]');
    if (pedidos.length > 0) {
      await savePedidos(pedidos);
      console.log(`[Migration Script] Migrated ${pedidos.length} active orders successfully.`);
    }

    console.log('[Migration Script] Migrating Deleted Orders (Trash)...');
    const deletedPedidos = await safeReadJson(DB_PATHS.deletedPedidos, '[]');
    if (deletedPedidos.length > 0) {
      await saveDeletedPedidos(deletedPedidos);
      console.log(`[Migration Script] Migrated ${deletedPedidos.length} deleted orders successfully.`);
    }

    console.log('[Migration Script] Migrating Backup Orders...');
    const backups = await safeReadJson(DB_PATHS.backups, '[]');
    if (backups.length > 0) {
      await saveBackups(backups);
      console.log(`[Migration Script] Migrated ${backups.length} backup orders successfully.`);
    }

    console.log('[Migration Script] Migrating Vendor Config...');
    const vendedor = await safeReadJson(DB_PATHS.vendedor, '{"nombre": "Lina Pulgarin", "codigo": "V-102"}');
    await saveVendedor(vendedor);
    console.log('[Migration Script] Migrated vendor config successfully.');

    console.log('[Migration Script] Migrating Campaigns...');
    const campanas = await safeReadJson(DB_PATHS.campanas, '[]');
    if (campanas.length > 0) {
      await saveCampanas(campanas);
      console.log(`[Migration Script] Migrated ${campanas.length} campaigns successfully.`);
    }

    console.log('[Migration Script] Migrating Campaign Reference Mappings...');
    const campanasReferencias = await safeReadJson(DB_PATHS.campanasReferencias, '{}');
    await saveCampanasReferencias(campanasReferencias);
    console.log('[Migration Script] Migrated campaign reference mappings successfully.');

  } else {
    console.log('[Migration Script] Brand is Melas: Skipping catalog, orders, and campaigns (starting catalog and orders from scratch).');
  }

  console.log('[Migration Script] Migration completed successfully!');
  await pool.end();
}

runMigration().catch(err => {
  console.error('[Migration Script] FATAL: Migration failed with error:', err);
  pool.end().catch(() => {});
  process.exit(1);
});
