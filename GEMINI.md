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
   - Dashboard analítico con métricas de alumnos activos, cursos, entregas pendientes y pagos vencidos.
   - Gestión de cursos/aulas virtuales: tablón de anuncios, trabajo de clase, matriculaciones.
   - Creación y edición de materiales multimedia (Audio Listening, Vídeos YouTube/Vimeo/MP4, Documentos PDF Drive/Web, Infografías).
   - Form Builder de cuestionarios interactivos con autocorrección (Test múltiple, V/F, respuesta corta y Fill-in-the-blanks con imágenes y audios).
   - Centro maestro de calificaciones con conmutador Presencial vs Online, feedback pedagógico y evaluación final por competencias (CEFR: Grammar, Reading, Writing, Listening, Speaking).
   - Gestión de alumnos con ficha extendida (DNI, teléfono, fecha de nacimiento/edad, dirección, vinculación a tutores) y alta automática de credenciales con webhook a n8n.
   - Matriz visual de control de mensualidades y generación de recibos/facturas en PDF.
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

### 2.1 Errores de Compilación TypeScript (Frontend)
- **Error TS6133 en `src/pages/TeacherCourses.tsx:59:10`:**
  - `enrolledStudents` está declarada con `useState` pero nunca se lee en el componente.
  - Al compilar con `npm run build` (`tsc -b`), el build falla inmediatamente porque `noUnusedLocals: true` está activo en `tsconfig.app.json`.
- **Dependencias de PDF (`jspdf` y `jspdf-autotable`):**
  - Declaradas en `frontend/package.json`, pero requerían ejecutar `npm install` localmente para sincronizar los tipos con el bundler.

### 2.2 Advertencias de Linter (`oxlint`) & Buenas Prácticas React
1. **Falta de propiedad `key` en mapeos JSX:**
   - `StudentCourses.tsx:628` (mapeo de tipos de entrega en el modal).
   - `TeacherGrades.tsx:633` y `634` (pestañas de filtro y botones de navegación rápida).
   - `TeacherCourses.tsx:317` y `318`.
   - `StudentsManagement.tsx:412` y `413`.
2. **Hoisting / Temporal Dead Zone (TDZ) en `useEffect`:**
   - En `StreamTab.tsx`, `MaterialsManagement.tsx`, `TeacherCourses.tsx` y `StudentsManagement.tsx`, funciones declaradas con `const fetchX = async () => ...` son invocadas dentro de `useEffect` declarado antes de su definición léxica. Debe reorganizarse el orden de declaración o envolverse en `useCallback`.
3. **Cascada de Renderizado (`set-state-in-effect`):**
   - `TeacherGrades.tsx:232` y `328`: llamadas a `setState` síncronas en efectos que provocan re-renderizados innecesarios al calcular medias y listas de alumnos.
   - `StudentClassworkTab.tsx:181`: sincronización de materiales asignados dentro de efectos dependientes.

### 2.3 Base de Datos y Sincronización Prisma
- Como se documentó en `STATUS.md`, las tablas `StructuredTask`, `StructuredTaskStep`, `StructuredTaskStepProgress`, `StructuredTaskStudent`, el rol `PARENT` y los campos de ficha extendida (`dni`, `phone`, `birthDate`, `address`) en `Profile` requieren sincronizarse en el PostgreSQL local mediante `npx prisma db push`.
- El archivo `backend/migrateEnrollments.ts` en la raíz contiene referencias a campos antiguos de `User` (`courseStartDate`, `monthlyFee`) que ya no existen en `schema.prisma` (fueron trasladados a `AcademyEnrollment`), por lo que no debe ejecutarse.

---

## 3. Bugs Funcionales y Flujos Rotos Detectados

### 🔴 3.1 BUG CRÍTICO: Cierre Inmediato del Pop-up de Resultados en `FormPlayer`
- **Ubicación:** `frontend/src/components/FormPlayer.tsx`, `StudentClassworkTab.tsx` (línea 391) y `StudentCourses.tsx` (líneas 200 y 725).
- **Descripción:** `FormPlayer` incluye un flujo de 3 pasos tras entregar: `'COMPLETED' -> 'GRADE' -> 'REVIEW'` con un modal que muestra la nota, los aciertos y felicitación. Sin embargo, al pulsar *«Enviar y Corregir Examen»*, `FormPlayer` ejecuta síncronamente el callback `onFinish()`. En las páginas consumidoras, tras recibir la respuesta afirmativa del backend (`res.ok`), se ejecuta inmediatamente `setViewingMaterial(null)` o `setViewingContent(null)`.
- **Impacto:** El modal que aloja `FormPlayer` se destruye de golpe en el DOM. El alumno **nunca llega a ver el pop-up de calificación**, felicitación ni desglose de aciertos que `FormPlayer` abre; la pantalla se cierra abruptamente dejando una sensación de fallo.

### 🔴 3.2 Imposibilidad de Cambio de Contraseña para Alumnos
- **Ubicación:** `frontend/src/components/StudentLayout.tsx` (línea 257) y `DashboardStudent.tsx`.
- **Descripción:** El botón para abrir `SettingsModal` en el panel de estudiantes está condicionado a:
  ```tsx
  {userRole === 'PARENT' && (
    <button onClick={() => setIsSettingsOpen(true)}>
      <Settings size={16} /> Ajustes de Cuenta
    </button>
  )}
  ```
- **Impacto:** Cuando el profesor o n8n da de alta a un alumno y le asigna una credencial temporal (`hitXXXX`), **el alumno no tiene ningún botón ni ajuste en toda la interfaz para cambiar su contraseña o actualizar su perfil**. Solo los padres tienen acceso a ese modal.

### 🔴 3.3 Botón "PDF Impagos" Inoperativo en `EnrollmentsManagement.tsx`
- **Ubicación:** `frontend/src/pages/EnrollmentsManagement.tsx` (línea 144) y `backend/src/routes/students.ts` (línea 300).
- **Descripción:** En la vista de gestión de matrículas, la función `downloadUnpaidPDF(student)` busca `student.paymentStatuses?.filter(p => !p.isPaid)`. No obstante, el endpoint `GET /api/students` del backend **no incluye la relación `paymentStatuses`** en la cláusula `select`.
- **Impacto:** `student.paymentStatuses` es siempre `undefined`. La condición `{s.paymentStatuses && s.paymentStatuses.some(p => !p.isPaid)}` nunca se cumple, por lo que el botón nunca aparece en la tabla; y si se forzara su ejecución, lanzaría un error informando que no hay pagos pendientes.

### 🔴 3.4 Código Muerto y Omisión del Rol `ADMIN` en `courses.ts`
- **Ubicación:** `backend/src/routes/courses.ts` (líneas 14, 71, 87, 198).
- **Descripción:**
  1. **Ruta duplicada:** La ruta `router.get('/:id', ...)` está definida dos veces: en la línea 71 (sin middleware de verificación) y en la línea 198 (con `verifyCourseAccess`). Express ejecuta siempre la primera, dejando la segunda como código muerto inalcanzable.
  2. **Omisión de `ADMIN`:** En `GET /api/courses`, se comprueba `if (role === 'TEACHER')`. Si un usuario con rol `ADMIN` inicia sesión, cae en la rama `else` (pensada para alumnos y tutores) y recibe un array vacío `[]`. Asimismo, en `GET /api/courses/:id`, se verifica `if (role === 'TEACHER' && course.teacherId !== userId) return 403`, bloqueando a los administradores.

### 🔴 3.5 Cuota Mensual "No asignada" en `SettingsModal`
- **Ubicación:** `backend/src/routes/auth.ts` (línea 109 `GET /api/auth/me`) y `frontend/src/components/SettingsModal.tsx` (línea 53).
- **Descripción:** `SettingsModal` intenta mostrar la cuota del estudiante leyendo `data.monthlyFee`. Sin embargo, `monthlyFee` no es una propiedad del modelo `User`, sino de la relación `academyEnrollments`. Dado que `GET /api/auth/me` no incluye `academyEnrollments`, `data.monthlyFee` llega siempre como `undefined`, mostrando de forma errónea *"No asignada"* incluso a alumnos con matrícula activa de 35€ o 65€.

### 🟡 3.6 Deficiencias en Tarjeta de Revisión de Examen (`TeacherGrades.tsx`)
- **Ubicación:** `frontend/src/pages/TeacherGrades.tsx` (líneas 1014-1062) y `components/GradesTab.tsx` (líneas 382-390).
- **Descripción:**
  - En `TeacherGrades.tsx` (dentro del expediente del alumno), la tarjeta de examen completado coloca en un contenedor `display: flex; justify-content: space-between; flex-wrap: wrap` tres hijos sueltos: el título con icono, el botón *«Revisar»* y el botón *«Editar Nota y Feedback»*. En anchos intermedios y móviles, el botón *«Revisar»* queda desalineado en medio de la tarjeta.
  - Además, no muestra el resumen rápido de aciertos (ej. `7/10 aciertos`).
  - En `GradesTab.tsx` (pestaña dentro del curso), para exámenes solo se muestra el botón *«Ver»*, sin opción de editar la nota o añadir observaciones pedagógicas, a diferencia de `TeacherGrades.tsx`.

### 🟡 3.7 Superposición Estética en `ExamReviewModal.tsx`
- **Ubicación:** `frontend/src/components/ExamReviewModal.tsx` (línea 198).
- **Descripción:** El estilo del fondo del modal está configurado como `background: '#aeb4b7'`. Es un color gris sólido y 100% opaco.
- **Impacto:** Al abrir la revisión pedagógica de cualquier prueba, la pantalla detrás se vuelve un bloque gris plano sin ninguna transparencia ni desenfoque, degradando la estética Glassmorphism del resto de la aplicación.

### 🟡 3.8 Email Hardcodeado en `TeacherLayout.tsx`
- **Ubicación:** `frontend/src/components/TeacherLayout.tsx` (línea 204).
- **Descripción:** La esquina inferior del menú lateral del profesor muestra de forma estática `<p>profesor@hitschool.com</p>`, en lugar de leer el email real del usuario desde `localStorage.getItem('userEmail')`.

---

## 4. Botones Vacíos, Huérfanos o Sin Efecto Real

1. **Componentes Completos Huérfanos en Frontend:**
   - **`StudentGradesTab.tsx` (359 líneas):** Componente perfectamente implementado para mostrar las calificaciones de un curso concreto a un alumno (incluyendo competencias y feedback), pero **no está importado en ninguna ruta ni pestaña de `StudentCourseView.tsx`**.
   - **`StudentPeopleTab.tsx` (63 líneas):** Componente listo para mostrar los compañeros de clase al alumno en un aula virtual, pero **no está integrado en `StudentCourseView.tsx`** (solo existen pestañas de Tablón y Material).
   - **`GradesTab.tsx` (496 líneas):** Componente diseñado específicamente con la propiedad `courseId: string` para calificar dentro del aula, pero **`CourseView.tsx` (vista profesor del curso) no incluye la pestaña de Calificaciones**; obliga a salir de la clase e ir a `/teacher/grades`.
2. **Botón "Calificar" del Dashboard del Profesor (`DashboardTeacher.tsx` línea 146):**
   - En la sección *«Últimas Entregas (Sin Nota)»*, al hacer clic en *«Calificar»*, se ejecuta `navigate('/teacher/grades')` sin pasar ningún parámetro de búsqueda, id de alumno ni id de entrega. El profesor aterriza en la lista global de calificaciones y debe buscar manualmente a quién correspondía esa entrega.
3. **Descarga de Facturas desde la Ficha del Alumno (`StudentsManagement.tsx`):**
   - En el modal de visualización de expediente extendido (`viewingStudent`), solo aparecen botones de *"Cerrar"* y *"Editar Ficha"*. El requisito maestro 1.4 (`REQUIREMENTS.md` línea 58: *«Acceso y descarga de facturas/recibos en PDF desde la ficha del alumno»*) está pendiente.
4. **Publicación en el Tablón sin Disparo de Notificaciones:**
   - En `StreamTab.tsx` y `POST /api/courses/:id/posts`, al publicar un anuncio para la clase, solo se guarda el registro en base de datos. No existe webhook a n8n ni envío de correo electrónico a los alumnos matriculados o tutores (requisito 1.7 de `REQUIREMENTS.md`).

---

## 5. Inconsistencias de Experiencia de Usuario y UI/UX

### 5.1 Fragmentación Visual de Tareas Estructuradas (Punto 2 de `BUGS.md`)
Actualmente coexisten dos implementaciones visuales y de interacción distintas para las mismas tareas estructuradas:
- **En «Mis Clases» (`StudentCourses.tsx`):**
  - Muestra una barra de progreso porcentual superior (`X de Y pasos completados - Z%`).
  - Botones de acción dinámicos según el tipo de material: *«Realizar Test»*, *«Ver Documento»*, *«Ver Vídeo»*, *«Ver Examen Corregido»*.
- **En «Material Asignado» dentro del aula (`StudentClassworkTab.tsx`):**
  - Muestra etiquetas badge `Paso a paso` y `N pasos` sin barra de porcentaje.
  - Botones etiquetados con la sintaxis `[ FORM ] Título` o `[ VIDEO ] Título`, y un botón secundario separado *«Ver Entrega / Resultados»*.
  - Los modales para completar documentos o responder preguntas utilizan estilos y diálogos dispares.

### 5.2 Posicionamiento y Desbordamiento de Modales (Punto 1 de `BUGS.md`)
- En `StudentClassworkTab.tsx` y `StudentCourses.tsx`, los contenedores de modales aplican inline `alignItems: 'stretch'`, `padding: '0.75rem 1rem 0'` y `height: 'calc(100vh - 0.75rem)'`, lo que genera modales pegados al borde superior del viewport que fuerzan scroll manual y rompen la regla global de centrado de `index.css` (`align-items: center`).
- En dispositivos móviles, algunos modales carecen de anchos fluidos y de `overflow-y: auto` interno seguro, provocando recortes de texto.

---

## 6. Comparativa con Documentos Maestros (`REQUIREMENTS.md` y `REFACTORIZACIONES.md`)

| Funcionalidad / Requisito | Estado en Docs | Estado Real en Código | Diagnóstico / Observaciones |
| :--- | :---: | :---: | :--- |
| **Unificación del modelo de asignaciones** | Pendiente (`REFACTORIZACIONES.md`) | Fragmentado en 3 modelos | Coexisten `Assignment` (clase), `MaterialAssignment` (directo) y `StructuredTask` (pasos). Genera duplicidad de endpoints y tablas. |
| **Tarjetas limpias de material con modal de detalle** | Pendiente (`REFACTORIZACIONES.md`) | Tarjetas densas | `MaterialsManagement.tsx` tiene tarjetas sobrecargadas con botones directos en lugar del diseño bajo demanda solicitado. |
| **Acceso a facturas desde ficha del alumno** | Pendiente (`REQUIREMENTS.md:58`) | No implementado | La ficha modal del alumno en `StudentsManagement.tsx` no tiene botón de facturas/recibos. |
| **Pagos agrupados por tutor familiar** | Pendiente (`REQUIREMENTS.md:71`) | Parcial | Los pagos se consultan por hijo con selector; no existe factura combinada unificada de hermanos. |
| **Planes tarifarios flexibles** | Parcial (`REQUIREMENTS.md:72`) | Parcial (35€ y 65€) | Solo existen selectores fijos de 35€ y 65€/mes. Pendiente soporte para trimestrales y tarifas a medida. |
| **Avisos por email al publicar en tablón** | Pendiente (`REQUIREMENTS.md:82`) | No conectado a n8n | El backend guarda el post en Postgres pero no emite webhook ni notificación. |
| **Pestañas de aula virtual para alumno** | Completado en requisitos | Huérfanas en frontend | `StudentGradesTab` y `StudentPeopleTab` existen pero están excluidas de `StudentCourseView`. |

---

## 7. Plan de Acción y Roadmap de Solución Recomendado

### Fase 1: Hotfixes Inmediatos y Estabilidad (Prioridad Alta)
1. **Resolver compilación TypeScript:**
   - Eliminar la variable no utilizada `enrolledStudents` en `src/pages/TeacherCourses.tsx:59`.
2. **Corregir bug crítico de `FormPlayer`:**
   - Evitar que `onFinish` cierre el modal contenedor inmediatamente. Permitir que el alumno interactúe con el modal de resultados (`GRADE` y `REVIEW`) y que sea el botón de cierre del propio `FormPlayer` el que desmonte la vista.
3. **Habilitar acceso a Ajustes de Cuenta para Alumnos:**
   - Modificar `StudentLayout.tsx` para que el botón *«Ajustes de Cuenta»* esté visible tanto para `PARENT` como para `STUDENT`.
4. **Corregir endpoint `GET /api/students` para Matrículas:**
   - Añadir la relación `paymentStatuses` en el `select` de `backend/src/routes/students.ts` para que el informe y botón "PDF Impagos" funcione.
5. **Corregir permisos `ADMIN` y rutas en `backend/src/routes/courses.ts`:**
   - Eliminar la ruta duplicada `GET /:id` (línea 198) e incorporar `role === 'ADMIN'` en las verificaciones de cursos.
6. **Corregir `GET /api/auth/me`:**
   - Incluir `academyEnrollments: true` para que la cuota mensual se muestre correctamente en `SettingsModal`.

### Fase 2: Homogeneización UI/UX y Modales (Prioridad Media)
1. **Unificar visualmente las Tareas Estructuradas:**
   - Estandarizar un único componente de tarjeta de tarea estructurada compartido entre `StudentCourses.tsx` y `StudentClassworkTab.tsx`.
2. **Ajustar contenedor de modales en `index.css` y componentes:**
   - Sustituir `alignItems: 'stretch'` y alturas absolutas por `alignItems: 'center'`, anchos fluidos y `overflow-y: auto`.
   - Cambiar el fondo de `ExamReviewModal.tsx` a un overlay translúcido con blur `rgba(0, 0, 0, 0.6)`.
3. **Tarjeta de revisión de exámenes en `TeacherGrades.tsx`:**
   - Agrupar los botones de acción en un contenedor `div`, añadir el indicador de aciertos (`score / total`) y alinear correctamente en mobile.
4. **Integrar pestañas huérfanas:**
   - Conectar `StudentGradesTab.tsx` y `StudentPeopleTab.tsx` en `StudentCourseView.tsx`.
   - Añadir la pestaña `GradesTab.tsx` en `CourseView.tsx` del profesor.

### Fase 3: Consolidación de Funcionalidades y Refactorizaciones (Prioridad Arquitectónica)
1. **Unificación del modelo de asignaciones:**
   - Transicionar hacia el modelo único propuesto en `REFACTORIZACIONES.md` donde toda asignación sea una estructura de 1 o N pasos.
2. **Facturación desde ficha del alumno:**
   - Añadir botón en `StudentsManagement.tsx` para listar las mensualidades del alumno y descargar facturas directamente.
3. **Automatización n8n en el Tablón:**
   - Disparar webhook al publicar anuncios en el tablón para notificar a los alumnos y padres matriculados.

---

## 8. Casos de Prueba Sembrados en Base de Datos (Credenciales y Relaciones)

Se ha creado y ejecutado el script `backend/prisma/seed-test-cases.ts` con todos los perfiles, relaciones familiares, cursos, mensualidades y entregas para realizar pruebas exhaustivas en el frontend.

### 🔑 Contraseña Universal
- **Contraseña para todas las cuentas de prueba:** `1234`

### 👥 Matriz de Cuentas y Roles

| Rol | Correo Electrónico | Nombre y Descripción | Relación / Dependencia | Cursos / Datos Clave |
| :--- | :--- | :--- | :--- | :--- |
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
