# 📘 HitSchool — Auditoría Exhaustiva del Proyecto & Memoria Técnica (GEMINI.md)

---

## 1. Contexto General y Arquitectura del Sistema

### 1.1 Naturaleza del Proyecto
**HitSchool** es una plataforma educativa integral en la nube orientada a academias de idiomas (específicamente inglés). Combina las funcionalidades de un **LMS (Learning Management System)** estilo Google Classroom, un **sistema de gestión académica y de alumnos (ERP ligero)**, un **motor de exámenes interactivos multimedia autocorregibles**, un **centro de facturación y control de pagos mensuales** y un **portal de comunicación multi-rol (profesores, alumnos y padres/tutores)**.

### 1.2 Stack Tecnológico
- **Frontend:** React 19 + TypeScript + Vite + CSS Nativo (Design System en verde pastel `--primary: #4e9b75` y blanco crudo `--background: #f7f8f5`) + Lucide Icons + React Router v7. Generación de PDFs con `jspdf` y `jspdf-autotable`.
- **Backend:** Node.js (v20) + Express 5 + TypeScript + Prisma ORM 6 + JWT + Bcrypt.
- **Base de Datos:** PostgreSQL 15 en contenedor Docker (`hit_school_db`), tipado con Prisma.
- **Automatización de Procesos / Email:** Motor n8n (`hit_school_n8n`) con webhooks locales para envío de credenciales automáticas y bienvenida por Gmail.
- **Despliegue & Orquestación:** Docker Compose unificado (`hit_school_db`, `hit_school_backend`, `hit_school_frontend`, `hit_school_n8n`).

### 1.3 Módulos y Roles de Usuario
1. **Profesor / Administrador (`TEACHER` / `ADMIN`):**
   - **Administrador (`ADMIN` - Laura):** Dashboard global con supervisión académica y centro de control financiero (métricas de impagos en tiempo real, gestión total CRUD de alumnos, profesores, tutores y creación/asignación de clases).
   - **Profesor (`TEACHER`):** Dashboard pedagógico centrado en la docencia (entregas por calificar, alumnos y aulas asignadas, biblioteca de material didáctico, calificaciones y chat directo), con aislamiento total de métricas y secciones financieras inaccesibles.
   - Gestión de cursos/aulas virtuales: tablón de anuncios, trabajo de clase, matriculaciones.
   - Creación y edición de materiales multimedia (Audio Listening, Vídeos YouTube/Vimeo/MP4, Documentos PDF Drive/Web, Infografías).
   - Form Builder de cuestionarios interactivos con autocorrección (Test múltiple, V/F, respuesta corta y Fill-in-the-blanks con imágenes y audios).
   - Centro maestro de calificaciones con conmutador Presencial vs Online, feedback pedagógico y evaluación final por competencias (CEFR: Grammar, Reading, Writing, Listening, Speaking).
   - Gestión de alumnos con ficha extendida (DNI, teléfono, fecha de nacimiento/edad, dirección, vinculación a tutores) y envío de credenciales por SMTP desde el backend al formalizar la primera matrícula.
   - Matriz visual de control de mensualidades y generación de recibos/facturas en PDF (exclusivo Directora).
   - Chat privado directo con alumnos y padres (hilos contextuales por hijo).
2. **Alumno (`STUDENT`):**
   - Dashboard de bienvenida con estado de cuota, tareas pendientes y media académica.
   - Acceso a sus aulas virtuales, recursos asignados y anuncios del tablón.
   - Resolución de exámenes autocorregibles con revisión pedagógica.
   - Entrega de tareas multiformato (redacción de texto, enlace en la nube, archivos adjuntos de hasta 10MB o solo marcar como realizada).
   - Flujo de tareas estructuradas paso a paso con seguimiento de progreso individual.
   - Consulta de calificaciones, feedback cualitativo del profesor y desglose de competencias.
   - Chat directo con sus profesores asignados.
   - Consulta y descarga de facturas mensuales (si no depende de un tutor).
3. **Padre / Tutor (`PARENT`):**
   - Selector de hijos en el sidebar para alternar entre hermanos matriculados.
   - Supervisión en modo solo lectura de las tareas, clases y notas de sus hijos.
   - Centro familiar de facturación con descarga de recibos PDF de las mensualidades abonadas.
   - Canal de chat exclusivo con los profesores de sus hijos con conversaciones aisladas por cada hijo.

---

## 2. Auditoría Técnica: Compilación, Tipado y Calidad de Código

### 2.1 Estado de Compilación TypeScript (Frontend)
- **Compilación de Producción (`tsc -b && vite build`):** ✅ **100% Libre de Errores.**
  - Se eliminó la variable no leída `enrolledStudents` en `src/pages/TeacherCourses.tsx`.
  - Se verificaron y sincronizaron todas las dependencias (`jspdf`, `jspdf-autotable`, `xlsx`).
  - El frontend compila de forma consistente sin warnings bloqueantes en ~2-4 segundos.

### 2.2 Calidad de Código y Buenas Prácticas React
1. **Propiedades `key` en mapeos JSX:**
   - Resueltos los listados dinámicos en modales y tablas (`StudentCourses.tsx`, `TeacherGrades.tsx`, `TeacherCourses.tsx` y `StudentsManagement.tsx`).
2. **Pestañas y Rutas Sincronizadas:**
   - Sincronización bidireccional entre la URL (`?tab=...`), `sessionStorage` y el estado interno del componente para mantener la pestaña activa al recargar.

### 2.3 Base de Datos y Sincronización Prisma
- **Esquema Sincronizado:** Tablas `StructuredTask`, `StructuredTaskStep`, `StructuredTaskStepProgress`, `StructuredTaskStudent`, `CourseTeacher`, rol `PARENT` y ficha extendida (`dni`, `phone`, `birthDate`, `address`, `schoolYear`, etc.) en `Profile` completamente aplicadas en PostgreSQL mediante Prisma.
- **Jerarquía y Docentes:** Nueva tabla relacional `CourseTeacher` (`@@unique([courseId, teacherId])`) operativa para gestionar la asignación de profesores a cursos online de forma independiente al profesor titular.
- **Semilla Central:** Script `backend/prisma/seed-test-cases.ts` con cuentas de prueba completas para todos los roles (Admin, Profesores, Tutores, Alumnos con y sin tutor).

---

## 3. Estado de Bugs Funcionales y Puntos Críticos (Puntos Rojos y Amarillos)

### 🟢 3.1 [RESUELTO] Cierre Inmediato del Pop-up de Resultados en `FormPlayer`
- **Diagnóstico anterior:** `FormPlayer` cerraba síncronamente el modal contenedor al invocar `onFinish()` tras pulsar *«Enviar y Corregir Examen»*, impidiendo al alumno ver su nota y aciertos.
- **Solución implementada:** Se desacopló la entrega API del ciclo de vida del modal. `onFinish` registra la entrega en segundo plano y actualiza el progreso, mientras `FormPlayer` muestra de forma interactiva el pop-up de 3 pasos (`COMPLETED` -> `GRADE` -> `REVIEW`) con puntuación acumulada, felicitación y revisión de preguntas. El modal solo se cierra cuando el alumno pulsa conscientemente el botón de cierre (`onClose`).

### 🟢 3.2 [RESUELTO] Imposibilidad de Cambio de Contraseña para Alumnos
- **Diagnóstico anterior:** El botón de `SettingsModal` estaba condicionado únicamente a `{userRole === 'PARENT'}` en `StudentLayout.tsx`.
- **Solución implementada:** Se habilitó el acceso a `SettingsModal` para todos los usuarios (`STUDENT` y `PARENT`). Los alumnos disponen del modal para actualizar sus datos de contacto y cambiar su contraseña temporal (`hitXXXX`) por una propia mediante el endpoint seguro `PUT /api/auth/change-password`.

### 🟢 3.3 [RESUELTO] Botón "PDF Impagos" Inoperativo en `EnrollmentsManagement.tsx`
- **Diagnóstico anterior:** El endpoint `GET /api/students` no incluía la relación `paymentStatuses` en su cláusula `select`, provocando que `student.paymentStatuses` fuera `undefined`.
- **Solución implementada:** Se enriqueció la consulta en `backend/src/routes/students.ts` seleccionando `paymentStatuses` (`month`, `year`, `amount`, `isPaid`, `status`, `dueDate`). El botón para descargar el resumen de cuotas pendientes ahora funciona correctamente.

### 🟢 3.4 [RESUELTO] Código Muerto y Soporte del Rol `ADMIN` en `courses.ts`
- **Diagnóstico anterior:** Coexistían dos declaraciones de `GET /:id` en `courses.ts` y se omitía al usuario `ADMIN` en los filtros de acceso a cursos.
- **Solución implementada:** Se eliminó la ruta duplicada. Se integró el soporte nativo para `role === 'ADMIN'`, otorgándole bypass administrativo para consultar, crear, duplicar y eliminar cualquier clase de la academia.

### 🟢 3.5 [RESUELTO] Cuota Mensual "No asignada" en `SettingsModal`
- **Diagnóstico anterior:** `GET /api/auth/me` no incluía la relación `academyEnrollments`, dejando `monthlyFee` como `undefined`.
- **Solución implementada:** Se añadió `academyEnrollments: { select: { monthlyFee, startDate, endDate }, orderBy: { startDate: 'desc' }, take: 1 }` en `backend/src/routes/auth.ts`, devolviendo la cuota real (35€ o 65€) en el perfil del usuario.

### 🟢 3.6 [RESUELTO] Deficiencias en Tarjeta de Revisión de Examen (`TeacherGrades.tsx`)
- **Diagnóstico anterior:** Desalineación en móvil de los botones de acción y ausencia del conteo de preguntas pendientes de revisión.
- **Solución implementada:** Se agruparon los botones en un contenedor flex responsivo, se implementó el distintivo visual ámbar `⏳ X preguntas por calificar` para cuestionarios con preguntas abiertas y se añadió el botón directo *"Corregir Test"* / *"Ver Test"*.

### 🟢 3.7 [RESUELTO] Superposición Estética en `ExamReviewModal.tsx`
- **Diagnóstico anterior:** Fondo opaco gris sólido `#aeb4b7` que rompía la estética Glassmorphism.
- **Solución implementada:** Se actualizó `backdropStyle` a un fondo moderno semitransparente `rgba(15, 23, 42, 0.65)` con desenfoque `backdropFilter: blur(6px)`.

### 🟢 3.8 [RESUELTO] Identidad y Email Dinámico en `TeacherLayout.tsx`
- **Diagnóstico anterior:** El correo en el sidebar inferior del profesor mostraba `<p>profesor@hitschool.com</p>` estático.
- **Solución implementada:** Ahora lee dinámicamente `localStorage.getItem('userEmail')` y muestra el badge distintivo según el rol: `👑 Directora` para `ADMIN` y `👨‍🏫 Profesor` para `TEACHER`.

### 🟢 3.9 [RESUELTO] Especialización y Purga de Secciones Inaccesibles en Dashboard (`DashboardTeacher.tsx`)
- **Diagnóstico anterior:** El widget de *«Control de Pagos e Impagos»* (con enlace a `/teacher/payments`) se renderizaba para todos los usuarios, incluidos los profesores con rol `TEACHER` que no tienen acceso financiero y recibían un error 403. Además, existía un botón en los atajos rápidos apuntando a `/teacher/tasks` que no se correspondía con ninguna ruta del frontend.
- **Solución implementada:**
  - **Sustitución en el Bento Grid:** En la sesión de `TEACHER`, se eliminó cualquier métrica de facturación. En su lugar, el Bento Grid despliega la tarjeta **«Biblioteca de Material Didáctico»** (`/teacher/materials`), informando del total de recursos y cuestionarios disponibles, manteniendo la armonía y altura simétrica de la cuadrícula. Para `ADMIN`, se mantiene la tarjeta de cobros e impagos.
  - **Atajos Rápidos Reorganizados:** Para `TEACHER`, los botones superiores ofrecen accesos directos a *Mis Clases* (`/teacher/courses`), *Calificaciones* (`/teacher/grades`), *Subir Material* (`/teacher/materials`), *Fichas Alumnos* (`/teacher/students`) y *Mensajes* (`/teacher/chat`). Para `ADMIN`, se añade *Control Pagos* (`/teacher/payments`).
  - **Seguridad en Backend (`GET /api/dashboard/teacher`):** Para `TEACHER`, `overduePayments` devuelve `0` de forma estricta y segura, `courseWhere` contabiliza con precisión las aulas asignadas (presenciales y online asignadas), y se suministra el contador `activeMaterials` para la tarjeta pedagógica.
  - **Saludo Contextual:** Saludo personalizado según rol (`¡Buenos días/tardes/noches, Directora!` vs `¡Buenos días/tardes/noches, Profesor!`).

---

## 4. Estado de Componentes, Botones y Conectividad UI

1. **Pestañas de Aula Virtual Integradas:**
   - **`StudentGradesTab.tsx`:** ✅ Conectado en `StudentCourseView.tsx` (Pestaña *"Mis Calificaciones"*). Muestra calificaciones por entregas y evaluación trimestral por competencias CEFR.
   - **`StudentPeopleTab.tsx`:** ✅ Conectado en `StudentCourseView.tsx` (Pestaña *"Compañeros"*). Permite al alumno ver a los integrantes de su clase.
   - **`GradesTab.tsx`:** ✅ Conectado en `CourseView.tsx` (Pestaña *"Calificaciones"* para profesores). Permite calificar tareas y registrar evaluaciones trimestrales directamente desde el aula sin tener que salir a la vista global.
2. **Navegación Contextual desde el Dashboard:**
   - **Botón "Calificar" (`DashboardTeacher.tsx`):** ✅ Enriquecido con el parámetro `navigate('/teacher/grades?student=...')`. En `TeacherGrades.tsx`, se inicializa el filtro de búsqueda y se abre automáticamente el expediente del alumno seleccionado.
3. **Acceso a Facturas desde la Ficha del Alumno:**
   - **Modal de Alumno (`StudentsManagement.tsx`):** ✅ Incorporado botón *"Facturas y Pagos"* para Administradores que redirige al centro de facturación filtrado por el alumno.
4. **Publicación en el Tablón sin Disparo de Notificaciones:**
   - En `StreamTab.tsx` y `POST /api/courses/:id/posts`, los anuncios se guardan en base de datos. Disparo de webhook n8n pendiente de conexión.

---

## 5. Inconsistencias de Experiencia de Usuario y UI/UX

### 5.1 Tareas Estructuradas y Evaluación Abierta
- Soporte completo y genérico para preguntas de respuesta libre (`OPEN_TEXT`) en cualquier cuestionario con evaluación docente y recálculo ponderado en tiempo real.
- Indicadores informativos en el conmutador de vistas de clases (`TeacherCourses.tsx`): contadores de alumnos y tareas pendientes de revisión (`👥 X alumnos`, `⏳ Y con pendientes`, `✓ Al día`).

### 5.2 Posicionamiento y Desbordamiento de Modales
- Modales centrados de forma fija en viewport con `position: fixed; inset: 0`, scroll interno independiente (`overflow-y: auto`) y overlays con desenfoque de fondo.

---

## 6. Comparativa con Documentos Maestros (`REQUIREMENTS.md` y `REFACTORIZACIONES.md`)

| Funcionalidad / Requisito | Estado en Docs | Estado Real en Código | Diagnóstico / Observaciones |
| :--- | :---: | :---: | :--- |
| **Jerarquía y Rol ADMIN Superior** | Requisito clave | ✅ Completado | Laura (`admin@hitschool.com`) con acceso exclusivo a pagos, alta/baja de alumnos/tutores/profesores y creación de clases. |
| **Aislamiento de Clases Online vs Presencial** | Requisito clave | ✅ Completado | Presenciales abiertas a todo el claustro; online privadas solo accesibles por titulares o docentes asignados por Admin. |
| **Asignación Híbrida de Profesores** | Requisito clave | ✅ Completado | Asignación directa desde el aula virtual (`PeopleTab`) o por lote desde gestión de profesores (`TeachersManagement`). |
| **Preguntas de Texto Libre / Redacciones** | Requisito clave | ✅ Completado | Tipo `OPEN_TEXT` en formularios con flujo de corrección docente y aviso *"Nota asignada por profesor, no se autocorrige"*. |
| **Conmutador Cuadrícula / Tabla en Clases** | Requisito clave | ✅ Completado | Selector segmentado con persistencia en `localStorage` y badges resumen de alumnos y pendientes. |
| **Duplicación Inteligente de Clases** | Requisito clave | ✅ Completado | Clonación transaccional reseteando fechas a `null` y desvinculando alumnos. |
| **Pestañas de aula virtual para alumno y profesor** | Parcial | ✅ Completado | `StudentGradesTab`, `StudentPeopleTab` y `GradesTab` completamente integradas en sus respectivas aulas. |
| **Acceso a facturas desde ficha del alumno** | Pendiente (`REQUIREMENTS.md:58`) | ✅ Resuelto | Botón directo *"Facturas y Pagos"* operativo en la ficha del expediente. |
| **Especialización del Dashboard (Admin vs Profesor)** | Requisito clave | ✅ Completado | Widget de pagos exclusivo para Directora; profesores cuentan con tarjeta de Material Didáctico y atajos depurados sin secciones inaccesibles. |
| **Avisos por email al publicar en tablón** | Pendiente (`REQUIREMENTS.md:82`) | Pendiente | El backend guarda el post en Postgres; pendiente emitir webhook a n8n. |

---

## 7. Plan de Acción y Roadmap de Solución

### ✅ Fase 1: Hotfixes Inmediatos y Estabilidad (100% Completada)
- [x] Resolver compilación TypeScript eliminando variables no utilizadas.
- [x] Corregir bug crítico de cierre de `FormPlayer` (pop-up de 3 pasos funcional).
- [x] Habilitar acceso a Ajustes de Cuenta para Alumnos.
- [x] Corregir endpoint `GET /api/students` incluyendo `paymentStatuses`.
- [x] Corregir permisos `ADMIN` y rutas en `courses.ts`.
- [x] Corregir `GET /api/auth/me` incluyendo cuota mensual real.

### ✅ Fase 2: Homogeneización UI/UX, Jerarquía y Conectividad (100% Completada)
- [x] Implementar Jerarquía de Administrador (Laura) vs Profesores normales.
- [x] Especialización del Dashboard de Directora vs Profesor (aislamiento de pagos y tarjeta de material didáctico).
- [x] Soporte para preguntas de texto libre / redacciones en cuestionarios (`OPEN_TEXT`).
- [x] Conmutador de vistas (tarjetas vs tabla) en Mis Clases.
- [x] Duplicación de clases para alumnos independientes.
- [x] Integrar pestañas huérfanas: `StudentGradesTab` y `StudentPeopleTab` en `StudentCourseView`, y `GradesTab` en `CourseView`.
- [x] Conectar botón "Calificar" del dashboard con búsqueda y apertura de expediente.
- [x] Estilizar modales con overlays translúcidos y blur.

### ⏳ Fase 3: Próximos Pasos Prioritarios
1. **Persistencia de Sesión / Cookies (Tarea 7 de `REPORTE_TAREAS.md`):**
   - Ampliar vigencia de token JWT y persistencia en navegador (PC y móvil) para evitar re-inicios de sesión constantes.
2. **Automatización n8n en el Tablón:**
   - Emitir webhook al publicar anuncios para notificar por email a los alumnos y tutores del aula.

---

## 8. Casos de Prueba Sembrados en Base de Datos (Credenciales y Relaciones)

Se ha creado y ejecutado el script `backend/prisma/seed-test-cases.ts` con todos los perfiles, relaciones familiares, cursos, mensualidades y entregas para realizar pruebas exhaustivas en el frontend.

### 🔑 Contraseña Universal
- **Contraseña para todas las cuentas de prueba:** `1234`

### 👥 Matriz de Cuentas y Roles

| Rol | Correo Electrónico | Nombre y Descripción | Relación / Dependencia | Cursos / Datos Clave |
| :--- | :--- | :--- | :--- | :--- |
| `ADMIN` | `admin@hitschool.com` | **Laura (Directora / Admin)** | Administradora principal | Acceso total: pagos, alumnos, profesores, tutores, creación y asignación de clases. |
| `TEACHER` | `profesor1@hitschool.com` | **Carlos** (Profesor B2/C1) | Titular de cursos superiores | Cursos: B2 Cambridge, C1 Advanced. Tareas y chat directo. |
| `TEACHER` | `profesor2@hitschool.com` | **Elena** (Profesora Infantil/A2) | Titular de primaria y jóvenes | Curso: A2 Primaria & Young Learners. Tareas de vocabulario y chat. |
| `PARENT` | `padre.unhijo@hitschool.com` | **Marcos (Padre UnHijo)** | Tutor con **1 hijo** asignado | Hijo: Hugo (`hijo.unico@hitschool.com`). |
| `PARENT` | `padre.doshijos@hitschool.com` | **Lucía (Madre DosHijos)** | Tutora con **2 hijos** (hermanos) | Hijos: Mateo (`hermano.mayor@hitschool.com`) y Sofía (`hermano.menor@hitschool.com`). |
| `STUDENT` | `hijo.unico@hitschool.com` | **Hugo (Hijo Único)** | Hijo de Marcos (Padre UnHijo) | Presencial, 35€/mes. Curso A2. Pagos: Junio/Julio OK, Agosto impagado, Septiembre pendiente. |
| `STUDENT` | `hermano.mayor@hitschool.com` | **Mateo (Hermano Mayor)** | Hijo 1 de Lucía (Madre DosHijos) | Presencial, 65€/mes. Curso B2. **Todos los pagos al día (Mayo-Sep OK)**. Tarea con entrega pendiente de calificar por profesor. |
| `STUDENT` | `hermano.menor@hitschool.com` | **Sofía (Hermana Menor)** | Hija 2 de Lucía (Madre DosHijos) | Online, 35€/mes. Curso A2. Pagos: Mayo/Junio OK, **Julio/Agosto impagados (overdue)**, Septiembre pendiente. |
| `STUDENT` | `alumno.independiente@hitschool.com` | **Álex (Alumno Independiente)** | Alumno sin tutor (`parentId: null`) | Online, 65€/mes. Cursos B2 y C1. Pagos: Abril a Agosto OK, Septiembre pendiente. |

### 🧪 Escenarios de Prueba Verificables en Frontend

1. **Selector Familiar de Hijos en Panel Padre (`padre.doshijos@hitschool.com`):**
   - Probar el dropdown del sidebar para alternar entre **Mateo** y **Sofía**.
   - Verificar que al seleccionar a Mateo aparecen todas sus mensualidades abonadas (con recibos PDF descargables) y el curso B2.
   - Al alternar a Sofía, verificar que aparecen 2 cuotas impagadas/vencidas (35€ de Julio y Agosto) y el curso A2.
   - En la pestaña de Mensajes / Chat de la madre, comprobar que los hilos con el profesor Carlos (sobre Mateo) y con la profesora Elena (sobre Sofía) están perfectamente separados e identifican al hijo.

2. **Panel de Alumno Independiente (`alumno.independiente@hitschool.com`):**
   - Iniciar sesión sin tutor asociado: comprobar que no aparece ningún selector de hijos ni bloqueos de permisos.
   - Acceder a sus dos cursos simultáneos (B2 y C1).
   - Chat directo con el Profesor Carlos sin contexto de tutor.

3. **Flujo de Calificación del Profesor (`profesor1@hitschool.com`):**
   - En el dashboard de Carlos, comprobar la sección de *«Últimas Entregas (Sin Nota)»*: debe aparecer la redacción de Mateo (*"B2 Essay: The Impact of Artificial Intelligence on Jobs"*).
   - Acceder a corregir, asignar nota numérica y redactar feedback pedagógico.
   - Comprobar la tarea estructurada multi-paso *"Módulo Intensivo: Conditionals & Writing B2"* (Mateo tiene los pasos 1 y 2 completos, paso 3 pendiente).

4. **Detección de Impagos y Facturación:**
   - Probar la descarga de facturas y los avisos de recibos atrasados tanto en la vista del profesor/admin como en el centro de facturación de padres.
