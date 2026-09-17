import { Router } from 'express';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireTeacher } from '../middleware/auth';
import { sendAccountReactivationEmail, sendParentWelcomeEmail } from '../services/email';

const router = Router();
const prisma = new PrismaClient();

const parentSelect = {
  id: true,
  email: true,
  status: true,
  createdAt: true,
  profile: { select: { firstName: true, lastName: true, dni: true, phone: true, address: true } },
  children: { select: { id: true, email: true, status: true, profile: { select: { firstName: true, lastName: true } } } }
};

router.get('/', authenticateToken, requireTeacher, async (_req, res) => {
  try {
    const parents = await prisma.user.findMany({ where: { role: 'PARENT' }, select: parentSelect, orderBy: { createdAt: 'desc' } });
    res.json(parents);
  } catch (error) {
    console.error('Error al obtener tutores:', error);
    res.status(500).json({ error: 'Error al obtener tutores' });
  }
});

router.post('/', authenticateToken, requireTeacher, async (req, res) => {
  const { firstName, lastName, email, dni, phone, address } = req.body;
  if (!firstName?.trim() || !lastName?.trim() || !email?.trim()) return res.status(400).json({ error: 'Nombre, apellidos y correo son obligatorios.' });
  const temporaryPassword = `hit${Math.floor(1000 + Math.random() * 9000)}`;
  try {
    const parent = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        passwordHash: await bcrypt.hash(temporaryPassword, 10),
        role: 'PARENT',
        status: 'ACTIVE',
        profile: { create: { firstName: firstName.trim(), lastName: lastName.trim(), dni: dni?.trim() || null, phone: phone?.trim() || null, address: address?.trim() || null } }
      },
      select: parentSelect
    });
    try {
      await sendParentWelcomeEmail(parent.email, parent.profile?.firstName || firstName, temporaryPassword);
    } catch (mailError) {
      console.error('El tutor fue creado, pero no se pudo enviar el correo SMTP:', mailError);
    }
    res.status(201).json({ message: 'Tutor creado correctamente.', parent });
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'El correo ya está registrado.' });
    console.error('Error al crear tutor:', error);
    res.status(500).json({ error: 'Error al crear tutor' });
  }
});

router.put('/:id', authenticateToken, requireTeacher, async (req, res) => {
  const parentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { firstName, lastName, email, dni, phone, address } = req.body;
  if (!firstName?.trim() || !lastName?.trim() || !email?.trim()) return res.status(400).json({ error: 'Nombre, apellidos y correo son obligatorios.' });
  try {
    const duplicate = await prisma.user.findFirst({ where: { email: email.trim().toLowerCase(), NOT: { id: parentId } } });
    if (duplicate) return res.status(400).json({ error: 'El correo ya está registrado.' });
    const parent = await prisma.user.update({
      where: { id: parentId, role: 'PARENT' },
      data: {
        email: email.trim().toLowerCase(),
        profile: {
          upsert: {
            create: {
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              dni: dni?.trim() || null,
              phone: phone?.trim() || null,
              address: address?.trim() || null
            },
            update: {
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              dni: dni?.trim() || null,
              phone: phone?.trim() || null,
              address: address?.trim() || null
            }
          }
        }
      },
      select: parentSelect
    });
    res.json({ message: 'Tutor actualizado correctamente.', parent });
  } catch (error) {
    console.error('Error al actualizar tutor:', error);
    res.status(500).json({ error: 'Error al actualizar tutor' });
  }
});

router.patch('/:id/status', authenticateToken, requireTeacher, async (req, res) => {
  const parentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const status = req.body.status === 'ACTIVE' ? 'ACTIVE' : req.body.status === 'INACTIVE' ? 'INACTIVE' : null;
  if (!status) return res.status(400).json({ error: 'Estado no válido' });
  try {
    const existing = await prisma.user.findFirst({ where: { id: parentId, role: 'PARENT' }, include: { profile: true } });
    if (!existing) return res.status(404).json({ error: 'Tutor no encontrado' });
    const isReactivation = existing.status === 'INACTIVE' && status === 'ACTIVE';
    const temporaryPassword = isReactivation ? `hit${Math.floor(1000 + Math.random() * 9000)}` : null;
    const parent = await prisma.user.update({ where: { id: parentId }, data: { status, ...(temporaryPassword ? { passwordHash: await bcrypt.hash(temporaryPassword, 10) } : {}) }, select: parentSelect });
    if (temporaryPassword) {
      try { await sendAccountReactivationEmail(parent.email, parent.profile?.firstName || 'tutor', temporaryPassword, 'tutor'); }
      catch (mailError) { console.error('El tutor fue reactivado, pero no se pudo enviar el correo SMTP:', mailError); }
    }
    res.json({ message: status === 'ACTIVE' ? 'Tutor dado de alta' : 'Tutor dado de baja', parent });
  } catch (error) {
    console.error('Error al cambiar estado del tutor:', error);
    res.status(500).json({ error: 'Error al cambiar el estado del tutor' });
  }
});

router.delete('/:id', authenticateToken, requireTeacher, async (req, res) => {
  const parentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
    const children = await prisma.user.count({ where: { parentId } });
    if (children > 0) return res.status(400).json({ error: 'No se puede eliminar un tutor con alumnos asociados. Desvincúlalos primero.' });
    await prisma.user.delete({ where: { id: parentId, role: 'PARENT' } });
    res.json({ message: 'Tutor eliminado correctamente.' });
  } catch (error) {
    console.error('Error al eliminar tutor:', error);
    res.status(500).json({ error: 'Error al eliminar tutor' });
  }
});

export default router;
