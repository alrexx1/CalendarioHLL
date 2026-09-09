# Plan de Corrección Integral de Bugs y Mejoras de Experiencia de Usuario (HLL)

Este plan aborda y soluciona de forma estructurada los 12 problemas y vulnerabilidades detectados durante la auditoría del sistema institucional de reservas de la Sala de Computación del Colegio Santo Domingo Helen Lee Lassen.

## User Review Required

> [!IMPORTANT]
> **Políticas de Seguridad en Reservas**: A partir de estas correcciones, solo usuarios autenticados (docentes o administradores) podrán crear, modificar o eliminar reservas horarias. Los docentes solo podrán editar y anular sus **propias** reservas; únicamente los administradores podrán aplicar bloqueos institucionales o cancelar reservas de terceros.

> [!NOTE]
> **Compatibilidad de Calendario**: La corrección del cálculo de semanas asegura que ningún día hábil del mes quede fuera de la vista (como ocurría con los primeros días de septiembre, abril y octubre). Las semanas ahora cubren del lunes de la primera semana con días hábiles hasta el viernes de cierre del mes.

---

## Proposed Changes

### 1. Seguridad del Servidor y Control de Rutas

#### [MODIFY] [server.js](file:///c:/Users/Alejandro%20Rivero/Documents/IA/Calendario%20HLL/server.js)
- Eliminar la línea `app.use(express.static(__dirname, { index: false }));` que exponía indebidamente el código fuente (`server.js`, `package.json`, archivos `/src/`, etc.).
- Mantener únicamente `app.use(express.static(path.join(__dirname, 'public'), { index: false }));` y las rutas explícitas para servir la aplicación web.

#### [MODIFY] [rateLimiter.js](file:///c:/Users/Alejandro%20Rivero/Documents/IA/Calendario%20HLL/src/middleware/rateLimiter.js)
- Aumentar el límite de `authLimiter` de 10 a 60 peticiones por ventana de 10 minutos para evitar que la IP pública compartida de la red escolar bloquee a todo el cuerpo docente durante el ingreso matutino.

#### [MODIFY] [reservationsRoutes.js](file:///c:/Users/Alejandro%20Rivero/Documents/IA/Calendario%20HLL/src/routes/reservationsRoutes.js)
- Reemplazar `router.use(optionalAuth)` general por:
  - `GET /` con `optionalAuth` (permite visualización pública del calendario en modo solo lectura).
  - `POST /` con `requireAuth` (garantiza usuario autenticado para agendar).
  - `DELETE /` con `requireAuth` (garantiza usuario autenticado para anular).

---

### 2. Controladores de Backend y Resiliencia

#### [MODIFY] [reservationsController.js](file:///c:/Users/Alejandro%20Rivero/Documents/IA/Calendario%20HLL/src/controllers/reservationsController.js)
- En `createOrUpdateReserva`:
  - Verificar que `isBlocked: true` solo pueda ser asignado si `req.user.role === 'administrator'`.
  - Comprobar si ya existe una reserva en ese bloque: si pertenece a otro docente (`user_email !== req.user.email`), rechazar con error 403 excepto si quien edita es `administrator`.
  - Asegurar que `user_email` guardado en la base de datos sea siempre `req.user.email`.
- En `deleteReserva`:
  - Consultar la reserva antes de eliminar: si el usuario no es `administrator` y no es el autor de la reserva (`user_email !== req.user.email`), rechazar con 403 ("No tienes permisos para cancelar la reserva de otro docente").
  - Bloquear eliminación de bloqueos institucionales (`is_blocked: true`) a usuarios que no sean `administrator`.

#### [MODIFY] [authController.js](file:///c:/Users/Alejandro%20Rivero/Documents/IA/Calendario%20HLL/src/controllers/authController.js)
- En `login`: si el pool de base de datos no está disponible o falla la conexión con Neon, responder con código HTTP 503 y mensaje explícito de *"Servicio de base de datos no disponible temporalmente"*, evitando que el usuario crea que su contraseña es incorrecta y agote sus intentos.

---

### 3. Calendario, Grilla y Horarios Frontend

#### [MODIFY] [calendar.js](file:///c:/Users/Alejandro%20Rivero/Documents/IA/Calendario%20HLL/public/js/calendar.js)
- En `buildMonthStructure`:
  - Corregir el inicio del mes: si el día 1° es lunes a viernes, retroceder al lunes de esa semana; si es sábado o domingo, iniciar el lunes siguiente. Esto recupera los días 1 al 4 de septiembre, 1 al 3 de abril, etc.
- En `fetchMonth` y `loadMonth`:
  - Ajustar `this.currentWeek = Math.max(0, Math.min(this.currentWeek, this.activeWeeks.length - 1))` al cambiar de mes para evitar que semanas inexistentes queden seleccionadas y rompan la interfaz.
- En `FRIDAY_GRID_MAP`:
  - Eliminar el solapamiento en `lookupSlots` entre la fila 5 y la fila 6 para evitar que las reservas del bloque `12:15 - 13:00` aparezcan duplicadas en la grilla del viernes.
- En eventos de clic sobre celdas libres y botones de reserva:
  - Si el usuario no está autenticado, llamar a `Auth.lockAccessWall()` para que ingrese con su cuenta docente, en lugar de invocar `Auth.openAdminLoginModal()`.

---

### 4. Módulo de Reservas y Gestión de Sesiones

#### [MODIFY] [reservations.js](file:///c:/Users/Alejandro%20Rivero/Documents/IA/Calendario%20HLL/public/js/reservations.js)
- En `showDetail`:
  - Comprobar propiedad de la reserva mediante correo electrónico:
    ```javascript
    const isOwner = Auth.currentUser && reservation.userEmail &&
      (Auth.currentUser.email.toLowerCase() === reservation.userEmail.toLowerCase());
    const canDelete = Auth.isAdmin || isOwner || Boolean(reservation.userCreated);
    ```
  - Permitir así que los docentes puedan cancelar sus reservas en cualquier momento, incluso tras recargar la página o cambiar de dispositivo.
- En botón "Nueva Reserva" de escritorio:
  - Si no está autenticado, solicitar inicio de sesión docente institucional.

#### [MODIFY] [auth.js](file:///c:/Users/Alejandro%20Rivero/Documents/IA/Calendario%20HLL/public/js/auth.js)
- En `forgot-request-form`:
  - Sincronizar `this.recoveryEmail = email;` en el envío del Paso 1 para que el Paso 2 use siempre el correo correcto y no un valor residual.
- En `restoreSession`:
  - Validar silenciosamente la sesión en segundo plano con `API.getProfile()`; si el token caducó (más de 24 horas), cerrar sesión limpiamente y mostrar el muro de acceso.

---

### 5. Service Worker y PWA

#### [MODIFY] [sw.js](file:///c:/Users/Alejandro%20Rivero/Documents/IA/Calendario%20HLL/public/sw.js)
- Configurar `{ ignoreSearch: true }` en `caches.match()` para que los recursos con versiones (`?v=1.3`) hagan match directo con los recursos cacheados.
- Proteger el manejador `fetch` para que nunca retorne `undefined` a `event.respondWith()`, evitando excepciones `TypeError` cuando se navega sin conexión.

---

## Verification Plan

### Automated Tests
1. Ejecutar pruebas con Node.js verificando la estructura mensual de semanas para los 12 meses de 2026:
   ```powershell
   node -e "..."
   ```
2. Verificar que el servidor ya no sirve archivos sensibles de la raíz:
   ```powershell
   node -e "fetch('http://localhost:PORT/server.js').then(r => console.log(r.status))"
   ```
3. Comprobar que los endpoints protegidos devuelven 401 sin token y 403 ante modificaciones no autorizadas:
   ```powershell
   node -e "fetch('http://localhost:PORT/api/reservas', { method: 'POST' }).then(r => console.log(r.status))"
   ```

### Manual Verification
1. **Septiembre 2026**: Verificar que la Semana 1 muestre desde el 31 de agosto al 4 de septiembre, permitiendo ver y agendar los días 1, 2, 3 y 4 de septiembre.
2. **Ciclo de Reserva Docente**:
   - Iniciar sesión como docente.
   - Crear una reserva para un bloque libre.
   - Recargar la página (F5).
   - Hacer clic sobre la reserva y verificar que el botón *"Eliminar reserva"* sigue habilitado y permite anularla correctamente.
3. **Cambio de Mes**: Navegar a un mes con 5 semanas, situarse en la semana 5, cambiar a un mes con 4 semanas y comprobar que la interfaz selecciona limpiamente la semana 4 sin errores en consola.
4. **Viernes**: Registrar un bloque en viernes y verificar que no se duplica en dos renglones.
5. **Recuperación de Contraseña**: Probar el flujo completo de recuperación con un correo nuevo y verificar que el Paso 2 conserva el correo del Paso 1.
