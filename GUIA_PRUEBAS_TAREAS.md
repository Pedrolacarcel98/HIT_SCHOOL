# 📋 Guía Maestra de Pruebas y Verificación de Tareas — HitSchool

Esta guía contiene el protocolo exhaustivo de pruebas paso a paso para verificar el ciclo de vida completo de las tareas en **HitSchool**: creación de recursos, confección de plantillas, asignación a clases, resolución multiformato por el alumno, visualización de correcciones in-situ, revisión docente con feedback pedagógico y supervisión familiar.

---

## 🔑 1. Credenciales de Acceso y Entorno de Prueba

La base de datos y el repositorio de materiales han sido **completamente reseteados y limpiados** (0 materiales, 0 tareas, 0 plantillas). Las cuentas de usuario y la clase `KIDS 1` están listas para iniciar las pruebas desde cero:

| Rol | Usuario / Email | Contraseña | Contexto en la Prueba |
| :--- | :--- | :---: | :--- |
| **Profesor** | `profesor1@hitschool.com` | `1234` | **Carlos**: Titular de la clase `KIDS 1`. Crea materiales, plantillas, asigna y califica. |
| **Alumno 1** | `hermano.mayor@hitschool.com` | `1234` | **Mateo**: Alumno matriculado en `KIDS 1`. Realiza entregas de texto, archivos y exámenes. |
| **Alumno 2** | `hermano.menor@hitschool.com` | `1234` | **Sofía**: Alumna matriculada en `KIDS 1`. Útil para probar modo secuencial y bloqueos. |
| **Alumno 3** | `hijo.unico@hitschool.com` | `1234` | **Hugo**: Alumno matriculado en `KIDS 1`. Útil para probar entregas pendientes o con retraso. |
| **Padre/Tutor** | `padre.doshijos@hitschool.com` | `1234` | **Lucía**: Madre de Mateo y Sofía. Prueba selector familiar y modo solo lectura. |
| **Alumno Libre** | `alumno.independiente@hitschool.com` | `1234` | **Álex**: Alumno sin tutor asignado. |

---

## 🧪 Fase 1: Creación de Recursos en el Repositorio de Materiales

> **Objetivo**: Crear 5 materiales atómicos en la biblioteca para utilizarlos posteriormente en las tareas estructuradas.

### Caso 1.1: Añadir Recurso de Vídeo (`VIDEO`)
- **Rol**: Profesor (`profesor1@hitschool.com`).
- **Navegación**: Menú lateral -> **Materiales** -> Botón **«+ Nuevo Material»**.
- **Acciones**:
  1. Seleccionar tipo: **Vídeo**.
  2. Título: `Vídeo Guía: Present Perfect vs Past Simple`.
  3. Nivel: `B1` | Competencia / Categoría: `Gramática y Vocabulario (CEFR)`.
  4. URL del vídeo: `https://www.youtube.com/watch?v=kJQP7kiw5Fk` (o cualquier enlace válido de YouTube / Vimeo / MP4).
  5. Descripción: `Píldora explicativa con ejemplos prácticos para diferenciar ambos tiempos verbales.`
  6. Pulsar **«Guardar Material»**.
- **Verificación**:
  - [x] El material se guarda correctamente y aparece en la lista de materiales.
  - [x] Al pulsar en la tarjeta o botón de ver, se abre el reproductor y el vídeo se reproduce sin errores.

---

### Caso 1.2: Añadir Recurso de Documento / PDF (`DOCUMENT`)
- **Rol**: Profesor (`profesor1@hitschool.com`).
- **Navegación**: Menú lateral -> **Materiales** -> Botón **«+ Nuevo Material»**.
- **Acciones**:
  1. Seleccionar tipo: **Documento**.
  2. Título: `Ficha Teórica: Conectores y Estructura de Redacción B1/B2`.
  3. Nivel: `B1` | Competencia / Categoría: `Expresión Escrita (Writing)`.
  4. URL: `https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf` (o enlace a Google Drive de consulta).
  5. Descripción: `Documento de consulta obligatoria con conectores formales e informales.`
  6. Pulsar **«Guardar Material»**.
- **Verificación**:
  - [x] El documento queda registrado con el icono de PDF.
  - [x] Al hacer clic en el botón de ver o previsualizar, se abre en una pestaña nueva (`target="_blank"`) o en el visor de documentos sin reemplazar la pestaña de HitSchool.

---

### Caso 1.3: Añadir Recurso de Audio Listening (`AUDIO`)
- **Rol**: Profesor (`profesor1@hitschool.com`).
- **Navegación**: Menú lateral -> **Materiales** -> Botón **«+ Nuevo Material»**.
- **Acciones**:
  1. Seleccionar tipo: **Audio**.
  2. Título: `Listening Track 01: Conversación en el Aeropuerto`.
  3. Nivel: `A2/B1` | Competencia: `Comprensión Auditiva (Listening)`.
  4. URL: `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3`
  5. Descripción: `Escucha la pista antes de completar las preguntas del cuestionario.`
  6. Pulsar **«Guardar Material»**.
- **Verificación**:
  - [x] Aparece el componente `AudioPlayer` con barra de progreso, tiempo y control de volumen operativo.

---

### Caso 1.4: Añadir Recurso de Imagen / Infografía (`IMAGE`)
- **Rol**: Profesor (`profesor1@hitschool.com`).
- **Navegación**: Menú lateral -> **Materiales** -> Botón **«+ Nuevo Material»**.
- **Acciones**:
  1. Seleccionar tipo: **Imagen**.
  2. Título: `Infografía: Irregular Verbs Cheat Sheet`.
  3. Nivel: `GENERAL` | Competencia: `Gramática y Vocabulario (CEFR)`.
  4. URL: `https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800`
  5. Pulsar **«Guardar Material»**.
- **Verificación**:
  - [x] La tarjeta muestra la miniatura de la imagen nítida. Al pulsar, se amplía en modal.

---

### Caso 1.5: Crear Examen Interactivo Autocorregible (`FORM`)
- **Rol**: Profesor (`profesor1@hitschool.com`).
- **Navegación**: Menú lateral -> **Materiales** -> Botón **«+ Nuevo Examen / Cuestionario»**.
- **Acciones en el Form Builder**:
  1. Título: `Test Autocorregible: Gramática y Verbos Irregulares`.
  2. Descripción: `Completa las siguientes preguntas. Obtendrás tu nota al instante.`
  3. **Pregunta 1 (Opción Múltiple)**:
     - Enunciado: *«She _____ to London three times this year.»*
     - Opciones: A) `went`, B) `has been`, C) `goes`, D) `is going`.
     - Respuesta correcta: Opción B (`has been`). Puntos: `2`.
  4. **Pregunta 2 (Verdadero / Falso)**:
     - Enunciado: *«"Yesterday" is typically used with the Present Perfect tense.»*
     - Respuesta correcta: `Falso`. Puntos: `2`.
  5. **Pregunta 3 (Respuesta Corta)**:
     - Enunciado: *«What is the past participle of the verb "write"?»*
     - Respuesta correcta: `written` (No distinguir mayúsculas/minúsculas). Puntos: `3`.
  6. **Pregunta 4 (Rellenar Espacios - Fill in the blanks)**:
     - Enunciado con paréntesis: *«If I (had) more time, I would (travel) around the world.»*
     - Puntos: `3`.
  7. Comprobar que la suma de puntos es `10` (2 + 2 + 3 + 3).
  8. Probar el botón **«Previsualizar Examen»** en el propio Form Builder para comprobar que los inputs funcionan.
  9. Pulsar **«Guardar Examen»**.
- **Verificación**:
  - [x] El cuestionario se guarda en la biblioteca de materiales con la etiqueta `FORM` y badge interactivo.

---

## 🏗️ Fase 2: Creación y Edición de Plantillas de Tareas

> **Objetivo**: Crear plantillas reutilizables multi-paso compuestas por los materiales atómicos y verificar su modificación.

### Caso 2.1: Crear Plantilla de Tarea Estructurada Multi-Paso
- **Rol**: Profesor (`profesor1@hitschool.com`).
- **Navegación**: Menú lateral -> **Tareas y Plantillas** -> Pestaña **«Plantillas de Tareas»** -> Botón **«+ Nueva Plantilla»**.
- **Configuración General**:
  1. Título de la Plantilla: `[Plantilla] Módulo B1: Grammar, Listening & Writing`.
  2. Descripción: `Módulo completo con explicación en vídeo, lectura, test autocorregible y redacción.`
  3. Trimestre: `Trimestre 1 (1er Trimestre)`.
  4. Competencia Lingüística CEFR: `Gramática y Vocabulario (CEFR)`.
  5. Modo de avance: Activar conmutador **«Secuencial (paso a paso)»**.
- **Configuración de los Pasos (4 Pasos)**:
  - **Paso 1 (Vídeo explicativo - No evaluable)**:
    - Título: `1. Visionado: Present Perfect vs Past Simple`.
    - Seleccionar material: `Vídeo Guía: Present Perfect vs Past Simple`.
    - Requiere entrega: `NO` (Paso meramente formativo / visualización).
  - **Paso 2 (Lectura de Documento - No evaluable)**:
    - Título: `2. Lectura y Estudio: Guía de Conectores`.
    - Seleccionar material: `Ficha Teórica: Conectores y Estructura de Redacción B1/B2`.
    - Requiere entrega: `NO`.
  - **Paso 3 (Examen Autocorregible - Evaluable automático)**:
    - Título: `3. Cuestionario de Evaluación Continua`.
    - Seleccionar material: `Test Autocorregible: Gramática y Verbos Irregulares`.
    - Requiere entrega: Automático por ser `FORM`.
  - **Paso 4 (Redacción y Aplicación Práctica - Evaluable manual)**:
    - Título: `4. Writing: Redacción sobre un Viaje Inolvidable`.
    - Descripción de la tarea: *«Escribe una redacción de 100-120 palabras utilizando al menos 3 conectores y 2 formas de Present Perfect. Puedes escribirla directamente en el cuadro de texto o subir una foto/PDF de tu cuaderno.»*
    - Material de apoyo opcional: Asociar la `Infografía: Irregular Verbs Cheat Sheet`.
    - Requiere entrega del alumno: `SÍ`.
- **Acción**: Pulsar **«Guardar Tarea / Plantilla»**.
- **Verificación**:
  - [x] La plantilla aparece en la pestaña de **«Plantillas de Tareas»** con la etiqueta `⭐ Plantilla Catálogo` y el contador `4 pasos`.
  - [x] No está asignada a ningún alumno ni clase aún (`courseId: null`).

---

### Caso 2.2: Modificación y Reordenación de la Plantilla
- **Rol**: Profesor (`profesor1@hitschool.com`).
- **Navegación**: Menú lateral -> **Tareas y Plantillas** -> Pestaña **«Plantillas de Tareas»** -> En la tarjeta de la plantilla, pulsar **«Editar»**.
- **Acciones**:
  1. Cambiar el título a: `[Plantilla Maestra] B1 Complete Unit: Grammar & Writing`.
  2. Mover el Paso 2 hacia arriba mediante el botón de flecha ⬆ (el documento antes del vídeo o viceversa) y volver a colocarlo en orden.
  3. Modificar el texto de las instrucciones del Paso 4 añadiendo: *«(Extensión mínima: 100 palabras)»*.
  4. Pulsar **«Guardar Tarea / Plantilla»**.
- **Verificación**:
  - [x] El título se actualiza inmediatamente en la lista.
  - [x] Al volver a abrir la edición, el orden y las instrucciones modificadas se mantienen intactos.

---

## 🚀 Fase 3: Asignación de Tareas a una Clase

> **Objetivo**: Asignar la plantilla a la clase `KIDS 1` y crear una tarea individual directa para comprobar ambos flujos.

### Caso 3.1: Asignar Tarea desde Plantilla a la Clase `KIDS 1`
- **Rol**: Profesor (`profesor1@hitschool.com`).
- **Navegación**: Menú lateral -> **Tareas y Plantillas** -> Pestaña **«Plantillas de Tareas»** -> En la plantilla `[Plantilla Maestra] B1 Complete Unit...`, pulsar el botón verde **«Asignar a Clase»**.
- **Configuración de la Asignación**:
  1. Destinatario: Seleccionar la clase **`KIDS 1`**.
  2. Fecha límite de entrega (`dueDate`): Fijar una fecha futura (opcional).
  3. Fecha de publicación (`publishAt`): Opcional. Si se deja vacía la publicación es inmediata; si se fija una fecha futura, la tarea quedará programada y el botón cambiará dinámicamente a **«Programar Tarea»**.
  4. Avance secuencial: Heredado automáticamente de la plantilla (intrínseco de la tarea).
  5. Pulsar **«Publicar Tarea en Clase»** (o «Programar Tarea»).
- **Verificación**:
  - [x] La plantilla original **no se elimina ni se modifica**; sigue intacta en el catálogo de plantillas.
  - [x] Se crea un nuevo registro de tarea estructurada asignado a `KIDS 1`.
  - [x] En la pestaña **«Tareas Asignadas a Clases»**, aparece la nueva tarea listada con sus pasos y detalles (y la etiqueta badge «Programada: [fecha]» si se configuró fecha de publicación futura).
  - [x] Entrando en Menú lateral -> **Mis Clases** -> **`KIDS 1`** -> Pestaña **«Trabajo de clase»**, la tarea aparece inmediatamente visible si la publicación es inmediata (o programada si la fecha es futura).

---

### Caso 3.2: Asignación de Tarea Simple Directa (Documento del Profesor + Foto/PDF del Alumno)
- **Rol**: Profesor (`profesor1@hitschool.com`).
- **Navegación (Opción A)**: Menú lateral -> **Tareas y Plantillas** -> Botón superior **«Asignar Tarea a Clase»** (o desde la pestaña «Tareas Asignadas a Clases»).
- **Navegación (Opción B)**: Menú lateral -> **Mis Clases** -> Entrar en **`KIDS 1`** -> Pestaña **«Trabajo de clase»** -> Botón **«+ Crear Tarea»**.
- **Configuración**:
  1. Título: `Ficha de Ejercicios en Cuaderno (Handwritten Homework)`.
  2. Categoría: `Gramática y Vocabulario (CEFR)`.
  3. Trimestre: `1`.
  4. Material adjunto del profesor: Asociar `Ficha Teórica: Conectores y Estructura de Redacción B1/B2`.
  5. Instrucciones: *«Descarga la ficha adjunta, realiza las actividades 1 a 5 en tu libreta a mano y sube una foto o PDF con tus respuestas.»*
  6. Pulsar **«Guardar Tarea / Plantilla»** (o Asignar).
- **Verificación**:
  - [x] La tarea queda visible en la lista de trabajo de clase de `KIDS 1` y en «Tareas Asignadas a Clases».

---

## 👨‍🎓 Fase 4: Flujo del Alumno (Resolución, Entregas y Visualización In-Situ)

> **Objetivo**: Iniciar sesión como alumno de `KIDS 1` y completar todos los tipos de pasos comprobando la experiencia de usuario y ausencia de bugs.

### Caso 4.1: Comprobación de Persistencia y Estabilidad de Pantalla
- **Rol**: Alumno (`hermano.mayor@hitschool.com` - Mateo).
- **Navegación**:
  1. Entrar en la clase **`KIDS 1`**.
  2. Cambiar a la pestaña **«Trabajo de clase»**.
  3. **Pulsar F5 / Recargar la página en el navegador**:
- **Verificación**:
  - [x] **Persistencia comprobada**: La aplicación vuelve a cargar directamente en la pestaña «Trabajo de clase» (no salta al Tablón de anuncios).
  - [x] Se muestran las 2 tareas asignadas: `Módulo B1: Grammar, Listening & Writing (Semana 1)` y `Ficha de Ejercicios en Cuaderno`.

---

### Caso 4.2: Realización del Paso 1 (Vídeo Formativo - No Evaluable)
- **Rol**: Alumno (`hermano.mayor@hitschool.com` - Mateo).
- **Acciones**:
  1. En la tarea `Módulo B1...`, hacer clic en el botón del Paso 1: `Vídeo Guía: Present Perfect...`.
  2. Comprobar que se abre el modal y el reproductor de vídeo.
  3. Marcar el checkbox de completado del paso.
- **Verificación**:
  - [x] **Preservación del Scroll**: La pantalla NO salta arriba al inicio de la página; el scroll se mantiene exactamente donde está la tarea.
  - [x] El título del paso se tacha o atenúa y muestra el badge verde: `<CheckCircle2 /> Completado`.
  - [x] La barra de progreso superior de la tarea avanza a `1 de 4 pasos completados - 25%`.

---

### Caso 4.3: Realización del Paso 2 (Documento de Consulta - No Evaluable)
- **Rol**: Alumno (`hermano.mayor@hitschool.com` - Mateo).
- **Acciones**:
  1. Hacer clic en el nombre del documento: `Ficha Teórica: Conectores...`.
  2. Hacer clic en el icono de descarga (`<Download />`).
  3. Marcar el checkbox de completado del paso.
- **Verificación**:
  - [x] El documento se abre en una pestaña nueva o se descarga sin cerrar ni reemplazar la sesión de HitSchool.
  - [x] El paso queda marcado con `<CheckCircle2 /> Completado`.
  - [x] La barra de progreso avanza a `2 de 4 pasos completados - 50%`.

---

### Caso 4.4: Realización del Paso 3 (Examen Interactivo - Verificación Crítica de Resultados In-Situ)
- **Rol**: Alumno (`hermano.mayor@hitschool.com` - Mateo).
- **Acciones**:
  1. Hacer clic en el Paso 3: `Test Autocorregible: Gramática y Verbos Irregulares`.
  2. Se abre el modal con `FormPlayer`.
  3. Responder a las preguntas:
     - Pregunta 1: Elegir `has been` (Acierto).
     - Pregunta 2: Elegir `Falso` (Acierto).
     - Pregunta 3: Escribir `written` (Acierto).
     - Pregunta 4: Rellenar con `had` y una palabra errónea ej. `travelled` para verificar detección de fallos.
  4. Pulsar el botón **«Enviar y Corregir Examen»**.
- **Verificación de Resultados In-Situ (Punto Crítico Bug 1)**:
  - [x] **El modal NO se cierra**: La pantalla NO vuelve abruptamente a la lista de tareas.
  - [x] Aparece inmediatamente la pantalla de felicitación: *«¡Examen completado! Has respondido a todas las preguntas»*.
  - [x] Al pulsar **«Ver Calificación»**:
    - Muestra la nota exacta obtenida (ej. `7 / 10` o `70% de Acierto`).
    - Mensaje dinámico de superación.
  - [x] Al pulsar **«Revisar Respuestas (Aciertos y Fallos)»**:
    - Las preguntas acertadas aparecen con borde verde y tick `CheckCircle2`.
    - La pregunta fallada aparece con borde rojo, cruz `XCircle` y el texto explicativo: `Tu respuesta: travelled | Respuesta correcta: travel`.
    - Al pulsar **«← Volver a mi Calificación»**, regresa a la tarjeta resumen sin problemas.
  - [x] Pulsar **«Finalizar y Salir»** (o la `X` superior).
  - [x] Ahora sí, el modal se cierra de forma voluntaria.
  - [x] En la lista de tareas, debajo del Paso 3 aparece el badge verde:
    - `✓ Examen entregado y corregido · Nota: 7.0/10`
    - **NUNCA** aparece el recuadro vacío `Tu entrega:`.

---

### Caso 4.5: Realización del Paso 4 (Entrega Manual con Archivo Adjunto y Visor Online)
- **Rol**: Alumno (`hermano.mayor@hitschool.com` - Mateo).
- **Acciones**:
  1. En el Paso 4 (`Writing: Redacción...`), pulsar para abrir el modal de entrega.
  2. Seleccionar modalidad: **Archivo Adjunto**.
  3. Seleccionar una foto de un examen o una imagen PNG/JPG (o PDF).
  4. En el campo de texto opcional, escribir: *«Adjunto la redacción realizada en el cuaderno con los conectores subrayados.»*
  5. Pulsar **«Entregar Tarea al Profesor»**.
- **Verificación**:
  - [x] La entrega se registra con éxito.
  - [x] Debajo del paso aparece el bloque:
    - `✓ Tu entrega:`
    - Texto: *«Adjunto la redacción realizada en el cuaderno...»*
    - Enlace al archivo adjunto: `Archivo: [nombre-del-archivo.jpg]`.
  - [x] La barra de la tarea alcanza el `4 de 4 pasos completados - 100%`.
  - [x] La tarea muestra el estado: `✓ Tarea Entregada`.

---

### Caso 4.6: Verificación del Modo Secuencial con Otro Alumno
- **Rol**: Alumna (`hermano.menor@hitschool.com` - Sofía).
- **Navegación**: Entrar en `KIDS 1` -> **«Trabajo de clase»**.
- **Acciones**:
  1. Observar los pasos de la tarea `Módulo B1...`.
  2. Intentar hacer clic directamente en el Paso 3 (Examen) o Paso 4 (Writing) sin haber completado el Paso 1.
- **Verificación**:
  - [x] Los pasos posteriores aparecen atenuados (`opacity: 0.6`) y deshabilitados (`pointer-events: none`).
  - [x] Únicamente el Paso 1 está habilitado para interactuar.
  - [x] Al completar el Paso 1, el Paso 2 se desbloquea de forma secuencial.

---

## 👩‍🏫 Fase 5: Corrección, Calificaciones y Feedback del Profesor

> **Objetivo**: Revisar las entregas del alumno desde el centro de calificaciones, comprobar el desglose completo de pasos (Bug 2) y añadir feedback pedagógico.

### Caso 5.1: Comprobación del Desglose de Tareas en `GradesTab`
- **Rol**: Profesor (`profesor1@hitschool.com` - Carlos).
- **Navegación**: Menú lateral -> **Clases** -> Entrar en **`KIDS 1`** -> Pestaña **«Calificaciones»**.
- **Acciones**:
  1. Cambiar a la subpestaña **«Tareas»** (o *Tareas del Trimestre*).
  2. Localizar la tarea `Módulo B1: Grammar, Listening & Writing (Semana 1)`.
  3. Observar la fila correspondiente al alumno **Mateo**:
- **Verificación**:
  - [ ] Aparece el estado verde: `✓ Tarea Entregada` y `Dentro de plazo`.
  - [ ] En la fila de chips de pasos aparecen **todos los pasos**:
    - `✓ 1. Visionado: Present Perfect vs Past Simple` (chip verde claro).
    - `✓ 2. Lectura y Estudio: Guía de Conectores` (chip verde claro).
    - `7.0/10 3. Cuestionario de Evaluación Continua` (chip con nota).
    - `⏳ 4. Writing: Redacción sobre un Viaje Inolvidable` (chip pendiente de calificar por el docente).

---

### Caso 5.2: Apertura del Modal de Revisión y Verificación de Pasos (Punto Crítico Bug 2)
- **Rol**: Profesor (`profesor1@hitschool.com` - Carlos).
- **Acción**: En la fila de Mateo, pulsar el botón **«Revisar Entrega Completa»**.
- **Verificación del Desglose Completo (Punto Crítico Bug 2)**:
  - [ ] En la cabecera del modal se muestra:
    - `Total pasos: 4` (los 4 pasos de la tarea, **no** solo 1 ni solo los evaluables).
    - `✓ Pasos completados: 4 / 4`.
    - `📝 Evaluables: 2`.
    - `📖 Formativos / Guías: 2`.
  - [ ] En el cuerpo del desglose aparecen numerados correlativamente:
    - **Paso 1**: Identificado como `📖 Material didáctico (No evaluable)`. Badge: `Completado ✓`. Mensaje: `✓ El alumno ha visualizado y marcado este recurso como completado.` Enlace `Ver material`.
    - **Paso 2**: Identificado como `📖 Material didáctico (No evaluable)`. Badge: `Completado ✓`. Mensaje: `✓ El alumno ha visualizado y marcado este recurso como completado.` Enlace `Ver material`.
    - **Paso 3**: Identificado como `📝 Cuestionario / Examen (Evaluación automática)`. Muestra: `📊 Resultado: 3 de 4 aciertos`. Botón: `Ver Cuestionario Corregido`.
    - **Paso 4**: Identificado como `✍️ Entrega manual (Evaluación docente)`. Muestra el texto y archivo entregados por Mateo.

---

### Caso 5.3: Revisión del Cuestionario y Redacción de Feedback
- **Rol**: Profesor (`profesor1@hitschool.com` - Carlos).
- **Acciones**:
  1. En el Paso 3, pulsar **«Ver Cuestionario Corregido»**.
  2. Comprobar que se abre `ExamReviewModal` con todas las preguntas del examen y las respuestas de Mateo.
  3. Cerrar el modal de revisión de preguntas.
  4. En el campo *«Comentarios / Feedback pedagógico para este cuestionario»*, escribir:
     `"Muy buen resultado en el examen. Repasa el condicional tipo 2 para la próxima semana."`
- **Verificación**:
  - [ ] El modal de examen abre con preguntas y respuestas sin pantallas en blanco ni errores.

---

### Caso 5.4: Corrección de la Redacción Manual con Visor de Fotos/PDFs
- **Rol**: Profesor (`profesor1@hitschool.com` - Carlos).
- **Acciones en el Paso 4 (Writing)**:
  1. Leer el texto entregado por Mateo en el recuadro.
  2. Si Mateo subió una foto o PDF, pulsar sobre el archivo o botón del ojo (`<Eye />`).
  3. En el visor emergente (`AttachmentViewerModal`):
     - Probar el botón **«+ Zoom»** y **«- Zoom»**.
     - Probar el botón **«Rotar 90°»** (comprobar que la imagen gira a 90°, 180°, 270° y 360°).
     - Cerrar el visor.
  4. En el campo de **Nota del Paso**, introducir: `8.5`.
  5. En el campo de **Feedback del Paso**, escribir:
     `"Excelente uso de conectores (furthermore, in addition). Cuida la ortografía de los adjetivos irregulares."`
- **Verificación**:
  - [ ] El visor online de fotos/PDFs funciona con fluidez sin obligar a descargar el archivo al disco duro.
  - [ ] La nota `8.5` se introduce correctamente en el input.

---

### Caso 5.5: Calificación Global de la Tarea y Guardado en Expediente
- **Rol**: Profesor (`profesor1@hitschool.com` - Carlos).
- **Acciones**:
  1. Observar el cálculo de la nota media sugerida automática:
     - Paso 3: `7.0` | Paso 4: `8.5` -> Media calculada: `7.75` (redondeada a `7.8` / `7.7`).
  2. En el campo de **Calificación Global**, probar a sobrescribir la nota a `8.0`.
  3. En el campo de **Observaciones pedagógicas globales de la tarea**, escribir:
     `"Módulo completado con éxito. Excelente trabajo en redacción y comprensión."`
  4. Pulsar **«Guardar Calificación y Feedback»**.
- **Verificación**:
  - [ ] Se cierra el modal y aparece el mensaje de confirmación de guardado.
  - [ ] En la tabla de `GradesTab`, la fila de Mateo ahora muestra la nota consolidada: `Nota: 8.0 / 10`.
  - [ ] El chip del Paso 4 cambia de `⏳` a `8.5/10`.
  - [ ] Debajo de la fila de Mateo aparece el cuadro con el feedback pedagógico del profesor:
    `💬 Feedback del profesor: "Módulo completado con éxito. Excelente trabajo en redacción y comprensión."`

---

## 👨‍👩‍👧 Fase 6: Verificación de Alumno y Tutor Familiar

> **Objetivo**: Confirmar que el alumno ve sus notas y feedback, y que el padre/tutor puede supervisar los progresos de sus dos hijos de forma aislada.

### Caso 6.1: El Alumno Consulta su Expediente Corregido
- **Rol**: Alumno (`hermano.mayor@hitschool.com` - Mateo).
- **Navegación**: Entrar en `KIDS 1` -> Pestaña **«Calificaciones»**.
- **Verificación**:
  - [ ] Mateo ve la nota final de la tarea: `8.0 / 10`.
  - [ ] Ve los chips de cada paso con sus notas respectivas (`7.0/10` y `8.5/10`).
  - [ ] Puede leer el feedback global del profesor y las observaciones individuales de la redacción.
  - [ ] Puede pulsar para revisar su examen corregido en cualquier momento.

---

### Caso 6.2: Supervisión Familiar y Selector de Hijos (Padre/Tutor)
- **Rol**: Tutora / Madre (`padre.doshijos@hitschool.com` - Lucía).
- **Navegación**: Entrar con Lucía.
- **Acciones**:
  1. En el desplegable superior del menú lateral (**Selector de Hijos**), seleccionar a **Mateo**.
  2. Entrar en la clase `KIDS 1` -> Pestaña «Calificaciones».
  3. Comprobar que ve todas las tareas, notas (`8.0/10`) y observaciones pedagógicas de Mateo en modo **solo lectura** (sin botones de editar notas ni enviar tareas).
  4. En el selector de hijos, cambiar a **Sofía**:
  5. Entrar en `KIDS 1` -> Pestaña «Calificaciones» y «Trabajo de clase».
- **Verificación**:
  - [ ] Las vistas están completamente aisladas: la pantalla de Sofía muestra sus propias tareas pendientes, sin mezclar las notas ni entregas de Mateo.
  - [ ] No hay fugas de datos entre hermanos.

---

## 🎯 Matriz Resumen de Cobertura de Pruebas

| Funcionalidad / Escenario | Caso(s) | Estado Esperado | Verificado |
| :--- | :---: | :--- | :---: |
| **Repositorio Multimedia** | 1.1 - 1.4 | Creación de vídeo, PDF, audio e imagen con preview | [ ] |
| **Form Builder (Exámenes)** | 1.5 | Test múltiple, V/F, respuesta corta y fill-in-blanks | [ ] |
| **Plantillas Multi-Paso** | 2.1 - 2.2 | Creación y reordenación de pasos sin romper referencias | [ ] |
| **Asignación a Clases** | 3.1 - 3.2 | Asignación desde plantilla y tarea directa en clase | [ ] |
| **Persistencia al Recargar** | 4.1 | F5 mantiene pestaña activa (`?tab=classwork`) | [ ] |
| **Preservación del Scroll** | 4.2 | Completar pasos no salta la pantalla al inicio | [ ] |
| **Descarga Segura de PDFs** | 4.3 | `target="_blank"` sin reemplazar la web | [ ] |
| **Examen In-Situ (Bug 1)** | 4.4 | Pop-up de notas y revisión de fallos visible al enviar | [ ] |
| **Badge de Entrega (Bug 1)** | 4.4 - 4.5 | Badge verde `Nota: X/10` o `Completado`; sin `Tu entrega:` vacío | [ ] |
| **Modo Secuencial** | 4.6 | Bloqueo estricto de pasos posteriores hasta completar anteriores | [ ] |
| **Desglose de Pasos (Bug 2)** | 5.1 - 5.2 | Muestra todos los pasos (formativos + evaluables) | [ ] |
| **Visor Online con Rotación**| 5.4 | Zoom y rotación 90° de fotos tomadas con móvil | [ ] |
| **Feedback Pedagógico** | 5.3 - 5.5 | Comentarios por paso y global visibles para alumno | [ ] |
| **Portal de Tutores** | 6.2 | Selector de hijos y aislamiento total entre hermanos | [ ] |

---

*Guía creada automáticamente para el equipo de HitSchool. La base de datos y materiales quedan limpios y listos para ejecutar las pruebas siguiendo este documento.*
