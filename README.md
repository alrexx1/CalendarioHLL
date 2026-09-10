# Sistema de Reservas de Sala de Computación — Colegio HLL

Aplicación web institucional para la gestión y reserva de bloques horarios de la Sala de Computación del **Colegio Santo Domingo Helen Lee Lassen**, adaptada para despliegue en la nube en **Render** con base de datos PostgreSQL serverless en **Neon**.

---

## Despliegue Rápido en Neon y Render

### 1️⃣ Paso 1: Crear la Base de Datos en Neon (PostgreSQL)
1. Ingresa a [console.neon.tech](https://console.neon.tech) y crea una cuenta gratuita.
2. Haz clic en **Create Project**:
   - **Name**: `hll-calendario` (o el nombre que prefieras).
   - **Postgres version**: Selecciona `PostgreSQL 16` (la opción recomendada y por defecto).
   - **Region**: Elige la más cercana (ej: `US East - Ohio/N. Virginia`).
3. Al crearse el proyecto, Neon te mostrará tu **Connection string**:
   ```text
   postgresql://alex:AbCdEf123456@ep-cool-fog-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. ¡Copia esa URL completa! Es tu variable `DATABASE_URL`.

>  **Nota:** La aplicación se encarga automáticamente de crear las tablas necesarias e insertar los datos iniciales de prueba de Agosto 2026 la primera vez que se conecte.

---

### 2️⃣ Paso 2: Probar Localmente (Opcional)
1. Pega tu URL de Neon en el archivo `.env`:
   ```env
   PORT=3000
   DATABASE_URL=postgresql://tu_usuario:tu_password@ep-xxx.neon.tech/neondb?sslmode=require
   ```
2. Inicia el servidor:
   ```bash
   npm start
   ```
3. Abre tu navegador en `http://localhost:3000`. Verás el indicador verde: `🟢 Neon DB Conectado`.

---

### 3️⃣ Paso 3: Desplegar en Render
1. Sube este proyecto a tu repositorio en **GitHub** o **GitLab**.
2. Ingresa a [dashboard.render.com](https://dashboard.render.com) y selecciona **New +** → **Web Service**.
3. Conecta tu repositorio de GitHub.
4. Configura los parámetros:
   - **Name**: `calendario-hll`
   - **Region**: La misma región de tu Neon (o cercana).
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: `Free`
5. En la sección **Environment Variables**, añade:
   - **Key**: `DATABASE_URL`
   - **Value**: *(Pega tu Connection string de Neon)*
6. Haz clic en **Create Web Service**.

¡Listo! Render compilará tu aplicación en aproximadamente 1 minuto y te entregará una URL pública segura HTTPS (ej: `https://calendario-hll.onrender.com`).

---

## Primer Inicio de Sesión y Seguridad
Al inicializar el sistema con una base de datos nueva:
1. El sistema crea un usuario administrador inicial con contraseña temporal configurable vía `INITIAL_ADMIN_PASSWORD` (o por defecto `admin@colegiohll.cl`).
2. Al ingresar por primera vez, el sistema exige obligatoriamente cambiar la contraseña por una clave personal antes de otorgar acceso.
3. Los docentes autorizados pueden registrarse directamente desde la pantalla de bienvenida utilizando su correo institucional `@colegiohll.cl`.

