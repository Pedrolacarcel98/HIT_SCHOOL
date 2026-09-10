# 📋 Requisitos Funcionales — HIT SCHOOL

Documento maestro de especificación de requisitos funcionales, trazabilidad y seguimiento de desarrollo.
*Convención de estados:* `[x]` Completado | `[/]` Parcial / En progreso | `[ ]` Pendiente

---

## 🌟 0. Requisitos de la Reunión con el Cliente (Prioridad Actual)

A continuación se detallan los 11 requerimientos acordados en la última reunión con el cliente, su alcance funcional y su estado de ejecución:

| # | Requisito del Cliente | Alcance Funcional Resumido | Estado |
| :-: | :--- | :--- | :-: |
| **1** | **Extractos de pago por años con total** | Filtro por ejercicio anual y cuadro de totales (Total Facturado, Total Abonado, Saldo Pendiente) en el PDF. | `[x] Completado` |
| **2** | **Calificaciones trimestrales (Middle & Final Term)** | 2 notas trimestrales. Presencial: media entre Middle/Final y tareas. Online: media 100% automática de tareas y exámenes. | `[ ] Pendiente` |
| **3** | **Programación diferida de tareas** | Programar fecha/hora de publicación de tareas estilo Google Classroom (ocultas para el alumno hasta la fecha). | `[x] Completado` |
| **4** | **Recursos del profesor mediante Google Drive** | El docente comparte recursos mediante enlaces individuales de Google Drive y el alumno puede descargar, completar y adjuntar documentos en su entrega. | `[x] Completado` |
| **5** | **Previsualización de audio en creador de exámenes** | Reproductor visual inmediato al asociar una pista de audio opcional a una pregunta interactiva. | `[x] Completado` |
| **6** | **Acceso directo Web desde móvil y ordenador (PWA)** | Configuración de Web App Manifest, meta tags e iconos para instalación directa en pantalla de inicio. | `[ ] Pendiente` |
| **7** | **Fotos y vídeos locales en Tablón de Anuncios** | Subida y reproducción directa de imágenes y vídeos almacenados localmente en las publicaciones de clase. | `[x] Completado` |
| **8** | **Chat con visibilidad global para docentes** | Todos los profesores/administradores ven todos los chats de la academia; el alumno solo ve a quien se dirige. | `[x] Completado` |
| **9** | **Paleta de fondos visuales y mayor contraste** | Rediseño visual con fondos diferenciados por sección y badges cromáticos para aumentar el engagement. | `[ ] Pendiente` |
| **10** | **Vuelco masivo de alumnos (Exportar / Importar Excel)** | Descarga de expedientes a Excel/CSV e importador masivo con vista previa y creación transaccional. | `[/] Parcial` |

---

### Detalle de los 11 Puntos del Cliente

### 0.1 Extracto de Pagos por Años con Desglose de Totales `[x]`
- [x] Selector de ejercicio/año dinámico en la interfaz del profesor (`/teacher/payments`) y del alumno/padre (`/student/payments`).
- [x] Soporte en el generador de PDF (`generateStatementPDF`) para filtrar las mensualidades abonadas por año o emitir histórico completo.
- [x] Inclusión del ejercicio fiscal en la cabecera del documento y en el nombre del archivo (`Extracto_{Alumno}_{Año}.pdf`).
- [x] Tabla simplificada con `Periodo / Mensualidad`, `Importe` y `Fecha de Pago`, sin estados de impago.
- [x] Fila final `TOTAL` con el importe abonado, sin bloque adicional de resumen.
- [x] Paginación dinámica multihélice (*Página X de Y*).

### 0.2 Motor de Calificaciones Trimestrales (Middle Term y Final Term) `[ ]`
- [ ] Definición de estructura académica por trimestres (1º, 2º y 3º trimestre) con dos hitos evaluativos principales:
  - **Middle Term:** Calificación intermedia del trimestre.
  - **Final Term:** Calificación final del trimestre.
- [ ] **Lógica para Alumnos Presenciales (Academia):**
  - La nota final trimestral se calcula combinando las calificaciones formales de exámenes (*Middle* y *Final Term*) introducidas por el profesor y la nota media ponderada de las entregas y tareas prácticas.
  - Ponderación configurable o media aritmética entre examen y trabajo continuo.
- [ ] **Lógica para Alumnos Online / Individuales:**
  - El cálculo de las calificaciones finales trimestrales debe ser **100% automático** a partir del promedio ponderado en tiempo real de todas las tareas, tests autocorregibles y redacciones entregadas en la plataforma durante ese periodo.
- [ ] Interfaz de visualización para alumnos y padres con el desglose trimestral (*Middle*, *Final*, *Media Tareas* y *Calificación Definitiva*).

### 0.3 Programación de Tareas Diferidas (Estilo Google Classroom) `[x]`
- [x] Soporte para campo `publishAt` (fecha y hora) en la creación y edición de tareas, materiales asignados y tareas estructuradas.
- [x] **Visibilidad condicionada:**
  - El profesor puede ver las tareas programadas con un badge distintivo (*"Programada para el DD/MM/AAAA HH:mm"*).
  - Los alumnos y tutores no ven la tarea ni reciben notificación hasta que se alcanza la fecha y hora programada.
- [x] Publicación automática al expirar la fecha de programación mediante filtros de visibilidad en backend.

### 0.4 Recursos del Profesor mediante Google Drive `[x]`
- [x] El docente vincula documentos PDF/Office, audios, imágenes y vídeos mediante enlaces individuales compartidos de Google Drive en Material de Clase.
- [x] Los recursos se visualizan o reproducen con compatibilidad para Google Drive, sin consumir almacenamiento del servidor de HitSchool.
- [x] El alumno puede abrir o descargar un documento, completarlo y adjuntarlo opcionalmente desde su dispositivo al entregar la tarea.
- [x] El profesor puede revisar y descargar el archivo adjunto por el alumno desde Calificaciones.

### 0.5 Reproductor Visual de Audios en el Creador de Exámenes `[x]`
- [x] Al seleccionar una pista de audio existente en Material de Clase para una pregunta del Form Builder:
  - Mostrar de inmediato un reproductor interactivo embebido con controles (play/pause, barra de progreso y volumen).
  - Permitir al profesor escuchar y validar el corte de audio antes de guardar el examen.

### 0.6 Acceso Directo Web / PWA (Móvil y Escritorio) `[ ]`
- [ ] Configuración de `manifest.webmanifest` / `manifest.json` con nombre de la app (*HitSchool*), colores corporativos (`#4e9b75`), iconos adaptativos (192x192 y 512x512) y orientación vertical preferente.
- [ ] Meta tags para Safari/iOS (`apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-touch-icon`).
- [ ] Banner / Botón accesible en la interfaz para instalar como acceso directo en escritorio (Chrome/Edge) o móvil (Android/iOS).

### 0.7 Soporte Multimedia Local y Google Drive en el Tablón de Anuncios (`Stream`) `[x]`
- [x] Posibilidad de adjuntar imágenes y vídeos desde el almacenamiento local del dispositivo al publicar un anuncio en el aula.
- [x] Almacenamiento en el servidor mediante endpoint multipart y directorio `uploads/posts`.
- [x] Posibilidad de publicar una URL de Google Drive indicando si contiene una imagen o un vídeo.
- [x] Conversión de enlaces de Drive a URLs compatibles con visualización y reproducción en el navegador.
- [x] Visor integrado en el tablón para reproducir vídeo, mostrar imágenes y descargar archivos desde profesor, alumno y tutor.

### 0.8 Visibilidad de Chat Multi-Profesor / Supervisión Centralizada `[x]`
- [x] **Acceso Docente / Administrativo:** Cualquier profesor o administrador puede consultar y participar en las conversaciones abiertas con los alumnos o padres de la academia (supervisión colegiada del equipo docente).
- [x] **Aislamiento del Alumno / Padre:** El alumno y el tutor solo ven la conversación con su profesor asignado y a quien se están dirigiendo específicamente, sin visibilidad sobre hilos de otros compañeros.

### 0.9 Diseño Visual Enriquecido con Fondos y Acentos de Color `[ ]`
- [ ] Introducción de gradientes y tonalidades suaves de fondo que rompan la monotonía de pantallas planas.
- [ ] Asignación de códigos de color por tipo de actividad y estado:
  - Tareas pendientes: acentos ámbar / cálidos suaves.
  - Tareas completadas: verdes menta corporativos.
  - Exámenes y evaluaciones: azules/violetas pastel.
- [ ] Mayor contraste y jerarquía tipográfica en paneles, tarjetas y cabeceras.

### 0.10 Exportación e Importación Masiva de Alumnos (Excel / CSV) `[/]`
- [x] **Exportación a Excel (`.xlsx`):**
  - Descarga con 1 clic desde Gestión de Alumnos con: nombre, apellidos, correo, fecha de nacimiento, curso escolar, padre/madre, móvil, grupo, alergias, autorización de imagen y observaciones.
- [ ] **Importación Masiva desde Excel:**
  - Asistente de carga de ficheros Excel/CSV con plantilla modelo descargable.
  - Mapeo automático de columnas y vista previa interactiva con validación previa de duplicados (email o DNI).
  - Creación masiva transaccional en base de datos con alta de usuarios, perfiles, generación de credenciales automáticas y disparo opcional de webhooks a n8n.

---

## 1. Módulo Profesor / Administración

### 1.1 Gestión de Tareas y Calificaciones
- [x] Creación y asignación de tareas por clase con título, descripción, fecha límite y categoría de destreza (*Reading, Listening, Writing, etc.*).
- [x] Soporte para tareas sin fecha límite explícita (fecha opcional).
- [x] Visualización estructurada y ordenada para el alumno (clasificada por categorías Core de destreza y tareas estructuradas con pasos numerados, materiales vinculados y progreso individual).
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
- [x] Soporte multiformato de preguntas:
  - [x] Opción múltiple (*Multiple Choice*).
  - [x] Verdadero / Falso (*True/False*).
  - [x] Respuesta corta (*Short Answer* con normalización case-insensitive).
  - [x] Completar espacios (*Fill in the blanks* interactivo) mediante texto con soluciones entre paréntesis.
  - [x] Preguntas con imágenes adjuntas en el enunciado.
- [x] Soporte de destrezas lingüísticas (*Writing, Speaking, Listening, Reading, Grammar & Vocabulary, Mock Exams*).
- [x] Calificación manual por el profesor y feedback detallado desde el panel de calificaciones.
- [x] Revisión pedagógica del examen para el alumno con desglose de respuestas correctas, fallos y puntuación total.
- [x] Duplicación profunda de exámenes con 1 clic (`POST /api/materials/:id/duplicate`) conservando preguntas y estructura.

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
- [x] Acceso directo al control de pagos y facturas desde la ficha del alumno en `StudentsManagement.tsx`.

### 1.5 Repositorio Central y Catálogo de Plantillas
- [x] Catálogo centralizado de recursos didácticos (`/teacher/materials`).
- [x] Filtros combinados en tiempo real por tipo de medio, nivel y destreza (*Skill*).
- [x] Catálogo de Plantillas de Tareas (`StructuredTask` con `isTemplate: true`):
  - Creación de módulos modelo de 1 o N pasos.
  - Guardado de cualquier tarea existente como plantilla reutilizable (`POST /:id/save-as-template`).
  - Despliegue inmediato de plantillas a clases activas con ajuste de fecha límite.
- [x] Edición reconciliadora y no destructiva de tareas (preserva las entregas y notas previas de los alumnos).

### 1.6 Control de Pagos y Facturación
- [x] Matriz visual de estado de cobro por estudiante en `/teacher/payments`.
- [x] Indicadores automáticos de estado: **Pagado**, **Pendiente** e **Impago** con actualización reactiva.
- [x] Marcado y desmarcado de pagos con un solo clic (*Toggle Switch*).
- [x] Generación y sincronización automática del calendario de pagos según la duración del curso del alumno.
- [x] Generación de facturas individuales en PDF con numeración oficial.
- [x] **Generación de extractos de cuenta anuales o históricos consolidados con desglose de totales (Punto 1).**
- [ ] Pagos agrupados por familia/tutor (factura única consolidada para hermanos).
- [/] Soporte de planes tarifarios flexibles (35€ y 65€/mes validados; pendiente tarifas trimestrales y personalizadas).

### 1.7 Comunicación y Notificaciones
- [x] Chat privado directo Profesor ↔ Alumno con historial persistente.
- [x] Canal de comunicación privado Profesor ↔ Padres/Tutores (hilos independientes por hijo).
- [x] Tablón de anuncios (*Stream*) por clase para publicaciones grupales.
- [/] Notificaciones automáticas:
  - [x] Webhook a n8n al crear nuevo alumno.
  - [x] Webhook a n8n para enviar credenciales al Padre/Tutor asignado.
  - [ ] Aviso por email a alumnos/padres al publicar anuncios en el tablón de la clase.
  - [ ] Notificaciones push en la app.

---

## 2. Módulo Alumno y Familia

### 2.1 Control de Pagos
- [x] Consulta clara de mensualidades, cuotas abonadas y pendientes (`/student/payments`).
- [x] Indicador visual de estado de cuota (*Pagado, Pendiente, Impago*).
- [x] Descarga directa de facturas y recibos en formato PDF (habilitado tras confirmar pago).
- [x] **Selector de año y descarga de extracto anual consolidado en PDF con cuadro de totales.**

### 2.2 Material y Tareas
- [x] Visualización de clases matriculadas y acceso al aula virtual.
- [x] Tablón de anuncios de la clase con comunicados del profesor.
- [x] Visualización de imágenes y vídeos publicados desde archivo local o URL de Google Drive.
- [x] Trabajo de clase organizado por destrezas (*Reading, Listening, Writing, Grammar, etc.*).
- [x] Componente unificado `TaskCard` en Mis Clases y en Aula Virtual con barra de porcentaje y badges de entrega.
- [x] Realización de exámenes interactivos con audio y autocorrección sin cierre prematuro del pop-up de resultados.
- [x] Entrega de tareas multiformato (marcar realizada, texto abierto o archivos adjuntos).

### 2.3 Calificaciones y Progreso
- [x] Pestaña «Mis Calificaciones» integrada en el aula virtual del alumno (`StudentCourseView.tsx`).
- [x] Panel global de calificaciones con notas numéricas sobre 10 y desglose CEFR.
- [x] Modal interactivo de revisión pedagógica de exámenes con diseño Glassmorphism y desenfoque de fondo.
- [x] Pestaña «Compañeros» para consultar la lista de clase (retirada posteriormente de la vista del alumno por decisión funcional).

### 2.4 Ajustes y Perfil
- [x] Modal de ajustes de cuenta disponible tanto para alumnos (`STUDENT`) como para tutores (`PARENT`).
- [x] Cambio de contraseña y visualización de cuota mensual real asignada.

---

## 3. Módulo Padres / Tutores (Cuentas Familiares)
- [x] Rol de usuario `PARENT` en base de datos (`Role.PARENT`).
- [x] Modelo relacional Padre ↔ Hijos (`1 Padre : N Alumnos` / Hermanos).
- [x] Alta rápida de alumnos vinculados a padre existente o creación simultánea de Padre + Hijo.
- [x] Selector de Hijos en el Sidebar para alternar instantáneamente entre hermanos.
- [x] Supervisión en modo solo lectura de notas, clases, tareas y recibos del hijo seleccionado.
- [x] Descarga de facturas y extractos anuales de cada hijo.
- [x] Canal de chat exclusivo con los profesores de sus hijos con conversaciones aisladas por cada hijo.