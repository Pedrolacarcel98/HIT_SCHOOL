<style>
  @page {
    size: A4 portrait;
    margin: 15mm;
  }
  .seccion-rol {
    page-break-before: always !important;
    break-before: page !important;
    page-break-inside: avoid !important;
  }
  table {
    width: 100% !important;
    font-size: 11px !important;
    border-collapse: collapse;
  }
</style>

# 📘 Guía Práctica de HitSchool

Esta guía explica cómo usar HitSchool en el día a día. Está pensada para dirección, profesores y alumnos, con pasos claros y sin complicaciones.

## 1. Entrada a la plataforma

### Cómo iniciar sesión

1. Abre la dirección de HitSchool en tu navegador.
2. Escribe tu correo electrónico.
3. Escribe tu contraseña.
3. Pulsa el botón de acceso.
5. La plataforma te llevará automáticamente a tu zona de trabajo según tu perfil:
  - Dirección o administración: panel de gestión dentro de `/teacher`, con funciones adicionales de administración.
   - Profesorado: panel de clases y tareas.
  - Alumnado y tutores: panel de cursos, entregas y notas.

### Si no recuerdas tu clave

Si no puedes entrar porque no recuerdas tu contraseña, utiliza la opción de recuperación de contraseña de la pantalla de acceso. El backend envía una contraseña temporal por SMTP. Si el correo no llega, contacta con dirección para revisar el estado de la cuenta y la configuración de correo.

### Si aparece un error de acceso

Los errores más habituales suelen deberse a una contraseña incorrecta, un usuario desactivado o un correo que no está registrado. En ese caso, no crees otra cuenta por tu cuenta: avisa a dirección para que compruebe tus datos.

### Consejos rápidos para entrar sin problemas

| Situación | Qué hacer |
| :--- | :--- |
| No entra la contraseña | Comprueba mayúsculas, espacios y que estés usando la clave correcta |
| No reconoce el correo | Revisa que no falte ninguna letra o punto |
| La pantalla no carga | Actualiza la página o prueba con otro navegador |
| El usuario está bloqueado o inactivo | Contacta con dirección o administración |

<div class="seccion-rol">

## 2. Para la Dirección / Administradores

La zona de dirección permite controlar el funcionamiento general de la academia: usuarios, clases, matrículas, pagos y seguimiento global.

### Vistas generales

Al entrar como dirección o administrador, verás una vista general desde la que puedes acceder a los apartados principales de gestión. Desde ahí puedes revisar usuarios, cursos, alumnos, profesores, pagos y otros elementos importantes de la plataforma.

La idea es que tengas una visión rápida de qué está pasando en la academia y puedas actuar sin tener que ir pantalla por pantalla buscando información.

### Gestión de usuarios

Desde el área de administración puedes gestionar las cuentas de profesores, alumnos, tutores y administradores. El administrador utiliza el panel `/teacher`; no existe un panel separado `/admin`.

Para dar de alta un usuario:

1. Entra en el apartado de gestión correspondiente.
2. Elige si quieres crear un profesor, alumno u otro perfil disponible.
3. Rellena los datos básicos: nombre, correo y datos necesarios para la cuenta.
4. Guarda los cambios.
5. Comprueba que el usuario aparece en la lista.

Para editar un usuario:

1. Busca el usuario en el listado.
2. Abre su ficha o usa la acción de edición.
3. Cambia los datos necesarios.
4. Guarda la modificación.

Para desactivar un usuario:

1. Localiza el usuario.
2. Usa la opción de baja, desactivación o cambio de estado.
3. Confirma la acción.
4. Revisa que ya no aparezca como usuario activo.

Cuando se reactiva un alumno, profesor o tutor, el sistema genera una contraseña temporal nueva y trata de enviarla por SMTP. La reactivación de la cuenta se completa aunque el correo falle.

### Control de clases

La dirección puede crear, editar, eliminar y duplicar clases, además de asignar docentes. Los profesores no crean clases nuevas: trabajan dentro de las clases donde son titulares o están asignados.

Para crear un grupo o clase:

1. Entra en el apartado de clases o cursos.
2. Pulsa la opción de crear una clase nueva.
3. Indica el nombre del grupo, modalidad o datos principales.
4. Asigna el profesor titular si corresponde.
5. Guarda la clase.

Para asignar docentes:

1. Abre la clase o grupo.
2. Busca la sección de profesor o docente asignado.
3. Selecciona el profesor correcto.
4. Guarda los cambios.

El profesor titular o un profesor ya asignado también puede añadir colaboradores desde la pestaña **Personas**. La retirada de colaboradores permanece reservada al administrador.

### Control de matrículas y alumnos

Cuando un alumno debe formar parte de una clase, dirección puede revisar su matrícula y vincularlo al grupo correspondiente. Esto permite que el alumno vea sus cursos, tareas y materiales desde su panel.

Pasos habituales:

1. Entra en alumnos o matrículas.
2. Busca el alumno.
3. Revisa sus datos.
4. Asócialo a la clase correspondiente.
5. Guarda y comprueba que aparece dentro del grupo.

Para dar de alta académica a un alumno:

1. Abre **Gestión de Alumnos**.
2. Selecciona el alumno pendiente de alta.
3. Indica importe, periodicidad y fecha de inicio.
4. Confirma el alta.

La cuenta pasa a activa, se genera el calendario de pagos y se envían las credenciales por SMTP. Una baja cierra la matrícula, desactiva al alumno y elimina sus matrículas de clases. Si el tutor ya no tiene hijos activos, también puede quedar desactivado.

### Pagos y seguimiento económico

Si tu perfil tiene permisos para ello, podrás consultar pagos, deudas o estados económicos. Esta zona ayuda a controlar recibos, importes pendientes y estado financiero de cada alumno o grupo.

Acciones habituales:

1. Entrar en el apartado de pagos.
2. Buscar un alumno, grupo o periodo.
3. Revisar si hay pagos al día o importes pendientes.
4. Actualizar el estado si corresponde.
5. Guardar los cambios.

El control global de pagos está destinado a dirección/administración. El alumno y el tutor pueden consultar su propio historial y estado desde el portal correspondiente. Los pagos se calculan según el calendario de la matrícula activa y pueden ser mensuales o trimestrales.

### Tabla resumen

| Acción principal | Dónde se realiza | Resultado esperado |
| :--- | :--- | :--- |
| Crear profesor | Gestión de profesores | El docente puede acceder a la plataforma |
| Crear alumno | Gestión de alumnos | El alumno queda registrado en HitSchool |
| Editar datos de usuario | Listado de usuarios | La información queda actualizada |
| Desactivar usuario | Ficha o listado de usuario | El usuario deja de estar activo |
| Crear clase o grupo | Cursos o clases | La clase queda disponible para organizar alumnos y tareas |
| Asignar profesor | Detalle de la clase | El docente queda vinculado al aula |
| Revisar pagos | Pagos | Se ve el estado económico del alumno o grupo |
| Consultar información general | Panel principal | Dirección obtiene una visión rápida de la academia |

</div>

<div class="seccion-rol">

## 3. Para Profesores

La zona del profesor está pensada para organizar clases, publicar materiales, crear tareas, revisar entregas y poner notas.

### Tus asignaturas

Al entrar como profesor, verás tus clases o asignaturas disponibles. Cada clase funciona como un espacio de trabajo donde puedes consultar alumnos, publicar contenido y hacer seguimiento del progreso.

Para entrar en una clase:

1. Accede a tu panel de profesor.
2. Busca la clase que quieres abrir.
3. Haz clic sobre ella.
4. Revisa las pestañas o apartados disponibles: tablón, tareas, personas, materiales o notas, según la configuración de la plataforma.

### Ver listados de alumnos

Dentro de cada clase puedes revisar qué alumnos están inscritos. Esta vista te ayuda a comprobar si falta alguien, si hay alumnos mal asignados o si necesitas contactar con dirección para ajustar una matrícula.

Pasos:

1. Abre la clase.
2. Entra en el apartado de personas o alumnado.
3. Revisa el listado.
4. Si detectas un error, comunícalo a dirección para corregirlo.

### Acceso a clases y profesores asignados

Un profesor solo ve las clases en las que es titular o está asignado mediante `CourseTeacher`.

Dentro de una clase autorizada puede consultar alumnos, crear tareas, publicar anuncios, corregir entregas, gestionar materiales y consultar calificaciones. No obtiene acceso automático a otras clases por ser presencial.

### Reutilizar o clonar una clase anterior

La duplicación de clases es una acción de administración, no una acción ordinaria del profesor.

Pasos recomendados:

1. Dirección busca la clase que quiere usar como modelo.
2. Usa la opción de duplicar o clonar.
3. Cambia el nombre para el nuevo curso o grupo.
4. Revisa fechas, tareas y materiales.
5. Comprueba que no se arrastran alumnos ni matrículas antiguas.
6. Guarda la nueva clase.

Antes de publicar una clase clonada, revisa especialmente las fechas límite y los alumnos inscritos. Así evitas que aparezcan tareas antiguas o datos del grupo anterior.

### Tareas y materiales

Los materiales son recursos que el alumnado puede consultar. Las tareas son actividades que el alumno debe realizar y entregar.

Para subir un material:

1. Entra en la clase.
2. Abre el apartado de materiales o recursos.
3. Pulsa subir o crear material.
4. Añade título y descripción si hace falta.
5. Adjunta el archivo o contenido.
6. Publica o guarda el material.

Para crear una tarea sencilla:

1. Entra en la clase.
2. Abre el apartado de tareas.
3. Pulsa crear tarea.
4. Escribe el título.
5. Añade instrucciones claras para el alumno.
6. Indica la fecha límite si corresponde.
7. Adjunta archivos de apoyo si son necesarios.
8. Publica la tarea.

También puedes crear una **tarea estructurada/multistep** con varios pasos. Puede ser para toda la clase o para alumnos concretos, tener pasos secuenciales, fecha de publicación futura y materiales evaluables. Las plantillas no se notifican hasta convertirse en una tarea activa.

Las tareas estructuradas pueden incluir formularios autocorregibles, entregas de texto, enlaces y archivos adjuntos. La tarea se considera evaluable cuando todos sus pasos evaluables tienen calificación.

#### Publicaciones del tablón

En la pestaña **Tablón** puedes publicar texto, imágenes o vídeos. Al publicar, el sistema conserva el anuncio y envía una notificación individual por SMTP a alumnos y tutores activos. Los destinatarios duplicados se agrupan y el profesor no recibe copia.

### Corregir entregas

Cuando los alumnos entregan una tarea, el profesor puede revisar el contenido y valorar el trabajo.

Pasos:

1. Abre la clase.
2. Entra en tareas.
3. Selecciona la tarea que quieres corregir.
4. Revisa las entregas recibidas.
5. Abre la entrega de cada alumno.
6. Comprueba los archivos o respuestas.
7. Añade comentarios si es necesario.
8. Guarda la revisión.

### Poner notas

Después de revisar una entrega, puedes añadir o actualizar la calificación.

Pasos:

1. Abre la entrega o el apartado de notas.
2. Introduce la calificación correspondiente.
3. Añade observaciones si quieres dar más contexto al alumno.
4. Guarda los cambios.
5. Comprueba que la nota aparece correctamente en el expediente o vista de calificaciones.

#### Calificaciones por clase

Entra en **Calificaciones**. La vista inicial es **Por clases** y solo muestra las clases autorizadas y sus alumnos matriculados. Las notas no se mezclan entre clases.

Para alumnos presenciales se muestra:

- `MIDDLE TERM`: 35%.
- `FINAL TERM`: 35%.
- `MEDIA TAREAS`: 30%.
- `CALIFICACIÓN TRIMESTRAL`: resultado ponderado.

Para alumnos online, la nota global es la media continua de las tareas evaluables y puede incluir el desglose de competencias.

La vista **Por alumnos** es secundaria y muestra el expediente separado por cada clase. Si un alumno pertenece a varias clases, conserva una nota independiente en cada una.

Un profesor puede consultar y guardar notas únicamente para alumnos matriculados en una clase donde sea titular o esté asignado.

### Comunicación con alumnos

Si la plataforma tiene chat o mensajería activa para tu perfil, puedes usarla para resolver dudas, avisar de cambios o dar indicaciones rápidas.

Recomendaciones:

- Usa mensajes claros y breves.
- Indica siempre a qué clase o tarea te refieres.
- Evita enviar la misma información por varios sitios si ya está publicada en la tarea.
- El indicador rojo del chat avisa de mensajes no leídos.
- También pueden aparecer indicadores de novedades en calificaciones y clases.

### Tabla resumen

| Acción habitual | Paso a paso | Resultado esperado |
| :--- | :--- | :--- |
| Entrar en una clase | Panel de profesor > seleccionar clase | Se abre el espacio de trabajo de esa asignatura |
| Ver alumnos | Clase > personas o alumnado | Aparece el listado de estudiantes inscritos |
| Acceder a una clase | Mis Clases > abrir clase autorizada | Se abre el espacio de trabajo disponible para el profesor |
| Asignar colaborador | Clase > Personas > Asignar Profesor | El profesor queda vinculado a la clase |
| Clonar clase | Administración > clase anterior > duplicar | Se crea una copia sin alumnos ni fechas antiguas |
| Subir material | Clase > materiales > subir recurso | El alumnado puede consultar el archivo |
| Crear tarea | Clase > tareas > crear tarea > publicar | La tarea aparece para los alumnos |
| Revisar entregas | Tarea > entregas > abrir alumno | El profesor puede valorar el trabajo recibido |
| Poner nota | Entrega o calificaciones > introducir nota > guardar | La calificación queda registrada |
| Enviar mensaje | Chat > conversación > escribir y enviar | El alumno recibe la comunicación |

</div>

<div class="seccion-rol">

## 4. Para Alumnos

La zona del alumno permite consultar cursos, ver tareas, entregar trabajos y revisar notas.

### Tus cursos

Al entrar como alumno, verás las asignaturas o clases en las que estás inscrito. Cada curso contiene la información que el profesor haya publicado.

Para abrir un curso:

1. Entra en la plataforma con tu correo y contraseña.
2. Revisa tu panel de alumno.
3. Haz clic en el curso que quieras consultar.
4. Mira los apartados disponibles: tareas, materiales, notas o mensajes.

Si falta una asignatura, avisa a tu profesor o a dirección para que revisen tu matrícula.

Los tutores pueden seleccionar cuál de sus hijos quieren consultar cuando tienen más de uno vinculado.

### Consultar tareas

En el apartado de tareas puedes ver qué trabajos tienes pendientes, cuáles están entregados y qué fecha límite tiene cada uno.

Pasos:

1. Abre tu curso.
2. Entra en tareas o trabajo de clase.
3. Revisa el listado.
4. Abre la tarea que quieras consultar.
5. Lee las instrucciones completas antes de entregar.

### Entregar trabajos

Para entregar una tarea:

1. Abre el curso correspondiente.
2. Entra en tareas.
3. Selecciona la tarea que quieres entregar.
4. Lee las instrucciones.
5. Adjunta el archivo pedido o completa la respuesta indicada.
6. Pulsa enviar o entregar.
7. Comprueba que la tarea queda marcada como entregada.

Antes de enviar, revisa que el archivo sea el correcto. Si entregas un documento equivocado, avisa al profesor cuanto antes.

### Subida de archivos

Cuando adjuntes un archivo, espera a que termine la carga antes de cerrar la página. Si cierras demasiado pronto, puede que la entrega no se guarde bien.

Consejos:

- Usa nombres de archivo claros.
- Evita archivos demasiado pesados si no son necesarios.
- Comprueba que el archivo se abre correctamente antes de subirlo.
- Si hay un error, intenta subirlo de nuevo o avisa al profesor.

### Consulta de notas

Puedes revisar tus calificaciones desde el apartado de notas o expediente académico.

Pasos:

1. Entra en tu panel de alumno.
2. Abre notas, calificaciones o expediente.
3. Selecciona el curso o periodo si aparece esa opción.
4. Revisa las notas y comentarios del profesor.

Si no ves una nota, puede ser que el profesor todavía no haya corregido la tarea o que la calificación aún no esté publicada.

En presencial, la nota trimestral combina 35% de Mid Term, 35% de Final Term y 30% de tareas. En online, se utiliza la media continua de tareas. Las notas se muestran separadas por clase y trimestre.

### Formularios y exámenes

Cuando una tarea contiene un formulario, responde todas las preguntas y pulsa **Enviar y corregir examen**. Las preguntas objetivas se corrigen automáticamente. Si hay preguntas abiertas, la entrega queda pendiente de revisión del profesor. Al finalizar podrás revisar tus respuestas y ver la puntuación disponible.

### Avisos y novedades

Los puntos rojos de la barra lateral indican mensajes de chat, calificaciones nuevas o tareas nuevas. Al entrar en la sección correspondiente, la novedad se marca como vista.

### Comentarios del profesor

Además de la nota, algunas tareas pueden incluir observaciones. Léelas con atención porque te ayudan a saber qué mejorar o qué hiciste bien.

### Tabla resumen

| Uso diario | Qué debes hacer | Resultado esperado |
| :--- | :--- | :--- |
| Ver tus cursos | Entrar al panel de alumno | Aparecen tus asignaturas activas |
| Abrir una asignatura | Hacer clic en el curso | Ves tareas, materiales y avisos |
| Consultar una tarea | Curso > tareas > abrir tarea | Ves instrucciones y fecha límite |
| Entregar trabajo | Adjuntar archivo o respuesta > enviar | La tarea queda marcada como entregada |
| Revisar materiales | Curso > materiales | Puedes descargar o consultar recursos |
| Ver notas | Panel de alumno > calificaciones | Aparecen tus notas disponibles |
| Leer comentarios | Abrir tarea corregida o nota | Ves observaciones del profesor |
| Avisar de un problema | Contactar con profesor o dirección | Se puede revisar la incidencia |

</div>

<div class="seccion-rol">

## 5. Para Tutores

El tutor utiliza el mismo entorno de alumnado, pero puede cambiar entre los hijos activos vinculados a su cuenta.

### Consultar a un hijo

1. Entra con las credenciales del tutor.
2. Abre **Mis Clases** para ver las clases del hijo seleccionado.
3. Usa el selector de hijos del panel lateral si tienes más de un hijo activo.
4. Consulta sus tareas, entregas, calificaciones, pagos y conversaciones permitidas.

El tutor no puede ver clases ni calificaciones de alumnos que no estén vinculados a su cuenta. Si un hijo se da de baja, deja de aparecer en el portal familiar; si el tutor no tiene ningún hijo activo, su cuenta puede desactivarse automáticamente.

### Pagos del hijo

Desde **Mis Pagos** puedes consultar cuotas, fechas de vencimiento, importes, pagos realizados y estados pendientes del calendario de matrícula.

### Comunicación

El tutor puede comunicarse con profesores cuando la conversación está permitida. Las conversaciones se asocian al hijo correspondiente para evitar mezclar historiales familiares.

</div>

<div class="seccion-rol">

## 6. Mapa de navegación

| Perfil | Rutas principales | Uso |
| :--- | :--- | :--- |
| Administrador | `/teacher`, `/teacher/courses`, `/teacher/grades`, `/teacher/students`, `/teacher/teachers`, `/teacher/admins`, `/teacher/parents`, `/teacher/payments` | Gestión global de clases, usuarios, matrículas, calificaciones y pagos |
| Profesor | `/teacher`, `/teacher/courses`, `/teacher/course/:id`, `/teacher/grades`, `/teacher/materials`, `/teacher/students`, `/teacher/parents`, `/teacher/chat` | Trabajo dentro de clases autorizadas, tareas, materiales, entregas, notas y comunicación |
| Alumno | `/student`, `/student/courses`, `/student/course/:id`, `/student/grades`, `/student/payments`, `/student/chat` | Consulta de clases, tareas, entregas, calificaciones, pagos y chat |
| Tutor | `/student`, `/student/courses`, `/student/course/:id`, `/student/grades`, `/student/payments`, `/student/chat` | Consulta de los hijos activos vinculados |

Las rutas protegidas requieren sesión y validan el rol. Un profesor solo puede consultar datos académicos de clases donde es titular o está asignado; las calificaciones se separan por clase y alumno.

</div>

<div class="seccion-rol">

## 7. Dudas habituales

### No puedo iniciar sesión

Comprueba que estás usando el correo correcto y que la contraseña está bien escrita. Si el problema continúa, contacta con dirección o administración para revisar tu cuenta.

También puedes utilizar la recuperación de contraseña. La nueva clave se envía por correo electrónico si la cuenta está activa.

### No veo una clase o asignatura

Puede que todavía no estés matriculado en esa clase o que la asignación no se haya guardado. Avisa a dirección o a tu profesor para que lo revisen.

### No puedo subir un archivo

Prueba lo siguiente:

1. Revisa que el archivo no esté abierto en otro programa.
2. Comprueba que tienes conexión a internet.
3. Intenta subirlo otra vez.
4. Si sigue fallando, cambia el nombre del archivo usando solo letras y números.
5. Si el problema continúa, avisa al profesor.

### La tarea aparece como no entregada

Puede que no hayas pulsado el botón final de enviar o entregar. Vuelve a abrir la tarea y revisa su estado. Si tienes dudas, contacta con el profesor.

### No veo mi nota

Es posible que la tarea aún no esté corregida o que la nota todavía no se haya publicado. Espera a que el profesor termine la revisión o pregunta directamente si ha pasado mucho tiempo.

En las calificaciones del profesor, una tarjeta puede mostrar los bloques con `- / 10` mientras todavía no exista una evaluación trimestral guardada. Esto significa que la evaluación está pendiente, no que falte el alumno.

### He entregado un archivo equivocado

Avise al profesor cuanto antes. Si la tarea permite modificar la entrega, sube el archivo correcto. Si no lo permite, el profesor podrá indicarte cómo proceder.

### La página carga lenta

Actualiza la página y comprueba tu conexión. Si estás usando muchos archivos o una red lenta, espera unos segundos antes de repetir la acción.

### Me aparece un error al guardar

No cierres la ventana de inmediato. Revisa si el cambio se ha guardado. Si no aparece, intenta repetir la acción. Si el error se repite, informa a dirección o al profesor indicando qué estabas intentando hacer.

### Recomendaciones generales

| Recomendación | Por qué ayuda |
| :--- | :--- |
| Revisar bien los datos antes de guardar | Evita cambios incorrectos |
| No cerrar la página mientras se sube un archivo | Permite que la entrega se guarde correctamente |
| Usar nombres de archivo claros | Facilita la revisión por parte del profesor |
| Consultar las tareas con frecuencia | Evita entregas fuera de plazo |
| Avisar pronto si hay un problema | Permite resolverlo antes de la fecha límite |

</div>
