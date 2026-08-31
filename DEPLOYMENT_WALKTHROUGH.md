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
```

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

### Paso 5.1: Sincronizar el esquema de tablas en PostgreSQL
```bash
docker exec hit_school_backend npx prisma db push
```

### Paso 5.2: Cargar datos de prueba (Profesor, Alumno y Recursos Didácticos)
```bash
docker exec hit_school_backend npx prisma db seed
```

> **Datos de Acceso Precargados:**
> - 💼 **Profesor:** `profesor@hitschool.com` | Contraseña: `1234`
> - 🎓 **Alumno:** `alumno@hitschool.com` | Contraseña: `1234`

---

## 🤖 6. Configurar n8n para el Envío Automático de Correos

Cuando el profesor da de alta a un nuevo alumno, el backend dispara un Webhook a n8n para que este envíe automáticamente un email con sus credenciales.

### Paso a Paso en n8n:
1. Accede a **[http://localhost:5678](http://localhost:5678)** y crea tu cuenta de administrador local.
2. Crea un nuevo flujo (**"Add workflow"**) y añade un nodo de tipo **Webhook**:
   - **HTTP Method:** `POST`
   - **Path:** `nuevo-alumno`
   - **Webhook URLs:** Verás que la URL de test es `http://localhost:5678/webhook-test/nuevo-alumno`.
3. Haz clic en **"Listen for test event"** en el nodo.
4. Conecta el Webhook a un nodo de **Gmail** (o SMTP):
   - **Acción:** `Send Email`.
   - **To:** `{{ $json.body.email }}`.
   - **Subject:** `¡Bienvenido a HitSchool, {{ $json.body.firstName }}! 🎓`.
   - **Message (HTML):** Usa la plantilla prediseñada con los estilos corporativos de HitSchool.
5. Guarda el flujo y actívalo (**Active: ON**).

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
  - Pulsa **`+ Nuevo Alumno`** y rellena el formulario. Comprueba que n8n recibe los datos y se dispara el webhook.
  - Utiliza el **buscador en tiempo real** para filtrar por nombre o correo.
  - Pulsa el botón de **Editar** (icono de lápiz) para modificar los datos de un alumno.
  - Pulsa el botón de **Eliminar** (icono de papelera) y confirma el borrado seguro en cascada.

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
docker exec hit_school_backend npx prisma db push
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
