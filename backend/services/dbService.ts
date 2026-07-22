import bcrypt from 'bcryptjs';
import { pool } from './dbConnection';

// Helper to query orders and their items
async function queryPedidos(whereClause: string, params: any[] = []) {
  const query = `
    SELECT 
      id,
      numero_pedido as "numeroPedido",
      cliente_id as "clienteId",
      cliente_nombre as "clienteNombre",
      cliente_telefono as "clienteTelefono",
      vendedor_nombre as "vendedorNombre",
      subtotal::float,
      porcentaje_descuento::float as "porcentajeDescuento",
      monto_descuento::float as "montoDescuento",
      total::float,
      estado,
      notas,
      fecha,
      fecha_entrega_estimada as "fechaEntregaEstimada",
      fecha_limite_despacho as "fechaLimiteDespacho",
      campana,
      facturacion_fe::float as "facturacionFE",
      facturacion_rm::float as "facturacionRM",
      fecha_cancelado as "fechaCancelado",
      motivo_cancelado as "motivoCancelado",
      fecha_eliminacion as "fechaEliminacion",
      editado,
      backup_of as "backupOf",
      backup_fecha as "backupFecha",
      es_backup as "esBackup"
    FROM pedidos
    WHERE ${whereClause}
  `;
  const res = await pool.query(query, params);
  
  if (res.rows.length === 0) return [];
  
  const ids = res.rows.map(p => p.id);
  const itemsRes = await pool.query(`
    SELECT 
      id,
      pedido_id as "pedidoId",
      prenda_ref as "prendaRef",
      nombre_prenda as "nombrePrenda",
      categoria,
      talla,
      novedad,
      cantidad::int,
      precio_unitario::float as "precioUnitario",
      total::float,
      tallas_detalle as "tallasDetalle"
    FROM pedido_items
    WHERE pedido_id = ANY($1)
  `, [ids]);
  
  const itemsByPedido = new Map<string, any[]>();
  itemsRes.rows.forEach(item => {
    const list = itemsByPedido.get(item.pedidoId) || [];
    const { pedidoId, ...cleanItem } = item;
    list.push(cleanItem);
    itemsByPedido.set(item.pedidoId, list);
  });
  
  return res.rows.map(p => ({
    ...p,
    items: itemsByPedido.get(p.id) || []
  }));
}

// Helper to save a slice of orders (active, deleted, or backups)
async function saveOrdersSlice(orders: any[], isDeleted: boolean, isBackup: boolean) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    if (orders.length > 0) {
      for (const o of orders) {
        // Upsert order
        await client.query(`
          INSERT INTO pedidos (
            id, numero_pedido, cliente_id, cliente_nombre, cliente_telefono, vendedor_nombre,
            subtotal, porcentaje_descuento, monto_descuento, total, estado, notas, fecha,
            fecha_entrega_estimada, fecha_limite_despacho, campana, facturacion_fe, facturacion_rm,
            fecha_cancelado, motivo_cancelado, fecha_eliminacion, editado, backup_of, backup_fecha,
            es_backup, es_deleted
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
          ON CONFLICT (id) DO UPDATE SET
            numero_pedido = EXCLUDED.numero_pedido,
            cliente_id = EXCLUDED.cliente_id,
            cliente_nombre = EXCLUDED.cliente_nombre,
            cliente_telefono = EXCLUDED.cliente_telefono,
            vendedor_nombre = EXCLUDED.vendedor_nombre,
            subtotal = EXCLUDED.subtotal,
            porcentaje_descuento = EXCLUDED.porcentaje_descuento,
            monto_descuento = EXCLUDED.monto_descuento,
            total = EXCLUDED.total,
            estado = EXCLUDED.estado,
            notas = EXCLUDED.notas,
            fecha = EXCLUDED.fecha,
            fecha_entrega_estimada = EXCLUDED.fecha_entrega_estimada,
            fecha_limite_despacho = EXCLUDED.fecha_limite_despacho,
            campana = EXCLUDED.campana,
            facturacion_fe = EXCLUDED.facturacion_fe,
            facturacion_rm = EXCLUDED.facturacion_rm,
            fecha_cancelado = EXCLUDED.fecha_cancelado,
            motivo_cancelado = EXCLUDED.motivo_cancelado,
            fecha_eliminacion = EXCLUDED.fecha_eliminacion,
            editado = EXCLUDED.editado,
            backup_of = EXCLUDED.backup_of,
            backup_fecha = EXCLUDED.backup_fecha,
            es_backup = EXCLUDED.es_backup,
            es_deleted = EXCLUDED.es_deleted
        `, [
          o.id, o.numeroPedido, o.clienteId, o.clienteNombre, o.clienteTelefono || '', o.vendedorNombre,
          o.subtotal, o.porcentajeDescuento, o.montoDescuento, o.total, o.estado, o.notas || null, o.fecha,
          o.fechaEntregaEstimada, o.fechaLimiteDespacho || null, o.campana || null, o.facturacionFE || null, o.facturacionRM || null,
          o.fechaCancelado || null, o.motivoCancelado || null, o.fechaEliminacion || null, o.editado || false, o.backupOf || null, o.backupFecha || null,
          isBackup, isDeleted
        ]);
        
        // Delete and recreate items for this order to be consistent
        await client.query('DELETE FROM pedido_items WHERE pedido_id = $1', [o.id]);
        
        if (Array.isArray(o.items) && o.items.length > 0) {
          for (const item of o.items) {
            await client.query(`
              INSERT INTO pedido_items (
                id, pedido_id, prenda_ref, nombre_prenda, categoria, talla, novedad, cantidad, precio_unitario, total, tallas_detalle
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            `, [
              item.id, o.id, item.prendaRef, item.nombrePrenda, item.categoria, item.talla, item.novedad || null,
              item.cantidad, item.precioUnitario, item.total, item.tallasDetalle ? JSON.stringify(item.tallasDetalle) : null
            ]);
          }
        }
      }
      
      // Delete orders that are not in the new lists
      const ids = orders.map(o => o.id);
      await client.query(`
        DELETE FROM pedidos 
        WHERE es_deleted = $1 AND es_backup = $2 AND NOT (id = ANY($3))
      `, [isDeleted, isBackup, ids]);
    } else {
      await client.query('DELETE FROM pedidos WHERE es_deleted = $1 AND es_backup = $2', [isDeleted, isBackup]);
    }
    
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getAllData() {
  // Query clients
  const clientRes = await pool.query(`
    SELECT 
      id,
      codigo_cliente as "codigoCliente",
      nombre,
      documento_identidad as "documentoIdentidad",
      telefono,
      correo,
      direccion,
      ciudad,
      notas,
      fecha_registro as "fechaRegistro",
      limite_facturacion as "limiteFacturacion"
    FROM clientes
  `);
  const clientes = clientRes.rows;

  // Query garments (catalog)
  const prendasRes = await pool.query(`
    SELECT 
      ref,
      nombre,
      categoria,
      precio_base::float as "precioBase",
      tallas_disponibles as "tallasDisponibles",
      imagen_url as "imagenUrl",
      stock::int,
      descripcion
    FROM prendas
  `);
  const prendas = prendasRes.rows.map(p => ({
    ...p,
    categoria: p.categoria,
    tallasDisponibles: p.tallasDisponibles
  }));

  // Query users
  const userRes = await pool.query(`
    SELECT 
      id,
      nombre,
      usuario,
      clave,
      rol,
      es_primera_vez as "esPrimeraVez",
      activo,
      id_vendedor as "idVendedor"
    FROM usuarios
  `);
  let usuarios = userRes.rows;

  // Auto-encrypt plaintext passwords if any are found (legacy support)
  let hasPlaintextPINs = false;
  usuarios = await Promise.all(
    usuarios.map(async (u: any) => {
      if (u.clave && /^\d{4}$/.test(u.clave)) {
        const hash = await bcrypt.hash(u.clave, 10);
        hasPlaintextPINs = true;
        await pool.query('UPDATE usuarios SET clave = $1 WHERE id = $2', [hash, u.id]);
        return { ...u, clave: hash };
      }
      return u;
    })
  );

  // Fallback for default users if none exist
  if (usuarios.length === 0) {
    const defaultUsuarios = [
      { id: 'usr_sop', nombre: 'Usuario Soporte', usuario: 'SOP', clave: '9999', rol: 'soporte', esPrimeraVez: false, activo: true },
      { id: 'usr_gen', nombre: 'Usuario General', usuario: 'GEN', clave: '1234', rol: 'general', esPrimeraVez: true, activo: true }
    ];
    for (const u of defaultUsuarios) {
      const hash = await bcrypt.hash(u.clave, 10);
      await pool.query(`
        INSERT INTO usuarios (id, nombre, usuario, clave, rol, es_primera_vez, activo, id_vendedor)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [u.id, u.nombre, u.usuario, hash, u.rol, u.esPrimeraVez, u.activo, null]);
    }
    const freshUsers = await pool.query('SELECT id, nombre, usuario, clave, rol, es_primera_vez as "esPrimeraVez", activo, id_vendedor as "idVendedor" FROM usuarios');
    usuarios = freshUsers.rows;
  }

  // Query campaigns
  const campRes = await pool.query('SELECT nombre, anio::int, numero::int FROM campanas ORDER BY anio DESC, numero ASC');
  let campanas = campRes.rows;
  
  if (campanas.length === 0) {
    const defaultCampanas = [
      { nombre: 'Inicio de año', anio: 2026, numero: 1 },
      { nombre: 'Madres', anio: 2026, numero: 2 },
      { nombre: 'Vacaciones', anio: 2026, numero: 3 },
      { nombre: 'Temporada', anio: 2026, numero: 4 }
    ];
    for (const c of defaultCampanas) {
      await pool.query('INSERT INTO campanas (nombre, anio, numero) VALUES ($1, $2, $3)', [c.nombre, c.anio, c.numero]);
    }
    const freshCamps = await pool.query('SELECT nombre, anio::int, numero::int FROM campanas ORDER BY anio DESC, numero ASC');
    campanas = freshCamps.rows;
  }

  // Query campaign references mapping
  const refsRes = await pool.query('SELECT * FROM campanas_referencias');
  const campanasReferencias: Record<string, string[]> = {};
  refsRes.rows.forEach(row => {
    campanasReferencias[row.campana_key] = row.referencias;
  });

  // Query active vendor configuration
  const vendedorRes = await pool.query('SELECT nombre, codigo FROM vendedor ORDER BY id DESC LIMIT 1');
  const vendedor = vendedorRes.rows[0] || { nombre: 'Lina Pulgarin', codigo: 'V-102' };

  // Query active, deleted, and backup orders
  const pedidos = await queryPedidos('NOT es_deleted AND NOT es_backup');
  const deletedPedidos = await queryPedidos('es_deleted AND NOT es_backup');
  const backups = await queryPedidos('es_backup');

  return {
    clientes,
    pedidos,
    deletedPedidos,
    backups,
    vendedor,
    prendas,
    usuarios,
    campanas,
    campanasReferencias
  };
}

export async function saveClientes(clientes: any[]) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (clientes.length > 0) {
      for (const c of clientes) {
        await client.query(`
          INSERT INTO clientes (
            id, codigo_cliente, nombre, documento_identidad, telefono, correo, direccion, ciudad, notas, fecha_registro, limite_facturacion
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (id) DO UPDATE SET
            codigo_cliente = EXCLUDED.codigo_cliente,
            nombre = EXCLUDED.nombre,
            documento_identidad = EXCLUDED.documento_identidad,
            telefono = EXCLUDED.telefono,
            correo = EXCLUDED.correo,
            direccion = EXCLUDED.direccion,
            ciudad = EXCLUDED.ciudad,
            notas = EXCLUDED.notas,
            fecha_registro = EXCLUDED.fecha_registro,
            limite_facturacion = EXCLUDED.limite_facturacion
        `, [
          c.id, c.codigoCliente, c.nombre, c.documentoIdentidad, c.telefono || '', c.correo || '', c.direccion || '', c.ciudad || '', c.notas || null, c.fechaRegistro, c.limiteFacturacion || null
        ]);
      }
      const ids = clientes.map(c => c.id);
      await client.query('DELETE FROM clientes WHERE NOT (id = ANY($1))', [ids]);
    } else {
      await client.query('DELETE FROM clientes');
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function savePedidos(pedidos: any[]) {
  return saveOrdersSlice(pedidos, false, false);
}

export async function saveDeletedPedidos(deletedPedidos: any[]) {
  return saveOrdersSlice(deletedPedidos, true, false);
}

export async function saveBackups(backups: any[]) {
  return saveOrdersSlice(backups, false, true);
}

export async function saveVendedor(vendedor: any) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM vendedor');
    await client.query('INSERT INTO vendedor (nombre, codigo) VALUES ($1, $2)', [vendedor.nombre, vendedor.codigo]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function savePrendas(prendas: any[]) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (prendas.length > 0) {
      for (const p of prendas) {
        await client.query(`
          INSERT INTO prendas (
            ref, nombre, categoria, precio_base, tallas_disponibles, imagen_url, stock, descripcion
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (ref) DO UPDATE SET
            nombre = EXCLUDED.nombre,
            categoria = EXCLUDED.categoria,
            precio_base = EXCLUDED.precio_base,
            tallas_disponibles = EXCLUDED.tallas_disponibles,
            imagen_url = EXCLUDED.imagen_url,
            stock = EXCLUDED.stock,
            descripcion = EXCLUDED.descripcion
        `, [
          p.ref, p.nombre, JSON.stringify(p.categoria), p.precioBase, JSON.stringify(p.tallasDisponibles), p.imagenUrl || null, p.stock, p.descripcion || null
        ]);
      }
      const refs = prendas.map(p => p.ref);
      await client.query('DELETE FROM prendas WHERE NOT (ref = ANY($1))', [refs]);
    } else {
      await client.query('DELETE FROM prendas');
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function saveUsuarios(usuarios: any[]) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (usuarios.length > 0) {
      for (const u of usuarios) {
        await client.query(`
          INSERT INTO usuarios (
            id, nombre, usuario, clave, rol, es_primera_vez, activo, id_vendedor
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO UPDATE SET
            nombre = EXCLUDED.nombre,
            usuario = EXCLUDED.usuario,
            clave = EXCLUDED.clave,
            rol = EXCLUDED.rol,
            es_primera_vez = EXCLUDED.es_primera_vez,
            activo = EXCLUDED.activo,
            id_vendedor = EXCLUDED.id_vendedor
        `, [
          u.id, u.nombre, u.usuario, u.clave, u.rol, u.esPrimeraVez, u.activo !== false, u.idVendedor || null
        ]);
      }
      const ids = usuarios.map(u => u.id);
      await client.query('DELETE FROM usuarios WHERE NOT (id = ANY($1))', [ids]);
    } else {
      await client.query('DELETE FROM usuarios');
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function saveCampanas(campanas: any[]) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM campanas');
    if (campanas.length > 0) {
      for (const c of campanas) {
        await client.query(`
          INSERT INTO campanas (nombre, anio, numero) VALUES ($1, $2, $3)
        `, [c.nombre, c.anio, c.numero]);
      }
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function saveCampanasReferencias(campanasReferencias: Record<string, string[]>) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM campanas_referencias');
    for (const [key, refs] of Object.entries(campanasReferencias)) {
      await client.query(`
        INSERT INTO campanas_referencias (campana_key, referencias) VALUES ($1, $2)
      `, [key, JSON.stringify(refs)]);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
