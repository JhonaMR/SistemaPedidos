# Sistema TOMA PEDIDO - Entorno Local

Este proyecto es una aplicación web local diseñada para la gestión rápida y eficiente de clientes, toma de pedidos de prendas de vestir y control de referencias de catálogo.

El sistema está optimizado para funcionar completamente de forma local, utilizando un backend modular y almacenamiento directo en archivos JSON locales, lo que elimina la necesidad de configurar servidores de bases de datos complejos.

---

## Características Principales

*   **Toma de Pedidos Dinámica:** Interfaz interactiva y animada para añadir prendas al carrito, seleccionar clientes y generar totales.
*   **Gestión de Catálogo de Referencias:** Carga dinámica de productos y soporte para imágenes locales.
*   **Directorio de Clientes:** CRUD completo de clientes con historial de compras.
*   **Impresión de Comprobantes:** Servicio de generación de recibos listos para imprimir.
*   **Base de Datos en JSON:** Toda la información se persiste localmente en archivos legibles y portables.
*   **Copias de Seguridad (Backup):** Capacidad para descargar y restaurar copias de respaldo de pedidos.

---

## Requisitos Previos

*   [Node.js](https://nodejs.org/) (versión 18 o superior recomendada)
*   npm (incluido por defecto con Node.js)

---

## Instrucciones de Arranque

1.  **Instalar dependencias:**
    Ejecuta el siguiente comando en la raíz del proyecto para instalar todos los módulos necesarios:
    ```bash
    npm install
    ```

2.  **Configurar Variables de Entorno (Opcional):**
    Puedes crear un archivo `.env.local` y añadir tu API Key de Gemini si deseas utilizar las características de IA (si el sistema las integra):
    ```env
    GEMINI_API_KEY=tu_api_key_aqui
    ```

3.  **Iniciar la aplicación en modo desarrollo:**
    ```bash
    npm run dev
    ```
    El servidor Express y la aplicación de Vite se iniciarán en: [http://localhost:5050](http://localhost:5050).

---

## Gestión de Datos Locales

*   **Carpeta de Datos (`db_json/`):** Aquí se almacenan los archivos de base de datos en formato JSON (`clientes.json`, `pedidos.json`, `prendas.json`, etc.). El sistema lee y escribe de forma automática en estos archivos.
*   **Carpeta de Ejemplos (`db_json_ejemplos/`):** Contiene plantillas de ejemplo y un archivo de instrucciones detallado (`INSTRUCCIONES.md`) que explica el formato de los datos.
*   **Carpeta de Fotos (`fotos_referencias/`):** Almacena las imágenes físicas de las prendas. Puedes soltar tus imágenes aquí y referenciarlas en `prendas.json` usando la ruta relativa `/fotos_referencias/mi_prenda.jpg`.
