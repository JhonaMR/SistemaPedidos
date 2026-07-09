var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/object-assign/index.js
var require_object_assign = __commonJS({
  "node_modules/object-assign/index.js"(exports, module) {
    "use strict";
    var getOwnPropertySymbols = Object.getOwnPropertySymbols;
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    var propIsEnumerable = Object.prototype.propertyIsEnumerable;
    function toObject(val) {
      if (val === null || val === void 0) {
        throw new TypeError("Object.assign cannot be called with null or undefined");
      }
      return Object(val);
    }
    function shouldUseNative() {
      try {
        if (!Object.assign) {
          return false;
        }
        var test1 = new String("abc");
        test1[5] = "de";
        if (Object.getOwnPropertyNames(test1)[0] === "5") {
          return false;
        }
        var test2 = {};
        for (var i = 0; i < 10; i++) {
          test2["_" + String.fromCharCode(i)] = i;
        }
        var order2 = Object.getOwnPropertyNames(test2).map(function(n) {
          return test2[n];
        });
        if (order2.join("") !== "0123456789") {
          return false;
        }
        var test3 = {};
        "abcdefghijklmnopqrst".split("").forEach(function(letter) {
          test3[letter] = letter;
        });
        if (Object.keys(Object.assign({}, test3)).join("") !== "abcdefghijklmnopqrst") {
          return false;
        }
        return true;
      } catch (err) {
        return false;
      }
    }
    module.exports = shouldUseNative() ? Object.assign : function(target, source) {
      var from;
      var to = toObject(target);
      var symbols;
      for (var s = 1; s < arguments.length; s++) {
        from = Object(arguments[s]);
        for (var key in from) {
          if (hasOwnProperty.call(from, key)) {
            to[key] = from[key];
          }
        }
        if (getOwnPropertySymbols) {
          symbols = getOwnPropertySymbols(from);
          for (var i = 0; i < symbols.length; i++) {
            if (propIsEnumerable.call(from, symbols[i])) {
              to[symbols[i]] = from[symbols[i]];
            }
          }
        }
      }
      return to;
    };
  }
});

// node_modules/vary/index.js
var require_vary = __commonJS({
  "node_modules/vary/index.js"(exports, module) {
    "use strict";
    module.exports = vary;
    module.exports.append = append;
    var FIELD_NAME_REGEXP = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
    function append(header, field) {
      if (typeof header !== "string") {
        throw new TypeError("header argument is required");
      }
      if (!field) {
        throw new TypeError("field argument is required");
      }
      var fields = !Array.isArray(field) ? parse(String(field)) : field;
      for (var j = 0; j < fields.length; j++) {
        if (!FIELD_NAME_REGEXP.test(fields[j])) {
          throw new TypeError("field argument contains an invalid header name");
        }
      }
      if (header === "*") {
        return header;
      }
      var val = header;
      var vals = parse(header.toLowerCase());
      if (fields.indexOf("*") !== -1 || vals.indexOf("*") !== -1) {
        return "*";
      }
      for (var i = 0; i < fields.length; i++) {
        var fld = fields[i].toLowerCase();
        if (vals.indexOf(fld) === -1) {
          vals.push(fld);
          val = val ? val + ", " + fields[i] : fields[i];
        }
      }
      return val;
    }
    function parse(header) {
      var end = 0;
      var list = [];
      var start = 0;
      for (var i = 0, len = header.length; i < len; i++) {
        switch (header.charCodeAt(i)) {
          case 32:
            if (start === end) {
              start = end = i + 1;
            }
            break;
          case 44:
            list.push(header.substring(start, end));
            start = end = i + 1;
            break;
          default:
            end = i + 1;
            break;
        }
      }
      list.push(header.substring(start, end));
      return list;
    }
    function vary(res, field) {
      if (!res || !res.getHeader || !res.setHeader) {
        throw new TypeError("res argument is required");
      }
      var val = res.getHeader("Vary") || "";
      var header = Array.isArray(val) ? val.join(", ") : String(val);
      if (val = append(header, field)) {
        res.setHeader("Vary", val);
      }
    }
  }
});

// node_modules/cors/lib/index.js
var require_lib = __commonJS({
  "node_modules/cors/lib/index.js"(exports, module) {
    (function() {
      "use strict";
      var assign = require_object_assign();
      var vary = require_vary();
      var defaults = {
        origin: "*",
        methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
        preflightContinue: false,
        optionsSuccessStatus: 204
      };
      function isString(s) {
        return typeof s === "string" || s instanceof String;
      }
      function isOriginAllowed(origin, allowedOrigin) {
        if (Array.isArray(allowedOrigin)) {
          for (var i = 0; i < allowedOrigin.length; ++i) {
            if (isOriginAllowed(origin, allowedOrigin[i])) {
              return true;
            }
          }
          return false;
        } else if (isString(allowedOrigin)) {
          return origin === allowedOrigin;
        } else if (allowedOrigin instanceof RegExp) {
          return allowedOrigin.test(origin);
        } else {
          return !!allowedOrigin;
        }
      }
      function configureOrigin(options, req) {
        var requestOrigin = req.headers.origin, headers = [], isAllowed;
        if (!options.origin || options.origin === "*") {
          headers.push([{
            key: "Access-Control-Allow-Origin",
            value: "*"
          }]);
        } else if (isString(options.origin)) {
          headers.push([{
            key: "Access-Control-Allow-Origin",
            value: options.origin
          }]);
          headers.push([{
            key: "Vary",
            value: "Origin"
          }]);
        } else {
          isAllowed = isOriginAllowed(requestOrigin, options.origin);
          headers.push([{
            key: "Access-Control-Allow-Origin",
            value: isAllowed ? requestOrigin : false
          }]);
          headers.push([{
            key: "Vary",
            value: "Origin"
          }]);
        }
        return headers;
      }
      function configureMethods(options) {
        var methods = options.methods;
        if (methods.join) {
          methods = options.methods.join(",");
        }
        return {
          key: "Access-Control-Allow-Methods",
          value: methods
        };
      }
      function configureCredentials(options) {
        if (options.credentials === true) {
          return {
            key: "Access-Control-Allow-Credentials",
            value: "true"
          };
        }
        return null;
      }
      function configureAllowedHeaders(options, req) {
        var allowedHeaders = options.allowedHeaders || options.headers;
        var headers = [];
        if (!allowedHeaders) {
          allowedHeaders = req.headers["access-control-request-headers"];
          headers.push([{
            key: "Vary",
            value: "Access-Control-Request-Headers"
          }]);
        } else if (allowedHeaders.join) {
          allowedHeaders = allowedHeaders.join(",");
        }
        if (allowedHeaders && allowedHeaders.length) {
          headers.push([{
            key: "Access-Control-Allow-Headers",
            value: allowedHeaders
          }]);
        }
        return headers;
      }
      function configureExposedHeaders(options) {
        var headers = options.exposedHeaders;
        if (!headers) {
          return null;
        } else if (headers.join) {
          headers = headers.join(",");
        }
        if (headers && headers.length) {
          return {
            key: "Access-Control-Expose-Headers",
            value: headers
          };
        }
        return null;
      }
      function configureMaxAge(options) {
        var maxAge = (typeof options.maxAge === "number" || options.maxAge) && options.maxAge.toString();
        if (maxAge && maxAge.length) {
          return {
            key: "Access-Control-Max-Age",
            value: maxAge
          };
        }
        return null;
      }
      function applyHeaders(headers, res) {
        for (var i = 0, n = headers.length; i < n; i++) {
          var header = headers[i];
          if (header) {
            if (Array.isArray(header)) {
              applyHeaders(header, res);
            } else if (header.key === "Vary" && header.value) {
              vary(res, header.value);
            } else if (header.value) {
              res.setHeader(header.key, header.value);
            }
          }
        }
      }
      function cors2(options, req, res, next) {
        var headers = [], method = req.method && req.method.toUpperCase && req.method.toUpperCase();
        if (method === "OPTIONS") {
          headers.push(configureOrigin(options, req));
          headers.push(configureCredentials(options));
          headers.push(configureMethods(options));
          headers.push(configureAllowedHeaders(options, req));
          headers.push(configureMaxAge(options));
          headers.push(configureExposedHeaders(options));
          applyHeaders(headers, res);
          if (options.preflightContinue) {
            next();
          } else {
            res.statusCode = options.optionsSuccessStatus;
            res.setHeader("Content-Length", "0");
            res.end();
          }
        } else {
          headers.push(configureOrigin(options, req));
          headers.push(configureCredentials(options));
          headers.push(configureExposedHeaders(options));
          applyHeaders(headers, res);
          next();
        }
      }
      function middlewareWrapper(o) {
        var optionsCallback = null;
        if (typeof o === "function") {
          optionsCallback = o;
        } else {
          optionsCallback = function(req, cb) {
            cb(null, o);
          };
        }
        return function corsMiddleware(req, res, next) {
          optionsCallback(req, function(err, options) {
            if (err) {
              next(err);
            } else {
              var corsOptions = assign({}, defaults, options);
              var originCallback = null;
              if (corsOptions.origin && typeof corsOptions.origin === "function") {
                originCallback = corsOptions.origin;
              } else if (corsOptions.origin) {
                originCallback = function(origin, cb) {
                  cb(null, corsOptions.origin);
                };
              }
              if (originCallback) {
                originCallback(req.headers.origin, function(err2, origin) {
                  if (err2 || !origin) {
                    next(err2);
                  } else {
                    corsOptions.origin = origin;
                    cors2(corsOptions, req, res, next);
                  }
                });
              } else {
                next();
              }
            }
          });
        };
      }
      module.exports = middlewareWrapper;
    })();
  }
});

// backend/server.ts
var import_cors = __toESM(require_lib(), 1);
import express from "express";
import { createServer as createViteServer } from "vite";
import path2 from "path";

// backend/routes/api.ts
import { Router } from "express";

// backend/services/dbService.ts
import fs from "fs/promises";

// backend/config.ts
import path from "path";
var PORT = process.env.PORT || 5050;
var NODE_ENV = process.env.NODE_ENV || "development";
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
var FOTOS_REFERENCIAS_DIR = path.join(process.cwd(), "public", "fotos_referencias");

// backend/services/dbService.ts
async function safeReadFile(filePath, defaultContent) {
  try {
    await fs.access(filePath);
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    return JSON.parse(defaultContent);
  }
}
async function safeWriteFile(filePath, data) {
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error(`Error writing to ${filePath}:`, err);
    throw err;
  }
}
async function getAllData() {
  const clientes = await safeReadFile(DB_PATHS.clientes, "[]");
  const pedidos = await safeReadFile(DB_PATHS.pedidos, "[]");
  const deletedPedidos = await safeReadFile(DB_PATHS.deletedPedidos, "[]");
  const backups = await safeReadFile(DB_PATHS.backups, "[]");
  const vendedor = await safeReadFile(DB_PATHS.vendedor, '{"nombre": "Lina Pulgarin", "codigo": "V-102"}');
  const prendas = await safeReadFile(DB_PATHS.prendas, "[]");
  const defaultUsuarios = '[{"id":"usr_sop","nombre":"Usuario Soporte","usuario":"SOP","clave":"9999","rol":"soporte","esPrimeraVez":false,"activo":true},{"id":"usr_gen","nombre":"Usuario General","usuario":"GEN","clave":"1234","rol":"general","esPrimeraVez":true,"activo":true}]';
  const usuarios = await safeReadFile(DB_PATHS.usuarios, defaultUsuarios);
  const defaultCampanas = '[{"nombre":"Inicio de a\xF1o","anio":2026,"numero":1},{"nombre":"Madres","anio":2026,"numero":2},{"nombre":"Vacaciones","anio":2026,"numero":3},{"nombre":"Temporada","anio":2026,"numero":4}]';
  const defaultCampanasRefs = '{"Inicio de a\xF1o 2026":["p1","p2","p3","p4","p5","p6","p7"],"Madres 2026":["p1","p2","p3","p4","p5","p6","p7"],"Vacaciones 2026":["p1","p2","p3","p4","p5","p6","p7"],"Temporada 2026":["p1","p2","p3","p4","p5","p6","p7"]}';
  let campanas = await safeReadFile(DB_PATHS.campanas, defaultCampanas);
  const campanasReferencias = await safeReadFile(DB_PATHS.campanasReferencias, defaultCampanasRefs);
  if (Array.isArray(campanas) && campanas.length > 0 && typeof campanas[0] === "string") {
    campanas = campanas.map((c) => {
      const match = c.match(/\d{4}/);
      const anio = match ? parseInt(match[0], 10) : 2026;
      const cleanName = c.replace(new RegExp(`\\s*${anio}\\s*`, "g"), "").trim();
      const norm = cleanName.toLowerCase();
      let numero = 1;
      if (norm.includes("inicio")) numero = 1;
      else if (norm.includes("madre")) numero = 2;
      else if (norm.includes("vacacio") || norm.includes("vacac")) numero = 3;
      else if (norm.includes("temporad")) numero = 4;
      else numero = 5;
      return { nombre: cleanName, anio, numero };
    });
    await safeWriteFile(DB_PATHS.campanas, campanas);
  }
  return { clientes, pedidos, deletedPedidos, backups, vendedor, prendas, usuarios, campanas, campanasReferencias };
}
async function saveClientes(clientes) {
  return safeWriteFile(DB_PATHS.clientes, clientes);
}
async function savePedidos(pedidos) {
  return safeWriteFile(DB_PATHS.pedidos, pedidos);
}
async function saveDeletedPedidos(deletedPedidos) {
  return safeWriteFile(DB_PATHS.deletedPedidos, deletedPedidos);
}
async function saveBackups(backups) {
  return safeWriteFile(DB_PATHS.backups, backups);
}
async function saveVendedor(vendedor) {
  return safeWriteFile(DB_PATHS.vendedor, vendedor);
}
async function savePrendas(prendas) {
  return safeWriteFile(DB_PATHS.prendas, prendas);
}
async function saveUsuarios(usuarios) {
  return safeWriteFile(DB_PATHS.usuarios, usuarios);
}
async function saveCampanas(campanas) {
  return safeWriteFile(DB_PATHS.campanas, campanas);
}
async function saveCampanasReferencias(campanasReferencias) {
  return safeWriteFile(DB_PATHS.campanasReferencias, campanasReferencias);
}

// backend/routes/api.ts
var router = Router();
router.get("/health", (req, res) => {
  res.json({ status: "ok", serverTime: (/* @__PURE__ */ new Date()).toISOString() });
});
router.get("/data", async (req, res) => {
  try {
    const data = await getAllData();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Error al leer los datos de los JSON locales", details: err.message });
  }
});
router.post("/clientes", async (req, res) => {
  try {
    const { clientes } = req.body;
    if (!Array.isArray(clientes)) {
      return res.status(400).json({ error: "Formato incorrecto. Se requiere un array de clientes." });
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
router.post("/pedidos", async (req, res) => {
  try {
    const { pedidos } = req.body;
    if (!Array.isArray(pedidos)) {
      return res.status(400).json({ error: "Formato incorrecto. Se requiere un array de pedidos." });
    }
    const data = await getAllData();
    const existingMap = new Map(data.pedidos.map((p) => [p.id, p]));
    pedidos.forEach((p) => {
      existingMap.set(p.id, p);
    });
    const deletedIds = new Set((data.deletedPedidos || []).map((p) => p.id));
    const merged = Array.from(existingMap.values()).filter((p) => !deletedIds.has(p.id));
    await savePedidos(merged);
    res.json({ success: true, count: merged.length });
  } catch (err) {
    res.status(500).json({ error: "Error al guardar pedidos", details: err.message });
  }
});
router.post("/deleted-pedidos", async (req, res) => {
  try {
    const { deletedPedidos } = req.body;
    if (!Array.isArray(deletedPedidos)) {
      return res.status(400).json({ error: "Formato incorrecto. Se requiere un array de pedidos eliminados." });
    }
    const data = await getAllData();
    const existingMap = new Map(data.deletedPedidos.map((p) => [p.id, p]));
    deletedPedidos.forEach((p) => {
      existingMap.set(p.id, p);
    });
    const merged = Array.from(existingMap.values());
    await saveDeletedPedidos(merged);
    const deletedIds = new Set(merged.map((p) => p.id));
    const activePedidos = data.pedidos.filter((p) => !deletedIds.has(p.id));
    await savePedidos(activePedidos);
    res.json({ success: true, count: merged.length });
  } catch (err) {
    res.status(500).json({ error: "Error al guardar pedidos eliminados", details: err.message });
  }
});
router.post("/backups", async (req, res) => {
  try {
    const { backups } = req.body;
    if (!Array.isArray(backups)) {
      return res.status(400).json({ error: "Formato incorrecto. Se requiere un array de backups." });
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
router.post("/vendedor", async (req, res) => {
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
router.post("/prendas", async (req, res) => {
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
router.post("/usuarios", async (req, res) => {
  try {
    const { usuarios } = req.body;
    if (!Array.isArray(usuarios)) {
      return res.status(400).json({ error: "Formato incorrecto. Se requiere un array de usuarios." });
    }
    const data = await getAllData();
    const existingMap = new Map(data.usuarios.map((u) => [u.id, u]));
    usuarios.forEach((u) => {
      existingMap.set(u.id, u);
    });
    const merged = Array.from(existingMap.values());
    await saveUsuarios(merged);
    res.json({ success: true, count: merged.length });
  } catch (err) {
    res.status(500).json({ error: "Error al guardar usuarios", details: err.message });
  }
});
router.post("/campanas", async (req, res) => {
  try {
    const { campanas } = req.body;
    if (!Array.isArray(campanas)) {
      return res.status(400).json({ error: "Formato incorrecto. Se requiere un array de campa\xF1as." });
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
router.post("/campanas-referencias", async (req, res) => {
  try {
    const { campanasReferencias } = req.body;
    if (!campanasReferencias || typeof campanasReferencias !== "object") {
      return res.status(400).json({ error: "Formato incorrecto. Se requiere un mapa de campa\xF1as y referencias." });
    }
    await saveCampanasReferencias(campanasReferencias);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Error al guardar referencias de campa\xF1a", details: err.message });
  }
});
router.post("/pedidos/sync-batch", async (req, res) => {
  try {
    const { pedidos, clientes } = req.body;
    if (!Array.isArray(pedidos) || !Array.isArray(clientes)) {
      return res.status(400).json({ error: "Formato incorrecto. Se requieren arrays de pedidos y clientes." });
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
    const getSiguienteCorrelativo = (prefijoVendedor, pedidosConsolidados) => {
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
    };
    pedidos.forEach((p) => {
      if (!pedidosMap.has(p.id)) {
        const pedidoParaGuardar = { ...p };
        if (pedidoParaGuardar.numeroPedido && pedidoParaGuardar.numeroPedido.startsWith("ASYNC-")) {
          const parts = pedidoParaGuardar.numeroPedido.split("-");
          const prefijoVendedor = parts[1] || "01";
          const siguienteCorr = getSiguienteCorrelativo(prefijoVendedor, Array.from(pedidosMap.values()));
          const paddedNum = String(siguienteCorr).padStart(3, "0");
          pedidoParaGuardar.numeroPedido = `${prefijoVendedor}-${paddedNum}`;
        }
        pedidosMap.set(p.id, pedidoParaGuardar);
        nuevosPedidosIds.push(p.id);
      }
    });
    const deletedIds = new Set((data.deletedPedidos || []).map((p) => p.id));
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
var api_default = router;

// backend/server.ts
var isProd = NODE_ENV === "production";
async function startServer() {
  const app = express();
  app.use((0, import_cors.default)());
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
/*! Bundled license information:

object-assign/index.js:
  (*
  object-assign
  (c) Sindre Sorhus
  @license MIT
  *)

vary/index.js:
  (*!
   * vary
   * Copyright(c) 2014-2017 Douglas Christopher Wilson
   * MIT Licensed
   *)
*/
