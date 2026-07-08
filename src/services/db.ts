import Dexie, { type Table } from 'dexie';
import { Cliente, Prenda, Pedido, UsuarioApp } from '../types';

export interface PedidoOffline extends Pedido {
  idLocal?: number;
  sincronizado: 0 | 1;
  errorSync?: string;
}

class TomaPedidoDB extends Dexie {
  pedidos!: Table<PedidoOffline>;
  clientes!: Table<Cliente>;
  prendas!: Table<Prenda>;
  usuarios!: Table<UsuarioApp>;
  campanas!: Table<{ id: string; nombre: string; anio: number; numero: number }>;
  campanasReferencias!: Table<{ campana: string; referencias: string[] }>;

  constructor() {
    super('TomaPedidoDatabase');
    this.version(1).stores({
      pedidos: '++idLocal, id, numeroPedido, clienteId, sincronizado, fecha',
      clientes: 'id, documentoIdentidad, nombre, codigoCliente',
      prendas: 'ref, nombre',
      usuarios: 'id, usuario',
      campanas: 'id',
      campanasReferencias: 'campana'
    });
  }
}

export const db = new TomaPedidoDB();
