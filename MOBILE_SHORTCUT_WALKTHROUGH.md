# 📱 Walkthrough: Acceso Directo a Pantalla Completa (Web App Standalone / PWA)

Este documento detalla los pasos exactos para configurar **HitSchool** como una Web App instalable a pantalla completa en dispositivos móviles (**iOS Safari** y **Android Chrome**). 

Al aplicar estos cambios, cuando un alumno, profesor o tutor pulse **«Añadir a la pantalla de inicio»**, la aplicación se abrirá **sin las barras de navegación del explorador**, con el icono corporativo en el escritorio del móvil y con la barra de estado teñida con el color corporativo de la academia (`#4e9b75`).

---

## 📋 Resumen de Archivos Afectados

1. **`frontend/public/manifest.json`** *(Crear nuevo archivo)*: Manifiesto web para Android y navegadores basados en Chromium.
2. **`frontend/index.html`** *(Modificar)*: Metaetiquetas de iOS (`apple-mobile-web-app-*`), viewport y enlace al manifiesto.
3. **`frontend/public/icon-192.png` y `icon-512.png`** *(Añadir o generar)*: Iconos de alta resolución para la pantalla de inicio y splash screen.
4. **`frontend/src/index.css`** *(Modificar ligeros estilos)*: Soporte para *Safe Areas* (el "notch" de iPhone y barras inferiores).

---

## 🚀 Paso a Paso de Implementación

### Paso 1: Crear el archivo `frontend/public/manifest.json`

Crea el archivo `manifest.json` dentro de la carpeta `frontend/public/` con el siguiente contenido:

```json
{
  "short_name": "HitSchool",
  "name": "HitSchool - Academia de Inglés",
  "description": "Plataforma educativa y aula virtual de HitSchool",
  "icons": [
    {
      "src": "/icon-192.png",
      "type": "image/png",
      "sizes": "192x192",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512.png",
      "type": "image/png",
      "sizes": "512x512",
      "purpose": "any maskable"
    },
    {
      "src": "/favicon.svg",
      "type": "image/svg+xml",
      "sizes": "any"
    }
  ],
  "start_url": "/",
  "background_color": "#f7f8f5",
  "theme_color": "#4e9b75",
  "display": "standalone",
  "orientation": "portrait-primary",
  "scope": "/"
}
```

> **Propiedades clave:**
> - `"display": "standalone"`: Fuerza la eliminación de la barra de URLs y controles del navegador.
> - `"theme_color": "#4e9b75"`: Pinta la barra superior del sistema operativo con el verde corporativo.
> - `"background_color": "#f7f8f5"`: Color de la pantalla de bienvenida mientras carga la app.

---

### Paso 2: Añadir los Iconos Corporativos en `frontend/public/`

En `frontend/public/` ya existe `logo.webp` y `favicon.svg`. Para que tanto iOS como Android muestren un icono nítido sin recortes en la pantalla de inicio, se necesitan dos imágenes PNG cuadradas:
- `frontend/public/icon-192.png` (192 × 192 píxeles)
- `frontend/public/icon-512.png` (512 × 512 píxeles)
- `frontend/public/apple-touch-icon.png` (180 × 180 píxeles o reutilizar el de 192px)

> 💡 **Nota rápida de generación:** Puedes convertir rápidamente `logo.webp` o `favicon.svg` a estos tamaños PNG usando cualquier convertidor online (ej. [squoosh.app](https://squoosh.app/) o herramientas como ImageMagick/Sharp) con fondo sólido o transparente bien centrado.

---

### Paso 3: Modificar `frontend/index.html`

Edita `frontend/index.html` para incorporar todas las metaetiquetas que le indican a iOS y Android cómo comportarse al ser lanzadas desde la pantalla de inicio:

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    
    <!-- Viewport adaptado con soporte para Notch de iPhone (viewport-fit=cover) -->
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
    
    <!-- Título formal de la aplicación -->
    <title>HitSchool - Campus Virtual</title>

    <!-- Metaetiquetas exclusivas para iOS / iPadOS (Safari Web App) -->
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="HitSchool" />
    <link rel="apple-touch-icon" href="/icon-192.png" />

    <!-- Metaetiquetas para Android y navegadores modernos -->
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="theme-color" content="#4e9b75" />

    <!-- Vinculación del Manifiesto PWA -->
    <link rel="manifest" href="/manifest.json" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

### Paso 4: Ajustar Safe Areas en `frontend/src/index.css`

Al abrir la aplicación a pantalla completa en iPhones con "Isla Dinámica" o "Notch", la barra de estado superior puede solaparse ligeramente con la cabecera si no se declaran las *Safe Areas*.

Añade estas reglas globales en `frontend/src/index.css`:

```css
/* Soporte para áreas seguras de pantalla completa en móviles (Notch y barra de gestos) */
:root {
  --sat: env(safe-area-inset-top, 0px);
  --sab: env(safe-area-inset-bottom, 0px);
  --sal: env(safe-area-inset-left, 0px);
  --sar: env(safe-area-inset-right, 0px);
}

body {
  /* Evita el scroll elástico de rebote en los bordes de la pantalla en iOS */
  overscroll-behavior-y: none;
  -webkit-tap-highlight-color: transparent;
  padding-top: var(--sat);
  padding-bottom: var(--sab);
}

/* Modales en móvil: que nunca superen la altura visible con barra de navegación */
@media (max-width: 768px) {
  .modal-overlay, .modal-container {
    padding: 0.75rem !important;
  }
  
  .modal-content {
    max-height: calc(100vh - 2rem - var(--sat) - var(--sab)) !important;
    overflow-y: auto !important;
    width: 95vw !important;
  }
}
```

---

## 🧪 Cómo Verificar y Probar la Instalación

### 1. Verificación en Ordenador con Chrome DevTools:
1. Arranca el frontend (`npm run dev`).
2. Abre Google Chrome y pulsa `F12` (Herramientas de Desarrollador).
3. Ve a la pestaña **Application** -> en el menú izquierdo haz clic en **Manifest**.
4. Verifica que:
   - Aparece el nombre `HitSchool - Academia de Inglés`.
   - Los iconos de 192px y 512px se previsualizan correctamente.
   - `Display` marca `standalone`.
   - `Theme color` marca `#4e9b75`.

---

### 2. Prueba en Móvil Real (iOS Safari):
1. Entra con el iPhone a la URL de la plataforma (ej. `https://tu-dominio.com` o tu IP local en la misma red Wi-Fi).
2. Pulsa el botón **Compartir** (icono central inferior de un cuadrado con flecha hacia arriba).
3. Desliza hacia abajo y pulsa en **«Añadir a la pantalla de inicio»** (o *«Add to Home Screen»*).
4. Confirma el nombre "HitSchool" y pulsa **Añadir**.
5. Sal al escritorio de tu iPhone: verás el icono de HitSchool.
6. Pulsa sobre el icono: **la plataforma se abrirá a pantalla completa sin ninguna barra de Safari**.

---

### 3. Prueba en Móvil Real (Android Chrome):
1. Entra con un dispositivo Android a la URL en Chrome.
2. Pulsa los **tres puntos verticales** arriba a la derecha.
3. Selecciona **«Instalar aplicación»** o **«Añadir a pantalla de inicio»**.
4. Acepta el cuadro de diálogo.
5. HitSchool aparecerá en tu lista de aplicaciones y en el escritorio exactamente igual que una app descargada de Google Play.

---

## 💬 Plantilla de Mensaje para Alumnos y Padres (WhatsApp / Email)

Puedes copiar y pegar este bloque en el correo de bienvenida que envía n8n o en vuestras comunicaciones iniciales:

```markdown
👋 ¡Bienvenido/a a HitSchool!

Puedes llevar nuestro campus virtual en tu teléfono como una App, sin necesidad de descargar nada desde la tienda:

📱 En iPhone (Safari):
1. Entra en tu navegador a: https://campus.hitschool.com
2. Pulsa el botón "Compartir" (cuadrado con flecha hacia arriba en la barra inferior).
3. Elige la opción "Añadir a la pantalla de inicio".

🤖 En Android (Chrome):
1. Entra a: https://campus.hitschool.com
2. Pulsa en los tres puntos de opciones arriba a la derecha.
3. Elige "Instalar aplicación" o "Añadir a pantalla de inicio".

¡Listo! Ya tendrás el icono de HitSchool en tu pantalla para consultar notas, avisos y tareas con un solo toque.
```
