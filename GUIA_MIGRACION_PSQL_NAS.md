# Guía Definitiva de Despliegue Paso a Paso: NAS QNAP y PostgreSQL
## Para el Sistema de Toma de Pedidos (PLOW & MELAS)

Esta guía ha sido redactada de forma extremadamente específica para acompañarte en tu primer despliegue utilizando **Docker**, **PostgreSQL** y **Cloudflare Tunnels** en tu **NAS QNAP**. Sigue cada paso en el orden indicado.

---

## ÍNDICE DE FASES
* [Fase 1: Preparación y Migración de Datos en tu PC](#fase-1-preparación-y-migración-de-datos-en-tu-pc)
* [Fase 2: Preparación de Carpetas en la NAS QNAP](#fase-2-preparación-de-carpetas-en-la-nas-qnap)
* [Fase 3: Configuración del Túnel en Cloudflare (Paso a Paso)](#fase-3-configuración-del-túnel-en-cloudflare-paso-a-paso)
* [Fase 4: Despliegue de los Contenedores en la NAS QNAP](#fase-4-despliegue-de-los-contenedores-en-la-nas-qnap)
* [Fase 5: Mantenimiento y Respaldos](#fase-5-mantenimiento-y-respaldos)

---

## FASE 1: Preparación y Migración de Datos en tu PC

El primer paso es transferir la información que actualmente tienes en archivos JSON (`db_json/pedidos.json`, `clientes.json`, etc.) hacia bases de datos de PostgreSQL. Haremos esto desde tu computadora de desarrollo antes de mover los archivos a la NAS.

### Paso 1.1: Instalar PostgreSQL en tu PC (Si no lo tienes)
1. Descarga el instalador oficial de PostgreSQL para Windows en: [enterprisedb.com/downloads/postgres-postgresql-downloads](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads). Selecciona la versión **15** o **16**.
2. Corre el instalador. Durante la instalación te pedirá una **clave de superusuario (postgres)**. Escribe una clave fácil de recordar para desarrollo (ej: `postgres` o `admin123`).
3. Termina la instalación. Abre la herramienta **pgAdmin 4** (se instala automáticamente con PostgreSQL).
4. En pgAdmin, haz clic en **Servers** en el menú izquierdo, introduce la clave que configuraste para conectar.
5. Haz clic derecho sobre **Databases** -> **Create** -> **Database...**
   * En Database, escribe: `arare_plow` y haz clic en **Save**.
6. Haz clic derecho sobre **Databases** nuevamente -> **Create** -> **Database...**
   * En Database, escribe: `arare_melas` y haz clic en **Save**.
   *(Ya tienes creadas las bases de datos locales para ambas marcas)*.

### Paso 1.2: Configurar tu archivo `.env` local temporal
Para que tu script de migración sepa a dónde conectarse en tu PC:
1. En la raíz de tu proyecto en la PC (`c:\Users\luisf\OneDrive\Desktop\TOMA PEDIDO`), edita o crea un archivo llamado `.env`.
2. Escribe las siguientes credenciales correspondientes a tu PostgreSQL local:
   ```text
   PGHOST=localhost
   PGPORT=5432
   PGUSER=postgres
   PGPASSWORD=PON_AQUI_LA_CONTRASENA_QUE_ELEGISTE
   PGDATABASE=arare_plow
   ```

### Paso 1.3: Ejecutar la migración
1. Abre tu terminal de VS Code en la raíz del proyecto.
2. Ejecuta el comando de migración para **Plow** (esta acción leerá tus JSON locales y creará las tablas y datos en `arare_plow`):
   ```bash
   npm run migrate -- --brand=plow
   ```
   *Deberías ver mensajes en consola confirmando que se migraron pedidos, clientes y catálogo.*
3. Ahora, cambia en tu archivo `.env` la base de datos a `arare_melas`:
   ```text
   PGDATABASE=arare_melas
   ```
4. Ejecuta el comando de migración para **Melas** (esta acción migrará únicamente los usuarios y clientes para arrancar el catálogo desde cero):
   ```bash
   npm run migrate -- --brand=melas
   ```
5. **Listo.** Tus bases de datos en PostgreSQL ya tienen toda la información histórica. Ya no dependeremos de los archivos JSON.

### Paso 1.4: Seleccionar los archivos correctos para transferir
No debes subir todo el proyecto a la NAS porque pesa demasiado. Crea una carpeta comprimida en formato `.zip` que contenga **únicamente** los siguientes archivos y carpetas:
* **Carpetas a incluir:**
  * `backend/` (Todo su contenido)
  * `src/` (Todo su contenido)
  * `public/` (Todo su contenido, **excepto** la carpeta `fotos_referencias` si esta pesa demasiado; es mejor pasar las fotos por separado directamente a sus carpetas de volumen en la NAS).
* **Archivos a incluir:**
  * `Dockerfile` (Receta de compilación de Docker)
  * `docker-compose.yml` (Orquestación del servidor)
  * `package.json`
  * `package-lock.json`
  * `tsconfig.json`
  * `vite.config.ts`
  * `index.html`
* **Carpetas y Archivos a EXCLUIR (NO INCLUIR):**
  * `node_modules/` (Pesa megabytes y se instalará automáticamente en el contenedor)
  * `.git/` (Historial de control de versiones)
  * `dist/` (Se compilará en la NAS)
  * `postgres_data/` o carpetas de base de datos local
  * `.env` (Las variables se configuran directo en el `docker-compose.yml`)

---

## FASE 2: Preparación de Carpetas en la NAS QNAP

Ahora prepararemos el almacenamiento persistente dentro de tu NAS física.

### Paso 2.1: Crear la estructura en File Station
1. Inicia sesión en la interfaz web de tu NAS QNAP (QTS).
2. Abre la aplicación **File Station**.
3. Ve a tu carpeta compartida destinada a aplicaciones (normalmente hay una carpeta llamada `Public` o `Web` o puedes crear una nueva llamada `docker`).
4. Crea una carpeta llamada **`toma-pedidos`**.
5. Dentro de `toma-pedidos`, crea las siguientes tres subcarpetas vacías:
   * **`plow_fotos`** (Aquí irán las imágenes del catálogo de ropa Plow)
   * **`melas_fotos`** (Aquí irán las imágenes del catálogo de ropa Melas)
   * **`postgres_data`** (Aquí guardará Postgres los archivos físicos de la base de datos)
6. Sube y descomprime el archivo `.zip` que preparaste en el **Paso 1.4** en la raíz de la carpeta `/docker/toma-pedidos/`.

### Paso 2.2: Copiar las fotos del catálogo
* Toma las imágenes que tengas en tu computador y súbelas usando **File Station**:
  * Las fotos de Plow a `/docker/toma-pedidos/plow_fotos/`.
  * Las fotos de Melas a `/docker/toma-pedidos/melas_fotos/`.

### Paso 2.3: Obtener la Ruta Física Real (Absoluta) de la NAS
Docker necesita conocer la ruta física interna del disco de tu NAS para montar los archivos.
1. En **File Station**, haz clic derecho sobre la carpeta `toma-pedidos` y selecciona **Properties** (Propiedades).
2. Busca el campo **Location** o **Path** (Ruta). Verás algo similar a esto:
   `/share/CACHEDEV1_DATA/docker/toma-pedidos`
3. Anota esta ruta exacta. La usaremos en el archivo `docker-compose.yml` en la Fase 4.

---

## FASE 3: Configuración del Túnel en Cloudflare (Paso a Paso)

Este paso expone los dos servidores de backend a internet de forma segura.

### Paso 3.1: Acceder a Cloudflare Zero Trust
1. Abre tu navegador y ve a [dash.cloudflare.com](https://dash.cloudflare.com/) e ingresa a tu cuenta.
2. En el menú lateral izquierdo, haz clic en **Zero Trust**.
3. Si es la primera vez que entras, selecciona el plan **Free** ($0 USD) y completa los datos (no requiere pagos).
4. Dentro del panel de Zero Trust, haz clic en **Networks** -> **Tunnels** en el menú lateral.

### Paso 3.2: Crear el Túnel
1. Haz clic en el botón **Add a tunnel** (Añadir un túnel).
2. Selecciona **Cloudflared** como tipo de conector y haz clic en **Next**.
3. Dale un nombre identificativo a tu túnel (ej. `nas-qnap-pedidos`) y haz clic en **Save tunnel**.

### Paso 3.3: Obtener el Token del Conector para Docker
1. En la siguiente pantalla, Cloudflare te dará comandos para instalar el servicio en diferentes sistemas operativos. Haz clic en la opción **Docker**.
2. Verás un comando largo similar a este:
   `docker run cloudflare/cloudflared:latest tunnel --no-autoupdate run --token eyJhIjoiY2...`
3. Copia **únicamente** la cadena de texto larga que aparece al final, después de `--token`. Este es tu **TUNNEL_TOKEN**.
4. Guárdalo en un archivo de texto en tu PC. Lo usaremos a continuación.
5. Haz clic en **Next** en la página de Cloudflare.

### Paso 3.4: Configurar las Rutas Públicas (Public Hostnames)
Ahora asignaremos tus subdominios (`api-plow.yersi.cc` y `api-melas.yersi.cc`) para que viajen seguros a sus respectivos contenedores en la NAS:

1. **Añadir subdominio para PLOW:**
   * Haz clic en **Public Hostname** -> **Add a public hostname**.
   * **Subdomain:** Escribe `api-plow`
   * **Domain:** Selecciona tu dominio `yersi.cc` de la lista.
   * **Service Type:** Selecciona `HTTP` (en minúsculas).
   * **URL:** Escribe `toma-pedidos-plow:5050`
   * Haz clic en **Save hostname**.

2. **Añadir subdominio para MELAS:**
   * Haz clic de nuevo en **Add a public hostname**.
   * **Subdomain:** Escribe `api-melas`
   * **Domain:** Selecciona tu dominio `yersi.cc`.
   * **Service Type:** Selecciona `HTTP`.
   * **URL:** Escribe `toma-pedidos-melas:5050`
   * Haz clic en **Save hostname**.

*(No te preocupes por HTTPS; Cloudflare se encarga de cifrar la conexión automáticamente).*

---

## FASE 4: Despliegue de los Contenedores en la NAS QNAP

### Paso 4.1: Instalar Container Station
1. Entra a la administración de tu NAS QNAP.
2. Abre la aplicación **App Center**.
3. Busca **Container Station** e instálala (si aún no la tienes).

### Paso 4.2: Crear el Archivo docker-compose.yml Final
1. En tu computador local, abre el archivo [docker-compose.yml](file:///c:/Users/luisf/OneDrive/Desktop/TOMA%20PEDIDO/docker-compose.yml) y modifícalo con tus valores de QNAP:
   * **Ruta de Volúmenes:** Reemplaza `./plow_fotos` y `./melas_fotos` por las rutas físicas absolutas que obtuviste en el **Paso 2.3**.
   * **Token del Túnel:** Reemplaza `TU_TOKEN_DE_CLOUDFLARE_AQUI` por el token real que copiaste en el **Paso 3.3**.

Aquí tienes cómo debe lucir el archivo final:
```yaml
version: '3.8'

services:
  postgres-db:
    image: postgres:15-alpine
    container_name: toma-pedidos-db
    restart: always
    ports:
      - "5435:5432"
    environment:
      POSTGRES_DB: postgres
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: arare_psql_secreto_2026
    volumes:
      # Reemplaza '/share/CACHEDEV1_DATA' por el prefijo físico de tu NAS si varía
      - /share/CACHEDEV1_DATA/docker/toma-pedidos/postgres_data:/var/lib/postgresql/data

  backend-plow:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: toma-pedidos-plow
    restart: always
    ports:
      - "5050:5050"
    environment:
      NODE_ENV: production
      PORT: 5050
      VITE_BRAND: plow
      PGHOST: postgres-db
      PGPORT: 5432
      PGUSER: postgres
      PGPASSWORD: arare_psql_secreto_2026
      PGDATABASE: arare_plow
      JWT_SECRET: arare_jwt_secret_plow_2026
      FOTOS_REFERENCIAS_DIR: /app/fotos_referencias
    volumes:
      - /share/CACHEDEV1_DATA/docker/toma-pedidos/plow_fotos:/app/fotos_referencias
    depends_on:
      - postgres-db

  backend-melas:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: toma-pedidos-melas
    restart: always
    ports:
      - "5051:5050"
    environment:
      NODE_ENV: production
      PORT: 5050
      VITE_BRAND: melas
      PGHOST: postgres-db
      PGPORT: 5432
      PGUSER: postgres
      PGPASSWORD: arare_psql_secreto_2026
      PGDATABASE: arare_melas
      JWT_SECRET: arare_jwt_secret_melas_2026
      FOTOS_REFERENCIAS_DIR: /app/fotos_referencias
    volumes:
      - /share/CACHEDEV1_DATA/docker/toma-pedidos/melas_fotos:/app/fotos_referencias
    depends_on:
      - postgres-db

  cloudflare-tunnel:
    image: cloudflare/cloudflared:latest
    container_name: toma-pedidos-tunnel
    restart: always
    command: tunnel --no-autoupdate run
    environment:
      # Pega aquí el Token que copiaste en el Paso 3.3
      TUNNEL_TOKEN: eyJhIjoiY2...
    depends_on:
      - backend-plow
      - backend-melas
```
2. Guarda el archivo. Súbelo a la NAS reemplazando el `docker-compose.yml` que estaba allí.

### Paso 4.3: Crear la Aplicación en Container Station
1. Abre **Container Station**.
2. En el menú izquierdo, haz clic en **Applications** (Aplicaciones).
3. Haz clic en el botón **Create** (Crear) en la esquina superior derecha.
4. Completa la configuración del asistente:
   * **Project name (Nombre del Proyecto):** Escribe `toma-pedidos`.
   * **YAML Editor:** Pega el contenido exacto de tu archivo `docker-compose.yml` final.
5. Haz clic en **Validate** para verificar que la sintaxis sea correcta.
6. Haz clic en **Create**.
7. **¿Qué está pasando ahora?** QNAP descargará las imágenes de Postgres y Cloudflared de internet, leerá tu `Dockerfile`, compilará la versión productiva de React, compilará el backend, creará las bases de datos `arare_plow` y `arare_melas`, creará sus tablas automáticamente y conectará el túnel seguro hacia Cloudflare. Este proceso puede tardar entre 2 y 5 minutos.

---

## FASE 5: Mantenimiento y Respaldos

* **¿Cómo verificar si funciona?**
  Ve a la lista de contenedores en Container Station. Deberías ver los 4 contenedores en verde (`toma-pedidos-db`, `toma-pedidos-plow`, `toma-pedidos-melas` y `toma-pedidos-tunnel`). En tu celular, entra a `https://api-plow.yersi.cc/api/health` para comprobar que responda.
* **Respaldar tus Datos:**
  Toda tu información está guardada de forma segura en la carpeta `/docker/toma-pedidos/postgres_data/` de tu NAS. Abre la app **HBS 3 (Hybrid Backup Sync)** en tu QNAP y configura un backup diario automático de esa carpeta a Google Drive, OneDrive o a un disco duro externo. Si la NAS se daña, solo necesitas restaurar esa carpeta para recuperar todos los pedidos y clientes de la empresa.
