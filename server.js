// backend/server.ts
import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import path2 from "path";

// backend/routes/api.ts
import { Router } from "express";
import jwt2 from "jsonwebtoken";
import bcrypt2 from "bcryptjs";
import { rateLimit } from "express-rate-limit";
import { z as z2 } from "zod";

// backend/config.ts
import path from "path";
import dotenv from "dotenv";
dotenv.config();
var PORT = process.env.PORT || 5050;
var NODE_ENV = process.env.NODE_ENV || "development";
var PG_CONFIG = {
  host: process.env.PGHOST || "localhost",
  port: parseInt(process.env.PGPORT || "5435", 10),
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "postgres",
  database: process.env.PGDATABASE || "arare_plow"
};
var DB_DIR = path.join(process.cwd(), "db_json");
var DB_PATHS = {
  clientes: path.join(DB_DIR, "clientes.json"),
  pedidos: path.join(DB_DIR, "pedidos.json"),
  deletedPedidos: path.join(DB_DIR, "deleted_pedidos.json"),
  backups: path.join(DB_DIR, "backups.json"),
  vendedor: path.join(DB_DIR, "vendedor.json"),
  prendas: path.join(DB_DIR, "prendas.json"),
  usuarios: path.join(DB_DIR, "usuarios.json"),
  campanas: path.join(DB_DIR, "campanas.json"),
  campanasReferencias: path.join(DB_DIR, "campanas_referencias.json")
};
var FOTOS_REFERENCIAS_DIR = process.env.FOTOS_REFERENCIAS_DIR || path.join(process.cwd(), "public", "fotos_referencias");
var JWT_SECRET = process.env.JWT_SECRET || "arare_secreto_super_seguro_2026";

// backend/middleware/authMiddleware.ts
import jwt from "jsonwebtoken";
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Acceso no autorizado. Se requiere token de sesi\xF3n." });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inv\xE1lido o expirado." });
  }
}

// backend/schemas/validationSchemas.ts
import { z } from "zod";
var ClienteSchema = z.object({
  id: z.string(),
  codigoCliente: z.string().min(1, "El c\xF3digo del cliente es requerido"),
  nombre: z.string().min(1, "El nombre es requerido"),
  documentoIdentidad: z.string().min(1, "El documento de identidad es requerido"),
  telefono: z.string(),
  correo: z.string(),
  direccion: z.string(),
  ciudad: z.string(),
  notas: z.string().optional().nullable(),
  fechaRegistro: z.string(),
  limiteFacturacion: z.string().optional().nullable()
});
var ItemPedidoSchema = z.object({
  id: z.string(),
  prendaRef: z.string(),
  nombrePrenda: z.string(),
  categoria: z.string(),
  talla: z.string(),
  novedad: z.string().optional().nullable(),
  cantidad: z.number().int().positive("La cantidad debe ser mayor que 0"),
  precioUnitario: z.number().nonnegative(),
  total: z.number().nonnegative(),
  tallasDetalle: z.record(z.string(), z.number().int().nonnegative()).optional().nullable()
});
var PedidoSchema = z.object({
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
  estado: z.enum(["Pendiente", "Procesado", "Activo", "Completo", "Cancelado"]),
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
  esBackup: z.boolean().optional().nullable()
});
var UsuarioSchema = z.object({
  id: z.string(),
  nombre: z.string().min(1, "El nombre es requerido"),
  usuario: z.string().length(3, "El usuario debe tener exactamente 3 letras"),
  clave: z.string().optional().nullable(),
  rol: z.enum(["general", "soporte"]),
  esPrimeraVez: z.boolean(),
  activo: z.boolean().optional().nullable(),
  idVendedor: z.string().optional().nullable()
});
var CampanaSchema = z.object({
  nombre: z.string().min(1, "El nombre de la campa\xF1a es requerido"),
  anio: z.number().int().positive(),
  numero: z.number().int().positive()
});

// backend/services/dbService.ts
import bcrypt from "bcryptjs";

// backend/services/dbConnection.ts
import pg from "pg";
var pool = new pg.Pool(PG_CONFIG);
async function ensureDatabaseExists() {
  const { database, ...dbConfigWithoutDb } = PG_CONFIG;
  const client = new pg.Client({
    ...dbConfigWithoutDb,
    database: "postgres"
  });
  try {
    await client.connect();
    const res = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [database]);
    if (res.rowCount === 0) {
      console.log(`[Database Connection] Database "${database}" does not exist. Creating it...`);
      await client.query(`CREATE DATABASE "${database}"`);
      console.log(`[Database Connection] Database "${database}" created successfully.`);
    }
  } catch (err) {
    console.error(`[Database Connection] Error ensuring database "${database}" exists:`, err);
  } finally {
    try {
      await client.end();
    } catch (e) {
    }
  }
}
async function initDatabaseSchema() {
  await ensureDatabaseExists();
  const client = await pool.connect();
  try {
    console.log(`[Database Connection] Initializing tables for database: ${PG_CONFIG.database}`);
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
    await client.query(`
      CREATE TABLE IF NOT EXISTS campanas (
        nombre VARCHAR(100) NOT NULL,
        anio INTEGER NOT NULL,
        numero INTEGER NOT NULL,
        PRIMARY KEY (nombre, anio)
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS campanas_referencias (
        campana_key VARCHAR(150) PRIMARY KEY,
        referencias JSONB NOT NULL
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS vendedor (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        codigo VARCHAR(50) NOT NULL
      )
    `);
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
    console.log("[Database Connection] All database tables checked/created successfully.");
  } catch (err) {
    console.error("[Database Connection] Error initializing database schemas:", err);
    throw err;
  } finally {
    client.release();
  }
}

// backend/services/dbService.ts
async function queryPedidos(whereClause, params = []) {
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
  const ids = res.rows.map((p) => p.id);
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
  const itemsByPedido = /* @__PURE__ */ new Map();
  itemsRes.rows.forEach((item) => {
    const list = itemsByPedido.get(item.pedidoId) || [];
    const { pedidoId, ...cleanItem } = item;
    list.push(cleanItem);
    itemsByPedido.set(item.pedidoId, list);
  });
  return res.rows.map((p) => ({
    ...p,
    items: itemsByPedido.get(p.id) || []
  }));
}
async function saveOrdersSlice(orders, isDeleted, isBackup) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (orders.length > 0) {
      for (const o of orders) {
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
          o.id,
          o.numeroPedido,
          o.clienteId,
          o.clienteNombre,
          o.clienteTelefono || "",
          o.vendedorNombre,
          o.subtotal,
          o.porcentajeDescuento,
          o.montoDescuento,
          o.total,
          o.estado,
          o.notas || null,
          o.fecha,
          o.fechaEntregaEstimada,
          o.fechaLimiteDespacho || null,
          o.campana || null,
          o.facturacionFE || null,
          o.facturacionRM || null,
          o.fechaCancelado || null,
          o.motivoCancelado || null,
          o.fechaEliminacion || null,
          o.editado || false,
          o.backupOf || null,
          o.backupFecha || null,
          isBackup,
          isDeleted
        ]);
        await client.query("DELETE FROM pedido_items WHERE pedido_id = $1", [o.id]);
        if (Array.isArray(o.items) && o.items.length > 0) {
          for (const item of o.items) {
            await client.query(`
              INSERT INTO pedido_items (
                id, pedido_id, prenda_ref, nombre_prenda, categoria, talla, novedad, cantidad, precio_unitario, total, tallas_detalle
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            `, [
              item.id,
              o.id,
              item.prendaRef,
              item.nombrePrenda,
              item.categoria,
              item.talla,
              item.novedad || null,
              item.cantidad,
              item.precioUnitario,
              item.total,
              item.tallasDetalle ? JSON.stringify(item.tallasDetalle) : null
            ]);
          }
        }
      }
      const ids = orders.map((o) => o.id);
      await client.query(`
        DELETE FROM pedidos 
        WHERE es_deleted = $1 AND es_backup = $2 AND NOT (id = ANY($3))
      `, [isDeleted, isBackup, ids]);
    } else {
      await client.query("DELETE FROM pedidos WHERE es_deleted = $1 AND es_backup = $2", [isDeleted, isBackup]);
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
async function getAllData() {
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
  const prendas = prendasRes.rows.map((p) => ({
    ...p,
    categoria: p.categoria,
    tallasDisponibles: p.tallasDisponibles
  }));
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
  let hasPlaintextPINs = false;
  usuarios = await Promise.all(
    usuarios.map(async (u) => {
      if (u.clave && /^\d{4}$/.test(u.clave)) {
        const hash = await bcrypt.hash(u.clave, 10);
        hasPlaintextPINs = true;
        await pool.query("UPDATE usuarios SET clave = $1 WHERE id = $2", [hash, u.id]);
        return { ...u, clave: hash };
      }
      return u;
    })
  );
  if (usuarios.length === 0) {
    const defaultUsuarios = [
      { id: "usr_sop", nombre: "Usuario Soporte", usuario: "SOP", clave: "9999", rol: "soporte", esPrimeraVez: false, activo: true },
      { id: "usr_gen", nombre: "Usuario General", usuario: "GEN", clave: "1234", rol: "general", esPrimeraVez: true, activo: true }
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
  const campRes = await pool.query("SELECT nombre, anio::int, numero::int FROM campanas ORDER BY anio DESC, numero ASC");
  let campanas = campRes.rows;
  if (campanas.length === 0) {
    const defaultCampanas = [
      { nombre: "Inicio de a\xF1o", anio: 2026, numero: 1 },
      { nombre: "Madres", anio: 2026, numero: 2 },
      { nombre: "Vacaciones", anio: 2026, numero: 3 },
      { nombre: "Temporada", anio: 2026, numero: 4 }
    ];
    for (const c of defaultCampanas) {
      await pool.query("INSERT INTO campanas (nombre, anio, numero) VALUES ($1, $2, $3)", [c.nombre, c.anio, c.numero]);
    }
    const freshCamps = await pool.query("SELECT nombre, anio::int, numero::int FROM campanas ORDER BY anio DESC, numero ASC");
    campanas = freshCamps.rows;
  }
  const refsRes = await pool.query("SELECT * FROM campanas_referencias");
  const campanasReferencias = {};
  refsRes.rows.forEach((row) => {
    campanasReferencias[row.campana_key] = row.referencias;
  });
  const vendedorRes = await pool.query("SELECT nombre, codigo FROM vendedor ORDER BY id DESC LIMIT 1");
  const vendedor = vendedorRes.rows[0] || { nombre: "Lina Pulgarin", codigo: "V-102" };
  const pedidos = await queryPedidos("NOT es_deleted AND NOT es_backup");
  const deletedPedidos = await queryPedidos("es_deleted AND NOT es_backup");
  const backups = await queryPedidos("es_backup");
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
async function saveClientes(clientes) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
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
          c.id,
          c.codigoCliente,
          c.nombre,
          c.documentoIdentidad,
          c.telefono || "",
          c.correo || "",
          c.direccion || "",
          c.ciudad || "",
          c.notas || null,
          c.fechaRegistro,
          c.limiteFacturacion || null
        ]);
      }
      const ids = clientes.map((c) => c.id);
      await client.query("DELETE FROM clientes WHERE NOT (id = ANY($1))", [ids]);
    } else {
      await client.query("DELETE FROM clientes");
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
async function savePedidos(pedidos) {
  return saveOrdersSlice(pedidos, false, false);
}
async function saveDeletedPedidos(deletedPedidos) {
  return saveOrdersSlice(deletedPedidos, true, false);
}
async function saveBackups(backups) {
  return saveOrdersSlice(backups, false, true);
}
async function saveVendedor(vendedor) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM vendedor");
    await client.query("INSERT INTO vendedor (nombre, codigo) VALUES ($1, $2)", [vendedor.nombre, vendedor.codigo]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
async function savePrendas(prendas) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
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
          p.ref,
          p.nombre,
          JSON.stringify(p.categoria),
          p.precioBase,
          JSON.stringify(p.tallasDisponibles),
          p.imagenUrl || null,
          p.stock,
          p.descripcion || null
        ]);
      }
      const refs = prendas.map((p) => p.ref);
      await client.query("DELETE FROM prendas WHERE NOT (ref = ANY($1))", [refs]);
    } else {
      await client.query("DELETE FROM prendas");
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
async function saveUsuarios(usuarios) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
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
          u.id,
          u.nombre,
          u.usuario,
          u.clave,
          u.rol,
          u.esPrimeraVez,
          u.activo !== false,
          u.idVendedor || null
        ]);
      }
      const ids = usuarios.map((u) => u.id);
      await client.query("DELETE FROM usuarios WHERE NOT (id = ANY($1))", [ids]);
    } else {
      await client.query("DELETE FROM usuarios");
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
async function saveCampanas(campanas) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM campanas");
    if (campanas.length > 0) {
      for (const c of campanas) {
        await client.query(`
          INSERT INTO campanas (nombre, anio, numero) VALUES ($1, $2, $3)
        `, [c.nombre, c.anio, c.numero]);
      }
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
async function saveCampanasReferencias(campanasReferencias) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM campanas_referencias");
    for (const [key, refs] of Object.entries(campanasReferencias)) {
      await client.query(`
        INSERT INTO campanas_referencias (campana_key, referencias) VALUES ($1, $2)
      `, [key, JSON.stringify(refs)]);
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// backend/routes/api.ts
var router = Router();
var loginLimiter = rateLimit({
  windowMs: 60 * 1e3,
  // 1 minute
  max: 5,
  // Limit each IP to 5 requests per minute
  message: { error: "Demasiados intentos de inicio de sesi\xF3n. Por favor, intente de nuevo en un minuto." },
  standardHeaders: true,
  legacyHeaders: false
});
router.get("/health", (req, res) => {
  res.json({ status: "ok", serverTime: (/* @__PURE__ */ new Date()).toISOString() });
});
router.post("/auth/login", loginLimiter, async (req, res) => {
  try {
    const { usuario, clave } = req.body;
    if (!usuario || !clave) {
      return res.status(400).json({ error: "Usuario y clave son requeridos." });
    }
    const cleanUser = String(usuario).trim().toUpperCase();
    const cleanPin = String(clave).trim();
    const data = await getAllData();
    const foundUser = data.usuarios.find((u) => u.usuario.toUpperCase() === cleanUser);
    if (!foundUser) {
      return res.status(401).json({ error: "Usuario o clave incorrectos." });
    }
    if (foundUser.activo === false) {
      return res.status(403).json({ error: "Este usuario se encuentra inhabilitado. Contacte a Soporte." });
    }
    const match = await bcrypt2.compare(cleanPin, foundUser.clave);
    if (!match) {
      return res.status(401).json({ error: "Usuario o clave incorrectos." });
    }
    const token = jwt2.sign(
      {
        id: foundUser.id,
        usuario: foundUser.usuario,
        nombre: foundUser.nombre,
        rol: foundUser.rol,
        idVendedor: foundUser.idVendedor
      },
      JWT_SECRET,
      { expiresIn: "30d" }
    );
    const { clave: _, ...userWithoutPassword } = foundUser;
    res.json({
      success: true,
      token,
      user: userWithoutPassword
    });
  } catch (err) {
    res.status(500).json({ error: "Error al iniciar sesi\xF3n", details: err.message });
  }
});
router.get("/data", authMiddleware, async (req, res) => {
  try {
    const data = await getAllData();
    const safeUsuarios = data.usuarios.map(({ clave, ...u }) => u);
    res.json({
      ...data,
      usuarios: safeUsuarios
    });
  } catch (err) {
    res.status(500).json({ error: "Error al leer los datos de los JSON locales", details: err.message });
  }
});
router.post("/clientes", authMiddleware, async (req, res) => {
  try {
    const { clientes } = req.body;
    const parsed = z2.array(ClienteSchema).safeParse(clientes);
    if (!parsed.success) {
      return res.status(400).json({ error: "Estructura de clientes inv\xE1lida", details: parsed.error.format() });
    }
    const data = await getAllData();
    const existingMap = new Map(data.clientes.map((c) => [c.id, c]));
    clientes.forEach((c) => {
      existingMap.set(c.id, c);
    });
    const merged = Array.from(existingMap.values());
    await saveClientes(merged);
    res.json({ success: true, count: merged.length });
  } catch (err) {
    res.status(500).json({ error: "Error al guardar clientes", details: err.message });
  }
});
function getSiguienteCorrelativo(prefijoVendedor, pedidosConsolidados, maxCorrelativosPorVendedor) {
  if (maxCorrelativosPorVendedor.has(prefijoVendedor)) {
    const next2 = maxCorrelativosPorVendedor.get(prefijoVendedor) + 1;
    maxCorrelativosPorVendedor.set(prefijoVendedor, next2);
    return next2;
  }
  const pedidosVendedor = pedidosConsolidados.filter(
    (p) => p.numeroPedido && p.numeroPedido.startsWith(`${prefijoVendedor}-`) && !p.numeroPedido.startsWith("ASYNC-")
  );
  let maxCorr = 0;
  if (pedidosVendedor.length > 0) {
    const correlativos = pedidosVendedor.map((p) => {
      const parts = p.numeroPedido.split("-");
      const corr = parseInt(parts[1], 10);
      return isNaN(corr) ? 0 : corr;
    });
    maxCorr = Math.max(...correlativos);
  }
  const next = maxCorr + 1;
  maxCorrelativosPorVendedor.set(prefijoVendedor, next);
  return next;
}
router.post("/pedidos", authMiddleware, async (req, res) => {
  try {
    const { pedidos } = req.body;
    const parsed = z2.array(PedidoSchema).safeParse(pedidos);
    if (!parsed.success) {
      return res.status(400).json({ error: "Estructura de pedidos inv\xE1lida", details: parsed.error.format() });
    }
    const data = await getAllData();
    const existingMap = new Map(data.pedidos.map((p) => [p.id, p]));
    const maxCorrelativosPorVendedor = /* @__PURE__ */ new Map();
    pedidos.forEach((p) => {
      const isNew = !existingMap.has(p.id);
      const pedidoParaGuardar = { ...p };
      if (isNew) {
        if (pedidoParaGuardar.numeroPedido && pedidoParaGuardar.numeroPedido.startsWith("ASYNC-")) {
          const parts = pedidoParaGuardar.numeroPedido.split("-");
          const prefijoVendedor = parts[1] || "01";
          const siguienteCorr = getSiguienteCorrelativo(prefijoVendedor, Array.from(existingMap.values()), maxCorrelativosPorVendedor);
          const paddedNum = String(siguienteCorr).padStart(3, "0");
          pedidoParaGuardar.numeroPedido = `${prefijoVendedor}-${paddedNum}`;
        }
        existingMap.set(p.id, pedidoParaGuardar);
      } else {
        const existingPedido = existingMap.get(p.id);
        if (pedidoParaGuardar.numeroPedido && pedidoParaGuardar.numeroPedido.startsWith("ASYNC-") && existingPedido && existingPedido.numeroPedido && !existingPedido.numeroPedido.startsWith("ASYNC-")) {
          pedidoParaGuardar.numeroPedido = existingPedido.numeroPedido;
        }
        existingMap.set(p.id, { ...existingPedido, ...pedidoParaGuardar });
      }
    });
    const activeIdsSent = new Set(pedidos.map((p) => p.id));
    const serverDeletedPedidos = data.deletedPedidos || [];
    const finalDeleted = serverDeletedPedidos.filter((p) => !activeIdsSent.has(p.id));
    await saveDeletedPedidos(finalDeleted);
    const deletedIds = new Set(finalDeleted.map((p) => p.id));
    const merged = Array.from(existingMap.values()).filter((p) => !deletedIds.has(p.id));
    await savePedidos(merged);
    res.json({ success: true, count: merged.length });
  } catch (err) {
    res.status(500).json({ error: "Error al guardar pedidos", details: err.message });
  }
});
router.post("/deleted-pedidos", authMiddleware, async (req, res) => {
  try {
    const { deletedPedidos } = req.body;
    const user = req.user;
    const parsed = z2.array(PedidoSchema).safeParse(deletedPedidos);
    if (!parsed.success) {
      return res.status(400).json({ error: "Estructura de pedidos eliminados inv\xE1lida", details: parsed.error.format() });
    }
    const data = await getAllData();
    let serverDeletedPedidos = data.deletedPedidos || [];
    if (user) {
      if (user.rol === "soporte") {
        serverDeletedPedidos = deletedPedidos;
      } else {
        const otherSellersDeleted = serverDeletedPedidos.filter((p) => p.vendedorNombre !== user.nombre);
        serverDeletedPedidos = [...otherSellersDeleted, ...deletedPedidos];
      }
    } else {
      const existingMap = new Map(serverDeletedPedidos.map((p) => [p.id, p]));
      deletedPedidos.forEach((p) => {
        existingMap.set(p.id, p);
      });
      serverDeletedPedidos = Array.from(existingMap.values());
    }
    await saveDeletedPedidos(serverDeletedPedidos);
    const deletedIds = new Set(serverDeletedPedidos.map((p) => p.id));
    const activePedidos = data.pedidos.filter((p) => !deletedIds.has(p.id));
    await savePedidos(activePedidos);
    res.json({ success: true, count: serverDeletedPedidos.length });
  } catch (err) {
    res.status(500).json({ error: "Error al guardar pedidos eliminados", details: err.message });
  }
});
router.post("/backups", authMiddleware, async (req, res) => {
  try {
    const { backups } = req.body;
    const parsed = z2.array(PedidoSchema).safeParse(backups);
    if (!parsed.success) {
      return res.status(400).json({ error: "Estructura de backups inv\xE1lida", details: parsed.error.format() });
    }
    const data = await getAllData();
    const existingMap = new Map(data.backups.map((p) => [p.id, p]));
    backups.forEach((p) => {
      existingMap.set(p.id, p);
    });
    const merged = Array.from(existingMap.values());
    await saveBackups(merged);
    res.json({ success: true, count: merged.length });
  } catch (err) {
    res.status(500).json({ error: "Error al guardar backups de pedidos", details: err.message });
  }
});
router.post("/vendedor", authMiddleware, async (req, res) => {
  try {
    const vendedor = req.body;
    if (!vendedor || typeof vendedor.nombre !== "string") {
      return res.status(400).json({ error: "Datos del vendedor inv\xE1lidos." });
    }
    await saveVendedor(vendedor);
    res.json({ success: true, vendedor });
  } catch (err) {
    res.status(500).json({ error: "Error al guardar configuraci\xF3n del vendedor", details: err.message });
  }
});
router.post("/prendas", authMiddleware, async (req, res) => {
  try {
    const { prendas } = req.body;
    if (!Array.isArray(prendas)) {
      return res.status(400).json({ error: "Formato incorrecto. Se requiere un array de prendas." });
    }
    await savePrendas(prendas);
    res.json({ success: true, count: prendas.length });
  } catch (err) {
    res.status(500).json({ error: "Error al guardar prendas del cat\xE1logo", details: err.message });
  }
});
router.post("/usuarios", authMiddleware, async (req, res) => {
  try {
    const { usuarios } = req.body;
    const parsed = z2.array(UsuarioSchema).safeParse(usuarios);
    if (!parsed.success) {
      return res.status(400).json({ error: "Estructura de usuarios inv\xE1lida", details: parsed.error.format() });
    }
    const currentUser = req.user;
    const data = await getAllData();
    const existingMap = new Map(data.usuarios.map((u) => [u.id, u]));
    const isSupport = currentUser.rol === "soporte";
    for (const u of usuarios) {
      const existing = existingMap.get(u.id);
      if (!existing) {
        if (!isSupport) {
          return res.status(403).json({ error: "Acceso denegado. Solo soporte puede crear usuarios." });
        }
      } else {
        if (!isSupport) {
          if (u.id !== currentUser.id) {
            if (u.nombre !== existing.nombre || u.usuario !== existing.usuario || u.rol !== existing.rol || u.esPrimeraVez !== existing.esPrimeraVez || (u.activo ?? null) !== (existing.activo ?? null) || (u.idVendedor ?? null) !== (existing.idVendedor ?? null)) {
              return res.status(403).json({ error: "Acceso denegado. No puedes modificar la cuenta de otros usuarios." });
            }
          } else {
            if (u.rol !== existing.rol || u.activo !== existing.activo || u.usuario !== existing.usuario) {
              return res.status(403).json({ error: "Acceso denegado. No puedes modificar tu propio rol o estado activo." });
            }
          }
        }
      }
    }
    const hashedUsuarios = await Promise.all(
      usuarios.map(async (u) => {
        const existing = existingMap.get(u.id);
        let clave = u.clave;
        if (clave && /^\d{4}$/.test(clave)) {
          clave = await bcrypt2.hash(clave, 10);
        } else if (!clave && existing) {
          clave = existing.clave;
        }
        return { ...u, clave };
      })
    );
    hashedUsuarios.forEach((u) => {
      existingMap.set(u.id, u);
    });
    const merged = Array.from(existingMap.values());
    await saveUsuarios(merged);
    res.json({ success: true, count: merged.length });
  } catch (err) {
    res.status(500).json({ error: "Error al guardar usuarios", details: err.message });
  }
});
router.post("/campanas", authMiddleware, async (req, res) => {
  try {
    const { campanas } = req.body;
    const parsed = z2.array(CampanaSchema).safeParse(campanas);
    if (!parsed.success) {
      return res.status(400).json({ error: "Estructura de campa\xF1as inv\xE1lida", details: parsed.error.format() });
    }
    const data = await getAllData();
    const existingMap = new Map(data.campanas.map((c) => [`${c.nombre} ${c.anio}`, c]));
    campanas.forEach((c) => {
      existingMap.set(`${c.nombre} ${c.anio}`, c);
    });
    const merged = Array.from(existingMap.values());
    await saveCampanas(merged);
    res.json({ success: true, count: merged.length });
  } catch (err) {
    res.status(500).json({ error: "Error al guardar campa\xF1as", details: err.message });
  }
});
router.post("/campanas-referencias", authMiddleware, async (req, res) => {
  try {
    const { campanasReferencias } = req.body;
    const parsed = z2.record(z2.string(), z2.array(z2.string())).safeParse(campanasReferencias);
    if (!parsed.success) {
      return res.status(400).json({ error: "Estructura de mapeo de campa\xF1as inv\xE1lida", details: parsed.error.format() });
    }
    await saveCampanasReferencias(campanasReferencias);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Error al guardar referencias de campa\xF1a", details: err.message });
  }
});
router.post("/pedidos/sync-batch", authMiddleware, async (req, res) => {
  try {
    const { pedidos, clientes, deletedPedidos } = req.body;
    const user = req.user;
    const parsedPedidos = z2.array(PedidoSchema).safeParse(pedidos);
    const parsedClientes = z2.array(ClienteSchema).safeParse(clientes);
    const parsedDeleted = deletedPedidos ? z2.array(PedidoSchema).safeParse(deletedPedidos) : { success: true };
    if (!parsedPedidos.success || !parsedClientes.success || !parsedDeleted.success) {
      const details = {
        pedidos: parsedPedidos.success ? null : parsedPedidos.error.format(),
        clientes: parsedClientes.success ? null : parsedClientes.error.format(),
        deletedPedidos: parsedDeleted.success ? null : parsedDeleted.error?.format()
      };
      return res.status(400).json({ error: "Estructura de datos de sincronizaci\xF3n inv\xE1lida", details });
    }
    const data = await getAllData();
    const clientesActuales = data.clientes || [];
    const clientesMap = new Map(clientesActuales.map((c) => [c.id, c]));
    const nuevosClientesIds = [];
    clientes.forEach((c) => {
      if (!clientesMap.has(c.id)) {
        clientesMap.set(c.id, {
          ...c,
          codigoCliente: c.codigoCliente || "000"
        });
        nuevosClientesIds.push(c.id);
      }
    });
    await saveClientes(Array.from(clientesMap.values()));
    const pedidosActuales = data.pedidos || [];
    const pedidosMap = new Map(pedidosActuales.map((p) => [p.id, p]));
    const nuevosPedidosIds = [];
    const maxCorrelativosPorVendedor = /* @__PURE__ */ new Map();
    pedidos.forEach((p) => {
      const isNew = !pedidosMap.has(p.id);
      const pedidoParaGuardar = { ...p };
      if (isNew) {
        if (pedidoParaGuardar.numeroPedido && pedidoParaGuardar.numeroPedido.startsWith("ASYNC-")) {
          const parts = pedidoParaGuardar.numeroPedido.split("-");
          const prefijoVendedor = parts[1] || "01";
          const siguienteCorr = getSiguienteCorrelativo(prefijoVendedor, Array.from(pedidosMap.values()), maxCorrelativosPorVendedor);
          const paddedNum = String(siguienteCorr).padStart(3, "0");
          pedidoParaGuardar.numeroPedido = `${prefijoVendedor}-${paddedNum}`;
        }
        pedidosMap.set(p.id, pedidoParaGuardar);
        nuevosPedidosIds.push(p.id);
      } else {
        const existingPedido = pedidosMap.get(p.id);
        if (pedidoParaGuardar.numeroPedido && pedidoParaGuardar.numeroPedido.startsWith("ASYNC-") && existingPedido && existingPedido.numeroPedido && !existingPedido.numeroPedido.startsWith("ASYNC-")) {
          pedidoParaGuardar.numeroPedido = existingPedido.numeroPedido;
        }
        pedidosMap.set(p.id, { ...existingPedido, ...pedidoParaGuardar });
        nuevosPedidosIds.push(p.id);
      }
    });
    let serverDeletedPedidos = data.deletedPedidos || [];
    if (Array.isArray(deletedPedidos) && user) {
      if (user.rol === "soporte") {
        serverDeletedPedidos = deletedPedidos;
      } else {
        const otherSellersDeleted = serverDeletedPedidos.filter((p) => p.vendedorNombre !== user.nombre);
        serverDeletedPedidos = [...otherSellersDeleted, ...deletedPedidos];
      }
    }
    const activeIdsSent = new Set(pedidos.map((p) => p.id));
    const finalDeleted = serverDeletedPedidos.filter((p) => !activeIdsSent.has(p.id));
    await saveDeletedPedidos(finalDeleted);
    const deletedIds = new Set(finalDeleted.map((p) => p.id));
    const mergedPedidos = Array.from(pedidosMap.values()).filter((p) => !deletedIds.has(p.id));
    await savePedidos(mergedPedidos);
    const freshData = await getAllData();
    res.json({
      success: true,
      syncedOrderIds: nuevosPedidosIds,
      syncedClientIds: nuevosClientesIds,
      ...freshData
    });
  } catch (err) {
    res.status(500).json({ error: "Error durante la sincronizaci\xF3n en lote", details: err.message });
  }
});
router.get("/pedidos/nuevos", authMiddleware, async (req, res) => {
  try {
    const { desde } = req.query;
    const data = await getAllData();
    const pedidos = data.pedidos || [];
    let desdeMs;
    if (desde) {
      const numerico = Number(desde);
      if (!isNaN(numerico)) {
        desdeMs = numerico;
      } else {
        const parsedDate = Date.parse(desde);
        if (isNaN(parsedDate)) {
          return res.status(400).json({ error: 'El par\xE1metro "desde" tiene un formato inv\xE1lido (debe ser un timestamp o fecha v\xE1lida).' });
        }
        desdeMs = parsedDate;
      }
    } else {
      desdeMs = Date.now() - 24 * 60 * 60 * 1e3;
    }
    const nuevosPedidos = pedidos.filter((p) => {
      if (p.esBackup) return false;
      let pedidoMs = null;
      if (typeof p.id === "string") {
        const parts = p.id.split("_");
        if (parts.length >= 2) {
          const ts = parseInt(parts[1], 10);
          if (!isNaN(ts)) {
            pedidoMs = ts;
          }
        }
      }
      if (!pedidoMs && p.fecha) {
        pedidoMs = new Date(p.fecha).getTime();
      }
      return pedidoMs && pedidoMs > desdeMs;
    });
    res.json({
      success: true,
      count: nuevosPedidos.length,
      pedidos: nuevosPedidos
    });
  } catch (err) {
    res.status(500).json({ error: "Error al consultar nuevos pedidos", details: err.message });
  }
});
var api_default = router;

// backend/server.ts
var isProd = NODE_ENV === "production";
async function startServer() {
  await initDatabaseSchema();
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));
  app.use("/fotos_referencias", express.static(FOTOS_REFERENCIAS_DIR));
  app.use("/api", api_default);
  if (!isProd) {
    const reactPlugin = (await import("@vitejs/plugin-react")).default;
    const tailwindPlugin = (await import("@tailwindcss/vite")).default;
    const vite = await createViteServer({
      configFile: false,
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== "true",
        watch: process.env.DISABLE_HMR === "true" ? null : {
          ignored: ["**/db_json/**", "**/fotos_referencias/**"]
        }
      },
      appType: "spa",
      plugins: [reactPlugin(), tailwindPlugin()],
      resolve: {
        alias: {
          "@": path2.resolve(process.cwd(), ".")
        }
      }
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path2.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path2.join(process.cwd(), "dist", "index.html"));
    });
  }
  app.listen(PORT, () => {
    console.log(`[Toma Pedido Backend] Server running in ${NODE_ENV} mode at http://localhost:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("[Toma Pedido Backend] Failed to start server:", err);
});
