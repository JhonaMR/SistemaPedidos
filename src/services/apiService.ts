import { Cliente, Pedido, Prenda, UsuarioApp, Campana } from '../types';

// URL base de la API dinámica. Si está definida en las variables de entorno, la usa.
// Si no, usa ruta relativa por defecto (ideal para localhost).
const API_BASE = import.meta.env.VITE_API_URL || '';

export interface ServerData {
  clientes: Cliente[];
  pedidos: Pedido[];
  deletedPedidos: Pedido[];
  backups: Pedido[];
  vendedor: {
    nombre: string;
    codigo: string;
  };
  prendas: Prenda[];
  usuarios: UsuarioApp[];
  campanas: Campana[];
  campanasReferencias: Record<string, string[]>;
}

export async function fetchServerData(): Promise<ServerData> {
  const response = await fetch(`${API_BASE}/api/data`);
  if (!response.ok) {
    throw new Error('Error al obtener datos del servidor local.');
  }
  return response.json();
}

export async function apiSaveClientes(clientes: Cliente[]): Promise<boolean> {
  const response = await fetch(`${API_BASE}/api/clientes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientes }),
  });
  return response.ok;
}

export async function apiSavePedidos(pedidos: Pedido[]): Promise<boolean> {
  const response = await fetch(`${API_BASE}/api/pedidos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pedidos }),
  });
  return response.ok;
}

export async function apiSaveDeletedPedidos(deletedPedidos: Pedido[]): Promise<boolean> {
  const response = await fetch(`${API_BASE}/api/deleted-pedidos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deletedPedidos }),
  });
  return response.ok;
}

export async function apiSaveBackups(backups: Pedido[]): Promise<boolean> {
  const response = await fetch(`${API_BASE}/api/backups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ backups }),
  });
  return response.ok;
}

export async function apiSaveVendedor(vendedor: { nombre: string; codigo: string }): Promise<boolean> {
  const response = await fetch(`${API_BASE}/api/vendedor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(vendedor),
  });
  return response.ok;
}

export async function apiSavePrendas(prendas: Prenda[]): Promise<boolean> {
  const response = await fetch(`${API_BASE}/api/prendas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prendas }),
  });
  return response.ok;
}

export async function apiSaveUsuarios(usuarios: UsuarioApp[]): Promise<boolean> {
  const response = await fetch(`${API_BASE}/api/usuarios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuarios }),
  });
  return response.ok;
}

export async function apiSaveCampanas(campanas: Campana[]): Promise<boolean> {
  const response = await fetch(`${API_BASE}/api/campanas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ campanas }),
  });
  return response.ok;
}

export async function apiSaveCampanasReferencias(campanasReferencias: Record<string, string[]>): Promise<boolean> {
  const response = await fetch(`${API_BASE}/api/campanas-referencias`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ campanasReferencias }),
  });
  return response.ok;
}
