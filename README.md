# 🎓 HitSchool — Plataforma Educativa Integral

Plataforma interactiva de gestión académica, aulas virtuales y exámenes interactivos diseñada especialmente para academias de idiomas.

## 🚀 Despliegue Rápido y Pruebas

Para ver la guía completa paso a paso con todos los programas necesarios (Git, Docker, Node.js), inicialización de base de datos con seeds y configuración de n8n, consulta la:

👉 **[Guía Completa de Despliegue Local (DEPLOYMENT_WALKTHROUGH.md)](./DEPLOYMENT_WALKTHROUGH.md)**

### Comandos Rápidos:

```bash
# 1. Levantar contenedores (PostgreSQL, Backend, Frontend, n8n)
docker-compose up -d --build

# 2. Sincronizar y poblar base de datos
docker exec hit_school_backend npx prisma db push
docker exec hit_school_backend npx prisma db seed
```

### 🌐 URLs Principales:
- **Frontend:** [http://localhost:5173](http://localhost:5173) *(Profesor: `profesor@hitschool.com` / `1234` | Alumno: `alumno@hitschool.com` / `1234`)*
- **Backend API:** [http://localhost:3000](http://localhost:3000)
- **Automatizaciones n8n:** [http://localhost:5678](http://localhost:5678)

