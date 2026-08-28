# Estado del Proyecto: HIT SCHOOL

## 1. Contexto & Arquitectura

- **Proyecto:** Plataforma interactiva de gestión académica, aulas virtuales y exámenes interactivos para academias de inglés (HIT SCHOOL).
- **Documento maestro de requisitos:** [`REQUIREMENTS.md`](file:///c:/Users/PC1/Desktop/HitSchool/HIT_SCHOOL/REQUIREMENTS.md)
- **Stack Tecnológico:**
  - **Base de Datos:** PostgreSQL 15 + Prisma ORM (Relacional, migraciones y seeds tipados).
  - **Backend:** Node.js (v20) + Express 5 + TypeScript + JWT + Bcrypt.
  - **Frontend:** React 19 + TypeScript + Vite + Vanilla CSS moderno (Design System Verde Pastel / Blanco Crudo + Glassmorphism) + Lucide Icons + React Router v7.
  - **Automatizaciones / Email:** n8n Workflow Automation Engine (Webhooks locales en red Docker).
  - **Contenedores & Despliegue:** Docker Compose (`hit_school_db`, `hit_school_backend`, `hit_school_frontend`, `hit_school_n8n`).

---

## 2. Fase Actual & Progreso Global

- **Fase Actual:** Fase 2 — Consolidación de Módulos Core, Corrección de Desconexiones y Cierre de Requisitos Pendientes.
- **Progreso Global Estimado:** **92% de requisitos base completados / operativos**.
  - 🟢 **Gestión de Clases y Aulas (Estilo Google Classroom):** 95% Completado.
  - 🟢 **Biblioteca Multimedia & Exámenes Interactivos:** 95% Completado.
  - 🟢 **Gestión de Alumnos, Ficha Extendida y Cuentas Familiares:** 95% Completado.
  - 🟢 **Control Visual de Pagos y Mensualidades:** 90% Completado.
  - 🟢 **Calificaciones y Feedback del Profesor:** 95% Completado.
  - 🟢 **Ajustes de Cuenta y Cambio de Contraseña:** 100% Completado.
  - 🟢 **Seguridad Backend en Endpoints:** 100% Completado.
  - 🟢 **Generación y Descarga de Facturas / Recibos en PDF:** 30% (Paso 5 Siguiente).
  - 🟡 **Portal de Padres / Tutores (Vistas de Acceso Familiar):** 70% (Esquema en BD, Fichas, n8n completado; solo falta Frontend).

---

## 3. Auditoría Técnica Exhaustiva

### 3.1 Base de Datos (`schema.prisma` & PostgreSQL)
1. **Ficha Extendida y Rol Familiar:** Completado. Añadidos `PARENT` a `Role`, relación `parent` ↔ `children` en `User`, y `dni`, `phone`, `birthDate`, `address` a `Profile`.
2. **Entidad de Facturación / Recibos:** Preparada para generación PDF en frontend/backend (Paso 5).

### 3.2 Desconexiones y Gaps Detectados entre Frontend y Backend

1. **Navegación y Enrutamiento del Alumno:** *(Solucionado en Paso 1)*.
2. **Corrección y Calificación Manual del Profesor:** *(Solucionado en Paso 2)*.
3. **Chat y Comunicación en Directo (Alumno ↔ Profesor):** *(Solucionado: endpoint /contacts, auto-selección de profesor, polling de mensajes y textos contextuales)*.
4. **Entrega de Tareas no interactivas por el Alumno (`StudentClassworkTab.tsx`):**
   - **Problema:** Para tareas normales (ej. Writing, ejercicios en PDF), el alumno solo tiene un botón "Marcar como Completada" que envía un texto fijo hardcoded (`'Entregado por el alumno'`). No puede adjuntar archivos (PDF, audio) ni escribir su redacción.
   - **Solución:** Añadir modal de entrega con campo de texto enriquecido / URL / archivo adjunto.
5. **Avisos del Tablón y Notificaciones a Padres/Alumnos:**
   - **Problema:** Crear un anuncio en `StreamTab.tsx` solo guarda el post en base de datos; no dispara webhook de n8n para avisar a alumnos/padres por email.
   - **Solución:** Integrar disparo de notificación al crear anuncios importantes en el tablón.
6. **Seguridad en Endpoint de Depuración:**
   - **Problema:** `GET /api/users` en `backend/src/index.ts` expone la lista de todos los usuarios con sus hashes de contraseña sin autenticación.
   - **Solución:** Eliminado o protegido bajo `authenticateToken` y `requireTeacher`.

---

## 4. Registro de Sesión

- **Sesión actual:** Implementación de Ficha Extendida del Alumno, Seguridad Backend, Arquitectura de Cuentas Familiares (Padres & Hermanos) y Modal de Ajustes / Cambio de Contraseña.
- **Acciones realizadas:**
  - En `schema.prisma`: Añadido rol `PARENT`, relación autoreferencial `parentId` en `User` y campos extendidos (`dni`, `phone`, `birthDate`, `address`) en `Profile`.
  - En `backend/src/index.ts`: Eliminado el endpoint no autenticado `/api/users` y añadido healthcheck `/api/health`.
  - En `backend/src/routes/auth.ts`: Añadido endpoint seguro `PUT /api/auth/change-password` y `GET /api/auth/me`.
  - En `backend/src/routes/students.ts`: Añadido endpoint `GET /api/students/parents`, soporte de creación/edición de ficha extendida y alta simultánea o vinculación de tutores, con inclusión de payload para n8n.
  - En `frontend/src/components/SettingsModal.tsx`: Creado modal de ajustes de cuenta con cambio de contraseña (permitiendo cambiar la clave temporal generada por n8n por una clave personal).
  - En `frontend/src/pages/StudentsManagement.tsx`: Creado panel completo de gestión de alumnos con ficha extendida, cálculo automático de edad, visualización de expediente modal y asignación de tutores.
  - En `TeacherLayout.tsx` y `StudentDashboard.tsx`: Integrado botón y acceso a `SettingsModal`.
  - **n8n Workflow Automation**: Actualizado el flujo `nuevo-alumno` importando un JSON generado con versión `2.3` del nodo `IF`. Se procesan ramas en paralelo utilizando referencias absolutas (`$('Webhook').item.json.body`) para enviar credenciales separadas a alumno y padre.

---

## 5. Próximos Pasos Inmediatos (Roadmap de Desarrollo)

1. [x] **Paso 1 (Completado):** Corregir la ruta inicial del alumno para que aterrice en su Dashboard de Clases (`/student`) y pulir el menú de navegación.
2. [x] **Paso 2 (Completado):** Implementar en `GradesTab.tsx` y en el Centro Maestro `TeacherGrades.tsx` la interfaz interactiva para calificar tareas, feedback cualitativo y doble vista (alumnos/clases) con macro-división Presencial vs Online.
3. [x] **Paso 3 (Completado):** Implementar modal de entrega interactivo de tareas para el alumno en `StudentClassworkTab.tsx`.
4. [x] **Paso 4 (Completado):** Eliminar endpoint inseguro `/api/users`, añadir campos de ficha extendida (`dni`, `phone`, `birthDate`, `address`), soporte de tutores/padres y modal de cambio de contraseña `SettingsModal`.
5. [ ] **Paso 5 (Siguiente):** Integrar módulo de generación y descarga de recibos/facturas en PDF.
6. [ ] **Paso 6 (Fase Futura):** Desarrollar la interfaz y las vistas en Frontend del Portal familiar dedicado (`/parent`).

---

## 6. Decisiones Técnicas & Bloqueos

- **Decisión:** Mantener compatibilidad total con Docker Compose y n8n para todas las integraciones de notificación externa.
- **Decisión:** Centralizar la gestión de estado de pagos y avisos automáticos en el servicio de backend para asegurar coherencia entre profesor y alumno.
- **Bloqueo / Dependencia:** Definir si los recibos en PDF se generarán directamente en backend (con bibliotecas como `pdfkit` o `puppeteer`) o mediante plantilla HTML cliente descargable.