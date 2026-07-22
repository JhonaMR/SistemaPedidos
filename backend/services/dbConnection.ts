import pg from 'pg';
import { PG_CONFIG } from '../config';

// Create connection pool
export const pool = new pg.Pool(PG_CONFIG);

// Ensure the database exists (runs using default 'postgres' database connection)
async function ensureDatabaseExists() {
  const { database, ...dbConfigWithoutDb } = PG_CONFIG;
  
  const client = new pg.Client({
    ...dbConfigWithoutDb,
    database: 'postgres',
  });
  
  try {
    await client.connect();
    const res = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [database]);
    if (res.rowCount === 0) {
      console.log(`[Database Connection] Database "${database}" does not exist. Creating it...`);
      // Execute CREATE DATABASE
      await client.query(`CREATE DATABASE "${database}"`);
      console.log(`[Database Connection] Database "${database}" created successfully.`);
    }
  } catch (err) {
    console.error(`[Database Connection] Error ensuring database "${database}" exists:`, err);
  } finally {
    try {
      await client.end();
    } catch (e) {}
  }
}

// Initialize tables if they don't exist
export async function initDatabaseSchema() {
  // First ensure the database exists
  await ensureDatabaseExists();

  const client = await pool.connect();
  try {
    console.log(`[Database Connection] Initializing tables for database: ${PG_CONFIG.database}`);

    // Create table: usuarios
    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id VARCHAR(50) PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        usuario VARCHAR(10) UNIQUE NOT NULL,
        clave VARCHAR(255) NOT NULL,
        rol VARCHAR(20) NOT NULL,
        es_primera_vez BOOLEAN NOT NULL DEFAULT TRUE,
        activo BOOLEAN DEFAULT TRUE,
        id_vendedor VARCHAR(20)
      )
    `);

    // Create table: clientes
    await client.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id VARCHAR(50) PRIMARY KEY,
        codigo_cliente VARCHAR(50) NOT NULL,
        nombre VARCHAR(255) NOT NULL,
        documento_identidad VARCHAR(50) NOT NULL,
        telefono VARCHAR(50),
        correo VARCHAR(100),
        direccion VARCHAR(255),
        ciudad VARCHAR(100),
        notas TEXT,
        fecha_registro VARCHAR(50) NOT NULL,
        limite_facturacion VARCHAR(50)
      )
    `);

    // Create table: prendas (catalogo)
    await client.query(`
      CREATE TABLE IF NOT EXISTS prendas (
        ref VARCHAR(50) PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        categoria JSONB NOT NULL,
        precio_base NUMERIC(12, 2) NOT NULL,
        tallas_disponibles JSONB NOT NULL,
        imagen_url VARCHAR(255),
        stock INTEGER NOT NULL,
        descripcion TEXT
      )
    `);

    // Create table: campanas
    await client.query(`
      CREATE TABLE IF NOT EXISTS campanas (
        nombre VARCHAR(100) NOT NULL,
        anio INTEGER NOT NULL,
        numero INTEGER NOT NULL,
        PRIMARY KEY (nombre, anio)
      )
    `);

    // Create table: campanas_referencias
    await client.query(`
      CREATE TABLE IF NOT EXISTS campanas_referencias (
        campana_key VARCHAR(150) PRIMARY KEY,
        referencias JSONB NOT NULL
      )
    `);

    // Create table: vendedor
    await client.query(`
      CREATE TABLE IF NOT EXISTS vendedor (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        codigo VARCHAR(50) NOT NULL
      )
    `);

    // Create table: pedidos
    await client.query(`
      CREATE TABLE IF NOT EXISTS pedidos (
        id VARCHAR(50) PRIMARY KEY,
        numero_pedido VARCHAR(50) NOT NULL,
        cliente_id VARCHAR(50) NOT NULL,
        cliente_nombre VARCHAR(255) NOT NULL,
        cliente_telefono VARCHAR(50),
        vendedor_nombre VARCHAR(255) NOT NULL,
        subtotal NUMERIC(12, 2) NOT NULL,
        porcentaje_descuento NUMERIC(5, 2) NOT NULL,
        monto_descuento NUMERIC(12, 2) NOT NULL,
        total NUMERIC(12, 2) NOT NULL,
        estado VARCHAR(20) NOT NULL,
        notas TEXT,
        fecha VARCHAR(50) NOT NULL,
        fecha_entrega_estimada VARCHAR(50) NOT NULL,
        fecha_limite_despacho VARCHAR(50),
        campana VARCHAR(100),
        facturacion_fe NUMERIC(5, 2),
        facturacion_rm NUMERIC(5, 2),
        fecha_cancelado VARCHAR(50),
        motivo_cancelado TEXT,
        fecha_eliminacion VARCHAR(50),
        editado BOOLEAN,
        backup_of VARCHAR(50),
        backup_fecha VARCHAR(50),
        es_backup BOOLEAN DEFAULT FALSE,
        es_deleted BOOLEAN DEFAULT FALSE
      )
    `);

    // Drop old table if it doesn't have db_id column (migration support)
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'pedido_items') THEN
          IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'pedido_items' AND column_name = 'db_id') THEN
            DROP TABLE pedido_items CASCADE;
          END IF;
        END IF;
      END $$;
    `);

    // Create table: pedido_items
    await client.query(`
      CREATE TABLE IF NOT EXISTS pedido_items (
        db_id SERIAL PRIMARY KEY,
        id VARCHAR(50) NOT NULL,
        pedido_id VARCHAR(50) NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
        prenda_ref VARCHAR(50) NOT NULL,
        nombre_prenda VARCHAR(255) NOT NULL,
        categoria VARCHAR(100) NOT NULL,
        talla VARCHAR(20) NOT NULL,
        novedad TEXT,
        cantidad INTEGER NOT NULL,
        precio_unitario NUMERIC(12, 2) NOT NULL,
        total NUMERIC(12, 2) NOT NULL,
        tallas_detalle JSONB
      )
    `);

    console.log('[Database Connection] All database tables checked/created successfully.');
  } catch (err) {
    console.error('[Database Connection] Error initializing database schemas:', err);
    throw err;
  } finally {
    client.release();
  }
}
