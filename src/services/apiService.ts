import { Cliente, Pedido, Prenda, UsuarioApp, Campana } from '../types';

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

export interface LoginResponse {
  success: boolean;
  token: string;
  user: UsuarioApp;
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('prenda_jwt_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

export async function apiLogin(usuario: string, clave: string): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario, clave }),
  });
  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.error || 'Error al iniciar sesión.');
  }
  return response.json();
}

export async function fetchServerData(): Promise<ServerData> {
  const response = await fetch(`${API_BASE}/api/data`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    throw new Error('Error al obtener datos del servidor local.');
  }
  return response.json();
}

export async function apiSaveClientes(clientes: Cliente[]): Promise<boolean> {
  const response = await fetch(`${API_BASE}/api/clientes`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ clientes }),
  });
  return response.ok;
}

export async function apiSavePedidos(pedidos: Pedido[]): Promise<boolean> {
  const response = await fetch(`${API_BASE}/api/pedidos`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ pedidos }),
  });
  return response.ok;
}

export async function apiSaveDeletedPedidos(
  deletedPedidos: Pedido[],
  user?: { rol: string; nombre: string }
): Promise<boolean> {
  const response = await fetch(`${API_BASE}/api/deleted-pedidos`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ deletedPedidos, user }),
  });
  return response.ok;
}

export async function apiSaveBackups(backups: Pedido[]): Promise<boolean> {
  const response = await fetch(`${API_BASE}/api/backups`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ backups }),
  });
  return response.ok;
}

export async function apiSaveVendedor(vendedor: { nombre: string; codigo: string }): Promise<boolean> {
  const response = await fetch(`${API_BASE}/api/vendedor`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(vendedor),
  });
  return response.ok;
}

export async function apiSavePrendas(prendas: Prenda[]): Promise<boolean> {
  const response = await fetch(`${API_BASE}/api/prendas`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ prendas }),
  });
  return response.ok;
}

export async function apiSaveUsuarios(usuarios: UsuarioApp[]): Promise<boolean> {
  const response = await fetch(`${API_BASE}/api/usuarios`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ usuarios }),
  });
  return response.ok;
}

export async function apiSaveCampanas(campanas: Campana[]): Promise<boolean> {
  const response = await fetch(`${API_BASE}/api/campanas`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ campanas }),
  });
  return response.ok;
}

export async function apiSaveCampanasReferencias(campanasReferencias: Record<string, string[]>): Promise<boolean> {
  const response = await fetch(`${API_BASE}/api/campanas-referencias`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ campanasReferencias }),
  });
  return response.ok;
}
