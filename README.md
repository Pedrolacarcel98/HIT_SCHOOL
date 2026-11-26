# 🎓 HitSchool — Plataforma Educativa Integral

Plataforma interactiva de gestión académica, aulas virtuales y exámenes interactivos diseñada especialmente para academias de idiomas.

## Conteos de alumnos y matrículas

- Calificaciones y Control de Pagos consideran activo al alumno con estado `ACTIVE`, sin contar sus distintas clases como alumnos adicionales.
- Matrículas muestra el total global de alumnos activos de la academia por separado del total del curso escolar seleccionado. Este último cuenta alumnos únicos con matrícula `ACTIVE`, sin fecha de baja y con alumno activo; si hay varias, utiliza la más reciente.
- El selector comienza en «Todos los cursos», como Pagos. Los filtros de búsqueda, modalidad y periodicidad afectan al listado, no al total global. Las respuestas de consultas anteriores no sobrescriben el curso o la pestaña actual.
- Si un alumno activo no tiene matrícula abierta, Matrículas muestra un aviso: no crea ni reactiva registros automáticamente para hacer coincidir los números. Los conteos de cada grupo son miembros de ese grupo; sumarlos no es un total de alumnos únicos de la academia.

## 🚀 Despliegue Rápido y Pruebas

Para ver la guía completa paso a paso con todos los programas necesarios (Git, Docker, Node.js), inicialización de base de datos con seeds y configuración de n8n, consulta la:

👉 **[Guía Completa de Despliegue Local (DEPLOYMENT_WALKTHROUGH.md)](./DEPLOYMENT_WALKTHROUGH.md)**  
👉 **[Guía Maestra de Despliegue en Servidor Google Cloud VM Debian (DEPLOYMENT_GCP_DEBIAN.md)](./DEPLOYMENT_GCP_DEBIAN.md)**

### Comandos Rápidos:

```bash
# 1. Levantar contenedores (PostgreSQL, Backend, Frontend, n8n)
docker-compose up -d --build

# 2. Sincronizar y poblar base de datos (incluye el índice de email por rol)
docker exec hit_school_backend npm run schema:sync
docker exec hit_school_backend npx prisma db seed
```

### 🌐 URLs Principales:
- **Frontend:** [http://localhost:5173](http://localhost:5173) *(Profesor: `profesor@hitschool.com` / `1234` | Alumno: `alumno@hitschool.com` / `1234`)*
- **Backend API:** [http://localhost:3000](http://localhost:3000)
- **Automatizaciones n8n:** [http://localhost:5678](http://localhost:5678)

