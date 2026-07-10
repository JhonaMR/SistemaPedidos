import { z } from 'zod';

export const ClienteSchema = z.object({
  id: z.string(),
  codigoCliente: z.string().min(1, 'El código del cliente es requerido'),
  nombre: z.string().min(1, 'El nombre es requerido'),
  documentoIdentidad: z.string().min(1, 'El documento de identidad es requerido'),
  telefono: z.string(),
  correo: z.string(),
  direccion: z.string(),
  ciudad: z.string(),
  notas: z.string().optional().nullable(),
  fechaRegistro: z.string(),
  limiteFacturacion: z.string().optional().nullable(),
});

export const ItemPedidoSchema = z.object({
  id: z.string(),
  prendaRef: z.string(),
  nombrePrenda: z.string(),
  categoria: z.string(),
  talla: z.string(),
  novedad: z.string().optional().nullable(),
  cantidad: z.number().int().positive('La cantidad debe ser mayor que 0'),
  precioUnitario: z.number().nonnegative(),
  total: z.number().nonnegative(),
  tallasDetalle: z.record(z.string(), z.number().int().nonnegative()).optional().nullable(),
});

export const PedidoSchema = z.object({
  id: z.string(),
  numeroPedido: z.string(),
  clienteId: z.string(),
  clienteNombre: z.string(),
  clienteTelefono: z.string(),
  vendedorNombre: z.string(),
  items: z.array(ItemPedidoSchema),
  subtotal: z.number().nonnegative(),
  porcentajeDescuento: z.number().nonnegative(),
  montoDescuento: z.number().nonnegative(),
  total: z.number().nonnegative(),
  estado: z.enum(['Pendiente', 'Procesado', 'Activo', 'Completo', 'Cancelado']),
  notas: z.string().optional().nullable(),
  fecha: z.string(),
  fechaEntregaEstimada: z.string(),
  fechaLimiteDespacho: z.string().optional().nullable(),
  campana: z.string().optional().nullable(),
  facturacionFE: z.number().nonnegative().optional().nullable(),
  facturacionRM: z.number().nonnegative().optional().nullable(),
  fechaCancelado: z.string().optional().nullable(),
  motivoCancelado: z.string().optional().nullable(),
  fechaEliminacion: z.string().optional().nullable(),
  editado: z.boolean().optional().nullable(),
  backupOf: z.string().optional().nullable(),
  backupFecha: z.string().optional().nullable(),
  esBackup: z.boolean().optional().nullable(),
});

export const UsuarioSchema = z.object({
  id: z.string(),
  nombre: z.string().min(1, 'El nombre es requerido'),
  usuario: z.string().length(3, 'El usuario debe tener exactamente 3 letras'),
  clave: z.string(),
  rol: z.enum(['general', 'soporte']),
  esPrimeraVez: z.boolean(),
  activo: z.boolean().optional().nullable(),
  idVendedor: z.string().optional().nullable(),
});

export const CampanaSchema = z.object({
  nombre: z.string().min(1, 'El nombre de la campaña es requerido'),
  anio: z.number().int().positive(),
  numero: z.number().int().positive(),
});
