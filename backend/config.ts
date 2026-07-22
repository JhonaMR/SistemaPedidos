import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export const PORT = process.env.PORT || 5050;
export const NODE_ENV = process.env.NODE_ENV || 'development';

export const PG_CONFIG = {
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5435', 10),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'arare_plow',
};

export const DB_DIR = path.join(process.cwd(), 'db_json');

export const DB_PATHS = {
  clientes: path.join(DB_DIR, 'clientes.json'),
  pedidos: path.join(DB_DIR, 'pedidos.json'),
  deletedPedidos: path.join(DB_DIR, 'deleted_pedidos.json'),
  backups: path.join(DB_DIR, 'backups.json'),
  vendedor: path.join(DB_DIR, 'vendedor.json'),
  prendas: path.join(DB_DIR, 'prendas.json'),
  usuarios: path.join(DB_DIR, 'usuarios.json'),
  campanas: path.join(DB_DIR, 'campanas.json'),
  campanasReferencias: path.join(DB_DIR, 'campanas_referencias.json'),
};

export const FOTOS_REFERENCIAS_DIR = process.env.FOTOS_REFERENCIAS_DIR || path.join(process.cwd(), 'public', 'fotos_referencias');

export const JWT_SECRET = process.env.JWT_SECRET || 'arare_secreto_super_seguro_2026';

