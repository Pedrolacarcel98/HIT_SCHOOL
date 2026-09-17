import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';
import { sendAccountReactivationEmail } from '../services/email';

const router = Router();
const prisma = new PrismaClient();

const adminSelect = {
  id: true,
  email: true,
  status: true,
  createdAt: true,
  profile: {
    select: { firstName: true, lastName: true, dni: true, phone: true, birthDate: true }
  }
};

const normalizeId = (value: string | string[]) => Array.isArray(value) ? value[0] : value;

router.get('/', authenticateToken, requireAdmin, async (_req, res) => {
  try {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: adminSelect,
      orderBy: { createdAt: 'desc' }
    });
    res.json(admins);
  } catch (error) {
    console.error('Error al obtener administradores:', error);
    res.status(500).json({ error: 'Error al obtener administradores' });
  }
});

router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  const { firstName, lastName, email, dni, phone, birthDate } = req.body;
  if (!firstName || !lastName || !email) {
    return res.status(400).json({ error: 'Nombre, apellidos y email son obligatorios' });
  }

  const temporaryPassword = `hit${Math.floor(1000 + Math.random() * 9000)}`;
  try {
    const admin = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        passwordHash: await bcrypt.hash(temporaryPassword, 10),
        role: 'ADMIN',
        status: 'ACTIVE',
        profile: {
          create: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            dni: dni?.trim() || null,
            phone: phone?.trim() || null,
            birthDate: birthDate ? new Date(birthDate) : null
          }
        }
      },
      select: adminSelect
    });

    res.status(201).json({ message: 'Administrador creado con éxito', admin, generatedPassword: temporaryPassword });
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'El correo ya está registrado en el sistema' });
    console.error('Error al crear administrador:', error);
    res.status(500).json({ error: 'Error al crear el administrador' });
  }
});

router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const adminId = normalizeId(req.params.id);
  const { firstName, lastName, email, dni, phone, birthDate } = req.body;
  if (!firstName || !lastName || !email) {
    return res.status(400).json({ error: 'Nombre, apellidos y email son obligatorios' });
  }

  try {
    const admin = await prisma.user.findFirst({ where: { id: adminId, role: 'ADMIN' } });
    if (!admin) return res.status(404).json({ error: 'Administrador no encontrado' });

    const existingUser = await prisma.user.findFirst({
      where: { email: email.trim().toLowerCase(), NOT: { id: adminId } }
    });
    if (existingUser) return res.status(400).json({ error: 'Este correo ya pertenece a otro usuario' });

    const updatedAdmin = await prisma.user.update({
      where: { id: adminId },
      data: {
        email: email.trim().toLowerCase(),
        profile: {
          upsert: {
            create: { firstName: firstName.trim(), lastName: lastName.trim(), dni: dni?.trim() || null, phone: phone?.trim() || null, birthDate: birthDate ? new Date(birthDate) : null },
            update: { firstName: firstName.trim(), lastName: lastName.trim(), dni: dni?.trim() || null, phone: phone?.trim() || null, birthDate: birthDate ? new Date(birthDate) : null }
          }
        }
      },
      select: adminSelect
    });
    res.json({ message: 'Administrador actualizado con éxito', admin: updatedAdmin });
  } catch (error) {
    console.error('Error al actualizar administrador:', error);
    res.status(500).json({ error: 'Error al actualizar el administrador' });
  }
});

router.patch('/:id/status', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  const adminId = normalizeId(req.params.id);
  const status = req.body.status === 'ACTIVE' ? 'ACTIVE' : req.body.status === 'INACTIVE' ? 'INACTIVE' : null;
  if (!status) return res.status(400).json({ error: 'Estado no válido' });
  if (adminId === req.user?.id && status === 'INACTIVE') return res.status(400).json({ error: 'No puedes darte de baja a ti mismo.' });

  try {
    const existingAdmin = await prisma.user.findFirst({
      where: { id: adminId, role: 'ADMIN' },
      include: { profile: true }
    });
    if (!existingAdmin) return res.status(404).json({ error: 'Administrador no encontrado' });

    if (status === 'INACTIVE') {
      const activeAdmins = await prisma.user.count({ where: { role: 'ADMIN', status: 'ACTIVE' } });
      if (activeAdmins <= 1) return res.status(400).json({ error: 'Debe quedar al menos un administrador activo.' });
    }

    const isReactivation = existingAdmin.status === 'INACTIVE' && status === 'ACTIVE';
    const temporaryPassword = isReactivation ? `hit${Math.floor(1000 + Math.random() * 9000)}` : null;
    const admin = await prisma.user.update({
      where: { id: adminId },
      data: {
        status,
        ...(temporaryPassword ? { passwordHash: await bcrypt.hash(temporaryPassword, 10) } : {})
      },
      select: adminSelect
    });

    if (temporaryPassword) {
      try {
        await sendAccountReactivationEmail(
          admin.email,
          admin.profile?.firstName || 'administrador',
          temporaryPassword,
          'administrador'
        );
      } catch (mailError) {
        console.error('El administrador fue reactivado, pero no se pudo enviar el correo SMTP:', mailError);
      }
    }

    res.json({ message: status === 'ACTIVE' ? 'Administrador dado de alta' : 'Administrador dado de baja', admin });
  } catch (error) {
    console.error('Error al cambiar estado del administrador:', error);
    res.status(500).json({ error: 'Error al cambiar el estado del administrador' });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  const adminId = normalizeId(req.params.id);
  if (adminId === req.user?.id) return res.status(400).json({ error: 'No puedes eliminar tu propio usuario administrador.' });

  try {
    const admin = await prisma.user.findFirst({ where: { id: adminId, role: 'ADMIN' } });
    if (!admin) return res.status(404).json({ error: 'Administrador no encontrado' });

    const totalAdmins = await prisma.user.count({ where: { role: 'ADMIN' } });
    if (totalAdmins <= 1) return res.status(400).json({ error: 'Debe quedar al menos un administrador en el sistema.' });

    await prisma.user.delete({ where: { id: adminId } });
    res.json({ message: 'Administrador eliminado con éxito' });
  } catch (error) {
    console.error('Error al eliminar administrador:', error);
    res.status(500).json({ error: 'Error al eliminar el administrador' });
  }
});

export default router;
