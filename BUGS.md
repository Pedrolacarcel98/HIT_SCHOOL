**1. Corrección de posicionamiento y adaptabilidad de modales (UX/UI)**

* **Centrado automático en viewport:** Modificar el contenedor global de los modales para que utilicen posicionamiento fijo relativo a la pantalla actual (`position: fixed; inset: 0`), evitando que aparezcan en el tope absoluto del documento y obliguen a hacer scroll manual.
* **Afecta a:** Modal de *«Ver entrega/resultados»* y modal de ejecución de formularios en tareas estructuradas.


* **Diseño responsive móvil:** Corregir el layout en pantallas reducidas aplicando anchos fluidos, márgenes seguros y auto-scroll interno (`overflow-y: auto`), resolviendo los problemas de texto truncado y desbordamiento visual.


* **Corregir tarjeta revisar prueba** En el portal de calificaciones del profesor corregir la tarjeta de la revisión de la prueba

---

**2. Homogeneización visual de Tareas Estructuradas**

* **Consistencia entre vistas:** Unificar los componentes y la estructura visual de tareas estructuradas entre la vista general de **«Mis Clases»** y la sección interna de **«Material Asignado»** dentro de cada clase.
* **Mismo estándar de tarjetas y acciones:** Ambas pantallas deben compartir idéntico diseño de tarjetas, tipografías, estados de entrega y botones de acción para garantizar coherencia en la navegación.

