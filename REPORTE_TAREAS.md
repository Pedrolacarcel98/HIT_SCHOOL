# 📋 Reporte de Tareas y Mejoras — HitSchool

Lista de control para el seguimiento y resolucion de las tareas, bugs y peticiones del equipo.

---

## 📌 Estado de las Tareas

- [x] **1. Correccion Exhaustiva de Reproduccion y Revision de Audios**
  - **Descripcion:** El profesor y el alumno no podian reproducir adecuadamente pistas de listening ni grabaciones en cuestionarios y materiales.
  - **Solucion implementada:**
    - Se elimino el \iframe\ rigido de 84px de Google Drive en \AudioPlayer.tsx\.
    - Se implemento un endpoint proxy de streaming en backend (\GET /api/materials/proxy-audio\) con soporte de peticiones parciales (\206 Partial Content\, \Range: bytes\), eliminando el bloqueo \Cross-Origin-Resource-Policy: same-site\ impuesto por Google Drive.
    - Se anadio \AudioPlayer\ a \ExamReviewModal.tsx\ para escuchar pistas en la correccion de listening por parte del profesor.
    - Se integro reproduccion de audio en \AttachmentViewerModal.tsx\, \TaskDeliveryReviewModal.tsx\ y \TeacherGrades.tsx\ para grabaciones y archivos adjuntos entregados por alumnos.
    - Se integro la reproduccion en la revision pedagogica de \FormPlayer.tsx\.
  - **Estado:** ✅ **Completado y Verificado.**

- [x] **2. Correo Dinamico al Dar de Alta Alumnos (Nuevo Alumno vs Cuenta Reactivada)**
  - **Descripcion:** Al registrar a un alumno en el sistema y pulsar el boton *«Dar de alta»*, el correo enviado siempre decia *"Cuenta reactivada"*. Ahora es dinamico:
    - **Primera alta (alumno nuevo):** Se invoca \`sendStudentWelcomeEmail\` con asunto *"Bienvenido a HitSchool"* y plantilla de bienvenida oficial con credenciales.
    - **Reactivacion (alumno reincorporado):** Si el alumno ya estuvo matriculado previamente (\`previousEnrollmentsCount > 0\`), se invoca \`sendAccountReactivationEmail\` informando de la reactivacion de su cuenta para el nuevo curso.
    - **Borrado completo:** Si se elimina al alumno desde la gestion de alumnos, sus matrículas se purgan en cascada; al volver a registrarlo y matricularlo se procesa como primera alta.
  - **Estado:** ✅ **Completado y Verificado.**

- [x] **3. Duplicar Clase**
  - **Descripcion:** Clonar una clase existente replicando su estructura y sus tareas estructuradas completas, pero sin los alumnos matriculados y sin las fechas de publicacion ni de entrega de las tareas originales (para fijar las del nuevo alumno o curso).
  - **Solucion implementada:**
    - Endpoint backend `POST /api/courses/:id/duplicate` transaccional con clonacion de tareas estructuradas (`StructuredTask`), pasos (`StructuredTaskStep`) y recursos asociados.
    - Reseteo automatico de fechas a `null` (`dueDate: null`, `publishAt: null`, `notificationSentAt: null`).
    - Desvinculacion total de alumnos (`assignedStudentId: null`, `enrollments: []`) y exclusion de entregas o notas anteriores.
    - Soporte en `GET /api/courses` y `verifyCourseAccess` para permisos globales de `ADMIN`.
    - Modal de duplicacion intuitivo con nombre editable y selector de modalidad integrado en el menu de tarjetas de `TeacherCourses.tsx` y en la cabecera del aula en `CourseView.tsx`.
  - **Estado:** ✅ **Completado y Verificado.**

- [x] **4. Conmutador de Vistas en Mis Clases (Cuadrícula vs Tabla Resumen)**
  - **Descripcion:** Permitir alternar la visualización del listado de clases entre el modo tarjetas actual y un modo tabla resumen ligero, compacto e intuitivo. Debe mostrar globos/etiquetas breves con el nº de alumnos y alumnos con tareas pendientes, sin sobrecargar la interfaz.
  - **Solucion implementada:**
    - Conmutador visual con botones segmentados (`LayoutGrid` y `List`) en la barra superior de `TeacherCourses.tsx`.
    - Persistencia automática de la preferencia (`grid` o `table`) en `localStorage` (`hit_courses_view_mode`).
    - Enriquecimiento de `GET /api/courses` con cálculo ágil en memoria de `studentsCount` y `pendingStudentsCount`.
    - Etiquetas/globos informativos concisos:
      - Alumnos: `👥 X alumnos` (o `— Sin alumnos`).
      - Tareas: `⏳ Y con pendientes` (ámbar si hay entregas pendientes de revisión o tareas sin entregar) o `✓ Al día` (verde si todo está entregado y calificado).
    - Filas interactivas en modo tabla: clic en cualquier parte de la fila para entrar al aula, botón directo "Entrar →" y menú contextual de 3 puntos (Editar, Duplicar, Eliminar).
    - Enriquecimiento equivalente en la vista de tarjetas con los mismos globos informativos sutiles en el pie de tarjeta.
  - **Estado:** ✅ **Completado y Verificado.**

- [x] **5. Jerarquia y Rol ADMIN Superior (Laura)**
  - **Descripcion:** Implementación de la jerarquía completa de permisos entre `ADMIN` (Laura) y `TEACHER` (profesores normales), garantizando el aislamiento de clases online, la accesibilidad de clases presenciales y el control centralizado de la academia.
  - **Solucion implementada:**
    - **Credenciales y Modelo:** Cuenta central `admin@hitschool.com` (Laura, `ADMIN`). Modelo `CourseTeacher` en Prisma para asociar profesores a cursos con migración y cliente regenerado.
    - **Módulo de Pagos (`/teacher/payments`):** Exclusivo para `ADMIN`. Enlace en el sidebar visible solo para admin, redirección automática si un profesor intenta acceder manualmente y endpoints backend asegurados con `requireAdmin`.
    - **Directorio de Alumnos, Profesores y Tutores:** `ADMIN` tiene control total CRUD (crear, editar, eliminar, dar de alta/baja, matricular). Los profesores tienen acceso de solo lectura (pueden consultar fichas y expedientes, pero no modificar, eliminar ni crear).
    - **Clases Presenciales vs Online:**
      - **Presencial:** Accesible y gestionable de manera transparente por todos los profesores (aparición automática en listados y permisos de gestión de tareas).
      - **Online:** Estrictamente aislada. Los profesores solo ven y acceden a las clases online donde son titulares o han sido explícitamente asignados por la administración.
    - **Asignación Híbrida de Profesores (Aprobada):**
      - **Desde el Aula Virtual (`PeopleTab.tsx`):** Sección *"Profesores de la Clase"* donde el Admin puede asignar o desasignar profesores en clases online mediante selector desplegable.
      - **Desde Gestión de Profesores (`TeachersManagement.tsx`):** Botón *"Clases Asignadas"* con modal multi-selección para revisar y actualizar por lote las clases online asignadas a cada docente.
    - **Creación y Duplicación de Aulas:** Botones `+ Nueva Clase`, `Duplicar Clase` y `Eliminar Clase` restringidos exclusivamente al rol `ADMIN`.
    - **Especialización de Dashboard (Admin vs Profesor):**
      - El widget y métricas de facturación (`Control de Pagos e Impagos`) se muestran únicamente para `ADMIN` enlazando a `/teacher/payments`. Para los profesores normales (`TEACHER`), se oculta cualquier referencia o número de impagos, sustituyéndose en el Bento Grid por la **Biblioteca de Material Didáctico** (`/teacher/materials`) con el número de recursos y cuestionarios disponibles, manteniendo la simetría y armonía visual de la cuadrícula.
      - Los atajos rápidos superiores se ajustan a las secciones permitidas: para `TEACHER` se integran accesos directos a *Mis Clases*, *Calificaciones*, *Subir Material*, *Fichas Alumnos* y *Mensajes* (sin botón de pagos ni rutas rotas); para `ADMIN` se incluye el botón directo *Control Pagos*.
      - En el backend (`GET /api/dashboard/teacher`), para profesores normales `overduePayments` devuelve `0` de forma segura y los conteos de `activeCourses` y `activeStudents` respetan las clases presenciales y online asignadas.
    - **Identidad Visual:** Distintivo `👑 Directora` vs `👨‍🏫 Profesor` en cabecera, sidebar y saludo contextual del dashboard (`¡Buenos días, Directora!` vs `¡Buenos días, Profesor!`).
  - **Estado:** ✅ **Completado y Verificado.**

- [x] **6. Redacciones, Writings y Preguntas de Texto Libre en Cuestionarios (`OPEN_TEXT`)**
  - **Descripcion:** Soporte completo y genérico para preguntas de respuesta abierta/texto libre (`OPEN_TEXT`) en cualquier formulario o examen interactivo, permitiendo redactar sin límites de palabras ni caracteres y habilitando la corrección manual docente.
  - **Solucion implementada:**
    - **Form Builder (`FormBuilderModal.tsx`):**
      - Nuevo tipo de pregunta: *"Texto Libre / Redacción"* (`OPEN_TEXT`) aplicable a cualquier cuestionario.
      - Aviso claro y conciso: *"Nota asignada por profesor, no se autocorrige."*
      - Ponderación de puntos configurable por pregunta.
    - **Resolución del alumno (`FormPlayer.tsx`):**
      - Campo de texto libre multilinea `<textarea>` sin límite de palabras ni caracteres.
      - Autocorrección universal condicional: si el examen contiene $\ge$ 1 pregunta abierta, no se califica automáticamente con un 0% ni muestra fallo; se registra la entrega, se califica como *"Calificación Pendiente"* (`grade: null`), informando del número de preguntas pendientes de revisión.
    - **Evaluación y Revisión Docente (`ExamReviewModal.tsx`):**
      - Bloqueo estricto de preguntas tipo test u objetivas: mantienen su puntuación original inalterable.
      - Calificación individual de preguntas abiertas con tarjeta destacada en ámbar (`⏳ Pendiente de calificar`) y selector de puntos entre 0 y el máximo de la pregunta.
      - Recálculo dinámico en tiempo real de la puntuación acumulada y nota final sobre 10.
      - Caja única de observaciones y feedback pedagógico general del examen.
    - **Panel y Listados de Calificaciones (`TeacherGrades.tsx` & `GradesTab.tsx`):**
      - Distintivo visual ámbar con conteo: `⏳ X preguntas por calificar`.
      - Botón de acción destacado *"Corregir Examen"*.
      - Inclusión automática en los contadores y filtros de tareas pendientes de revisión (`PENDING`).
      - Arreglo de alineación y flex wrap en las tarjetas de examen y expediente.
    - **Backend (`structuredTasks.ts` & `assignments.ts`):**
      - Detección de `hasOpenText` y cálculo de `baseScore` objetivo en `gradeForm`.
      - Si `openTextCount > 0`, la entrega se guarda con `grade: null`.
      - Endpoint `POST /api/assignments/submissions/:subId/grade` enriquecido para recibir y persistir `questionScores`, sincronizando la entrega en la tarea estructurada.
  - **Estado:** ✅ **Completado y Verificado.**

- [ ] **7. Persistencia de Sesión / Recordar Acceso (PC y Móvil)**
  - **Descripcion:** Mantener la sesión activa en el navegador para que los alumnos (y tutores/profesores) no tengan que introducir usuario y contraseña constantemente, garantizando un acceso fluido y continuo tanto desde el ordenador como desde el móvil.
  - **Alcance clave:**
    - Ampliación de la vigencia del token JWT (actualmente 24h) a duración prolongada (ej. 30 días) para evitar cierres de sesión forzados continuos.
    - Persistencia fiable de credenciales de sesión en navegador/móvil mediante almacenamiento/cookie persistente que no expire al cerrar la pestaña o el navegador del teléfono.
    - Revalidación automática en segundo plano (`GET /api/auth/me`) para arrancar sesión directamente sin pasar por el login si el token sigue siendo válido.
  - **Estado:** ⏳ **Pendiente de atacar.**


