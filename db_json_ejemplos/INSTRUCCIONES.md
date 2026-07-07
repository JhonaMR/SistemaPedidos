# Instrucciones para la Configuración de Base de Datos Local en JSON

Esta carpeta contiene las plantillas y ejemplos de los archivos JSON de datos locales que utiliza el sistema. La base de datos real del sistema se encuentra en la carpeta `db_json/` en la raíz del proyecto.

Puedes editar o reemplazar los archivos dentro de la carpeta `db_json/` directamente para poblar el sistema con tus propios datos.

---

## 1. Archivos Disponibles y Estructura

### `db_json/prendas.json` (Catálogo de Referencias/Productos)
Este archivo define qué productos están disponibles en la tienda.
*   **Campos obligatorios:**
    *   `id`: Identificador único (ej. `"p1"`, `"prenda_1719876543"`).
    *   `sku`: Código de referencia visible (ej. `"CAM-001"`).
    *   `nombre`: Nombre de la prenda.
    *   `categoria`: Debe ser uno de los siguientes valores exactos: `"Dama"`, `"Niña"`, `"Niño"`, o `"Colegial"`.
    *   `precioBase`: Valor numérico en pesos (ej. `45000`).
    *   `tallasDisponibles`: Arreglo de strings con las tallas disponibles (ej. `["S", "M", "L", "XL"]`).
    *   `stock`: Cantidad disponible (ej. `50`).
*   **Campos opcionales:**
    *   `imagenUrl`: Ruta de la foto. Si colocas una imagen llamada `vestido.jpg` en la carpeta `fotos_referencias/` en la raíz del proyecto, puedes usar la ruta: `"/fotos_referencias/vestido.jpg"`.
    *   `descripcion`: Detalle o descripción técnica del producto.

### `db_json/clientes.json` (Directorio de Clientes)
Define los clientes registrados.
*   **Campos obligatorios:**
    *   `id`: Identificador único del cliente (ej. `"c1"`, `"cli_1719876543"`).
    *   `nombre`: Nombre completo o razón social.
    *   `documentoIdentidad`: Documento (Cédula de Ciudadanía, NIT, etc.).
    *   `telefono`: Número de contacto.
    *   `correo`: Correo electrónico.
    *   `direccion`: Dirección de entrega.
    *   `ciudad`: Ciudad de ubicación.
    *   `fechaRegistro`: Fecha en formato YYYY-MM-DD.
*   **Campos opcionales:**
    *   `notas`: Comentarios sobre preferencias de talla, colores, etc.
    *   `limiteFacturacion`: Límite numérico o `"N/A"`.

### `db_json/vendedor.json` (Configuración del Vendedor)
Configura el perfil de vendedor por defecto y su meta de comisión.
*   **Campos:**
    *   `nombre`: Nombre del vendedor.
    *   `codigo`: Código identificador (ej. `"V-102"`).
    *   `comisionMeta`: Porcentaje de comisión objetivo (ej. `10` para 10%).

### `db_json/pedidos.json` (Pedidos Activos)
Contiene la lista de pedidos activos creados en la plataforma.
*   **Campos principales:**
    *   `id`: Identificador único (ej. `"ped_1"`).
    *   `numeroPedido`: Consecutivo visible (ej. `"PED-0001"`).
    *   `clienteId`: Relación con el ID del cliente.
    *   `clienteNombre`: Nombre del cliente copiado en el pedido.
    *   `subtotal`, `porcentajeDescuento`, `montoDescuento`, `total`: Valores de facturación.
    *   `estado`: `"Pendiente"`, `"Procesado"`, `"Activo"`, `"Completo"` o `"Cancelado"`.
    *   `items`: Listado de prendas agregadas al carrito, donde cada elemento tiene `prendaId`, `nombrePrenda`, `categoria`, `talla`, `cantidad`, `precioUnitario` y `total`.

### `db_json/deleted_pedidos.json` (Historial de Pedidos en Papelera)
Misma estructura que `pedidos.json`, contiene los pedidos que han sido eliminados de la vista principal pero aún no han sido borrados de forma permanente.

### `db_json/backups.json` (Historial de Versiones Anteriores)
Misma estructura que `pedidos.json`, almacena versiones antiguas de pedidos antes de ser editados para fines de auditoría.

---

## 2. Instrucciones para Cargar Imágenes de Productos
1. Copia tus imágenes (archivos `.jpg`, `.png`, `.webp`, etc.) a la carpeta `fotos_referencias/` ubicada en la raíz del proyecto.
2. En tu archivo `db_json/prendas.json`, asigna el nombre de la foto al atributo `imagenUrl` de la prenda correspondiente de la siguiente manera:
   ```json
   "imagenUrl": "/fotos_referencias/nombre_de_tu_imagen.jpg"
   ```
3. Reinicia la aplicación (`npm run dev`) si es necesario, ¡y las fotos se verán reflejadas de inmediato!
