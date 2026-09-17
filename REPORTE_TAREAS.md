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

- [ ] **4. Jerarquia y Rol ADMIN Superior (Laura)**
  - **Descripcion:** Configurar una jerarquia de permisos administrativos donde unicamente el usuario con rol ADMIN (Laura) tenga permisos para crear clases y asignarlas al resto de profesores, mientras que los profesores gestionan su contenido sin crear aulas globales por su cuenta.
  - **Estado:** ⏳ **Pendiente de atacar.**

- [ ] **5. Redacciones y Writings Sin Limite de Palabras**
  - **Descripcion:** Clarificar y asegurar que las entregas de redaccion / writing se realicen en respuestas de texto libre sin limite restrictivo de palabras o mediante adjuntos multiformato (imagenes, documentos, audios).
  - **Estado:** ⏳ **Pendiente de atacar.**
