export interface Cliente {
  id: string;
  codigoCliente: string;
  nombre: string;
  documentoIdentidad: string; // DNI, RUT, RFC, etc.
  telefono: string;
  correo: string;
  direccion: string;
  ciudad: string;
  notas?: string;
  fechaRegistro: string;
  limiteFacturacion?: string; // "N/A" or numeric digits
}

export interface Prenda {
  ref: string;
  nombre: string;
  categoria: ('Dama' | 'Niña' | 'Niño' | 'Colegial' | 'Plus')[] | 'Dama' | 'Niña' | 'Niño' | 'Colegial' | 'Plus';
  precioBase: number;
  tallasDisponibles: string[];
  imagenUrl?: string;
  stock: number;
  descripcion?: string;
}

export interface ItemPedido {
  id: string; // Unique for the cart row
  prendaRef: string;
  nombrePrenda: string;
  categoria: string;
  talla: string;
  novedad?: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
  tallasDetalle?: Record<string, number>;
}

export interface Pedido {
  id: string;
  numeroPedido: string; // e.g. PED-0001
  clienteId: string;
  clienteNombre: string;
  clienteTelefono: string;
  vendedorNombre: string;
  items: ItemPedido[];
  subtotal: number;
  porcentajeDescuento: number; // e.g. 5 for 5%
  montoDescuento: number;
  total: number;
  estado: 'Pendiente' | 'Procesado' | 'Activo' | 'Completo' | 'Cancelado';
  notas?: string;
  fecha: string;
  fechaEntregaEstimada: string; // Will correspond to 'Fecha de inicio de despacho'
  fechaLimiteDespacho: string; // Will correspond to 'Fecha límite de despacho' (optional)
  campana?: string;
  facturacionFE?: number; // e.g. 100 for 100% FE
  facturacionRM?: number; // e.g. 0 for 0% RM
  fechaCancelado?: string; // Date when order was cancelled
  fechaEliminacion?: string; // Date when order was moved to trash
  editado?: boolean; // True if this order was modified
  backupOf?: string; // ID of the original order this is a backup of
  backupFecha?: string; // Date/Time when this backup was saved
  esBackup?: boolean; // Flag to identify backup records
}

export interface ResumenVendedor {
  totalVendido: number;
  totalPedidos: number;
  pedidosPendientes: number;
}

export interface UsuarioApp {
  id: string;
  nombre: string;
  usuario: string; // 3 letters
  clave: string; // 4 digits
  rol: 'general' | 'soporte';
  esPrimeraVez: boolean;
  activo?: boolean; // enable/disable state
  idVendedor?: string; // e.g. "01", "02" para consecutivos
}

