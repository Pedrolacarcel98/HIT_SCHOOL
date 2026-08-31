# Requisitos Funcionales — HIT SCHOOL

Documento maestro de especificación de requisitos funcionales y seguimiento de desarrollo.
*Convención de estados:* `[x]` Completado | `[/]` Parcial / En progreso | `[ ]` Pendiente

---

## 1. Módulo Profesor / Administración

### 1.1 Gestión de Tareas y Calificaciones
- [x] Creación y asignación de tareas por clase con título, descripción, fecha límite y categoría de destreza (*Reading, Listening, Writing, etc.*).
- [x] Soporte para tareas sin fecha límite explícita (fecha opcional).
- [/] Visualización estructurada y ordenada para el alumno (clasificada por categorías Core de destreza; pendiente añadir numeración explícita de pasos de actividad).
- [x] Recepción, corrección y revisión de entregas de alumnos (exámenes interactivos se corrigen automáticamente y tareas manuales cuentan con modal de evaluación con calificación numérica sobre 10 y feedback cualitativo).
- [x] **Centro Maestro de Calificaciones del Profesor (`/teacher/grades`):**
  - Vista general por alumnos con buscador, media de calificaciones y expediente académico completo.
  - Vista agrupada por clases/grupos presenciales y online con desglose de entregas y notas medias.
  - Macro-sección conmutadora **Presencial (Academia)** vs **Online / Individuales** disponible en Calificaciones, Mis Clases y Gestión de Alumnos.

### 1.2 Subida y Gestión de Material
- [x] Subida de materiales multimedia mediante enlaces directos y embebidos:
  - **Audio:** Reproductor integrado de Listening con control de velocidad (0.75x–1.5x), salto ±5s y barra de progreso.
  - **Vídeo:** Visor integrado compatible con YouTube, Vimeo y archivos MP4 directos.
  - **Documentos:** Visor embebido para PDFs (Google Drive / enlaces web).
  - **Imágenes / Infografías:** Visor responsivo de imágenes de estudio.
- [x] Organización del repositorio por tipo de recurso, nivel (*A1, A2, B1, B2, C1, C2, General*) y destreza lingüística.
- [x] Asignación directa de materiales de la biblioteca a alumnos específicos o a clases completas con fecha de entrega.

### 1.3 Motor de Exámenes y Cuestionarios
- [x] Creación de cuestionarios interactivos desde modal (*Form Builder*) con autocorrección.
- [x] Soporte de pistas de audio por pregunta para simulacros de *Listening*.
- [/] Soporte multiformato de preguntas:
  - [x] Opción múltiple (*Multiple Choice*).
  - [x] Verdadero / Falso (*True/False*).
  - [x] Respuesta corta (*Short Answer* con normalización case-insensitive).
  - [ ] Completar espacios (*Fill in the blanks* interactivo).
  - [ ] Preguntas con imágenes adjuntas en el enunciado.
- [x] Soporte de destrezas lingüísticas (*Writing, Speaking, Listening, Reading, Grammar & Vocabulary, Mock Exams*).
- [x] Calificación manual por el profesor y feedback detallado desde el panel de calificaciones con botones rápidos y modal interactivo.
- [x] Revisión pedagógica del examen para el alumno con desglose de respuestas correctas, fallos y puntuación total.

### 1.4 Gestión de Alumnos y Ficha de Usuario
- [x] Alta y registro de estudiantes desde panel de administración con generación automática de credenciales (`hitXXXX`).
- [x] Disparo automático de Webhook a **n8n** para envío de credenciales por email al crear alumno.
- [x] Matriculación de alumnos en una o varias clases mediante modal selector interactivo.
- [x] Edición y actualización de datos de alumnos (nombre, apellidos, email, cuota mensual, duración).
- [x] Eliminación segura de alumnos con borrado en cascada.
- [x] Ficha extendida del alumno:
  - [x] Nombre, Apellidos, Email.
  - [x] DNI / NIE.
  - [x] Teléfono de contacto / WhatsApp.
  - [x] Fecha de nacimiento / Edad.
  - [x] Dirección completa.
  - [x] Vinculación a Padre/Tutor pagador (para menores o hermanos con cuenta familiar).
- [x] Asignación de cuota mensual y duración de curso en meses.
- [ ] Acceso y descarga de facturas/recibos en PDF desde la ficha del alumno (disponible en /payments).

### 1.5 Repositorio Central de Contenidos
- [x] Catálogo centralizado de recursos didácticos (`/teacher/materials`).
- [x] Filtros combinados en tiempo real por tipo de medio, nivel y destreza (*Skill*).
- [x] Asignación rápida de contenidos a estudiantes individuales con gestión de accesos y revocación.
- [x] Edición y sustitución de contenidos y exámenes en tiempo real.

### 1.6 Control de Pagos y Facturación
- [x] Matriz visual de estado de cobro por estudiante (Mes actual y 2 meses anteriores) en `/teacher/payments`.
- [x] Indicadores automáticos de estado: **Pagado**, **Pendiente** e **Impago / Overdue** (alerta visual automática pasados 7 días del vencimiento).
- [x] Marcado y desmarcado de pagos con un solo clic (*Toggle Switch*).
- [x] Generación y sincronización automática del calendario de pagos según la duración del curso del alumno.
- [ ] Pagos agrupados por familia/tutor (un solo padre/tutor paga las cuotas de 2 o más hermanos con desglose unificado).
- [/] Soporte de planes tarifarios flexibles (actualmente validado a 35€ y 65€/mes; pendiente soportar pagos trimestrales, descuentos y tarifas personalizadas).
- [x] Persistencia de transacciones y estados de pago en PostgreSQL.

### 1.7 Comunicación y Notificaciones
- [x] Chat privado directo Profesor ↔ Alumno con historial persistente, edición y borrado de mensajes.
- [x] Canal de comunicación privado Profesor ↔ Padres/Tutores (hilos independientes por alumno).
- [x] Tablón de anuncios (*Stream*) por clase para publicaciones y avisos grupales.
- [/] Notificaciones automáticas:
  - [x] Webhook a n8n al crear nuevo alumno.
  - [x] Webhook a n8n para enviar credenciales al Padre/Tutor asignado.
  - [ ] Aviso por email a alumnos/padres al publicar anuncios en el tablón de la clase.
  - [ ] Notificaciones push / alertas en la app.

### 1.8 Control de Calificaciones y Progreso
- [x] Panel de calificaciones por clase para el profesor (`GradesTab.tsx`).
- [x] Panel global de calificaciones para el estudiante (`/student/grades`).
- [x] Desglose y categorización por destrezas (*Skills*: Grammar, Reading, Writing, Listening, Speaking y Nota Global).
- [x] Visualización y edición de observaciones cualitativas por alumno (modal interactivo para el profesor y botón de visualización de comentarios para el alumno).

---

## 2. Módulo Alumno y Familia

### 2.1 Control de Pagos
- [x] Consulta clara de mensualidades, cuotas abonadas y pendientes (`/student`).
- [x] Indicador visual de estado de cuota (*Pagado, Pendiente, Impago*).
- [x] Descarga directa de facturas y recibos en formato PDF (deshabilitado hasta registrar pago).

### 2.2 Material y Tareas
- [x] Visualización de clases matriculadas y acceso al aula virtual (`/student/dashboard` y `/student/course/:id`).
- [x] Tablón de anuncios de la clase con comunicados del profesor.
- [x] Trabajo de clase organizado por destrezas (*Reading, Listening, Writing, Grammar, etc.*).
- [x] Listado de material asignado directamente y contenido individualizado.
- [x] Realización de exámenes interactivos con audio y autocorrección inmediata.
- [x] Entrega de tareas:
  - [x] Envío y marcado de tareas como completadas.
  - [x] Adjunto de enlaces a documentos en la nube (PDFs, Google Docs, grabaciones de audio/video, Drive).
  - [x] Editor de texto para entrega de redacciones (*Writing* / respuestas abiertas) con contador de caracteres.

### 2.3 Calificaciones y Progreso
- [x] Panel de calificaciones con notas numéricas sobre 10.
- [x] Modal interactivo de revisión de exámenes corregidos (respuestas del alumno vs respuestas correctas).
- [x] Acceso directo al documento o material evaluado.

### 2.4 Comunicación
- [x] Chat privado directo con el profesor asignado.
- [x] Visualización en tiempo real de los posts del tablón de anuncios.
- [ ] Notificaciones de nuevos avisos y correcciones recibidas.

---

## 3. Módulo Padres / Tutores (Cuentas Familiares)
- [x] Rol de usuario `PARENT` en base de datos (`Role.PARENT`).
- [x] Modelo relacional Padre ↔ Hijos (`1 Padre : N Alumnos` / Hermanos).
- [x] Alta rápida de alumnos vinculados a padre existente o creación simultánea de Padre + Hijo.
- [x] Portal del Padre / Tutor (`/student` / Panel Adaptado):
  - [x] **Selector de Hijos:** Conmutador en Sidebar para alternar entre sus hijos (Laura, Marta, etc.).
  - [x] **Progreso y Calificaciones:** Expediente de cada hijo con tareas entregadas, pendientes, notas, evaluación final por competencias (Grammar, Reading, Writing, Listening, Speaking) y feedback del profesor.
  - [x] **Aulas Virtuales:** Visualización en modo solo lectura de las clases y avisos del tablón de sus hijos.
  - [x] **Centro de Pagos Familiar:** Gestión de cuotas de los hijos con descarga de facturas en PDF.
- [x] Canal de comunicación / Chat exclusivo Profesor ↔ Padre (hilos de conversación independientes por hijo).