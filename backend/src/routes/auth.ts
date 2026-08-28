import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        profile: true,
        children: {
          select: {
            id: true,
            email: true,
            profile: true
          }
        }
      }
    });
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.profile,
        children: user.children
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor al iniciar sesión' });
  }
});

// Obtener perfil actual del usuario logueado
router.get('/me', authenticateToken, async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'No autenticado' });

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        monthlyFee: true,
        courseDurationMonths: true,
        courseStartDate: true,
        profile: true,
        parentId: true,
        parent: {
          select: {
            id: true,
            email: true,
            profile: true
          }
        },
        children: {
          select: {
            id: true,
            email: true,
            role: true,
            monthlyFee: true,
            courseDurationMonths: true,
            profile: true,
            enrollments: {
              select: {
                courseId: true,
                course: {
                  select: {
                    id: true,
                    title: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(user);
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ error: 'Error al obtener perfil de usuario' });
  }
});

// Cambiar contraseña (para cambiar la contraseña temporal generada por n8n o actualizarla)
router.put('/change-password', authenticateToken, async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  const { currentPassword, newPassword } = req.body;

  if (!userId) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Debes indicar la contraseña actual y la nueva contraseña.' });
  }

  if (typeof newPassword !== 'string' || newPassword.trim().length < 6) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return res.status(400).json({ error: 'La contraseña actual no es correcta.' });
    }

    const newHash = await bcrypt.hash(newPassword.trim(), 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash }
    });

    res.json({ success: true, message: 'Contraseña actualizada correctamente.' });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({ error: 'Error del servidor al cambiar la contraseña.' });
  }
});

export default router;
