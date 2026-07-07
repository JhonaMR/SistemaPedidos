# Guía de Despliegue: Netlify + Cloudflare Tunnels (Gratuito)

Esta guía explica detalladamente cómo configurar el sistema de toma de pedidos para que funcione de forma pública en los celulares de los vendedores, sincronizando los datos directamente con el servidor físico/computador de tu empresa utilizando la red gratuita y segura de **Cloudflare** y el hosting de **Netlify**.

---

## Estructura del Sistema

```
[ Teléfono Móvil Vendedor ] 
           │
           ▼
┌──────────────────────────────────────┐
│  Frontend en Netlify (HTTPS)         │ (Descarga la PWA y la interfaz)
└──────────────────┬───────────────────┘
                   │
           (Envía peticiones POST/GET)
                   │
                   ▼
┌──────────────────────────────────────┐
│  Túnel de Cloudflare (HTTPS Seguro)  │ (Conexión directa a través de Internet)
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│  Tu Servidor Local (Puerto 5050)     │ (Computador de la empresa que guarda los JSONs)
└──────────────────────────────────────┘
```

---

## PARTE 1: Configurar el Túnel de Cloudflare (Servidor Local)

Cloudflare Tunnels crea una conexión cifrada de salida desde tu computador local hacia la nube de Cloudflare, permitiendo que tu backend Express sea accesible de forma segura bajo HTTPS sin tener que abrir puertos en tu router ni configurar IPs públicas.

### Requisito Previo
* Para usar la red de Cloudflare Tunnels de forma gratuita, necesitas tener una cuenta en **Cloudflare** (gratis) y un **dominio propio** (ej. `miempresa.com`) apuntando sus DNS a Cloudflare (Cloudflare ofrece registro de dominios muy económicos o puedes usar uno que ya tengas y añadirlo de forma gratuita).

### Paso a Paso para el Túnel:

1. **Registrarse e ingresar**:
   * Entra a [Cloudflare](https://dash.cloudflare.com/) y crea una cuenta gratuita.
   * En el menú lateral izquierdo, haz clic en **Zero Trust**. (Si es la primera vez que ingresas, te pedirá elegir un nombre de equipo y un método de pago, selecciona el **Plan Free de $0 dólares**, no te cobrarán nada).

2. **Crear el Túnel**:
   * Dentro de Zero Trust, ve a **Networks** -> **Tunnels**.
   * Haz clic en el botón **Add a tunnel** (Añadir un túnel).
   * Selecciona el tipo **Cloudflared** y haz clic en **Next**.
   * Dale un nombre a tu túnel (ej. `servidor-toma-pedidos`) y haz clic en **Save tunnel**.

3. **Instalar el Conector en tu Servidor Local (Windows)**:
   * Cloudflare te mostrará una lista de sistemas operativos. Haz clic en **Windows**.
   * Selecciona la arquitectura de tu procesador (normalmente **64-bit**).
   * Te dará un comando de PowerShell largo similar a este (contiene tu token único de seguridad):
     ```powershell
     iex ((New-Object System.Net.WebClient).DownloadString('https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.msi')); cloudflared service install TU_TOKEN_DE_SEGURIDAD_AQUI
     ```
   * Abre **PowerShell como Administrador** en tu servidor local (el computador donde corre tu backend).
   * Pega el comando que copiaste de la página de Cloudflare y presiona **Enter**.
   * *Esto descargará e instalará automáticamente el servicio de Cloudflare de fondo en Windows. El servicio se iniciará por sí solo cada vez que enciendas tu PC.*
   * En la página de Cloudflare verás que el estado cambia a **Connected** (Conectado). Haz clic en **Next**.

4. **Configurar la Ruta Pública (Public Hostname)**:
   * En la sección **Public Hostnames**, define la dirección web donde quieres exponer tu API.
   * **Subdomain (Subdominio)**: Escribe por ejemplo `api-pedidos`.
   * **Domain (Dominio)**: Selecciona tu dominio registrado en Cloudflare (ej. `tuempresa.com`).
   * **Path**: Déjalo vacío.
   * En **Service (Servicio)**, ingresa los datos de tu servidor de Express local:
     * **Type**: Selecciona **HTTP**.
     * **URL**: Escribe `localhost:5050` (el puerto de tu Express).
   * Haz clic en **Save tunnel**.
   * *A partir de este momento, cualquier petición a `https://api-pedidos.tuempresa.com` será enviada por Cloudflare directamente a tu Express local de forma segura bajo HTTPS.*

---

## PARTE 2: Compilar y Desplegar el Frontend en Netlify

Ahora que tienes tu servidor expuesto de forma segura en `https://api-pedidos.tuempresa.com`, compilaremos y subiremos la web de React.

### Paso 1: Generar la carpeta de producción en tu PC
1. Abre tu terminal de VS Code en la raíz de tu proyecto.
2. Ejecuta el comando de compilación:
   ```bash
   npm run build
   ```
3. Esto generará una nueva carpeta llamada `dist` en la raíz de tu proyecto. Esta carpeta contiene los archivos HTML, CSS, JavaScript e imágenes optimizados y listos para subir a la web.

### Paso 2: Subir la carpeta a Netlify (Netlify Drop - Método Fácil)
1. Abre tu navegador y entra a [Netlify Drop](https://app.netlify.com/drop).
2. Arrastra y suelta la carpeta entera llamada `dist` (la que se generó en el paso anterior) dentro de la caja de Netlify.
3. En menos de un minuto, Netlify te creará un sitio web con un enlace HTTPS seguro (por ejemplo: `https://toma-pedidos-arare.netlify.app`).

### Paso 3: Conectar la aplicación de Netlify con tu Servidor Local
Para que el frontend de Netlify sepa que debe enviarle los pedidos a tu URL de Cloudflare:
1. En el panel de control de tu sitio web recién creado en Netlify, haz clic en el menú izquierdo en **Site configuration** -> **Environment variables** (Variables de entorno).
2. Haz clic en **Add a variable** -> **Import from a .env file** o añade una variable individual:
   * **Key**: `VITE_API_URL`
   * **Value**: *La URL completa de tu túnel de Cloudflare que configuraste en la Parte 1* (ejemplo: `https://api-pedidos.tuempresa.com`).
3. Guarda la variable.
4. **IMPORTANTE**: Como Netlify compila las variables de entorno durante la subida, debes volver a desplegar la aplicación para que tome la nueva variable. Ve a la pestaña **Deploys** en Netlify, haz clic en **Trigger deploy** -> **Deploy site** (o vuelve a arrastrar tu carpeta `dist` en la misma caja de Netlify Drop).

---

## PARTE 3: Cómo probar en el Celular

1. Toma el teléfono móvil de un vendedor.
2. Abre el navegador (Chrome en Android o Safari en iOS).
3. Entra a la dirección web que te dio Netlify (ejemplo: `https://toma-pedidos-arare.netlify.app`).
4. **Instalar en el Teléfono**:
   * En Android: Te aparecerá un cartel que dice "Añadir a la pantalla de inicio". Acéptalo.
   * En iOS (iPhone): Pulsa el botón de compartir de Safari y selecciona **Añadir a la pantalla de inicio**.
   * *La app ahora aparecerá como un ícono más en tu celular, funcionando de forma offline y a pantalla completa.*
5. **Listo para Vender**:
   * Inicia sesión con las 3 letras asignadas del vendedor.
   * Descarga la base de datos inicial con conexión.
   * Sal al campo sin internet: podrás registrar clientes express con código `000` y pedidos consecutivos por vendedor (ej: `01-001`).
   * Al regresar con conexión, presiona **Sincronizar** para guardar los pedidos directamente en la PC central de la empresa.
