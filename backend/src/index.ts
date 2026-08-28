import express from 'express';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3000;

import authRoutes from './routes/auth';
import studentRoutes from './routes/students';
import courseRoutes from './routes/courses';
import materialRoutes from './routes/materials';
import paymentRoutes from './routes/payments';
import assignmentRoutes from './routes/assignments';
import chatRoutes from './routes/chat';

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/chat', chatRoutes);

app.get('/', (req, res) => {
  res.send('API de HitSchool funcionando correctamente');
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'hit_school_backend', timestamp: new Date() });
});

app.listen(port, () => {
  console.log(`Servidor backend corriendo en http://localhost:${port}`);
});
