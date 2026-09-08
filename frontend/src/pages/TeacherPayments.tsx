import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { AlertTriangle, ArrowLeft, CalendarDays, Check, ChevronRight, CircleDollarSign, Clock3, FileText, GraduationCap, Laptop, LoaderCircle, Search, Users, X } from 'lucide-react';
import { generateInvoicePDF, generateStatementPDF } from '../utils/invoice';
import { getPaymentVisualStatus } from '../utils/paymentStatus';

interface AcademyEnrollment {
  id: string;
  monthlyFee: number;
  startDate: string;
  endDate: string | null;
}

interface StudentPaymentItem {
  month: number;
  year: number;
  amount: number | null;
  dueDate: string | Date | null;
  paidAt: string | Date | null;
  isPaid: boolean;
  exists: boolean;
  status: 'PENDING' | 'PAID';
  isOverdue: boolean;
  visualStatus: 'PAID' | 'PENDING' | 'OVERDUE';
  updatedAt: string | Date | null;
  isApplicable: boolean;
}

interface PaymentStudent {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  dni?: string | null;
  modality?: 'PRESENCIAL' | 'ONLINE' | null;
  parent?: {
    profile?: {
      firstName: string;
      lastName: string;
      dni?: string | null;
    } | null;
  } | null;
  enrollments?: AcademyEnrollment[];
  payments: StudentPaymentItem[];
}

interface PaymentsResponse {
  months: Array<{ month: number; year: number }>;
  students: PaymentStudent[];
}

const TeacherPayments: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [students, setStudents] = useState<PaymentStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [selectedStudentPaymentId, setSelectedStudentPaymentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('student') || '');

  const monthLabel = (month: number, year: number) => {
    const date = new Date(year, month - 1, 1);
    const raw = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    return raw.charAt(0).toUpperCase() + raw.slice(1).replace(' de ', ' ');
  };

  const handleDownloadInvoice = (student: PaymentStudent, payment: StudentPaymentItem) => {
    const studentName = `${student.firstName} ${student.lastName}`.trim();
    const monthName = monthLabel(payment.month, payment.year);
    
    // Find matching enrollment for amount if not in payment
    let amount = payment.amount;
    if (!amount) {
      const cardDate = new Date(payment.year, payment.month - 1, 1);
      const enr = student.enrollments?.find(e => {
         const sd = new Date(e.startDate);
         const sdMonth = new Date(sd.getFullYear(), sd.getMonth(), 1);
         let edMonth = new Date(3000, 0, 1);
         if (e.endDate) {
           const ed = new Date(e.endDate);
           edMonth = new Date(ed.getFullYear(), ed.getMonth(), 1);
         }
         return cardDate.getTime() >= sdMonth.getTime() && cardDate.getTime() <= edMonth.getTime();
      });
      amount = enr?.monthlyFee || 35;
    }

    const billedName = student.parent?.profile 
      ? `${student.parent.profile.firstName} ${student.parent.profile.lastName}`.trim()
      : studentName;
    const billedDni = student.parent?.profile?.dni || student.dni || null;

    generateInvoicePDF({
      studentName: billedName,
      studentDni: billedDni,
      studentEmail: student.email,
      month: payment.month,
      year: payment.year,
      monthLabel: monthName,
      amount,
      paidAt: payment.paidAt
    });
  };

  const handleDownloadStatement = (student: PaymentStudent) => {
    const studentName = `${student.firstName} ${student.lastName}`.trim();
    const payments = student.payments.filter(p => p.isApplicable).map(p => {
      let amount = p.amount;
      if (!amount) {
        const cardDate = new Date(p.year, p.month - 1, 1);
        const enr = student.enrollments?.find(e => {
           const sd = new Date(e.startDate);
           const sdMonth = new Date(sd.getFullYear(), sd.getMonth(), 1);
           let edMonth = new Date(3000, 0, 1);
           if (e.endDate) {
             const ed = new Date(e.endDate);
             edMonth = new Date(ed.getFullYear(), ed.getMonth(), 1);
           }
           return cardDate.getTime() >= sdMonth.getTime() && cardDate.getTime() <= edMonth.getTime();
        });
        amount = enr?.monthlyFee || 35;
      }

      return {
        monthLabel: monthLabel(p.month, p.year),
        amount,
        isPaid: p.isPaid,
        paidAt: p.paidAt
      };
    });

    const billedName = student.parent?.profile 
      ? `${student.parent.profile.firstName} ${student.parent.profile.lastName}`.trim()
      : studentName;
    const billedDni = student.parent?.profile?.dni || student.dni || null;

    generateStatementPDF({
      studentName: billedName,
      studentDni: billedDni,
      studentEmail: student.email,
      payments
    });
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/payments?months=3`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data: PaymentsResponse | { error: string } = await res.json();

      if (!res.ok) {
        setError('error' in data ? data.error : 'No se pudo cargar el estado de pagos.');
        return;
      }

      setStudents((data as PaymentsResponse).students);
    } catch (fetchError) {
      console.error(fetchError);
      setError('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

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
    () => students.reduce((acc, student) => acc + student.payments.filter((payment) => payment.isApplicable && getPaymentVisualStatus(payment.isPaid, payment.month, payment.year) === 'OVERDUE').length, 0),
    [students]
  );

  const totalPaid = useMemo(
    () => students.reduce((acc, student) => acc + student.payments.filter((payment) => payment.isApplicable && getPaymentVisualStatus(payment.isPaid, payment.month, payment.year) === 'PAID').length, 0),
    [students]
  );

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === selectedStudentPaymentId) || null,
    [students, selectedStudentPaymentId]
  );

  const togglePayment = async (studentId: string, payment: StudentPaymentItem) => {
    try {
      setUpdatingKey(`${studentId}-${payment.year}-${payment.month}`);
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
          year: payment.year
        })
      });

      const body = await res.json();
      if (!res.ok) {
        setError(body.error || 'No se pudo actualizar el pago.');
        return;
      }

      setStudents((prev) =>
        prev.map((student) => {
          if (student.id !== studentId) {
            return student;
          }

          return {
            ...student,
            payments: student.payments.map((item) => {
              if (item.month !== payment.month || item.year !== payment.year) {
                return item;
              }

              return {
                ...item,
                isPaid: !payment.isPaid,
                status: !payment.isPaid ? 'PAID' : 'PENDING',
                visualStatus: getPaymentVisualStatus(!payment.isPaid, item.month, item.year),
                paidAt: !payment.isPaid ? new Date().toISOString() : null,
                updatedAt: new Date().toISOString()
              };
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

  const getStatusStyles = (payment: StudentPaymentItem) => {
    if (getPaymentVisualStatus(payment.isPaid, payment.month, payment.year) === 'PAID') {
      return { color: '#047857', background: '#d1fae5', border: '#a7f3d0', label: 'Pagado', icon: <Check size={16} /> };
    }

    if (getPaymentVisualStatus(payment.isPaid, payment.month, payment.year) === 'OVERDUE') {
      return { color: '#b91c1c', background: '#fee2e2', border: '#fecaca', label: 'Impago', icon: <AlertTriangle size={16} /> };
    }

    return { color: '#b45309', background: '#fef3c7', border: '#fde68a', label: 'Pendiente', icon: <X size={16} /> };
  };

  return (
    <div className="page-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <CircleDollarSign style={{ color: 'var(--primary)' }} /> Control de Pagos
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)' }}>
            Revisa el mes actual y los dos anteriores y marca con un tick los pagos realizados.
          </p>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div className="glass-panel" style={{ padding: '1rem 1.25rem', flex: '1 1 180px' }}>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Pagos marcados</p>
          <p style={{ margin: '0.35rem 0 0', fontSize: '1.35rem', fontWeight: 700, color: '#24583e' }}>{totalPaid}</p>
        </div>
        <div className="glass-panel" style={{ padding: '1rem 1.25rem', flex: '1 1 180px' }}>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Warnings de impago</p>
          <p style={{ margin: '0.35rem 0 0', fontSize: '1.35rem', fontWeight: 700, color: '#9e2a2b' }}>{totalOverdue}</p>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: '1rem', borderRadius: '10px', border: '1px solid #f7caca', background: '#fdf0f0', color: '#9e2a2b', padding: '1rem' }}>
          {error}
        </div>
      )}

      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border)', background: 'var(--surface-alt)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            ALUMNOS REGISTRADOS ({filteredStudents.length} de {students.length})
          </span>
          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Buscar alumno..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.45rem 0.8rem 0.45rem 2rem',
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
            <p style={{ margin: 0 }}>No se encontraron alumnos con ese criterio.</p>
          </div>
        ) : (
          filteredStudents.map((student) => {
            const initials = `${student.firstName[0] || ''}${student.lastName[0] || ''}`.toUpperCase() || 'AL';
            const activeEnrollment = student.enrollments?.find((enrollment) => !enrollment.endDate);
            const pastEnrollments = student.enrollments?.filter((enrollment) => enrollment.endDate) || [];
            const isSelected = selectedStudentPaymentId === student.id;
            const isOnline = student.modality === 'ONLINE';
            const hasEnrollment = (student.enrollments?.length || 0) > 0;
            const unpaidCount = student.payments.filter(
              (payment) => payment.isApplicable && getPaymentVisualStatus(payment.isPaid, payment.month, payment.year) !== 'PAID'
            ).length;

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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
                      {initials}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <strong style={{ fontSize: '0.98rem', color: 'var(--text-main)', display: 'block' }}>
                        {student.firstName} {student.lastName}
                      </strong>
                      <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{student.email}</small>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center', flex: 1 }}>
                    {hasEnrollment && (
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

                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    flexShrink: 0,
                    background: isOnline ? '#eef2ff' : '#f0fdf4',
                    color: isOnline ? '#4338ca' : '#15803d',
                    border: `1px solid ${isOnline ? '#c7d2fe' : '#bbf7d0'}`
                  }}>
                    {isOnline ? <Laptop size={12} /> : <GraduationCap size={12} />}
                    {isOnline ? 'Online' : 'Presencial'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.6rem', paddingTop: '0.45rem', borderTop: '1px dashed var(--border)', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {activeEnrollment ? (
                      <><strong style={{ color: 'var(--text-main)' }}>{activeEnrollment.monthlyFee} € / mes</strong> · Matrícula Activa</>
                    ) : pastEnrollments.length > 0 ? (
                      <>Inactivo · Última: {pastEnrollments[0].monthlyFee} € / mes</>
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

      {selectedStudent && createPortal(
        <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: '260px', zIndex: 50, minHeight: '100vh', overflowY: 'auto', background: '#f8fafc', padding: '2rem' }}>
          <div className="animate-fade-in" style={{ maxWidth: '1024px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <button
                type="button"
                onClick={() => setSelectedStudentPaymentId(null)}
                className="btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <ArrowLeft size={17} /> Volver a Control de Pagos
              </button>
            </div>

            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--text-main)' }}>
                  Pagos de {selectedStudent.firstName} {selectedStudent.lastName}
                </h1>
                <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)' }}>
                  Consulta y gestiona las mensualidades de {selectedStudent.firstName} {selectedStudent.lastName}.
                </p>
              </div>

              {selectedStudent.payments.filter((payment) => payment.isApplicable).length > 0 && (
                <button
                  type="button"
                  onClick={() => handleDownloadStatement(selectedStudent)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.55rem 0.95rem',
                    fontSize: '0.9rem',
                    borderRadius: '8px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  <FileText size={16} /> Generar Extracto Global
                </button>
              )}
            </header>

            {(() => {
              const activeEnrollment = selectedStudent.enrollments?.find((enrollment) => !enrollment.endDate);
              const pastEnrollments = selectedStudent.enrollments?.filter((enrollment) => enrollment.endDate) || [];
              const reference = activeEnrollment || pastEnrollments[pastEnrollments.length - 1] || null;

              return (
                <div style={{ background: '#fff', border: '1px solid rgba(226, 232, 240, 0.8)', borderRadius: '16px', boxShadow: 'var(--shadow-sm)', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <CalendarDays size={20} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      {reference
                        ? `Periodo de Matrícula: ${new Date(reference.startDate).toLocaleDateString('es-ES')} (${activeEnrollment ? 'Activa' : 'Inactiva'})`
                        : 'Sin periodo de matrícula registrado'}
                    </span>
                  </div>

                  <span style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    {reference ? `${reference.monthlyFee} € / mes` : 'Sin tarifa'}
                  </span>
                </div>
              );
            })()}

            <div style={{ background: '#fff', border: '1px solid rgba(226, 232, 240, 0.8)', borderRadius: '16px', boxShadow: 'var(--shadow-sm)', padding: '1.5rem' }}>
              <h4 style={{ margin: '0 0 1rem', fontSize: '1rem', color: 'var(--text-main)' }}>
                Historial de Mensualidades ({selectedStudent.payments.length})
              </h4>

              <div style={{ display: 'grid', gap: '1rem' }}>
                {selectedStudent.payments.map((payment) => {
                  const styles = getStatusStyles(payment);
                  const paymentKey = `${selectedStudent.id}-${payment.year}-${payment.month}`;
                  const isUpdating = updatingKey === paymentKey;

                  let amount = payment.amount;
                  if (!amount) {
                    const cardDate = new Date(payment.year, payment.month - 1, 1);
                    const enr = selectedStudent.enrollments?.find(e => {
                       const sd = new Date(e.startDate);
                       const sdMonth = new Date(sd.getFullYear(), sd.getMonth(), 1);
                       let edMonth = new Date(3000, 0, 1);
                       if (e.endDate) {
                         const ed = new Date(e.endDate);
                         edMonth = new Date(ed.getFullYear(), ed.getMonth(), 1);
                       }
                       return cardDate.getTime() >= sdMonth.getTime() && cardDate.getTime() <= edMonth.getTime();
                    });
                    amount = enr?.monthlyFee || 35;
                  }

                  return (
                    <div
                      key={paymentKey}
                      style={{
                        border: '1px solid var(--border)',
                        background: 'var(--surface-alt)',
                        borderRadius: '12px',
                        padding: '1.25rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '1rem',
                        flexWrap: 'wrap',
                        opacity: payment.isApplicable ? 1 : 0.55
                      }}
                    >
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>
                          {monthLabel(payment.month, payment.year)}
                        </h3>
                        <p style={{ margin: '0.45rem 0 0', color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: 600 }}>
                          {amount} €
                        </p>
                        {!payment.isApplicable && (
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.25rem' }}>
                            Fuera de periodo de matrícula.
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Clock3 size={14} /> Actualizado automáticamente
                        </span>
                        {(() => {
                          const isPaid = getPaymentVisualStatus(payment.isPaid, payment.month, payment.year) === 'PAID';
                          return (
                            <button
                              type="button"
                              disabled={!isPaid}
                              onClick={() => isPaid && handleDownloadInvoice(selectedStudent, payment)}
                              className="btn-secondary"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.45rem',
                                padding: '0.45rem 0.85rem',
                                fontSize: '0.85rem',
                                borderRadius: '8px',
                                opacity: isPaid ? 1 : 0.5,
                                cursor: isPaid ? 'pointer' : 'not-allowed'
                              }}
                              title={isPaid ? 'Descargar Factura Oficial en PDF' : 'Factura disponible únicamente tras registrar el pago'}
                            >
                              <FileText size={16} /> Factura PDF
                            </button>
                          );
                        })()}
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: styles.color, background: styles.background, borderRadius: '20px', padding: '0.4rem 0.85rem', fontWeight: 700 }}>
                          {styles.icon}
                          {styles.label}
                        </span>
                        <button
                          disabled={isUpdating || !payment.isApplicable}
                          onClick={() => togglePayment(selectedStudent.id, payment)}
                          aria-label={payment.isPaid ? 'Quitar tick de pagado' : 'Poner tick de pagado'}
                          title={payment.isPaid ? 'Quitar tick de pagado' : 'Poner tick de pagado'}
                          style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '10px',
                            border: `1px solid ${payment.isPaid ? 'var(--primary)' : 'var(--border)'}`,
                            background: payment.isPaid ? 'var(--primary-light)' : 'var(--surface)',
                            color: payment.isPaid ? 'var(--primary-text)' : 'var(--text-muted)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: isUpdating || !payment.isApplicable ? 0.7 : 1,
                            cursor: isUpdating || !payment.isApplicable ? 'not-allowed' : 'pointer'
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
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default TeacherPayments;
