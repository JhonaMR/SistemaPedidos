import path from 'path';

export const PORT = process.env.PORT || 5050;
export const NODE_ENV = process.env.NODE_ENV || 'development';

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

export const FOTOS_REFERENCIAS_DIR = path.join(process.cwd(), 'fotos_referencias');
