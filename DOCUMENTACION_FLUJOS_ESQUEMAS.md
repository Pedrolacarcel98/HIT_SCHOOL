<style>
  @page {
    size: A4 portrait;
    margin: 12mm;
  }
  .flujo-block {
    page-break-before: always !important;
    break-before: page !important;
    display: block;
    clear: both;
  }
  .flujo-block h2 {
    margin-top: 0 !important;
    margin-bottom: 4px !important;
    padding-bottom: 0 !important;
    font-size: 15px !important;
    page-break-after: avoid !important;
    break-after: avoid !important;
  }
  .mermaid {
    display: flex !important;
    justify-content: center !important;
    max-height: 390px !important;
    margin: 0 0 6px 0 !important;
    page-break-before: avoid !important;
    break-before: avoid !important;
  }
  .mermaid svg {
    max-height: 390px !important;
    height: auto !important;
  }
  table {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
    font-size: 9px !important;
    width: 100% !important;
  }
</style>

# Documentación Técnica Visual de HitSchool

## Carta ASM Simplificada

La siguiente documentación presenta los flujos principales de la plataforma usando diagramas Mermaid con el formato de Carta ASM Simplificada, adaptado a la arquitectura funcional de HitSchool.

<div class="flujo-block">

## 1. Flujo de Acceso y Autenticación

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'fontSize': '11px', 'fontFamily': 'Segoe UI, Arial, sans-serif', 'nodePadding': '8' }, 'flowchart': { 'curve': 'linear', 'useMaxWidth': true, 'nodeSpacing': 12, 'rankSpacing': 16 }}}%%
flowchart TD
    A([ESTADO INICIAL:<br/>Usuario entra en la ruta raíz<br/>de la aplicación])
    B(ACCIÓN: Mostrar pantalla<br/>de login)
    C(ACCIÓN: Introducir usuario<br/>y contraseña)
    D(ACCIÓN: Enviar credenciales<br/>a /api/auth/login)
    E{¿Credenciales<br/>válidas?}
    F(ACCIÓN: Crear sesión y<br/>guardar token del usuario)
    G{¿Rol del usuario?}
    H([ESTADO FINAL:<br/>Redirigir a /teacher])
    I([ESTADO FINAL:<br/>Redirigir a /student])
    J([ESTADO FINAL:<br/>Redirigir a /teacher<br/>con funciones de administrador])
    K([ESTADO FINAL:<br/>Mostrar error de acceso<br/>y bloquear sesión])

    A --> B
    B --> C
    C --> D
    D --> E
    E -- Sí --> F
    F --> G
    G -- Sí --> H
    G -- Alumno o tutor --> I
    G -- Administrador --> J
    E -- No --> K
```

| Elemento | Descripción |
| :--- | :--- |
| **Entradas / Evento** | Inicio de sesión desde la raíz de la plataforma con credenciales del usuario |
| **Condiciones Clave** | ¿Credenciales válidas?; ¿Qué rol tiene el usuario? |
| **Salida / Cambio de Estado** | Se crea una sesión autenticada. Profesores y administradores entran en /teacher; alumnos y tutores entran en /student. |

</div>

<div class="flujo-block">

## 2. Flujo de Creación y Duplicación de Clases

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'fontSize': '11px', 'fontFamily': 'Segoe UI, Arial, sans-serif', 'nodePadding': '8' }, 'flowchart': { 'curve': 'linear', 'useMaxWidth': true, 'nodeSpacing': 12, 'rankSpacing': 16 }}}%%
flowchart TD
    A([ESTADO INICIAL:<br/>Administrador crea o duplica una clase;<br/>profesor accede a una clase autorizada])
    B{¿Desea crear una clase<br/>nueva o duplicar una<br/>existente?}
    C(ACCIÓN: Abrir formulario<br/>de creación de clase)
    D(ACCIÓN: Seleccionar una<br/>clase base para duplicar)
    E(ACCIÓN: Ajustar nombre,<br/>modalidad y parámetros<br/>iniciales)
    F{¿Es una<br/>duplicación?}
    G(ACCIÓN: Limpiar datos de<br/>alumnos antiguos y<br/>desvincular matrículas)
    H(ACCIÓN: Reajustar fechas de<br/>publicación y entrega a nulas<br/>o nuevas)
    I(ACCIÓN: Guardar nueva clase<br/>en base de datos)
    J(ACCIÓN: Generar estructura<br/>de tareas y recursos<br/>asociados)
    K(ACCIÓN: Publicar la clase<br/>en el dashboard del docente)
    L([ESTADO FINAL:<br/>Clase creada y disponible<br/>para uso])
    M([ESTADO FINAL:<br/>Clase duplicada lista<br/>para edición])

    A --> B
    B -- Sí --> C
    B -- No --> D
    C --> E
    D --> E
    E --> F
    F -- Sí --> G
    G --> H
    H --> I
    F -- No --> I
    I --> J
    J --> K
    K --> L
    K --> M
```

| Elemento | Descripción |
| :--- | :--- |
| **Entradas / Evento** | El administrador crea o duplica una clase; el titular o un profesor asignado trabaja dentro de ella. |
| **Condiciones Clave** | Crear, editar, duplicar, asignar profesores y limpiar matrículas requieren permisos distintos. |
| **Salida / Cambio de Estado** | La clase queda guardada y disponible solo para el administrador, el titular y los profesores asignados. |

</div>

<div class="flujo-block">

## 3. Flujo Ciclo de Tareas y Evaluaciones

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'fontSize': '11px', 'fontFamily': 'Segoe UI, Arial, sans-serif', 'nodePadding': '8' }, 'flowchart': { 'curve': 'linear', 'useMaxWidth': true, 'nodeSpacing': 12, 'rankSpacing': 16 }}}%%
flowchart TD
    A([ESTADO INICIAL:<br/>Profesor prepara la asignatura<br/>y la tarea])
    B(ACCIÓN: Crear tarea<br/>estructurada con título,<br/>fechas y criterios)
    C(ACCIÓN: Guardar tarea<br/>en la base de datos)
    D(ACCIÓN: Publicar la tarea<br/>en el curso del alumno)
    E([ESTADO FINAL:<br/>Tarea visible en pendientes<br/>del alumnado])
    F(ACCIÓN: Alumno consulta tareas<br/>pendientes y abre la entrega)
    G(ACCIÓN: Subir entrega o<br/>examen resuelto)
    H(ACCIÓN: Almacenar entrega con<br/>metadatos y archivos)
    I{¿La tarea incluye<br/>preguntas de tipo<br/>test o abiertas?}
    J(ACCIÓN: Corregir automáticamente<br/>preguntas test)
    K(ACCIÓN: Revisar respuestas abiertas<br/>y asignar puntuación docente)
    L(ACCIÓN: Recalcular nota final<br/>y actualizar expediente)
    M([ESTADO FINAL:<br/>Nota registrada y visible<br/>en calificaciones])
    N([ESTADO FINAL:<br/>Entrega pendiente<br/>de revisión])

    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
    F --> G
    G --> H
    H --> I
    I -- Sí --> J
    J --> L
    I -- No --> K
    K --> L
    L --> M
    K --> N
```

| Elemento | Descripción |
| :--- | :--- |
| **Entradas / Evento** | Creación de una tarea de clase o individual y posterior entrega del alumno. |
| **Condiciones Clave** | Publicación inmediata o programada, tarea plantilla o activa, pasos evaluables y preguntas abiertas. |
| **Salida / Cambio de Estado** | Se guardan entregas, se corrigen, se recalculan las notas por clase y se notifica a los destinatarios autorizados. |

</div>

<div class="flujo-block">

## 4. Flujo de Administración y Gestión de Usuarios

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'fontSize': '11px', 'fontFamily': 'Segoe UI, Arial, sans-serif', 'nodePadding': '8' }, 'flowchart': { 'curve': 'linear', 'useMaxWidth': true, 'nodeSpacing': 12, 'rankSpacing': 16 }}}%%
flowchart TD
    A([ESTADO INICIAL:<br/>Administrador entra al<br/>módulo de gestión de usuarios])
    B{¿Qué entidad<br/>desea gestionar?}
    C(ACCIÓN: Seleccionar<br/>Alumno)
    D(ACCIÓN: Seleccionar<br/>Profesor)
    E(ACCIÓN: Seleccionar<br/>Tutor)
    F(ACCIÓN: Seleccionar<br/>Admin)
    G{¿Se trata de alta,<br/>baja o reactivación?}
    H(ACCIÓN: Dar de alta<br/>nuevo usuario)
    I(ACCIÓN: Dar de baja<br/>usuario activo)
    J(ACCIÓN: Reactivar<br/>usuario previo)
    K(ACCIÓN: Guardar estado y<br/>credenciales del usuario)
    L(ACCIÓN: Asignar matrícula<br/>y vincular aulas online)
    M(ACCIÓN: Actualizar permisos<br/>y visibilidad del usuario)
    N([ESTADO FINAL:<br/>Usuario gestionado<br/>correctamente])

    A --> B
    B -- Sí --> C
    B -- No --> D
    B -- No --> E
    B -- No --> F
    C --> G
    D --> G
    E --> G
    F --> G
    G -- Sí --> H
    G -- No --> I
    G -- No --> J
    H --> K
    I --> K
    J --> K
    K --> L
    L --> M
    M --> N
```

| Elemento | Descripción |
| :--- | :--- |
| **Entradas / Evento** | Selección de una entidad y decisión de alta, baja o reactivación |
| **Condiciones Clave** | ¿Qué entidad se gestiona?; ¿Qué acción corresponde? |
| **Salida / Cambio de Estado** | El usuario queda activo, inactivo o reactivado y recibe la matrícula y permisos adecuados |

</div>

<div class="flujo-block">

## 5. Flujo de Pagos e Impagos

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'fontSize': '11px', 'fontFamily': 'Segoe UI, Arial, sans-serif', 'nodePadding': '8' }, 'flowchart': { 'curve': 'linear', 'useMaxWidth': true, 'nodeSpacing': 12, 'rankSpacing': 16 }}}%%
flowchart TD
    A([ESTADO INICIAL:<br/>ADMIN entra al panel<br/>de control de pagos])
    B(ACCIÓN: Recopilar historial<br/>financiero y recibos)
    C(ACCIÓN: Agrupar deuda global<br/>por alumno, curso o periodo)
    D{¿Hay impagos o<br/>pendientes?}
    E(ACCIÓN: Marcar estado<br/>financiero como Impago)
    F(ACCIÓN: Marcar estado<br/>financiero como Al día)
    G(ACCIÓN: Actualizar registro<br/>de pagos y monitor financiero)
    H([ESTADO FINAL:<br/>Estado financiero actualizado<br/>para la academia])
    I(ACCIÓN: Alumno o tutor revisa<br/>su historial personal de recibos)
    J{¿Consulta de recibos<br/>personales?}
    K([ESTADO FINAL:<br/>Se muestra histórico de pagos<br/>y deuda personal])
    L([ESTADO FINAL:<br/>Se muestra acceso restringido<br/>o sin datos visibles])

    A --> B
    B --> C
    C --> D
    D -- Sí --> E
    E --> G
    D -- No --> F
    F --> G
    G --> H
    H --> I
    I --> J
    J -- Sí --> K
    J -- No --> L
```

| Elemento | Descripción |
| :--- | :--- |
| **Entradas / Evento** | Consulta de pagos globales por parte del ADMIN o histórico personal por parte del alumno/tutor |
| **Condiciones Clave** | ¿Hay impagos?; ¿Se está consultando el historial personal o la vista global? |
| **Salida / Cambio de Estado** | Se actualiza el estado financiero y se muestra la información permitida por rol |

</div>

<div class="flujo-block">

## 6. Flujo de Comunicación y Lectura de Mensajes

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'fontSize': '11px', 'fontFamily': 'Segoe UI, Arial, sans-serif', 'nodePadding': '8' }, 'flowchart': { 'curve': 'linear', 'useMaxWidth': true, 'nodeSpacing': 12, 'rankSpacing': 16 }}}%%
flowchart TD
    A([ESTADO INICIAL:<br/>Usuario abre una conversación<br/>activa])
    B(ACCIÓN: Redactar mensaje<br/>y enviarlo)
    C(ACCIÓN: Guardar mensaje<br/>en la conversación)
    D{¿La conversación está<br/>abierta en la interfaz<br/>actual?}
    E(ACCIÓN: Mostrar mensaje<br/>en tiempo real en la ventana<br/>activa)
    F(ACCIÓN: Generar alerta y<br/>badge de mensaje no leído)
    G(ACCIÓN: Actualizar lista de<br/>chats y llevar la conversación<br/>al inicio)
    H([ESTADO FINAL:<br/>Chat actualizado con<br/>nuevo mensaje])
    I([ESTADO FINAL:<br/>Mensaje pendiente de lectura<br/>y notificación visible])

    A --> B
    B --> C
    C --> D
    D -- Sí --> E
    E --> G
    G --> H
    D -- No --> F
    F --> G
    G --> I
```

| Elemento | Descripción |
| :--- | :--- |
| **Entradas / Evento** | Envío de un mensaje entre profesor y alumno |
| **Condiciones Clave** | ¿La conversación está abierta?; ¿La vista está activa en ese momento? |
| **Salida / Cambio de Estado** | El mensaje se entrega, se marca como leído o no leído y la conversación se reordena al inicio |

</div>

<div class="flujo-block">

## 7. Flujo de Consulta de Expediente Académico

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'fontSize': '11px', 'fontFamily': 'Segoe UI, Arial, sans-serif', 'nodePadding': '8' }, 'flowchart': { 'curve': 'linear', 'useMaxWidth': true, 'nodeSpacing': 12, 'rankSpacing': 16 }}}%%
flowchart TD
    A([ESTADO INICIAL:<br/>Alumno o tutor entra al<br/>expediente académico])
    B(ACCIÓN: Solicitar calificaciones<br/>por trimestre o periodo)
    C(ACCIÓN: Agrupar notas por<br/>curso, materia y actividad)
    D{¿Se desea filtrar por<br/>materia o rendimiento?}
    E(ACCIÓN: Aplicar filtro por<br/>materia, curso o periodo)
    F(ACCIÓN: Analizar tareas pendientes<br/>y rendimiento acumulado)
    G(ACCIÓN: Generar vista de notas<br/>y observaciones)
    H([ESTADO FINAL:<br/>Expediente académico visible<br/>para alumno o tutor])
    I([ESTADO FINAL:<br/>Vista sin filtro y con resumen<br/>general])

    A --> B
    B --> C
    C --> D
    D -- Sí --> E
    E --> F
    F --> G
    D -- No --> F
    G --> H
    F --> I
```

| Elemento | Descripción |
| :--- | :--- |
| **Entradas / Evento** | Acceso al expediente del alumno o tutor para consultar notas y rendimiento |
| **Condiciones Clave** | ¿Se aplica un filtro?; ¿Hay tareas pendientes o rendimiento bajo? |
| **Salida / Cambio de Estado** | Se genera la vista final con notas, materias y análisis académico |

</div>

<div class="flujo-block">

## 8. Flujo de Permisos de Clase y Profesores Asignados

```mermaid
flowchart TD
  A([Usuario solicita una clase]) --> B{¿Qué rol tiene?}
  B -- Administrador --> C([Acceso global])
  B -- Profesor --> D{¿Es titular o está asignado?}
  D -- Sí --> E([Acceso a alumnos, tareas, anuncios y calificaciones])
  D -- No --> F([Acceso denegado])
  E --> G{¿Gestionar colaboradores?}
  G -- Añadir --> H([Titular o asignado puede añadir profesor])
  G -- Retirar --> I([Solo administrador puede retirar])
```

| Elemento | Descripción |
| :--- | :--- |
| **Entradas / Evento** | Profesor accede a una clase, crea contenido o consulta datos académicos. |
| **Condiciones Clave** | El profesor debe ser titular o figurar en `CourseTeacher`; el alumno debe estar matriculado. |
| **Salida / Cambio de Estado** | Se concede acceso únicamente al ámbito de la clase autorizada. |

</div>

<div class="flujo-block">

## 9. Flujo de Calificaciones por Clase y por Alumno

```mermaid
flowchart TD
  A([Profesor abre Calificaciones]) --> B([Vista predeterminada por clases])
  B --> C([Cargar clases autorizadas])
  C --> D([Cargar alumnos matriculados y tareas evaluables])
  D --> E{¿Modalidad del alumno?}
  E -- Presencial --> F([35% Mid Term + 35% Final Term + 30% Tareas])
  E -- Online --> G([Media continua de tareas])
  F --> H([Nota global separada por clase])
  G --> H
  H --> I([Vista secundaria por alumno])
  I --> J([Expediente agrupado por cada clase])
```

| Elemento | Descripción |
| :--- | :--- |
| **Entradas / Evento** | Consulta de calificaciones de un profesor, alumno, tutor o administrador. |
| **Condiciones Clave** | Cada registro combina `studentId`, `courseId`, trimestre y año académico. |
| **Salida / Cambio de Estado** | Las notas no mezclan clases; un alumno matriculado en varias clases conserva una nota independiente en cada una. |

</div>

<div class="flujo-block">

## 10. Flujo de Materiales y Exámenes Interactivos

```mermaid
flowchart TD
  A([Profesor crea material]) --> B{¿Qué tipo?}
  B -- Documento, vídeo o audio --> C([Guardar recurso y URL])
  B -- Formulario --> D([Guardar preguntas y puntuaciones])
  C --> E([Publicar o asignar a alumnos])
  D --> E
  E --> F([Alumno abre recurso])
  F --> G{¿Es formulario?}
  G -- No --> H([Consultar o reproducir])
  G -- Sí --> I([Responder y enviar])
  I --> J([Corregir automáticamente lo objetivo])
  J --> K([Revisar preguntas abiertas si existen])
  K --> L([Guardar nota y feedback])
```

| Elemento | Descripción |
| :--- | :--- |
| **Entradas / Evento** | Alta, edición, duplicación, asignación o entrega de un material. |
| **Condiciones Clave** | Tipo de recurso, nivel, categoría, preguntas abiertas y estado de la entrega. |
| **Salida / Cambio de Estado** | El recurso queda disponible y la entrega actualiza el expediente cuando está evaluada. |

</div>

<div class="flujo-block">

## 11. Flujo de Notificaciones y Novedades

```mermaid
flowchart TD
  A([Profesor publica anuncio o tarea]) --> B([Guardar contenido])
  B --> C([Resolver alumnos y tutores activos])
  C --> D([Enviar correo SMTP sin duplicados])
  D --> E{¿SMTP correcto?}
  E -- Sí --> F([Marcar tarea notificada])
  E -- No --> G([Conservar tarea y reintentar])
  B --> H([Actualizar novedades de la interfaz])
  H --> I([Punto rojo en Chat, Calificaciones o Mis Clases])
```

| Elemento | Descripción |
| :--- | :--- |
| **Entradas / Evento** | Publicación de anuncio, tarea, calificación o mensaje nuevo. |
| **Condiciones Clave** | Solo cuentas activas reciben correo; las tareas programadas esperan a `publishAt`. |
| **Salida / Cambio de Estado** | Se envía correo, se reintenta si falla y se muestra la novedad hasta que el usuario la consulta. |

</div>

<div class="flujo-block">

## 12. Flujo de Matrículas, Pagos y Tutores

```mermaid
flowchart TD
  A([Profesor gestiona alumno]) --> B{¿Alta o baja?}
  B -- Alta --> C([Crear matrícula académica])
  C --> D([Activar alumno y generar pagos])
  D --> E([Enviar credenciales SMTP])
  B -- Baja --> F([Cerrar matrícula y retirar curso])
  F --> G([Desactivar alumno])
  G --> H{¿Tiene hijos activos el tutor?}
  H -- No --> I([Desactivar tutor])
  H -- Sí --> J([Mantener tutor activo])
  D --> K([Consultar y marcar pagos])
```

| Elemento | Descripción |
| :--- | :--- |
| **Entradas / Evento** | Alta, baja, reactivación, matrícula, consulta o actualización de pagos. |
| **Condiciones Clave** | La cuenta se activa con matrícula; la baja elimina matrículas de cursos y puede desactivar al tutor. |
| **Salida / Cambio de Estado** | Se actualizan estado, pagos, visibilidad, credenciales y acceso familiar. |

</div>

<div class="flujo-block">

## Resumen general del sistema

HitSchool combina doce flujos funcionales agrupados en cuatro capas:

- Acceso y autenticación
- Gestión académica y curricular
- Administración operativa y financiera
- Comunicación, notificaciones y seguimiento del alumno

Cada flujo mantiene una visión clara del estado del usuario, la actividad del curso y el resultado académico, con reglas de acceso diferenciadas por rol, separación de calificaciones por clase y actualización continua de la base de datos y la interfaz.

</div>
