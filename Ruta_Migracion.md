# Ruta de Migración a Producción (PostgreSQL & Multimarca)
## ARARE S.A.S. - Sistema de Toma de Pedidos

Este documento sirve como guía y punto de partida para retomar el trabajo exactamente donde lo dejamos. Detalla la arquitectura acordada y los pasos secuenciales que implementaremos a continuación.

---

## 1. Resumen de la Arquitectura Acordada

* **Base de Datos Central:** Un único motor de **PostgreSQL** corriendo en el puerto **`5435`** de la NAS.
* **Bases de Datos Independientes:**
  * `arare_plow`: Con todos los datos migrados (Catálogo, pedidos históricos, usuarios, clientes).
  * `arare_melas`: Con datos migrados **únicamente** de usuarios y clientes (para iniciar catálogo y pedidos desde cero).
* **Backends (Node.js/Express) en Docker:**
  * Instancia 1 (Plow): Puerto **`5050`**, conectada a `arare_plow`.
  * Instancia 2 (Melas): Puerto **`5051`**, conectada a `arare_melas`.
* **Aislamiento de Archivos en la NAS:**
  * Carpeta `/toma-pedidos/plow/fotos_referencias/` para fotos de ropa Plow.
  * Carpeta `/toma-pedidos/melas/fotos_referencias/` para fotos de ropa Melas.
* **Frontends (Netlify):** Dos despliegues independientes vinculados a tu repositorio de GitHub, cada uno configurado con la URL de su API correspondiente.
* **Túnel de Cloudflare:** Un solo túnel enrutando `api-plow.tuempresa.com` y `api-melas.tuempresa.com` a sus respectivos contenedores.

---

## 2. Hoja de Ruta: Pasos a Implementar

Cuando reanudemos, trabajaremos en el siguiente orden estricto:

### Fase 1: Preparación del Código (En tu PC de Desarrollo)
1. **Instalación de dependencias de Postgres:**
   * Agregar `pg` y `@types/pg` en el backend.
2. **Crear conexión a la Base de Datos (`dbConnection.ts`):**
   * Configurar el Pool de conexión dinámico que lea las variables de entorno.
   * Escribir el script SQL autogenerador de tablas (DDL) para que cree la estructura en el primer arranque del servidor.
3. **Modificar el servicio de base de datos (`dbService.ts`):**
   * Reescribir las funciones para que consulten Postgres usando SQL en lugar de leer/escribir archivos JSON.
   * Implementar transacciones ACID reales para la sincronización en lote.
4. **Desarrollar el Script de Migración (`migrateJsonToPostgres.ts`):**
   * Programar la lectura selectiva:
     * Si el comando es `npm run migrate -- --brand=plow`, carga todo.
     * Si es `npm run migrate -- --brand=melas`, solo carga usuarios y clientes.

### Fase 2: Configuración del Despliegue (Docker)
1. **Crear el `Dockerfile`** en la raíz del proyecto para indicarle a la NAS cómo empaquetar la app.
2. **Crear el `docker-compose.yml`** configurando:
   * El servicio de Postgres en el puerto `5435`.
   * Los servicios `backend-plow` (5050) y `backend-melas` (5051).
   * El conector de Cloudflare Tunnel.

### Fase 3: Despliegue en la NAS
1. Iniciar sesión como administrador en la NAS QNAP.
2. Instalar **Container Station (Docker)**.
3. Copiar el proyecto a la carpeta de la NAS.
4. Levantar los contenedores y ejecutar los dos comandos del script de migración para poblar las bases de datos.

---

## 3. Estado Actual: ¿Dónde retomamos?

* **Estado:** Planificación completada y aprobada conceptualmente.
* **Próximo Paso Inmediato:** Instalar el paquete `pg` de PostgreSQL en el backend y comenzar a escribir el archivo `backend/services/dbConnection.ts`.

*¡Guarda este archivo! Cuando estés listo para seguir, solo abre este documento y me indicas que arranquemos con el Paso 1 de la Fase 1.*
