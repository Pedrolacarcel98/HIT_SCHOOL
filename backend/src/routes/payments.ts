import { Router } from 'express';
import { PaymentState, PrismaClient } from '@prisma/client';
import { authenticateToken, requireTeacher, requireAdmin, AuthRequest } from '../middleware/auth';
import {
  DEFAULT_VISIBLE_MONTH_COUNT,
  ensureStudentPaymentScheduleById,
  getPaymentVisualStatus,
  getVisibleMonthTargets,
  getStudentApplicableMonthsUpToNow,
  getDueDateForEnrollmentMonth,
  isMonthWithinStudentSchedule,
  isPaymentOverdue,
  getAcademicYearForDate
} from '../services/payments';

const router = Router();
const prisma = new PrismaClient();

const getQueryString = (value: unknown) => {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0];
  }
  return undefined;
};

const parseMonthYear = (monthParam?: string, yearParam?: string) => {
  const now = new Date();
  const month = monthParam ? Number(monthParam) : now.getMonth() + 1;
  const year = yearParam ? Number(yearParam) : now.getFullYear();

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return { error: 'Mes inválido. Debe estar entre 1 y 12.' };
  }
  if (!Number.isInteger(year) || year < 2020 || year > 2100) {
    return { error: 'Año inválido.' };
  }
  return { month, year };
};

// GET /api/payments/academic-years - Cursos escolares disponibles
router.get('/academic-years', authenticateToken, requireTeacher, async (req, res) => {
  try {
    const currentYear = getAcademicYearForDate();
    const paymentsYears = await prisma.paymentStatus.findMany({
      select: { academicYear: true },
      distinct: ['academicYear']
    });
    const enrollmentsYears = await prisma.academyEnrollment.findMany({
      select: { academicYear: true },
      distinct: ['academicYear']
    });

    const yearsSet = new Set<string>([currentYear]);
    paymentsYears.forEach(p => p.academicYear && yearsSet.add(p.academicYear));
    enrollmentsYears.forEach(e => e.academicYear && yearsSet.add(e.academicYear));

    const sortedYears = Array.from(yearsSet).sort().reverse();
    return res.json(sortedYears);
  } catch (error) {
    console.error('Error obteniendo cursos escolares:', error);
    return res.status(500).json({ error: 'Error al obtener cursos escolares.' });
  }
});

// GET /api/payments/me - Vista de pagos para alumno o padre
router.get('/me', authenticateToken, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Token no válido' });
  }

  const parsed = parseMonthYear(getQueryString(req.query.month), getQueryString(req.query.year));
  if ('error' in parsed) {
    return res.status(400).json(parsed);
  }

  try {
    let targetStudentId = req.user.id;

    if (req.user.role === 'PARENT') {
      const userEmail = (req.user as any)?.email || '';
      const requestedStudentId = getQueryString(req.query.studentId);
      if (requestedStudentId) {
        const child = await prisma.user.findFirst({
          where: {
            id: requestedStudentId,
            role: 'STUDENT',
            OR: [
              { parentId: req.user.id },
              { parent: { email: { equals: userEmail, mode: 'insensitive' } } }
            ]
          }
        });
        if (!child) return res.status(403).json({ error: 'No tienes permisos.' });
        targetStudentId = child.id;
      } else {
        const child = await prisma.user.findFirst({
          where: {
            role: 'STUDENT',
            OR: [
              { parentId: req.user.id },
              { parent: { email: { equals: userEmail, mode: 'insensitive' } } }
            ]
          }
        });
        if (!child) return res.status(404).json({ error: 'No tienes ningún alumno asociado.' });
        targetStudentId = child.id;
      }
    }

    await ensureStudentPaymentScheduleById(prisma, targetStudentId);

    const student = await prisma.user.findUnique({
      where: { id: targetStudentId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        profile: { select: { firstName: true, lastName: true, dni: true, address: true } },
        parent: { select: { profile: { select: { dni: true, firstName: true, lastName: true, address: true } } } },
        academyEnrollments: true
      }
    });

    if (!student || student.role !== 'STUDENT') {
      return res.status(403).json({ error: 'Alumno no encontrado.' });
    }

    const allPayments = await prisma.paymentStatus.findMany({
      where: {
        studentId: targetStudentId,
        isExempt: false,
        status: { not: PaymentState.EXEMPT }
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    const data = allPayments.map(payment => {
      const isApplicable = isMonthWithinStudentSchedule(student.academyEnrollments, payment.month, payment.year);
      const dueDate = payment.dueDate ?? null;
      const isPaid = payment.isPaid ?? false;
      const isOverdue = isPaymentOverdue({ isPaid, isExempt: payment.isExempt, status: payment.status, dueDate });

      return {
        id: payment.id,
        month: payment.month,
        year: payment.year,
        amount: payment.amount,
        concept: payment.concept,
        isCustom: payment.isCustom,
        isExempt: payment.isExempt,
        dueDate,
        paidAt: payment.paidAt ?? null,
        isPaid,
        exists: true,
        status: payment.status,
        isOverdue,
        visualStatus: getPaymentVisualStatus({
          isPaid,
          isExempt: payment.isExempt,
          status: payment.status,
          month: payment.month,
          year: payment.year,
          dueDate
        }),
        updatedAt: payment.updatedAt ?? null,
        isApplicable,
        student: {
          id: student.id,
          email: student.email,
          profile: student.profile,
          parent: (student as any).parent,
          enrollments: student.academyEnrollments
        }
      };
    });

    if (req.query.all !== 'true' && data.length > 0) {
      return res.json(data[0]);
    }

    return res.json(data);
  } catch (error) {
    console.error('Error obteniendo pago del alumno:', error);
    return res.status(500).json({ error: 'Error al obtener el estado del pago' });
  }
});

// GET /api/payments - Listado principal con soporte para Activos e Histórico de Bajas
router.get('/', authenticateToken, requireTeacher, async (req, res) => {
  const tab = getQueryString(req.query.tab) || 'active'; // 'active' | 'history'
  const academicYear = getQueryString(req.query.academicYear) || 'ALL';

  try {
    // Alumnos según pestaña
    const studentWhere: any = { role: 'STUDENT' };
    if (tab === 'active') {
      studentWhere.status = 'ACTIVE';
    } else if (tab === 'history') {
      studentWhere.status = 'INACTIVE';
    }

    const students = await prisma.user.findMany({
      where: studentWhere,
      select: { id: true }
    });

    // Asegurar calendarios actualizados
    await Promise.all(students.map(student => ensureStudentPaymentScheduleById(prisma, student.id)));

    const refreshedStudents = await prisma.user.findMany({
      where: studentWhere,
      select: {
        id: true,
        email: true,
        status: true,
        modality: true,
        createdAt: true,
        profile: { select: { firstName: true, lastName: true, dni: true, address: true } },
        parent: { select: { profile: { select: { dni: true, firstName: true, lastName: true, address: true } } } },
        academyEnrollments: { orderBy: { startDate: 'desc' } },
        paymentStatuses: {
          where: academicYear !== 'ALL' ? { academicYear } : undefined,
          select: {
            id: true,
            academicYear: true,
            month: true,
            year: true,
            amount: true,
            concept: true,
            isCustom: true,
            isExempt: true,
            notes: true,
            dueDate: true,
            paidAt: true,
            status: true,
            isPaid: true,
            updatedAt: true
          },
          orderBy: [
            { year: 'desc' },
            { month: 'desc' },
            { createdAt: 'desc' }
          ]
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const data = refreshedStudents.map((student) => {
      const payments = student.paymentStatuses.map((payment) => {
        const isApplicable = isMonthWithinStudentSchedule(student.academyEnrollments, payment.month, payment.year);
        const dueDate = payment.dueDate ?? null;
        const isPaid = payment.isPaid ?? false;

        return {
          id: payment.id,
          academicYear: payment.academicYear,
          month: payment.month,
          year: payment.year,
          amount: payment.amount,
          concept: payment.concept,
          isCustom: payment.isCustom,
          isExempt: payment.isExempt,
          notes: payment.notes,
          dueDate,
          paidAt: payment.paidAt ?? null,
          isPaid,
          exists: true,
          status: payment.status,
          isOverdue: isPaymentOverdue({ isPaid, isExempt: payment.isExempt, status: payment.status, dueDate }),
          visualStatus: getPaymentVisualStatus({
            isPaid,
            isExempt: payment.isExempt,
            status: payment.status,
            month: payment.month,
            year: payment.year,
            dueDate
          }),
          updatedAt: payment.updatedAt ?? null,
          isApplicable
        };
      });

      // Calcular deuda pendiente (solo cuotas no pagadas y no exentas)
      const pendingPayments = payments.filter(p => !p.isPaid && !p.isExempt && p.status !== 'EXEMPT');
      const pendingDebt = pendingPayments.reduce((acc, curr) => acc + (curr.amount || 0), 0);
      const overdueDebt = payments
        .filter(p => p.visualStatus === 'OVERDUE')
        .reduce((acc, curr) => acc + (curr.amount || 0), 0);

      return {
        id: student.id,
        email: student.email,
        firstName: student.profile?.firstName ?? 'Alumno',
        lastName: student.profile?.lastName ?? '',
        dni: student.profile?.dni ?? null,
        parent: student.parent ?? null,
        status: student.status,
        modality: student.modality,
        enrollments: student.academyEnrollments,
        payments,
        pendingDebt,
        overdueDebt,
        isClean: pendingDebt === 0
      };
    });

    return res.json({ students: data, academicYear });
  } catch (error) {
    console.error('Error obteniendo pagos de alumnos:', error);
    return res.status(500).json({ error: 'Error al obtener pagos de alumnos' });
  }
});

// PUT /api/payments/item/:id - Editar importe o concepto de un pago puntual
router.put('/item/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  const paymentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { amount, concept, notes } = req.body;

  if (amount !== undefined && (typeof amount !== 'number' || isNaN(amount) || amount < 0)) {
    return res.status(400).json({ error: 'El importe debe ser un número positivo.' });
  }

  try {
    const existing = await prisma.paymentStatus.findUnique({ where: { id: paymentId } });
    if (!existing) {
      return res.status(404).json({ error: 'Pago no encontrado.' });
    }

    const updated = await prisma.paymentStatus.update({
      where: { id: paymentId },
      data: {
        amount: amount !== undefined ? amount : existing.amount,
        concept: concept ? concept.trim() : existing.concept,
        notes: notes !== undefined ? notes : existing.notes,
        isCustom: true
      }
    });

    return res.json({ message: 'Pago actualizado con éxito.', payment: updated });
  } catch (error) {
    console.error('Error editando pago:', error);
    return res.status(500).json({ error: 'Error al actualizar el pago.' });
  }
});

// DELETE /api/payments/item/:id - Eximir un mes o eliminar permanentemente
router.delete('/item/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  const paymentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const action = getQueryString(req.query.action) || (req.query.permanent === 'true' ? 'delete' : 'exempt');

  try {
    const existing = await prisma.paymentStatus.findUnique({ where: { id: paymentId } });
    if (!existing) {
      return res.status(404).json({ error: 'Pago no encontrado.' });
    }

    if (action === 'delete') {
      // Registrar en DeletedPaymentRecord para que ensureStudentPaymentScheduleById no lo regenere automáticamente
      await prisma.deletedPaymentRecord.upsert({
        where: {
          studentId_month_year_concept: {
            studentId: existing.studentId,
            month: existing.month,
            year: existing.year,
            concept: existing.concept
          }
        },
        create: {
          studentId: existing.studentId,
          academicYear: existing.academicYear,
          month: existing.month,
          year: existing.year,
          concept: existing.concept
        },
        update: {}
      });

      // Eliminación física total de la base de datos
      await prisma.paymentStatus.delete({ where: { id: paymentId } });

      return res.json({ message: 'Pago eliminado por completo.', deleted: true, paymentId });
    }

    // Acción por defecto: Eximir mes (vacaciones / baja temporal)
    if (existing.isPaid) {
      return res.status(400).json({ error: 'No se puede eximir un pago que ya figura como pagado.' });
    }

    const updated = await prisma.paymentStatus.update({
      where: { id: paymentId },
      data: {
        isExempt: true,
        status: PaymentState.EXEMPT
      }
    });

    return res.json({ message: 'Pago marcado como exento (vacaciones / baja).', payment: updated });
  } catch (error) {
    console.error('Error eliminando/eximiendo pago:', error);
    return res.status(500).json({ error: 'Error al procesar la baja del pago.' });
  }
});

// POST /api/payments/:studentId/extra - Añadir cargo o concepto adicional
router.post('/:studentId/extra', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  const studentId = Array.isArray(req.params.studentId) ? req.params.studentId[0] : req.params.studentId;
  const { amount, concept, month, year, academicYear } = req.body;

  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'El importe debe ser un número positivo.' });
  }
  if (!concept || !concept.trim()) {
    return res.status(400).json({ error: 'El concepto es obligatorio.' });
  }

  const now = new Date();
  const targetMonth = month ? Number(month) : now.getMonth() + 1;
  const targetYear = year ? Number(year) : now.getFullYear();
  const targetAcademicYear = academicYear || getAcademicYearForDate(new Date(targetYear, targetMonth - 1, 1));

  try {
    const student = await prisma.user.findFirst({ where: { id: studentId, role: 'STUDENT' } });
    if (!student) return res.status(404).json({ error: 'Alumno no encontrado.' });

    // Si estaba registrado como eliminado previamente, limpiar para permitir la reintroducción manual
    await prisma.deletedPaymentRecord.deleteMany({
      where: {
        studentId,
        month: targetMonth,
        year: targetYear,
        concept: concept.trim()
      }
    });

    const newPayment = await prisma.paymentStatus.create({
      data: {
        studentId,
        academicYear: targetAcademicYear,
        month: targetMonth,
        year: targetYear,
        amount,
        concept: concept.trim(),
        isCustom: true,
        isExempt: false,
        dueDate: new Date(targetYear, targetMonth - 1, 15, 12, 0, 0),
        status: PaymentState.PENDING,
        isPaid: false
      }
    });

    return res.status(201).json({ message: 'Concepto adicional creado.', payment: newPayment });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe un cobro con ese concepto en ese mes.' });
    }
    console.error('Error creando concepto adicional:', error);
    return res.status(500).json({ error: 'Error al crear concepto adicional.' });
  }
});

// PUT /api/payments/:studentId/pay-all - Botón «Todo Pagado» para un alumno en concreto
router.put('/:studentId/pay-all', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  const studentId = Array.isArray(req.params.studentId) ? req.params.studentId[0] : req.params.studentId;
  const academicYear = getQueryString(req.query.academicYear);

  try {
    const student = await prisma.user.findFirst({ where: { id: studentId, role: 'STUDENT' } });
    if (!student) return res.status(404).json({ error: 'Alumno no encontrado.' });

    const whereClause: any = {
      studentId,
      isPaid: false,
      isExempt: false,
      status: { not: PaymentState.EXEMPT }
    };

    if (academicYear && academicYear !== 'ALL') {
      whereClause.academicYear = academicYear;
    }

    const updated = await prisma.paymentStatus.updateMany({
      where: whereClause,
      data: {
        isPaid: true,
        paidAt: new Date(),
        status: PaymentState.PAID,
        markedById: req.user?.id
      }
    });

    return res.json({
      message: `Se han liquidado ${updated.count} pagos pendientes con éxito.`,
      updatedCount: updated.count
    });
  } catch (error) {
    console.error('Error al poner al día los pagos del alumno:', error);
    return res.status(500).json({ error: 'Error al marcar todo como pagado.' });
  }
});

// PUT /api/payments/:studentId - Conmutar estado pagado individual
router.put('/:studentId', authenticateToken, requireTeacher, async (req: AuthRequest, res) => {
  const studentId = Array.isArray(req.params.studentId) ? req.params.studentId[0] : req.params.studentId;
  const { isPaid, month, year, paymentId, concept } = req.body;

  if (typeof isPaid !== 'boolean') {
    return res.status(400).json({ error: 'El campo isPaid debe ser booleano.' });
  }

  try {
    let payment;
    if (paymentId) {
      payment = await prisma.paymentStatus.findUnique({ where: { id: paymentId } });
    } else {
      const parsed = parseMonthYear(
        month !== undefined ? String(month) : undefined,
        year !== undefined ? String(year) : undefined
      );
      if ('error' in parsed) return res.status(400).json(parsed);

      payment = await prisma.paymentStatus.findFirst({
        where: {
          studentId,
          month: parsed.month,
          year: parsed.year,
          ...(concept ? { concept } : {})
        }
      });
    }

    if (!payment) return res.status(404).json({ error: 'No existe una cuota generada para ese registro.' });

    const updatedPayment = await prisma.paymentStatus.update({
      where: { id: payment.id },
      data: {
        isPaid,
        status: isPaid ? PaymentState.PAID : PaymentState.PENDING,
        paidAt: isPaid ? new Date() : null,
        markedById: req.user?.id
      }
    });

    return res.json({ message: 'Pago actualizado correctamente', payment: updatedPayment });
  } catch (error) {
    console.error('Error actualizando pago:', error);
    return res.status(500).json({ error: 'Error al actualizar el pago' });
  }
});

export default router;
