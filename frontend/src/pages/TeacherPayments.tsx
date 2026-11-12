import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FileText,
  LoaderCircle,
  MoreVertical,
  Plus,
  Search,
  Trash2,
  Users,
  X,
  Edit2,
  BookOpen
} from 'lucide-react';
import ModalityBadge from '../components/ModalityBadge';
import CustomSelect from '../components/CustomSelect';
import { generateInvoicePDF, generateStatementPDF } from '../utils/invoice';

interface AcademyEnrollment {
  id: string;
  monthlyFee: number;
  startDate: string;
  endDate: string | null;
  billingPeriod?: 'MONTHLY' | 'QUARTERLY';
  hasBook?: boolean;
  bookPrice?: number | null;
}

interface StudentPaymentItem {
  id?: string;
  academicYear?: string;
  month: number;
  year: number;
  amount: number | null;
  concept?: string;
  isCustom?: boolean;
  isExempt?: boolean;
  notes?: string | null;
  dueDate: string | Date | null;
  paidAt: string | Date | null;
  isPaid: boolean;
  exists: boolean;
  status: 'PENDING' | 'PAID' | 'EXEMPT';
  isOverdue: boolean;
  visualStatus: 'PAID' | 'PENDING' | 'OVERDUE' | 'EXEMPT';
  updatedAt: string | Date | null;
  isApplicable: boolean;
}

interface PaymentStudent {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  dni?: string | null;
  status?: 'ACTIVE' | 'INACTIVE';
  modality?: 'PRESENCIAL' | 'ONLINE' | 'HIBRIDO' | null;
  pendingDebt?: number;
  overdueDebt?: number;
  isClean?: boolean;
  parent?: {
    profile?: {
      firstName: string;
      lastName: string;
      dni?: string | null;
      address?: string | null;
    } | null;
  } | null;
  enrollments?: AcademyEnrollment[];
  payments: StudentPaymentItem[];
}

interface PaymentsResponse {
  students: PaymentStudent[];
  academicYear?: string;
}

const TeacherPayments: React.FC = () => {
  const [searchParams] = useSearchParams();
  const userRole = localStorage.getItem('userRole') || 'TEACHER';
  const isAdmin = userRole === 'ADMIN';

  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('ALL');

  const [students, setStudents] = useState<PaymentStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [selectedStudentPaymentId, setSelectedStudentPaymentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('student') || '');
  const [statementYear, setStatementYear] = useState<string>('ALL');
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 767px)').matches);

  // Menú de 3 puntos
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);

  // Modales
  const [editingPayment, setEditingPayment] = useState<StudentPaymentItem | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [editConcept, setEditConcept] = useState<string>('');
  const [savingEdit, setSavingEdit] = useState(false);

  const [deletingPayment, setDeletingPayment] = useState<StudentPaymentItem | null>(null);
  const [savingDelete, setSavingDelete] = useState(false);

  const [showAddExtraModal, setShowAddExtraModal] = useState(false);
  const [extraAmount, setExtraAmount] = useState('35');
  const [extraConcept, setExtraConcept] = useState('Material / Libro');
  const [extraMonth, setExtraMonth] = useState(new Date().getMonth() + 1);
  const [extraYear, setExtraYear] = useState(new Date().getFullYear());
  const [savingExtra, setSavingExtra] = useState(false);

  const [showPayAllConfirm, setShowPayAllConfirm] = useState(false);
  const [savingPayAll, setSavingPayAll] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)');
    const handleChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    setStatementYear('ALL');
  }, [selectedStudentPaymentId]);

  // Cierra menú contextual al hacer clic fuera
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.payment-menu-container')) {
        setOpenMenuKey(null);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const monthLabel = (month: number, year: number) => {
    const date = new Date(year, month - 1, 1);
    const raw = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    return raw.charAt(0).toUpperCase() + raw.slice(1).replace(' de ', ' ');
  };

  const fetchAcademicYears = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/payments/academic-years`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const years: string[] = await res.json();
        setAcademicYears(years);
        if (years.length > 0 && selectedAcademicYear === 'ALL') {
          setSelectedAcademicYear(years[0]);
        }
      }
    } catch (err) {
      console.error('Error cargando cursos escolares:', err);
    }
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const yearParam = selectedAcademicYear !== 'ALL' ? `&academicYear=${selectedAcademicYear}` : '';
      const res = await fetch(`${apiUrl}/api/payments?tab=${activeTab}${yearParam}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data: PaymentsResponse | { error: string } = await res.json();

      if (!res.ok) {
        setError('error' in data ? data.error : 'No se pudo cargar el estado de pagos.');
        return;
      }

      setStudents((data as PaymentsResponse).students || []);
    } catch (fetchError) {
      console.error(fetchError);
      setError('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [activeTab, selectedAcademicYear]);

  useEffect(() => {
    const param = searchParams.get('student')?.toLowerCase();
    if (param && students.length > 0) {
      const found = students.find((s) =>
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(param) ||
        s.email.toLowerCase().includes(param)
      );
      if (found) {
        setSelectedStudentPaymentId(found.id);
      }
    }
  }, [students, searchParams]);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) =>
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  const totalOverdue = useMemo(
    () => students.reduce((acc, student) => acc + student.payments.filter((payment) => !payment.isExempt && payment.visualStatus === 'OVERDUE').length, 0),
    [students]
  );

  const totalPaid = useMemo(
    () => students.reduce((acc, student) => acc + student.payments.filter((payment) => payment.isPaid).length, 0),
    [students]
  );

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === selectedStudentPaymentId) || null,
    [students, selectedStudentPaymentId]
  );

  const availableStatementYears = useMemo(() => {
    if (!selectedStudent) return [];
    const years = Array.from(
      new Set(
        selectedStudent.payments
          .filter((p) => p.isApplicable)
          .map((p) => p.year)
      )
    ).sort((a, b) => b - a);
    return years;
  }, [selectedStudent]);

  const visibleStudentPayments = useMemo(() => {
    if (!selectedStudent) return [];
    if (statementYear === 'ALL') return selectedStudent.payments;
    const targetYear = Number(statementYear);
    return selectedStudent.payments.filter((p) => p.year === targetYear);
  }, [selectedStudent, statementYear]);

  // Descarga de Factura PDF Unificada
  const handleDownloadInvoice = (student: PaymentStudent, payment: StudentPaymentItem) => {
    const studentName = `${student.firstName} ${student.lastName}`.trim();
    const monthName = monthLabel(payment.month, payment.year);

    // Buscar si hay varios cobros en el mismo mes/año para este alumno (ej. Cuota + Libro)
    const monthPayments = student.payments.filter(
      p => p.month === payment.month && p.year === payment.year && p.isPaid && !p.isExempt
    );

    const billedName = student.parent?.profile 
      ? `${student.parent.profile.firstName} ${student.parent.profile.lastName}`.trim()
      : studentName;
    const billedDni = student.parent?.profile?.dni || student.dni || null;
    const billedAddress = student.parent?.profile?.address || null;

    if (monthPayments.length > 1) {
      const items = monthPayments.map(p => ({
        concept: p.concept === 'Material / Libro'
          ? 'Material Didáctico / Libro de Texto Oficial'
          : `Cuota Mensual - ${monthName}`,
        amount: p.amount || 35
      }));
      const totalAmount = items.reduce((acc, curr) => acc + curr.amount, 0);

      generateInvoicePDF({
        studentName: billedName,
        studentDni: billedDni,
        studentEmail: student.email,
        studentAddress: billedAddress,
        month: payment.month,
        year: payment.year,
        monthLabel: monthName,
        amount: totalAmount,
        items,
        paidAt: payment.paidAt
      });
    } else {
      const conceptText = payment.concept === 'Material / Libro'
        ? 'Material Didáctico / Libro de Texto Oficial'
        : `Cuota Mensual - ${monthName}`;
      const amount = payment.amount || 35;

      generateInvoicePDF({
        studentName: billedName,
        studentDni: billedDni,
        studentEmail: student.email,
        studentAddress: billedAddress,
        month: payment.month,
        year: payment.year,
        monthLabel: monthName,
        concept: conceptText,
        amount,
        paidAt: payment.paidAt
      });
    }
  };

  const handleDownloadStatement = (student: PaymentStudent, yearFilter: string = 'ALL') => {
    const studentName = `${student.firstName} ${student.lastName}`.trim();
    const filteredRaw = student.payments.filter(p => {
      if (p.isExempt) return false;
      if (yearFilter !== 'ALL' && p.year !== Number(yearFilter)) return false;
      return true;
    });

    const payments = filteredRaw.map(p => {
      return {
        monthLabel: `${p.concept || 'Cuota'} - ${monthLabel(p.month, p.year)}`,
        amount: p.amount || 35,
        isPaid: p.isPaid,
        paidAt: p.paidAt,
        year: p.year
      };
    });

    const billedName = student.parent?.profile 
      ? `${student.parent.profile.firstName} ${student.parent.profile.lastName}`.trim()
      : studentName;
    const billedDni = student.parent?.profile?.dni || student.dni || null;
    const billedAddress = student.parent?.profile?.address || null;

    generateStatementPDF({
      studentName: billedName,
      studentDni: billedDni,
      studentEmail: student.email,
      studentAddress: billedAddress,
      year: yearFilter === 'ALL' ? null : yearFilter,
      payments
    });
  };

  const togglePayment = async (studentId: string, payment: StudentPaymentItem) => {
    try {
      const key = `${studentId}-${payment.year}-${payment.month}-${payment.concept || 'cuota'}`;
      setUpdatingKey(key);
      setError('');
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      const res = await fetch(`${apiUrl}/api/payments/${studentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          isPaid: !payment.isPaid,
          month: payment.month,
          year: payment.year,
          paymentId: payment.id,
          concept: payment.concept
        })
      });

      const body = await res.json();
      if (!res.ok) {
        setError(body.error || 'No se pudo actualizar el pago.');
        return;
      }

      setStudents((prev) =>
        prev.map((student) => {
          if (student.id !== studentId) return student;

          return {
            ...student,
            payments: student.payments.map((item) => {
              if (item.id === payment.id || (item.month === payment.month && item.year === payment.year && item.concept === payment.concept)) {
                return {
                  ...item,
                  isPaid: !payment.isPaid,
                  status: !payment.isPaid ? 'PAID' : 'PENDING',
                  visualStatus: !payment.isPaid ? 'PAID' : 'PENDING',
                  paidAt: !payment.isPaid ? new Date().toISOString() : null
                };
              }
              return item;
            })
          };
        })
      );
    } catch (updateError) {
      console.error(updateError);
      setError('No se pudo actualizar el pago.');
    } finally {
      setUpdatingKey(null);
    }
  };

  // Botón Maestro «Todo Pagado» (Por Alumno)
  const handlePayAllForStudent = async () => {
    if (!selectedStudent) return;

    try {
      setSavingPayAll(true);
      setError('');
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const yearParam = selectedAcademicYear !== 'ALL' ? `?academicYear=${selectedAcademicYear}` : '';

      const res = await fetch(`${apiUrl}/api/payments/${selectedStudent.id}/pay-all${yearParam}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al liquidar pagos.');
        return;
      }

      // Actualizar todos los pagos pendientes de este alumno en local
      setStudents(prev =>
        prev.map(s => {
          if (s.id !== selectedStudent.id) return s;
          return {
            ...s,
            pendingDebt: 0,
            overdueDebt: 0,
            isClean: true,
            payments: s.payments.map(p => {
              if (!p.isExempt && !p.isPaid) {
                return {
                  ...p,
                  isPaid: true,
                  status: 'PAID',
                  visualStatus: 'PAID',
                  paidAt: new Date().toISOString()
                };
              }
              return p;
            })
          };
        })
      );

      setShowPayAllConfirm(false);
    } catch (err) {
      setError('Error de conexión al marcar todo como pagado.');
    } finally {
      setSavingPayAll(false);
    }
  };

  // Guardar Edición de Pago Puntual
  const handleSavePaymentEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment || !editingPayment.id) return;

    try {
      setSavingEdit(true);
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      const res = await fetch(`${apiUrl}/api/payments/item/${editingPayment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: Number(editAmount),
          concept: editConcept.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al actualizar pago.');
        return;
      }

      setStudents(prev =>
        prev.map(s => {
          if (s.id !== selectedStudent?.id) return s;
          return {
            ...s,
            payments: s.payments.map(p => {
              if (p.id === editingPayment.id) {
                return {
                  ...p,
                  amount: Number(editAmount),
                  concept: editConcept.trim(),
                  isCustom: true
                };
              }
              return p;
            })
          };
        })
      );

      setEditingPayment(null);
    } catch (err) {
      setError('Error de conexión al guardar edición.');
    } finally {
      setSavingEdit(false);
    }
  };

  // Eximir / Borrar Pago (Vacaciones)
  const handleExecuteDeletePayment = async () => {
    if (!deletingPayment || !deletingPayment.id) return;

    try {
      setSavingDelete(true);
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      const res = await fetch(`${apiUrl}/api/payments/item/${deletingPayment.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al eximir pago.');
        return;
      }

      setStudents(prev =>
        prev.map(s => {
          if (s.id !== selectedStudent?.id) return s;
          return {
            ...s,
            payments: s.payments.map(p => {
              if (p.id === deletingPayment.id) {
                return {
                  ...p,
                  isExempt: true,
                  status: 'EXEMPT',
                  visualStatus: 'EXEMPT'
                };
              }
              return p;
            })
          };
        })
      );

      setDeletingPayment(null);
    } catch (err) {
      setError('Error de conexión al eximir pago.');
    } finally {
      setSavingDelete(false);
    }
  };

  // Añadir Concepto Extra
  const handleSaveExtraPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    try {
      setSavingExtra(true);
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      const res = await fetch(`${apiUrl}/api/payments/${selectedStudent.id}/extra`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: Number(extraAmount),
          concept: extraConcept.trim(),
          month: Number(extraMonth),
          year: Number(extraYear),
          academicYear: selectedAcademicYear !== 'ALL' ? selectedAcademicYear : undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al añadir concepto adicional.');
        return;
      }

      setShowAddExtraModal(false);
      fetchPayments();
    } catch (err) {
      setError('Error de conexión al crear concepto adicional.');
    } finally {
      setSavingExtra(false);
    }
  };

  const getStatusStyles = (payment: StudentPaymentItem) => {
    if (payment.isExempt || payment.status === 'EXEMPT') {
      return { color: '#64748b', background: '#f1f5f9', border: '#cbd5e1', label: 'Exento / Vacaciones', icon: <Check size={16} /> };
    }

    if (payment.isPaid) {
      return { color: '#047857', background: '#d1fae5', border: '#a7f3d0', label: 'Pagado', icon: <Check size={16} /> };
    }

    if (payment.visualStatus === 'OVERDUE') {
      return { color: '#b91c1c', background: '#fee2e2', border: '#fecaca', label: 'Impago', icon: <AlertTriangle size={16} /> };
    }

    return { color: '#b45309', background: '#fef3c7', border: '#fde68a', label: 'Pendiente', icon: <X size={16} /> };
  };

  return (
    <div className="page-container" style={{ padding: '1.5rem', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Header Superior */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.65rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <CircleDollarSign style={{ color: 'var(--primary)' }} size={26} /> Control de Pagos
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Seguimiento de mensualidades, facturación, historial de bajas y gestión de recibos.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Curso:</label>
            <CustomSelect
              value={selectedAcademicYear}
              onChange={(val) => setSelectedAcademicYear(val)}
              options={[
                { value: 'ALL', label: 'Todos los cursos' },
                ...academicYears.map(y => ({ value: y, label: `Curso ${y}` }))
              ]}
              size="sm"
              triggerStyle={{ minWidth: '145px' }}
            />
          </div>
        </div>
      </header>

      {/* Bento Grid Métricas */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div className="glass-panel" style={{ padding: '1rem 1.25rem', flex: '1 1 180px', background: '#fff' }}>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>PAGOS LIQUIDADOS</p>
          <p style={{ margin: '0.35rem 0 0', fontSize: '1.5rem', fontWeight: 700, color: '#24583e' }}>{totalPaid}</p>
        </div>
        <div className="glass-panel" style={{ padding: '1rem 1.25rem', flex: '1 1 180px', background: '#fff' }}>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>RECIBOS VENCIDOS / IMPAGO</p>
          <p style={{ margin: '0.35rem 0 0', fontSize: '1.5rem', fontWeight: 700, color: '#9e2a2b' }}>{totalOverdue}</p>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: '1rem', borderRadius: '10px', border: '1px solid #f7caca', background: '#fdf0f0', color: '#9e2a2b', padding: '1rem', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {/* Pestañas: Alumnos Activos vs Histórico de Bajas */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
        <button
          type="button"
          onClick={() => { setActiveTab('active'); setSelectedStudentPaymentId(null); }}
          style={{
            padding: '0.55rem 1.15rem',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'active' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'active' ? '#fff' : 'var(--text-muted)',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            fontSize: '0.88rem'
          }}
        >
          <Users size={16} /> Alumnos Activos
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('history'); setSelectedStudentPaymentId(null); }}
          style={{
            padding: '0.55rem 1.15rem',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'history' ? '#ea580c' : 'transparent',
            color: activeTab === 'history' ? '#fff' : 'var(--text-muted)',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            fontSize: '0.88rem'
          }}
        >
          <Clock3 size={16} /> Histórico de Bajas
        </button>
      </div>

      {/* Lista de Alumnos */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden', background: '#fff' }}>
        <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border)', background: 'var(--surface-alt)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            {activeTab === 'active' ? 'ALUMNOS ACTIVOS' : 'ALUMNOS EN HISTÓRICO DE BAJAS'} ({filteredStudents.length} de {students.length})
          </span>
          <div style={{ position: 'relative', width: isMobile ? '100%' : '280px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Buscar alumno..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.45rem 0.8rem 0.45rem 2.1rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text-main)',
                fontSize: '0.85rem'
              }}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando pagos...</div>
        ) : filteredStudents.length === 0 ? (
          <div style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Users size={48} style={{ color: 'var(--primary)', opacity: 0.35, marginBottom: '1rem' }} />
            <p style={{ margin: 0 }}>
              {activeTab === 'active' ? 'No se encontraron alumnos activos.' : 'No hay alumnos registrados en el histórico de bajas.'}
            </p>
          </div>
        ) : (
          filteredStudents.map((student) => {
            const initials = `${student.firstName[0] || ''}${student.lastName[0] || ''}`.toUpperCase() || 'AL';
            const activeEnrollment = student.enrollments?.find((enrollment) => !enrollment.endDate);
            const pastEnrollments = student.enrollments?.filter((enrollment) => enrollment.endDate) || [];
            const isSelected = selectedStudentPaymentId === student.id;
            const hasEnrollment = (student.enrollments?.length || 0) > 0;
            const unpaidCount = student.payments.filter(
              (payment) => !payment.isExempt && payment.visualStatus !== 'PAID'
            ).length;
            const pendingDebt = student.pendingDebt || 0;

            return (
              <div
                key={student.id}
                onClick={() => setSelectedStudentPaymentId(student.id)}
                style={{
                  padding: '1.1rem 1.25rem',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  background: isSelected ? 'var(--primary-subtle)' : 'transparent',
                  borderLeft: isSelected ? '4px solid var(--primary)' : '4px solid transparent',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1fr) minmax(220px, 1fr) 120px', alignItems: 'center', gap: '1rem', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: activeTab === 'active' ? 'var(--primary)' : '#ea580c', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
                      {initials}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <strong style={{ fontSize: '0.98rem', color: 'var(--text-main)', display: 'block' }}>
                        {student.firstName} {student.lastName}
                      </strong>
                      <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{student.email}</small>
                    </div>
                  </div>

                  {/* Estado de Deuda en Histórico o Pagos Pendientes en Activos */}
                  <div style={{ display: 'flex', justifyContent: 'center', minWidth: 0 }}>
                    {activeTab === 'history' ? (
                      pendingDebt > 0 ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '999px',
                          background: '#fff1f2',
                          color: '#be123c',
                          border: '1px solid #fecdd3',
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}>
                          ⚠️ Deuda pendiente: {pendingDebt.toFixed(2)} €
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '999px',
                          background: '#f1f5f9',
                          color: '#64748b',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.75rem',
                          fontWeight: 600
                        }}>
                          ✓ Baja al día (0 €)
                        </span>
                      )
                    ) : hasEnrollment && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        fontSize: '0.75rem',
                        fontWeight: unpaidCount === 0 ? 500 : 600,
                        padding: '0.25rem 0.75rem',
                        borderRadius: '999px',
                        whiteSpace: 'nowrap',
                        background: unpaidCount === 0 ? '#ecfdf5' : '#fff1f2',
                        color: unpaidCount === 0 ? '#047857' : '#be123c',
                        border: `1px solid ${unpaidCount === 0 ? 'rgba(167, 243, 208, 0.8)' : 'rgba(254, 205, 211, 0.8)'}`,
                        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)'
                      }}>
                        {unpaidCount === 0
                          ? '✓ Pagos al día'
                          : unpaidCount === 1
                            ? '⚠️ Falta 1 pago'
                            : `⚠️ Faltan ${unpaidCount} pagos`}
                      </span>
                    )}
                  </div>

                  <ModalityBadge modality={student.modality} className="payments-modality" />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.6rem', paddingTop: '0.45rem', borderTop: '1px dashed var(--border)', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {activeEnrollment ? (
                      <><strong style={{ color: 'var(--text-main)' }}>{activeEnrollment.monthlyFee} € / mes</strong> · {activeEnrollment.billingPeriod === 'QUARTERLY' ? 'Trimestral' : 'Mensual'}</>
                    ) : pastEnrollments.length > 0 ? (
                      <>Baja · Última cuota: {pastEnrollments[0].monthlyFee} € / mes</>
                    ) : (
                      'Sin matrícula'
                    )}
                  </span>
                  <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Drawer Lateral del Alumno Seleccionado */}
      {selectedStudent && createPortal(
        <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: isMobile ? 0 : '260px', zIndex: 50, minHeight: '100vh', overflowY: 'auto', background: '#fce7f3' }}>
          <div style={{ padding: isMobile ? '1rem 0.85rem 3rem' : '2rem' }}>
            <div className="animate-fade-in" style={{ maxWidth: '1024px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <button
                  type="button"
                  onClick={() => setSelectedStudentPaymentId(null)}
                  className="btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                >
                  <ArrowLeft size={16} /> Volver a Control de Pagos
                </button>
              </div>

              {/* Header Drawer */}
              <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--text-main)' }}>
                    Pagos de {selectedStudent.firstName} {selectedStudent.lastName}
                  </h1>
                  <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    {selectedStudent.email} · {selectedStudent.status === 'ACTIVE' ? 'Alumno Activo' : 'Histórico de Baja'}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  {/* Botón Maestro «Todo Pagado» (Por Alumno) */}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setShowPayAllConfirm(true)}
                      className="btn-primary"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        padding: '0.55rem 1rem',
                        fontSize: '0.88rem',
                        background: '#047857',
                        borderColor: '#047857'
                      }}
                    >
                      <CheckCheck size={18} /> Marcar Todo Pagado
                    </button>
                  )}

                  {/* Botón Añadir Concepto Extra */}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setShowAddExtraModal(true)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        padding: '0.55rem 0.95rem',
                        fontSize: '0.88rem',
                        borderRadius: '8px',
                        background: '#fff',
                        border: '1px solid var(--border)',
                        color: 'var(--text-main)',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      <Plus size={16} /> Añadir Concepto
                    </button>
                  )}

                  {selectedStudent.payments.filter((payment) => !payment.isExempt).length > 0 && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <CustomSelect
                        value={statementYear}
                        onChange={(val) => setStatementYear(val)}
                        options={[
                          { value: 'ALL', label: 'Todos los años' },
                          ...availableStatementYears.map((yr) => ({ value: String(yr), label: `Año ${yr}` }))
                        ]}
                        size="sm"
                        triggerStyle={{ minWidth: '135px' }}
                      />
                      <button
                        type="button"
                        onClick={() => handleDownloadStatement(selectedStudent, statementYear)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                          padding: '0.55rem 0.95rem',
                          fontSize: '0.88rem',
                          borderRadius: '8px',
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-main)',
                          cursor: 'pointer',
                          fontWeight: 600
                        }}
                      >
                        <FileText size={16} /> Descargar Extracto
                      </button>
                    </div>
                  )}
                </div>
              </header>

              {/* Tarjeta Resumen de Matrícula */}
              {(() => {
                const activeEnrollment = selectedStudent.enrollments?.find((enrollment) => !enrollment.endDate);
                const pastEnrollments = selectedStudent.enrollments?.filter((enrollment) => enrollment.endDate) || [];
                const reference = activeEnrollment || pastEnrollments[0] || null;

                return (
                  <div style={{ background: '#fff', border: '1px solid rgba(226, 232, 240, 0.8)', borderRadius: '16px', boxShadow: 'var(--shadow-sm)', padding: isMobile ? '1rem' : '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <CalendarDays size={20} style={{ color: 'var(--primary)' }} />
                      <span style={{ fontSize: isMobile ? '0.92rem' : '1.05rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        {reference
                          ? `Periodo: ${new Date(reference.startDate).toLocaleDateString('es-ES')} (${activeEnrollment ? 'Matrícula Activa' : 'Baja'})`
                          : 'Sin periodo de matrícula registrado'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                      {reference && (
                        <span style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                          {reference.monthlyFee} € / mes ({reference.billingPeriod === 'QUARTERLY' ? 'Trimestral' : 'Mensual'})
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Lista de Mensualidades y Conceptos */}
              <div style={{ background: '#fff', border: '1px solid rgba(226, 232, 240, 0.8)', borderRadius: '16px', boxShadow: 'var(--shadow-sm)', padding: isMobile ? '1rem' : '1.5rem' }}>
                <h4 style={{ margin: '0 0 1rem', fontSize: '1rem', color: 'var(--text-main)' }}>
                  Cartas de Pago y Mensualidades ({visibleStudentPayments.length})
                </h4>

                <div style={{ display: 'grid', gap: '1rem' }}>
                  {visibleStudentPayments.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0.5rem 0' }}>
                      No hay pagos generados para este curso.
                    </p>
                  ) : (
                    visibleStudentPayments.map((payment) => {
                      const styles = getStatusStyles(payment);
                      const paymentKey = `${selectedStudent.id}-${payment.year}-${payment.month}-${payment.concept || 'cuota'}`;
                      const isUpdating = updatingKey === paymentKey;
                      const isBook = payment.concept === 'Material / Libro';
                      const isExempt = payment.isExempt || payment.status === 'EXEMPT';

                      return (
                        <div
                          key={paymentKey}
                          style={{
                            border: `1px solid ${isBook ? '#fde68a' : isExempt ? '#cbd5e1' : 'var(--border)'}`,
                            background: isBook ? '#fffbeb' : isExempt ? '#f8fafc' : 'var(--surface-alt)',
                            borderRadius: '12px',
                            padding: '1.25rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '1rem',
                            flexWrap: 'wrap',
                            opacity: isExempt ? 0.65 : 1
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              {isBook && <BookOpen size={18} style={{ color: '#92400e' }} />}
                              <h3 style={{ margin: 0, fontSize: '1.05rem', color: isBook ? '#92400e' : 'var(--text-main)', fontWeight: 700 }}>
                                {payment.concept && payment.concept !== 'Cuota mensual' ? payment.concept : monthLabel(payment.month, payment.year)}
                              </h3>
                            </div>

                            <p style={{ margin: '0.35rem 0 0', color: isBook ? '#92400e' : 'var(--text-main)', fontSize: '1rem', fontWeight: 700 }}>
                              {payment.amount?.toFixed(2)} €
                            </p>

                            {isBook && (
                              <div style={{ color: '#92400e', fontSize: '0.78rem', marginTop: '0.25rem', fontWeight: 500 }}>
                                Cargo puntual por adquisición de libro de texto y material.
                              </div>
                            )}

                            {isExempt && (
                              <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '0.25rem', fontWeight: 500 }}>
                                Alumno exento de este pago (vacaciones o baja temporal).
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                            {/* Botón Factura PDF */}
                            {payment.isPaid && (
                              <button
                                type="button"
                                onClick={() => handleDownloadInvoice(selectedStudent, payment)}
                                className="btn-secondary"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.45rem',
                                  padding: '0.45rem 0.85rem',
                                  fontSize: '0.85rem',
                                  borderRadius: '8px'
                                }}
                                title="Descargar Factura Oficial en PDF"
                              >
                                <FileText size={16} /> Factura PDF
                              </button>
                            )}

                            {/* Badge Estado */}
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: styles.color, background: styles.background, borderRadius: '20px', padding: '0.35rem 0.75rem', fontWeight: 700, fontSize: '0.85rem' }}>
                              {styles.icon}
                              {styles.label}
                            </span>

                            {/* Checkbox / Botón de Pagado */}
                            {!isExempt && (
                              <button
                                disabled={isUpdating}
                                onClick={() => togglePayment(selectedStudent.id, payment)}
                                aria-label={payment.isPaid ? 'Quitar tick de pagado' : 'Poner tick de pagado'}
                                title={payment.isPaid ? 'Quitar tick de pagado' : 'Poner tick de pagado'}
                                style={{
                                  width: '40px',
                                  height: '40px',
                                  borderRadius: '10px',
                                  border: `1px solid ${payment.isPaid ? 'var(--primary)' : 'var(--border)'}`,
                                  background: payment.isPaid ? 'var(--primary-light)' : 'var(--surface)',
                                  color: payment.isPaid ? 'var(--primary-text)' : 'var(--text-muted)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer'
                                }}
                              >
                                {isUpdating ? (
                                  <LoaderCircle size={18} className="spin" />
                                ) : payment.isPaid ? (
                                  <Check size={20} />
                                ) : (
                                  <span style={{ width: '18px', height: '18px', borderRadius: '6px', border: '1px solid var(--border)' }} />
                                )}
                              </button>
                            )}

                            {/* Menú de 3 puntos (Exclusivo Administrador) */}
                            {isAdmin && (
                              <div className="payment-menu-container" style={{ position: 'relative' }}>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuKey(openMenuKey === paymentKey ? null : paymentKey);
                                  }}
                                  title="Opciones de pago"
                                  style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    background: '#fff',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--text-main)'
                                  }}
                                >
                                  <MoreVertical size={16} />
                                </button>

                                {openMenuKey === paymentKey && (
                                  <div
                                    style={{
                                      position: 'absolute',
                                      right: 0,
                                      top: '42px',
                                      zIndex: 60,
                                      background: '#fff',
                                      border: '1px solid var(--border)',
                                      borderRadius: '8px',
                                      boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                                      padding: '0.4rem',
                                      minWidth: '180px',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '0.2rem'
                                    }}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingPayment(payment);
                                        setEditAmount(String(payment.amount || '35'));
                                        setEditConcept(payment.concept || 'Cuota mensual');
                                        setOpenMenuKey(null);
                                      }}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        padding: '0.5rem 0.75rem',
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--text-main)',
                                        fontSize: '0.85rem',
                                        cursor: 'pointer',
                                        borderRadius: '6px',
                                        textAlign: 'left'
                                      }}
                                    >
                                      <Edit2 size={14} style={{ color: 'var(--primary)' }} /> Editar Importe
                                    </button>

                                    {!payment.isPaid && !isExempt && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setDeletingPayment(payment);
                                          setOpenMenuKey(null);
                                        }}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '0.5rem',
                                          padding: '0.5rem 0.75rem',
                                          background: 'none',
                                          border: 'none',
                                          color: '#be123c',
                                          fontSize: '0.85rem',
                                          cursor: 'pointer',
                                          borderRadius: '6px',
                                          textAlign: 'left'
                                        }}
                                      >
                                        <Trash2 size={14} /> Eximir Mes (Vacaciones)
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Confirmación «Todo Pagado» */}
      {showPayAllConfirm && selectedStudent && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 90,
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '1.75rem', background: '#fff' }}>
            <h3 style={{ margin: '0 0 0.75rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCheck style={{ color: '#047857' }} /> Confirmar Todo Pagado
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.5, margin: '0 0 1.25rem' }}>
              ¿Estás seguro de que deseas poner al día y liquidar todas las cuotas y conceptos pendientes de <strong>{selectedStudent.firstName} {selectedStudent.lastName}</strong>?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowPayAllConfirm(false)}
                style={{ background: 'none', border: '1px solid var(--border)', padding: '0.6rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={savingPayAll}
                onClick={handlePayAllForStudent}
                className="btn-primary"
                style={{ padding: '0.6rem 1.4rem', background: '#047857', borderColor: '#047857' }}
              >
                {savingPayAll ? 'Liquidando...' : 'Sí, Marcar Todo Pagado'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar Importe / Concepto de Pago */}
      {editingPayment && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 90,
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '1.75rem', background: '#fff' }}>
            <h3 style={{ margin: '0 0 1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Edit2 size={20} style={{ color: 'var(--primary)' }} /> Editar Pago
            </h3>
            <form onSubmit={handleSavePaymentEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)' }}>Concepto</label>
                <input
                  type="text"
                  required
                  value={editConcept}
                  onChange={(e) => setEditConcept(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)' }}>Importe (€)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingPayment(null)}
                  style={{ background: 'none', border: '1px solid var(--border)', padding: '0.6rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="btn-primary"
                  style={{ padding: '0.6rem 1.4rem' }}
                >
                  {savingEdit ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Eximir Mes (Vacaciones) */}
      {deletingPayment && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 90,
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '1.75rem', background: '#fff' }}>
            <h3 style={{ margin: '0 0 0.75rem', color: '#be123c', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Trash2 size={20} /> Eximir Mensualidad
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.5, margin: '0 0 1.25rem' }}>
              ¿Confirmas que deseas eximir a este alumno del pago de <strong>{monthLabel(deletingPayment.month, deletingPayment.year)}</strong>? Se marcará como vacaciones/exento y no computará como deuda.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setDeletingPayment(null)}
                style={{ background: 'none', border: '1px solid var(--border)', padding: '0.6rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={savingDelete}
                onClick={handleExecuteDeletePayment}
                style={{ background: '#be123c', border: 'none', color: '#fff', padding: '0.6rem 1.4rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
              >
                {savingDelete ? 'Eximiendo...' : 'Sí, Eximir Mes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Añadir Concepto Extra */}
      {showAddExtraModal && selectedStudent && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 90,
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '1.75rem', background: '#fff' }}>
            <h3 style={{ margin: '0 0 1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={20} style={{ color: 'var(--primary)' }} /> Añadir Concepto Adicional
            </h3>
            <form onSubmit={handleSaveExtraPayment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)' }}>Concepto</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Material / Libro, Clase particular"
                  value={extraConcept}
                  onChange={(e) => setExtraConcept(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)' }}>Importe (€)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={extraAmount}
                  onChange={(e) => setExtraAmount(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)' }}>Mes</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    required
                    value={extraMonth}
                    onChange={(e) => setExtraMonth(Number(e.target.value))}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)' }}>Año</label>
                  <input
                    type="number"
                    min="2020"
                    max="2035"
                    required
                    value={extraYear}
                    onChange={(e) => setExtraYear(Number(e.target.value))}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddExtraModal(false)}
                  style={{ background: 'none', border: '1px solid var(--border)', padding: '0.6rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingExtra}
                  className="btn-primary"
                  style={{ padding: '0.6rem 1.4rem' }}
                >
                  {savingExtra ? 'Creando...' : 'Añadir Concepto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherPayments;
