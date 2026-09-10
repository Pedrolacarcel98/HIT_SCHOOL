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

- **Fase Actual:** Fase 2 — Consolidación de Módulos Core, tareas estructuradas y cierre de requisitos pendientes.
- **Progreso Global Estimado:** **98% de requisitos base implementados**.
  - 🟢 **Gestión de Clases y Aulas (Estilo Google Classroom):** 95% Completado.
  - 🟢 **Biblioteca Multimedia & Exámenes Interactivos:** 100% Implementado.
  - 🟢 **Gestión de Alumnos, Ficha Extendida y Cuentas Familiares:** 95% Completado.
  - 🟢 **Control Visual de Pagos y Mensualidades:** 95% Implementado.
  - 🟢 **Calificaciones y Feedback del Profesor:** 100% Implementado, incluyendo motor trimestral 35/35/30 presencial y medias online por disciplina.
  - 🟢 **Tareas Estructuradas, Recursos y Progreso Individual:** 100% implementado y sincronizado con PostgreSQL.
  - 🟢 **Ajustes de Cuenta y Cambio de Contraseña:** 100% Completado.
  - 🟢 **Seguridad Backend en Endpoints:** 100% Completado.
  - 🟢 **Exportación de Alumnos a Excel:** exportación `.xlsx` completada; importación masiva pendiente.
  - 🟢 **Portal de Padres / Tutores (Vistas de Acceso Familiar):** 100% (selector de hijos, clases, tablón, tareas, calificaciones, pagos y chat en modo solo lectura).

---

## 3. Auditoría Técnica Exhaustiva

### 3.1 Base de Datos (`schema.prisma` & PostgreSQL)
1. **Ficha Extendida y Rol Familiar:** Completado. Añadidos `PARENT` a `Role`, relación `parent` ↔ `children` en `User`, y `dni`, `phone`, `birthDate`, `address` a `Profile`.
2. **Entidad de Facturación / Recibos:** Preparada para generación PDF en frontend/backend (Paso 5).
3. **Tareas Estructuradas y Progreso:** Añadidos `StructuredTask`, `StructuredTaskStep` y `StructuredTaskStepProgress`, además de relaciones de `Assignment` y `Submission` para los exámenes incluidos en pasos. El esquema está sincronizado con PostgreSQL.

### 3.2 Desconexiones y Gaps Detectados entre Frontend y Backend

1. **Navegación y Enrutamiento del Alumno:** *(Solucionado en Paso 1)*.
2. **Corrección y Calificación Manual del Profesor:** *(Solucionado en Paso 2)*.
3. **Chat y Comunicación en Directo (Alumno ↔ Profesor):** *(Solucionado: endpoint /contacts, auto-selección de profesor, polling de mensajes y textos contextuales)*.
4. **Avisos del Tablón y Notificaciones a Padres/Alumnos:**
   - **Problema:** Crear un anuncio en `StreamTab.tsx` solo guarda el post en base de datos; no dispara webhook de n8n para avisar a alumnos/padres por email.
   - **Solución:** Integrar disparo de notificación al crear anuncios importantes en el tablón.

---

## 4. Registro de Sesión

- **Sesión actual:** Pagos, feedback de exámenes autocorregidos, preguntas con imágenes y huecos, y tareas estructuradas asignables con progreso individual.
- **Acciones realizadas:**
  - En `schema.prisma`: Añadido rol `PARENT`, relación autoreferencial `parentId` en `User` y campos extendidos (`dni`, `phone`, `birthDate`, `address`) en `Profile`.
  - En `backend/src/index.ts`: Eliminado el endpoint no autenticado `/api/users` y añadido healthcheck `/api/health`.
  - En `backend/src/routes/auth.ts`: Añadido endpoint seguro `PUT /api/auth/change-password` y `GET /api/auth/me`.
  - En `backend/src/routes/students.ts`: Añadido endpoint `GET /api/students/parents`, soporte de creación/edición de ficha extendida y alta simultánea o vinculación de tutores, con inclusión de payload para n8n.
  - En `frontend/src/components/SettingsModal.tsx`: Creado modal de ajustes de cuenta con cambio de contraseña (permitiendo cambiar la clave temporal generada por n8n por una clave personal).
  - En `frontend/src/pages/StudentsManagement.tsx`: Creado panel completo de gestión de alumnos con ficha extendida, cálculo automático de edad, visualización de expediente modal y asignación de tutores.
  - En `TeacherLayout.tsx` y `StudentDashboard.tsx`: Integrado botón y acceso a `SettingsModal`.
  - **n8n Workflow Automation**: Actualizado el flujo `nuevo-alumno` importando un JSON generado con versión `2.3` del nodo `IF`. Se procesan ramas en paralelo utilizando referencias absolutas (`$('Webhook').item.json.body`) para enviar credenciales separadas a alumno y padre.
  - En pagos: unificada la regla de estados en los tres paneles: pagado si `isPaid`, pendiente si es el mes actual e impago si la cuota no abonada pertenece a un mes anterior; factura disponible solo para pagos abonados.
  - En exámenes: añadidos imágenes por pregunta, preguntas de completar espacios con sintaxis de paréntesis, validación sensible a mayúsculas opcional y revisión compatible con ambos formatos.
  - En calificaciones: habilitado feedback pedagógico para exámenes autocorregidos, con persistencia en `Submission.feedback` y actualización inmediata de los tres paneles.
  - En tareas estructuradas: creadas tareas con pasos, materiales por paso, asignación a clase o alumno, recursos interactivos, progreso individual y exámenes de intento único registrados como entregas estándar.
  - En plantillas de tareas estructuradas: corregido el guardado desde tareas de clase, duplicación, edición, borrado y reutilización desde Material de Clase.
  - En el dashboard del alumno: incorporado el recuento de tareas estructuradas pendientes junto a las tareas normales.
  - En entregas estructuradas: restaurada la apertura del modal desde las casillas de vídeo, audio y documento, con envío de redacción y adjuntos.
  - En calificaciones: los adjuntos PDF del alumno se abren en una pestaña nueva y disponen de descarga independiente.
  - En programación de tareas: añadido `publishAt` opcional para tareas normales, asignaciones directas y tareas estructuradas. Profesor puede programar o reprogramar; alumno y tutor no ven contenidos futuros.
  - En recursos: añadido selector visual de audios e imágenes existentes al creador de exámenes, previsualización de Google Drive y apertura compatible de documentos, vídeos y audios.
  - En tablón: habilitada la publicación de imágenes y vídeos locales o mediante URL de Google Drive, con selector de tipo, reproducción/previsualización y descarga para profesor, alumno y tutor.
  - En chat: habilitada supervisión global de conversaciones para profesorado, con hilos independientes por profesor para alumno/tutor.
  - En Gestión de Alumnos: incorporada exportación `.xlsx` y campos opcionales de curso escolar, alergias, autorización de imagen y observaciones.
  - En calificaciones: las entregas posteriores a la fecha límite siguen permitidas y se identifican como fuera de plazo.
  - En calificaciones trimestrales: sincronizados los paneles de alumno y profesor mediante `TermGrade`, con selector de 1º, 2º y 3º trimestre.
  - En modalidad presencial: aplicada la ponderación 35% `Middle Term` + 35% `Final Term` + 30% tareas prácticas.
  - En modalidad online: calculadas automáticamente las medias de Grammar, Reading, Writing, Listening y Speaking; las disciplinas sin tareas calificadas se muestran como `-` y no afectan a la media global.
  - En historiales trimestrales: excluidos recursos sin contenido evaluable y admitidas entregas reales de texto, enlaces, archivos o notas aunque procedan de vídeo, imagen o documento.
  - En el expediente del profesor: añadido selector trimestral, historial filtrado por trimestre, edición de notas del trimestre activo y selector de alumnos por clase.
  - Validaciones de esta iteración: TypeScript frontend/backend y `prisma validate` correctos. No se ejecutó `build`.

---

## 5. Próximos Pasos Inmediatos (Roadmap de Desarrollo)

1. [x] **Paso 1 (Completado):** Corregir la ruta inicial del alumno para que aterrice en su Dashboard de Clases (`/student`) y pulir el menú de navegación.
2. [x] **Paso 2 (Completado):** Implementar en `GradesTab.tsx` y en el Centro Maestro `TeacherGrades.tsx` la interfaz interactiva para calificar tareas, feedback cualitativo y doble vista (alumnos/clases) con macro-división Presencial vs Online.
3. [x] **Paso 3 (Completado):** Implementar modal de entrega interactivo de tareas para el alumno en `StudentClassworkTab.tsx`.
4. [x] **Paso 4 (Completado):** Eliminar endpoint inseguro `/api/users`, añadir campos de ficha extendida (`dni`, `phone`, `birthDate`, `address`), soporte de tutores/padres y modal de cambio de contraseña `SettingsModal`.
5. [/] **Paso 5 (En curso):** Consolidar generación y descarga de recibos/facturas en PDF, incluyendo acceso desde la ficha del alumno.
8. [x] **Paso 8 (Completado):** Sincronizar el motor de calificaciones trimestrales entre panel de alumno y profesor, con medias por modalidad y filtrado de contenido evaluable.
6. [x] **Paso 6 (Completado):** Consolidar las vistas familiares; selector de hijos, tablón, pagos, calificaciones y tareas estructuradas están integrados en el panel adaptado.
7. [x] **Paso 7 (Completado):** Sincronizar Prisma y validar el flujo de tareas estructuradas/exámenes con profesor, alumno y tutor.

---

## 6. Decisiones Técnicas & Bloqueos

- **Decisión:** Mantener compatibilidad total con Docker Compose y n8n para todas las integraciones de notificación externa.
- **Decisión:** Centralizar la gestión de estado de pagos y avisos automáticos en el servicio de backend para asegurar coherencia entre profesor y alumno.
- **Decisión:** Las tareas estructuradas y su progreso se persisten en PostgreSQL. Los exámenes estructurados crean una `Assignment` y una única `Submission` estándar para reutilizar Calificaciones, revisiones y feedback.
- **Bloqueo / Dependencia:** Definir si los recibos en PDF se generarán directamente en backend (con bibliotecas como `pdfkit` o `puppeteer`) o mediante plantilla HTML cliente descargable.