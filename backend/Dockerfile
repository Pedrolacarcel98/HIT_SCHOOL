FROM node:20-alpine

WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm install

# Copiar el resto del código (en dev lo sobreescribe el volumen, pero es buena práctica)
COPY . .

# Generar Prisma Client
RUN npx prisma generate

EXPOSE 3000

# En desarrollo usamos nodemon / ts-node
CMD ["npm", "run", "dev"]
