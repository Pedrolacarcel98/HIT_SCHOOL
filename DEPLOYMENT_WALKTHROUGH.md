# 🚀 Guía Completa de Despliegue Local y Pruebas — HitSchool

Esta guía detalla paso a paso todo lo necesario para clonar el repositorio, levantar el entorno completo con **Docker Compose**, inicializar la base de datos con datos de prueba, configurar las automatizaciones en **n8n** y realizar un recorrido de pruebas completo de la plataforma.

---

## 📋 1. Requisitos Previos

Antes de empezar, asegúrate de tener instaladas las siguientes herramientas en tu equipo:

1. **Git:** Para clonar el repositorio. ([Descargar Git](https://git-scm.com/))
2. **Docker Desktop:** Motor de contenedores para ejecutar la base de datos, backend, frontend y n8n. ([Descargar Docker Desktop](https://www.docker.com/products/docker-desktop/))
   - *Nota en Windows:* Asegúrate de tener activado el motor WSL 2 en la configuración de Docker Desktop.
3. **Node.js (v18+ o v20+):** Recomendado si deseas ejecutar scripts o comandos fuera de Docker. ([Descargar Node.js](https://nodejs.org/))

---

## 📥 2. Clonar el Repositorio

Abre una terminal (PowerShell, Bash o CMD) y clona el proyecto en tu máquina:

```bash
git clone https://github.com/Pedrolacarcel98/HIT_SCHOOL.git
cd HIT_SCHOOL
```

---

## ⚙️ 3. Configuración de Variables de Entorno

El proyecto ya incluye valores predeterminados para desarrollo local, pero asegúrate de que el archivo `backend/.env` exista:

### Archivo `backend/.env`:
```env
DATABASE_URL="postgresql://root:rootpassword@db:5432/hitschool?schema=public"
JWT_SECRET="supersecretjwtkey_change_in_production"
PORT=3000
FRONTEND_URL="http://localhost:5173"
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_REJECT_UNAUTHORIZED=false
SMTP_USER="pruebas@hitschool.example.com"
SMTP_PASSWORD="credencial-de-prueba"
SMTP_FROM="HitSchool <pruebas@hitschool.example.com>"
SUPPORT_EMAIL="soporte@tudominio.com"
```

Las credenciales anteriores son datos de prueba y no envían correos reales. Sustitúyelas por las credenciales de tu proveedor SMTP antes de probar la recuperación de contraseña. `SMTP_REJECT_UNAUTHORIZED=false` solo debe usarse en entornos locales cuando un antivirus o proxy intercepte TLS con un certificado autofirmado; en producción debe omitirse o establecerse en `true`. El backend utiliza SMTP directamente tanto para la recuperación como para el correo de bienvenida de los profesores.

`SUPPORT_EMAIL` es opcional y se muestra como contacto en el pie de los correos transaccionales. Si no se configura, el mensaje indica al destinatario que contacte con la administración de su academia.

---

## 🐳 4. Levantar el Entorno con Docker Compose

Ejecuta el siguiente comando en la raíz del proyecto (`HIT_SCHOOL/`) para descargar las imágenes, compilar los contenedores y arrancarlos en segundo plano:

```bash
docker-compose up -d --build
```

### 🔍 Servicios y Puertos Desplegados:

| Servicio | Tecnología | URL Local / Puerto | Descripción |
| :--- | :--- | :--- | :--- |
| **Frontend** | React + Vite + TypeScript | [http://localhost:5173](http://localhost:5173) | Interfaz web para profesores y alumnos |
| **Backend** | Node.js + Express + Prisma | [http://localhost:3000](http://localhost:3000) | API REST y autenticación JWT |
| **Base de Datos** | PostgreSQL 15 | `localhost:5432` | Base de datos relacional persistente |
| **n8n** | n8n Automation Engine | [http://localhost:5678](http://localhost:5678) | Motor de automatización y correos |

---

## 🗄️ 5. Inicializar y Poblar la Base de Datos (Seeds)

Una vez que los contenedores estén levantados, sincroniza el esquema de Prisma y genera los usuarios y materiales de demostración:

### Paso 5.1: Sincronizar el esquema y las reglas de email en PostgreSQL
```bash
docker exec hit_school_backend npm run schema:sync
```

### Actualizar una base existente sin borrar datos

Los cambios de notas manuales necesitan dos columnas nuevas: `TermGrade.gradeOverrides` y `TaskDelivery.gradeMode`. Antes de arrancar la nueva versión del backend contra una base existente, realiza una copia de seguridad y verifica que `DATABASE_URL` apunta al destino correcto. Desde `backend/`:

```bash
npx prisma db execute --file prisma/add-grade-overrides.sql --schema prisma/schema.prisma
npx prisma generate
```

El SQL solo añade columnas si no existen; no borra tablas ni modifica las notas históricas. Las tareas históricas calificadas conservan su nota hasta elegir expresamente **Volver a automática**. El SQL se probó dos veces en PostgreSQL 15 temporal y una vez sobre tablas previas con filas históricas; la migración del entorno real sigue pendiente.

**Precaución:** `npm run dev` del backend ejecuta `schema:sync`, que incluye `--accept-data-loss`. No debe usarse como mecanismo de migración de una base con datos. No ejecutes semillas ni el reset de volúmenes sobre una base en uso.

### Paso 5.2: Cargar datos de prueba (Profesor, Alumno y Recursos Didácticos)
```bash
docker exec hit_school_backend npx prisma db seed
```

> **Datos de Acceso Precargados:**
> - 💼 **Profesor:** `admin@hitschool.com` | Contraseña: `1234`
> - 💼 **Profesor:** `profesor@hitschool.com` | Contraseña: `1234`
> - 💼 **Profesor2:** `profesor2@hitschool.com` | Contraseña: `1234`
> - 🎓 **Alumno:** `marpargut@hitschool.com` | Contraseña: `1234`
> - 🎓 **Tutor:** `marpargut@hitschool.com` | Contraseña: `123456`

---

## 🤖 6. Configurar n8n para el Envío Automático de Correos

Cuando el profesor crea la ficha de un alumno, la cuenta queda pendiente de alta. El email de cuenta activada se envía directamente por SMTP desde el backend cuando se formaliza su primera matrícula. Si el alumno ya estuvo matriculado, se dio de baja y vuelve a matricularse, se envía el email de cuenta reactivada.

La recuperación de contraseña se realiza directamente desde el backend mediante SMTP, por lo que no necesita un webhook de n8n. Cuando el usuario está activo, el backend genera una contraseña temporal, la envía al correo indicado y solo después actualiza la contraseña almacenada.

Las publicaciones del tablón también generan notificaciones directamente desde el backend mediante SMTP. Al publicar un anuncio, se envía un correo individual a cada alumno matriculado y a su tutor asociado cuando sus cuentas están activas. Los destinatarios duplicados se agrupan por correo y el profesor que publica no recibe una copia. El mensaje incluye la clase, el profesor, el contenido del anuncio y un enlace para acceder a la clase. Si algún correo falla, el anuncio se conserva y el error queda registrado en los logs del backend.

Las tareas estructuradas/multistep también generan notificaciones directamente desde el backend mediante SMTP. Las tareas de clase se envían a todos los alumnos matriculados y a sus tutores activos; las tareas individuales solo se envían a los alumnos asignados y a sus tutores activos. Las plantillas no generan correos y el profesor no recibe copia. Si `publishAt` tiene una fecha futura, el backend espera hasta esa fecha; si está vacío, se notifica inmediatamente. El backend revisa las tareas pendientes cada minuto y guarda la fecha de envío para evitar duplicados tras reinicios. Si SMTP falla, la tarea se conserva y queda pendiente para reintento.

Cuando se reactiva un alumno o un profesor dado de baja, el backend genera una nueva contraseña temporal, la guarda cifrada y la envía directamente por SMTP al correo de la cuenta reactivada. La reactivación se completa aunque el correo falle; el error queda registrado en los logs y la contraseña nueva deberá comunicarse manualmente si fuera necesario.

Los tutores creados desde Gestión de Tutores o al crear un alumno quedan pendientes de alta y no reciben correo en ese momento. Al pulsar **Dar de alta** en `/teacher/parents`, el backend activa la cuenta y envía sus credenciales por SMTP; si se trata de una cuenta dada de baja anteriormente, envía el correo de reactivación. Estas notificaciones se gestionan directamente desde el backend y no necesitan un flujo de n8n. Cuando un alumno se da de baja, el backend oculta ese alumno del portal del tutor y, si el tutor ya no tiene ningún alumno activo, desactiva automáticamente su cuenta. La gestión de tutores permite listar, buscar, editar, crear, dar de alta, dar de baja/reactivar y eliminar tutores sin alumnos asociados.

### Paso a Paso en n8n:
1. Accede a **[http://localhost:5678](http://localhost:5678)** y crea tu cuenta de administrador local.
2. Los correos de alta inicial y reactivación de alumnos ya no necesitan un flujo de n8n: los envía directamente el backend mediante SMTP.
3. Si necesitas mantener automatizaciones adicionales, crea un nuevo flujo (**"Add workflow"**) y añade un nodo de tipo **Webhook**:
   - **HTTP Method:** `POST`
   - **Path:** `nuevo-alumno`
   - **Webhook URLs:** Verás que la URL de test es `http://localhost:5678/webhook-test/nuevo-alumno`.
4. Haz clic en **"Listen for test event"** en el nodo.
5. Conecta el Webhook a un nodo de **Gmail** (o SMTP):
   - **Acción:** `Send Email`.
   - **To:** `{{ $json.body.email }}`.
   - **Subject:** `¡Bienvenido a HitSchool, {{ $json.body.firstName }}! 🎓`.
   - **Message (HTML):** Usa la plantilla prediseñada con los estilos corporativos de HitSchool.
6. Guarda el flujo y actívalo (**Active: ON**).

---

## 🧪 7. Recorrido de Pruebas (Test Walkthrough)

Sigue esta lista de verificación para comprobar que todo funciona al 100%:

### 1. Inicio de Sesión y Roles
- Ve a [http://localhost:5173](http://localhost:5173).
- Selecciona el rol correspondiente (**"Soy Alumno"**, **"Soy Tutor / Padre"** o **"Soy Profesor"**).
- Introduce las credenciales (ej. `profesor@hitschool.com` / `1234` para Profesor, o `alumno@hitschool.com` / `1234` para Alumno).
- Comprueba que la barra lateral persistente aparece a la izquierda con:
  - 📖 **Mis Clases**
  - 📁 **Material de Clase**
  - 👥 **Gestión de Alumnos**

### Notificaciones del Tablón
- Crea o utiliza una clase con al menos un alumno matriculado y, si procede, un tutor asociado.
- Verifica que las cuentas del alumno y del tutor estén activas.
- Publica un anuncio desde la pestaña **Tablón**.
- Comprueba que el alumno y su tutor reciben el correo en sus direcciones respectivas.
- Comprueba que una cuenta inactiva no recibe la notificación y que el anuncio sigue visible en la clase.
- Para probar un fallo de correo, detén temporalmente el servicio SMTP o usa una configuración inválida y verifica el error en `docker logs hit_school_backend`; la publicación debe conservarse.

### Notificaciones de Tareas Estructuradas
- Crea una tarea estructurada de tipo **Clase** para una clase con alumnos matriculados.
- Comprueba que los alumnos y tutores activos reciben el correo y que el profesor no lo recibe.
- Crea una tarea estructurada de tipo **Individual** para varios alumnos y comprueba que solo ellos y sus tutores reciben la notificación.
- Programa una tarea con `publishAt` futuro y verifica que no llega antes de la fecha; el backend la procesará en el siguiente ciclo de un minuto.
- Comprueba que una plantilla, una cuenta inactiva o un destinatario duplicado no genera envíos incorrectos.
- Reinicia el backend después de un envío y verifica que no se repite el correo.
- Para probar un fallo SMTP, usa una configuración inválida y revisa `docker logs hit_school_backend`; la tarea debe conservarse y reintentarse cuando el SMTP vuelva a funcionar.

### 2. Gestión de Aulas (Core Google Classroom)
- En **Mis Clases**, pulsa **`+ Crear nueva clase`** (ej. *B2 First Cambridge*).
- Haz clic en la tarjeta de la clase creada y explora las 4 pestañas:
  - **Tablón:** Publica un aviso para el grupo.
  - **Trabajo de clase:** Crea una tarea categorizada por los 5 pilares Core de inglés (*Grammar, Reading, Listening, Writing, Speaking o Mock Exams*).
  - **Personas:** Revisa los alumnos asignados al aula.
  - **Calificaciones:** Vista centralizada para notas.

### 3. Módulo "Material de Clase" y Exámenes Interactivos
- Entra a **Material de Clase** (`/teacher/materials`):
  - Prueba los filtros por tipo (Documentos, Vídeos, Audios, Exámenes) y por nivel (A1–C2).
  - Pulsa **`Ver / Reproducir`** en el examen de Listening de prueba:
    - Comprueba que el reproductor de audio integrado cuenta con **control de velocidad (0.75x–1.5x)** y **salto de ±5 segundos**.
    - Responde las preguntas y pulsa **`Enviar y Corregir Examen`**.
    - Verifica que aparece el **Pop-up de Calificación** con tu nota y el botón **`Revisar Respuestas`**.
- Pulsa **`Crear Examen / Formulario`** para crear tu propio cuestionario interactivo con preguntas de opción múltiple, verdadero/falso y pistas de audio.

### 4. Gestión Completa de Alumnos (CRUD)
- Entra a **Gestión de Alumnos** (`/teacher/students`):
  - Pulsa **`+ Nuevo Alumno`** y rellena el formulario. Comprueba que la cuenta queda pendiente de matrícula.
  - Matricula por primera vez al alumno y comprueba que recibe por SMTP el correo de cuenta activada con sus credenciales.
  - Da de baja al alumno y vuelve a matricularlo; comprueba que recibe el correo de cuenta reactivada.
  - Utiliza el **buscador en tiempo real** para filtrar por nombre o correo.
  - Pulsa el botón de **Editar** (icono de lápiz) para modificar los datos de un alumno.
  - Pulsa el botón de **Eliminar** (icono de papelera) y confirma el borrado seguro en cascada.

---

### Regresión de Notas, Chat y Pagos

Desde la raíz del repositorio, estas pruebas ejecutan las rutas HTTP y los servicios reales con almacenamiento simulado y sin enviar correos:

```bash
npx --prefix backend ts-node --project backend/tsconfig.json backend/test-academic-flows.ts
npx --prefix backend ts-node --project backend/tsconfig.json backend/test-chat-flows.ts
npx --prefix backend ts-node --project backend/tsconfig.json backend/test-payment-rules.ts
npx --prefix backend tsc --project backend/tsconfig.json --noEmit
npm --prefix frontend run build
```

Las pruebas académicas cubren administrador/profesor, presencial/online, guardado y lectura, notas cero, conservación de valores manuales, vuelta al cálculo automático y permisos. Las de chat cubren los cuatro roles, separación por hijo y mensajes llegados después de cargar el hilo. Las 55 comprobaciones de pagos incluyen alta mensual/trimestral, tarifas mensuales editables, septiembre, exclusión de nuevas cuotas ordinarias en julio/agosto, conservación de pagos especiales, cobro y vuelta a pendiente, cuotas ajenas/exentas y fallo transaccional simulado. El error `Simulated payment failure` es deliberado: comprueba la reversión del alta, no un fallo de la suite.

Para las pruebas de navegador, instala Chromium una vez:

```bash
npx --prefix frontend playwright install chromium
```

En una terminal inicia solo el frontend, sin Docker ni backend real:

```bash
npm --prefix frontend run dev -- --host 127.0.0.1 --port 4173 --strictPort
```

En otra terminal:

```bash
npm --prefix frontend run test:flows
```

La prueba monta los componentes reales con una API simulada: comprueba 16 escenarios de notas/tareas/chat en escritorio y móvil, además de dos PDF. Las capturas y boletines se guardan en la carpeta temporal del sistema `hitschool-flow-checks`. Se comprueban guardado, reapertura, modo manual/automático, error de guardado y negrita de conversaciones no leídas. No se conecta a los datos del proyecto.

### Integración con PostgreSQL temporal

La prueba real de persistencia se ejecuta en una base desechable y separada. No conecta con `hit_school_db`, no usa volúmenes del proyecto y no envía correos. El test incorpora una protección que solo admite `127.0.0.1:57306/hitschool_test`.

En PowerShell, confirma que el puerto local 57306 está libre y arranca el contenedor temporal:

```powershell
docker run --rm --detach --name hitschool-regression-pg `
  -e POSTGRES_USER=hitschool_test `
  -e POSTGRES_PASSWORD=temporary_only_20261113 `
  -e POSTGRES_DB=hitschool_test `
  -p 127.0.0.1:57306:5432 postgres:15-alpine
```

Entra en `backend/`, configura la conexión a ese puerto e inicializa únicamente la base vacía:

```powershell
$env:DATABASE_URL = 'postgresql://hitschool_test:temporary_only_20261113@127.0.0.1:57306/hitschool_test'
npx prisma db push --schema prisma/schema.prisma
npx prisma db execute --file prisma/add-grade-overrides.sql --schema prisma/schema.prisma
```

Desde la raíz, apunta la prueba al puerto temporal y ejecuta la integración Prisma real. El test rechaza otros host/base para reducir el riesgo de conectar por error con una instancia distinta. Después elimina solo el contenedor temporal:

```powershell
$env:DATABASE_URL = 'postgresql://hitschool_test:temporary_only_20261113@127.0.0.1:57306/hitschool_test'
$env:JWT_SECRET = 'temporary-postgres-integration-secret'
cd ..
npx --prefix backend ts-node --project backend/tsconfig.json backend/test-postgres-integration.ts
docker stop hitschool-regression-pg
```

En la sesión del 13/11/2026, la integración con PostgreSQL 15 **pasó**: guardado y relectura de competencias y cero manual; feedback sin perder notas; tarea MANUAL en cero y vuelta a AUTO leyendo la nota del paso; chat tutor/admin separado por hijo y `readAt` persistido; cuotas mensual 65 € y trimestral 60 €/mes pendientes; rechazo de alta duplicada; marcado/desmarcado de cobro y rechazo de una cuota perteneciente a otro alumno. SMTP se sustituyó por funciones locales.

También se probó la migración en una segunda base desechable con filas de ejemplo del esquema previo: preservó las notas y el estado históricos, creó `{}` en `gradeOverrides` y dejó `gradeMode` nulo. Se volvió a ejecutar el SQL en la base temporal para comprobar idempotencia. En la instancia local actual, las dos columnas ya existían, por lo que no se ejecutó el SQL sobre `hit_school_db`.

### Datos de verificación añadidos a la base local

Para poder probar las pantallas con las cuentas existentes se añadió a `hit_school_db` un escenario idempotente identificado por **`PRUEBA CAMBIOS 2026-11`**. No se modificaron, regeneraron ni consultaron hashes de contraseña. El seed verifica que los cinco usuarios siguientes existen, están activos y tienen los roles esperados; también verifica el vínculo del alumno con su tutor. `marpargut@hitschool.com` corresponde a dos registros distintos: uno `STUDENT` y otro `PARENT`, como exige el selector de rol.

Se conservan los accesos precargados del apartado anterior:

| Cuenta | Rol en la base | Acceso precargado |
| :--- | :--- | :--- |
| `admin@hitschool.com` | `ADMIN` | `1234` |
| `profesor@hitschool.com` | `TEACHER` | `1234` |
| `profesor2@hitschool.com` | `TEACHER` | `1234` |
| `marpargut@hitschool.com` | `STUDENT` | `1234` |
| `marpargut@hitschool.com` | `PARENT` | `123456` |

Escenario cargado:

- Clase presencial **«PRUEBA CAMBIOS 2026-11 · Clase presencial»**, a cargo de `profesor@hitschool.com`, con `marpargut@hitschool.com` matriculado como alumno.
- Trimestre 1, año académico de notas `2025-2026`: Midterm 8, Final 9, media de tareas manual 7,25. La global automática esperada es **8,13**.
- Tarea **MANUAL**: nota global 7,5 y paso 8,5. Tarea **AUTO**: nota de paso/global 6. Si se vuelve a automático en la primera, debe tomar 8,5.
- Siete mensajes de demostración no leídos distribuidos entre alumno, tutor, profesor, segundo profesor y administración; todos usan el contexto del mismo hijo.
- Matrícula **mensual** en `2026-2027`: 65 €/mes, octubre–diciembre, tres cuotas `PENDING`.
- Matrícula **trimestral** en `2027-2028`: 60 €/mes, octubre–diciembre, tres cuotas `PENDING`.

No se ejecutó `docker compose`, `schema:sync`, seeds generales ni reset. Para repetir el seed local idempotente desde PowerShell y desde la raíz del proyecto:

```powershell
$databaseUrl = docker exec hit_school_backend printenv DATABASE_URL
$databaseUrl = $databaseUrl -replace '@db:5432/', '@127.0.0.1:5432/'
$env:DATABASE_URL = $databaseUrl
npx --prefix backend ts-node --project backend/tsconfig.json backend/seed-change-verification-data.ts
```

### Recorrido web para dar el visto bueno

1. Abre `http://localhost:5173` y accede con la cuenta del rol indicado. Para el correo duplicado `marpargut@hitschool.com`, usa el selector de rol para entrar primero como alumno y después como tutor.
2. Con `profesor@hitschool.com`, abre **Mis clases** y entra en **«PRUEBA CAMBIOS 2026-11 · Clase presencial»**. En **Calificaciones**, selecciona trimestre 1 y `2025-2026`. Comprueba la etiqueta **MIDTERM**, su nota 8, Final 9, MEDIA TAREAS 7,25 y global 8,13. Pulsa **Editar Evaluación**, selecciona la media de tareas, bórrala por completo y escribe `6,79`: el campo debe quedarse vacío mientras escribes y conservar el modo manual. Guarda y vuelve a abrir para confirmar que muestra 6,79; también puedes introducir la coma decimal habitual, que se normaliza al enviar a la API. Restablece MEDIA TAREAS a automática: con las tareas demo debe pasar a 6,75. La global automática se vuelve a calcular desde sus componentes.
3. En el historial del expediente, abre **«PRUEBA CAMBIOS 2026-11 · Tarea presencial MANUAL»**. Comprueba Manual 7,5 frente al paso 8,5; pulsa **Volver a automática** y guarda. La nota de la tarea debe tomar la del paso. Repite con la tarea AUTO, que empieza en 6.
4. Con `admin@hitschool.com`, repite la edición de nota y revisa que puede acceder a la clase. Con el alumno y el tutor, confirma que ven las notas sin poder editarlas.
5. Abre **Mensajes** con cada rol. El alumno debe tener un mensaje pendiente del profesor; el profesor uno del alumno; el tutor mensajes pendientes de sus interlocutores; administración, mensajes del alumno y del tutor. Cada conversación pendiente debe resaltarse en negrita; abrirla no debe modificar la contraseña ni los datos del usuario.
6. Con `admin@hitschool.com`, abre **Gestión de matrículas** (`/teacher/enrollments`). Filtra por `marpargut@hitschool.com` y curso escolar. En `2026-2027` comprueba tres cuotas mensuales pendientes de 65 €. En `2027-2028` comprueba tres cuotas trimestrales pendientes de 60 €/mes.
7. En **Pagos** (`/teacher/payments`), selecciona esos cursos escolares. Marca una cuota y verifica estado pagado, después desmárcala y verifica que vuelve a pendiente. El escenario trimestral ya parte de 60 €/mes; no hace falta cambiar otra matrícula para probarlo.

Para quitar solo este escenario después de probarlo (clase, tareas/notas asociadas, matrículas demo, sus cuotas y mensajes marcados), sin eliminar ni actualizar las cinco cuentas, ejecuta desde la raíz:

```powershell
$databaseUrl = docker exec hit_school_backend printenv DATABASE_URL
$databaseUrl = $databaseUrl -replace '@db:5432/', '@127.0.0.1:5432/'
$env:DATABASE_URL = $databaseUrl
npx --prefix backend ts-node --project backend/tsconfig.json backend/cleanup-change-verification-data.ts
```

El seed y el cleanup incorporan una protección que solo admite `127.0.0.1:5432/hitschool`; no los apuntes al servidor. La base local de desarrollo **sí contiene ahora estos datos de prueba**. La base del servidor no se ha conectado ni modificado.

La incorporación a mitad de trimestre no se modificó por petición expresa y conserva un posible desfase de calendario. El curso académico de notas permanece en `2025-2026`.

La auditoría de dependencias también informa de avisos en `dompurify`, `source-map-js`, `vite` y `xlsx`; su actualización queda separada de estas correcciones funcionales.

El tipado del backend y la compilación del frontend pasan. El lint global sigue bloqueado por tres errores de `rules-of-hooks` en la pantalla de materiales (`MaterialsManagement.tsx`), que no se ha modificado en esta tarea; además muestra advertencias de estilo y efectos React en varios archivos. No debe interpretarse la compilación correcta como un lint global limpio.

---

## 🛠️ 8. Comandos Útiles y Solución de Problemas

### Ver logs en tiempo real de todos los servicios:
```bash
docker-compose logs -f
```

### Ver logs específicos de un contenedor:
```bash
docker logs -f hit_school_backend
docker logs -f hit_school_frontend
docker logs -f hit_school_n8n
```

### Reiniciar un contenedor específico si realizas cambios manuales:
```bash
docker restart hit_school_backend
docker restart hit_school_frontend
```

### Detener todos los servicios:
```bash
docker-compose down
```

### Reiniciar y borrar volúmenes de datos (Reset total):
```bash
docker-compose down -v
docker-compose up -d --build
docker exec hit_school_backend npm run schema:sync
docker exec hit_school_backend npx prisma db seed
```

---

## 📦 9. Estructura del Código

```text
HIT_SCHOOL/
├── docker-compose.yml       # Orquestación de DB, Backend, Frontend y n8n
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma    # Esquema de Base de Datos (Users, Courses, Materials, Posts)
│   │   └── seed.ts          # Script para poblar datos de prueba
│   ├── src/
│   │   ├── index.ts         # Servidor Express y montaje de rutas
│   │   ├── middleware/      # Autenticación JWT y control de roles
│   │   └── routes/          # Endpoints: auth, students, courses, materials
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.tsx          # Enrutador principal (React Router)
│   │   ├── components/      # TeacherLayout, AudioPlayer, VideoPlayer, FormPlayer, FormBuilder
│   │   └── pages/           # Login, TeacherDashboard, CourseView, StudentsManagement, MaterialsManagement
│   └── Dockerfile
└── DEPLOYMENT_WALKTHROUGH.md # Esta guía
```

---
*HitSchool © 2026 — Plataforma Educativa Integral.*

---

## Recursos en Google Drive

Google Drive alojará los archivos, así que no consumirá almacenamiento ni ancho de banda del servidor. HitSchool solo guarda y muestra el enlace.

Para organizar los recursos:

1. Crea una carpeta en Google Drive, por ejemplo `HitSchool - Recursos`.
2. Dentro crea subcarpetas: `Imágenes`, `Vídeos`, `Audios` y `Documentos`.
3. Pulsa con botón derecho en cada carpeta y selecciona `Compartir`.
4. En “Acceso general”, selecciona `Cualquier persona con el enlace`.
5. Asigna el rol `Lector`.
6. Sube los archivos a sus carpetas correspondientes.
7. Para añadir un recurso en HitSchool, abre el archivo concreto, pulsa `Compartir` → `Copiar enlace`, y pega ese enlace individual en Material de Clase.

No pegues el enlace de la carpeta en un recurso: debe usarse siempre el enlace del archivo concreto.

Compatible con:

- Imágenes: se pueden previsualizar.
- Vídeos: compatibles; MP4 es el formato más fiable.
- Audios: compatibles; MP3 es el formato recomendado.
- Documentos/PDF: compatibles.

La carpeta pública facilita que los archivos hereden permisos de lectura, pero HitSchool debe recibir el enlace individual de cada archivo.
