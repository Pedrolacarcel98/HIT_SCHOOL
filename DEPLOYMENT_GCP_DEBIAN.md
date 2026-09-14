# ☁️ Guía Maestra de Despliegue en Servidor Google Cloud (Debian) — HitSchool

Esta guía detalla el procedimiento completo paso a paso para desplegar **HitSchool** desde cero en una máquina virtual de **Google Cloud Engine (GCE)** con sistema operativo **Debian** (Debian 11 Bullseye o Debian 12 Bookworm).

---

## 📑 Tabla de Contenidos
1. [Paso 1: Configuración en Google Cloud Console](#-paso-1-configuración-en-google-cloud-console)
2. [Paso 2: Conexión SSH y Actualización del Sistema](#-paso-2-conexión-ssh-y-actualización-del-sistema)
3. [Paso 3: Configurar 4GB de Memoria SWAP (Anti-OOM)](#-paso-3-configurar-4gb-de-memoria-swap-anti-oom)
4. [Paso 4: Instalación Oficial de Docker y Docker Compose](#-paso-4-instalación-oficial-de-docker-y-docker-compose)
5. [Paso 5: Clonar el Repositorio de HitSchool](#-paso-5-clonar-el-repositorio-de-hitschool)
6. [Paso 6: Configurar Variables de Entorno y Red Remota](#-paso-6-configurar-variables-de-entorno-y-red-remota)
7. [Paso 7: Construir y Levantar los Contenedores](#-paso-7-construir-y-levantar-los-contenedores)
8. [Paso 8: Sincronizar Base de Datos y Cargar Datos de Prueba](#-paso-8-sincronizar-base-de-datos-y-cargar-datos-de-prueba)
9. [Paso 9: Verificación de Servicios y Credenciales](#-paso-9-verificación-de-servicios-y-credenciales)
10. [🚀 Script de Despliegue Todo-en-Uno (Opcional)](#-script-de-despliegue-todo-en-uno-opcional)
11. [🛠️ Mantenimiento, Actualizaciones y Backups](#️-mantenimiento-actualizaciones-y-backups)

---

## 🌐 Paso 1: Configuración en Google Cloud Console

Antes de interactuar con la terminal, debes permitir el tráfico de red hacia la máquina virtual y fijar su dirección IP.

### 1.1 Crear Regla de Cortafuegos (Firewall)
Por defecto, Google Cloud bloquea todos los puertos entrantes excepto SSH (puerto 22).

1. Abre la **Consola de Google Cloud** ([console.cloud.google.com](https://console.cloud.google.com/)).
2. Dirígete a **Red de VPC** > **Reglas de cortafuegos** (*VPC network > Firewall*).
3. Pulsa en **Crear regla de cortafuegos** (*Create Firewall Rule*):
   - **Nombre:** `allow-hitschool`
   - **Red:** `default`
   - **Dirección de tráfico:** `Entrante` (*Ingress*)
   - **Acción en caso de coincidencia:** `Permitir` (*Allow*)
   - **Destinos:** `Todas las instancias de la red` (*All instances in the network*)
   - **Filtro de fuente:** `Rangos de IPv4`
   - **Rangos de IPv4 de origen:** `0.0.0.0/0`
   - **Protocolos y puertos:** Marca **Protocolos y puertos especificados**, activa **TCP** e introduce:
     ```text
     80, 443, 3000, 5173, 5678
     ```
4. Haz clic en **Crear**.

> [!IMPORTANT]
> - **Puerto 5173:** Frontend React (Vite).
> - **Puerto 3000:** API REST Backend (Express).
> - **Puerto 5678:** Interfaz y Webhooks de n8n.
> - **Puertos 80 / 443:** Reservados para Nginx / Certificados SSL futuros.

### 1.2 Reservar IP Externa Estática
Para evitar que la dirección IP pública cambie cada vez que la máquina virtual se reinicie:
1. Ve a **Red de VPC** > **Direcciones IP** (*VPC network > IP addresses*).
2. Localiza la IP externa efímera asignada a tu VM y selecciona **Reservar dirección estática** (*Promote to static IP*), o crea una nueva y asígnala a la instancia.
3. Anota tu **IP Pública** (ejemplo: `34.175.82.100`).

---

## 💻 Paso 2: Conexión SSH y Actualización del Sistema

Conéctate a la máquina mediante el botón **SSH** en la consola de Google Cloud o con Google Cloud SDK:

```bash
gcloud compute ssh --zone <TU_ZONA> <NOMBRE_DE_TU_VM>
```

Una vez dentro de la terminal de Debian, ejecuta:

```bash
# 1. Actualizar repositorios e índices de paquetes
sudo apt-get update -y && sudo apt-get upgrade -y

# 2. Instalar utilidades esenciales
sudo apt-get install -y curl wget git htop ca-certificates gnupg lsb-release ufw
```

---

## 💾 Paso 3: Configurar 4GB de Memoria SWAP (Anti-OOM)

> [!WARNING]
> Las instancias de Google Cloud (como `e2-micro`, `e2-small` o `e2-medium`) disponen de 1 GB a 4 GB de memoria RAM física.
> Durante la compilación de Docker de Node.js, Vite y Prisma, el consumo de RAM supera los 2 GB. Si no existe memoria SWAP, el kernel de Linux liquidará el proceso con el error `Killed` o `Exit Code 137` (Out of Memory).

Ejecuta los siguientes comandos para crear y habilitar permanentemente 4 GB de intercambio:

```bash
# 1. Crear el archivo de swap de 4GB
sudo fallocate -l 4G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=4096

# 2. Configurar permisos seguros
sudo chmod 600 /swapfile

# 3. Formatear y activar swap
sudo mkswap /swapfile
sudo swapon /swapfile

# 4. Hacer que persista tras reiniciar la máquina
if ! grep -q '/swapfile none swap' /etc/fstab; then
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

# 5. Ajustar swappiness para un rendimiento óptimo
sudo sysctl vm.swappiness=10
if ! grep -q 'vm.swappiness=10' /etc/sysctl.conf; then
  echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
fi

# 6. Verificar memoria disponible
free -h
```

Deberás ver en la salida que la fila `Swap` muestra **`4.0Gi`**.

---

## 🐳 Paso 4: Instalación Oficial de Docker y Docker Compose

Instalaremos la versión oficial de **Docker Engine** y el plugin moderno **Docker Compose v2**:

```bash
# 1. Eliminar versiones antiguas conflictivas si existieran
sudo apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# 2. Configurar el llavero oficial de claves GPG de Docker
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# 3. Agregar el repositorio oficial de Docker a los orígenes de APT
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 4. Instalar Docker CE y Docker Compose Plugin
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 5. Habilitar e iniciar el servicio Docker
sudo systemctl enable docker
sudo systemctl start docker

# 6. Permitir ejecutar docker sin 'sudo' al usuario actual
sudo usermod -aG docker $USER
```

> [!NOTE]
> Para aplicar el nuevo grupo sin reiniciar la sesión, ejecuta:
> ```bash
> newgrp docker
> ```
> O desconéctate y vuelve a entrar por SSH. Verifica la instalación con:
> ```bash
> docker --version && docker compose version
> ```

---

## 📥 Paso 5: Clonar el Repositorio de HitSchool

Clona el proyecto en el directorio raíz de tu usuario:

```bash
cd ~
git clone https://github.com/Pedrolacarcel98/HIT_SCHOOL.git
cd HIT_SCHOOL

# Si trabajas sobre la rama DEV, cambia de rama:
git checkout DEV

# Comprobar estado del repositorio
git status
```

---

## ⚙️ Paso 6: Configurar Variables de Entorno y Red Remota

En un servidor remoto, las conexiones del navegador de los alumnos y profesores se dirigen a la **IP pública** del servidor, no a `localhost`.

### 6.1 Detectar la IP Pública de la VM
Ejecuta el siguiente comando para obtener automáticamente tu IP pública:

```bash
export VM_IP=$(curl -s ifconfig.me)
echo "Tu IP Pública es: $VM_IP"
```

### 6.2 Crear el archivo `backend/.env`
Crea el archivo de configuración con credenciales seguras y el soporte SMTP:

```bash
cat <<EOF > backend/.env
DATABASE_URL="postgresql://root:rootpassword@db:5432/hitschool?schema=public"
JWT_SECRET="$(openssl rand -hex 32)"
PORT=3000
FRONTEND_URL="http://${VM_IP}:5173"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_REJECT_UNAUTHORIZED=false
SMTP_USER="tu_correo_de_notificaciones@gmail.com"
SMTP_PASSWORD="tu_contraseña_de_aplicacion_gmail"
SMTP_FROM="HitSchool <tu_correo_de_notificaciones@gmail.com>"
EOF
```

*(Si no tienes credenciales de correo configuradas ahora mismo, puedes dejar los valores predeterminados de prueba; el sistema funcionará igualmente).*

### 6.3 Configurar `docker-compose.yml` para la IP Pública
Vite necesita conocer la URL del backend a la que deben llamar los navegadores externos. Sustituiremos `localhost` por la IP pública de la máquina:

```bash
# Reemplazar localhost por la IP pública en el docker-compose.yml
sed -i "s|VITE_API_URL=http://localhost:3000|VITE_API_URL=http://${VM_IP}:3000|g" docker-compose.yml
sed -i "s|FRONTEND_URL=http://localhost:5173|FRONTEND_URL=http://${VM_IP}:5173|g" docker-compose.yml
sed -i "s|N8N_HOST=localhost|N8N_HOST=${VM_IP}|g" docker-compose.yml
sed -i "s|WEBHOOK_URL=http://localhost:5678/|WEBHOOK_URL=http://${VM_IP}:5678/|g" docker-compose.yml
```

Puedes verificar los cambios en `docker-compose.yml` con:
```bash
grep -E 'VITE_API_URL|FRONTEND_URL|N8N_HOST' docker-compose.yml
```

---

## 🏗️ Paso 7: Construir y Levantar los Contenedores

Compila y levanta todos los microservicios en segundo plano:

```bash
docker compose up -d --build
```

Comprueba que los 4 contenedores están levantados y saludables:

```bash
docker compose ps
```

Deberías ver:
- `hit_school_db` (PostgreSQL en `0.0.0.0:5432`)
- `hit_school_backend` (Express en `0.0.0.0:3000`)
- `hit_school_frontend` (Vite React en `0.0.0.0:5173`)
- `hit_school_n8n` (n8n en `0.0.0.0:5678`)

---

## 🗄️ Paso 8: Sincronizar Base de Datos y Cargar Datos de Prueba

Una vez que el backend esté en ejecución, inicializaremos la estructura relacional y los datos de prueba:

### 8.1 Sincronizar el esquema de Prisma con PostgreSQL
```bash
docker exec hit_school_backend npx prisma db push
```

### 8.2 Sembrar los datos de prueba maestros (Cursos, Alumnos, Familias y Calificaciones)
```bash
docker exec hit_school_backend npx ts-node prisma/seed-test-cases.ts
```

*(Opcional: Si deseas una base de datos mínima sólo con 1 profesor y 1 alumno básico, puedes usar alternativamente `docker exec hit_school_backend npx prisma db seed`).*

---

## 🧪 Paso 9: Verificación de Servicios y Credenciales

### 9.1 Comprobar la salud del backend
```bash
curl -i http://localhost:3000/api/health
```
Debe devolver: `HTTP/1.1 200 OK` con `{"status":"ok"}`.

### 9.2 Accesos Web desde el Navegador
Abre tu navegador web e introduce tu IP pública:

| Servicio | URL Pública | Descripción |
| :--- | :--- | :--- |
| **Portal Web (Frontend)** | `http://<TU_IP_PUBLICA>:5173` | Panel para Alumnos, Padres y Profesores |
| **API REST (Backend)** | `http://<TU_IP_PUBLICA>:3000` | Endpoints y carga de archivos |
| **Automatización n8n** | `http://<TU_IP_PUBLICA>:5678` | Motor de flujos y Webhooks |

---

### 🔑 Credenciales de Acceso Precargadas

> **Contraseña universal para todas las cuentas de prueba:** `1234`

| Rol | Correo Electrónico | Descripción / Perfil |
| :--- | :--- | :--- |
| 💼 **Profesor B2/C1** | `profesor1@hitschool.com` | Profesor titular de cursos superiores. Cursos B2 y C1 con entregas pendientes de calificar. |
| 💼 **Profesora A2** | `profesor2@hitschool.com` | Profesora de nivel A2 / Primaria. |
| 👨‍👩‍👧 **Tutor (2 Hijos)** | `padre.doshijos@hitschool.com` | Madre (Lucía) de Mateo (B2) y Sofía (A2). Selector familiar habilitado y recibos. |
| 👨‍👩‍👦 **Tutor (1 Hijo)** | `padre.unhijo@hitschool.com` | Padre (Marcos) de Hugo (A2). |
| 🎓 **Alumno 1** | `hermano.mayor@hitschool.com` | Mateo. Cuotas al día. Tarea pendiente de corregir en B2. |
| 🎓 **Alumno 2** | `hermano.menor@hitschool.com` | Sofía. Cuotas vencidas (simulación de impago) en A2. |
| 🎓 **Alumno Autónomo** | `alumno.independiente@hitschool.com` | Álex. Alumno mayor de edad sin tutor asociado. Cursos B2 y C1. |

---

## 🚀 Script de Despliegue Todo-en-Uno (Opcional)

Si prefieres realizar todo el proceso de instalación en un solo paso, puedes copiar y pegar este bloque completo en tu VM limpia de Debian:

```bash
sudo bash -c '
set -e
echo "=== 1. Actualizando sistema ==="
apt-get update -y && apt-get upgrade -y
apt-get install -y curl wget git htop ca-certificates gnupg lsb-release ufw

echo "=== 2. Configurando 4GB SWAP ==="
if [ ! -f /swapfile ]; then
  fallocate -l 4G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=4096
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo "/swapfile none swap sw 0 0" >> /etc/fstab
  sysctl vm.swappiness=10
  echo "vm.swappiness=10" >> /etc/sysctl.conf
fi

echo "=== 3. Instalando Docker ==="
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
usermod -aG docker $SUDO_USER || true

echo "=== 4. Clonando Repositorio ==="
cd /home/$SUDO_USER
if [ ! -d "HIT_SCHOOL" ]; then
  sudo -u $SUDO_USER git clone https://github.com/Pedrolacarcel98/HIT_SCHOOL.git
fi
cd HIT_SCHOOL
sudo -u $SUDO_USER git checkout DEV

echo "=== 5. Configurando Variables y Red ==="
VM_IP=$(curl -s ifconfig.me)
echo "IP detectada: $VM_IP"

cat <<EOF > backend/.env
DATABASE_URL="postgresql://root:rootpassword@db:5432/hitschool?schema=public"
JWT_SECRET="$(openssl rand -hex 32)"
PORT=3000
FRONTEND_URL="http://${VM_IP}:5173"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_REJECT_UNAUTHORIZED=false
SMTP_USER="tu_correo@gmail.com"
SMTP_PASSWORD="tu_password"
SMTP_FROM="HitSchool <tu_correo@gmail.com>"
EOF

sed -i "s|VITE_API_URL=http://localhost:3000|VITE_API_URL=http://${VM_IP}:3000|g" docker-compose.yml
sed -i "s|FRONTEND_URL=http://localhost:5173|FRONTEND_URL=http://${VM_IP}:5173|g" docker-compose.yml
sed -i "s|N8N_HOST=localhost|N8N_HOST=${VM_IP}|g" docker-compose.yml
sed -i "s|WEBHOOK_URL=http://localhost:5678/|WEBHOOK_URL=http://${VM_IP}:5678/|g" docker-compose.yml

echo "=== 6. Levantando Contenedores ==="
docker compose up -d --build

echo "=== 7. Esperando inicialización del backend (15s) ==="
sleep 15

echo "=== 8. Sincronizando Base de Datos ==="
docker exec hit_school_backend npx prisma db push
docker exec hit_school_backend npx ts-node prisma/seed-test-cases.ts

echo "================================================="
echo "✅ Despliegue completado con éxito!"
echo "👉 Frontend: http://${VM_IP}:5173"
echo "👉 Backend:  http://${VM_IP}:3000"
echo "👉 n8n:      http://${VM_IP}:5678"
echo "================================================="
'
```

---

## 🛠️ Mantenimiento, Actualizaciones y Backups

### 🔄 Actualizar la aplicación con los últimos cambios de Git
Cuando el equipo suba nuevas funcionalidades al repositorio:

```bash
cd ~/HIT_SCHOOL
git pull origin DEV
docker compose up -d --build
```

### 📋 Ver logs en tiempo real
```bash
# Todos los contenedores
docker compose logs -f

# Solo backend
docker logs -f hit_school_backend

# Solo frontend
docker logs -f hit_school_frontend
```

### 💾 Realizar Backup de la Base de Datos PostgreSQL
Para hacer un volcado completo de seguridad:

```bash
docker exec -t hit_school_db pg_dumpall -c -U root > backup_hitschool_$(date +%Y%m%d_%H%M%S).sql
```

Para restaurar una copia de seguridad:
```bash
cat backup_hitschool_XXXXX.sql | docker exec -i hit_school_db psql -U root -d hitschool
```

### 🛑 Detener y Reiniciar Servicios
```bash
# Detener servicios
docker compose down

# Reiniciar servicios
docker compose restart
```

---
*HitSchool © 2026 — Guía Oficial de Infraestructura en Google Cloud Platform.*
