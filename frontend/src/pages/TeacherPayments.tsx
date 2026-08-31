import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, CircleDollarSign, FileText, LoaderCircle, X } from 'lucide-react';
import { generateInvoicePDF } from '../utils/invoice';

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
  monthlyFee: number | null;
  courseDurationMonths: number | null;
  payments: StudentPaymentItem[];
}

interface PaymentsResponse {
  months: Array<{ month: number; year: number }>;
  students: PaymentStudent[];
}

const TeacherPayments: React.FC = () => {
  const [students, setStudents] = useState<PaymentStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [error, setError] = useState('');

  const monthLabel = (month: number, year: number) => {
    const date = new Date(year, month - 1, 1);
    const raw = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    return raw.charAt(0).toUpperCase() + raw.slice(1).replace(' de ', ' ');
  };

  const handleDownloadInvoice = (student: PaymentStudent, payment: StudentPaymentItem) => {
    const studentName = `${student.firstName} ${student.lastName}`.trim();
    const monthName = monthLabel(payment.month, payment.year);

    generateInvoicePDF({
      studentName,
      studentDni: student.dni || null,
      studentEmail: student.email,
      month: payment.month,
      year: payment.year,
      monthLabel: monthName,
      amount: payment.amount || student.monthlyFee || 35,
      paidAt: payment.paidAt
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

  const totalOverdue = useMemo(
    () => students.reduce((acc, student) => acc + student.payments.filter((payment) => payment.isApplicable && payment.visualStatus === 'OVERDUE').length, 0),
    [students]
  );

  const totalPaid = useMemo(
    () => students.reduce((acc, student) => acc + student.payments.filter((payment) => payment.isApplicable && payment.visualStatus === 'PAID').length, 0),
    [students]
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
                visualStatus: !payment.isPaid ? 'PAID' : (item.isOverdue ? 'OVERDUE' : 'PENDING'),
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
    if (payment.visualStatus === 'PAID') {
      return { color: '#24583e', background: '#eaf4ef', border: '#bfe0d0', label: 'Pagado', icon: <Check size={16} /> };
    }

    if (payment.visualStatus === 'OVERDUE') {
      return { color: '#9e2a2b', background: '#fdf0f0', border: '#f7caca', label: 'Impago', icon: <AlertTriangle size={16} /> };
    }

    return { color: '#8d5b12', background: '#fef7e8', border: '#fae0b0', label: 'Pendiente', icon: <X size={16} /> };
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
        <div className="table-responsive">
          <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--surface-alt)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem' }}>ALUMNO</th>
              <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem' }}>TARIFA</th>
              <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem' }}>PAGOS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Cargando pagos...
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No hay alumnos registrados.
                </td>
              </tr>
            ) : (
              students.map((student) => {
                const initials = `${student.firstName[0] || ''}${student.lastName[0] || ''}`.toUpperCase() || 'AL';

                return (
                  <tr key={student.id} style={{ borderBottom: '1px solid var(--border)', verticalAlign: 'top' }}>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'var(--primary)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '0.85rem'
                          }}
                        >
                          {initials}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{student.firstName} {student.lastName}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{student.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-main)', fontWeight: 600 }}>
                      {student.monthlyFee ? `${student.monthlyFee} € / mes` : 'Sin tarifa'}
                      <div style={{ marginTop: '0.35rem', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 400 }}>
                        {student.courseDurationMonths ? `${student.courseDurationMonths} meses` : 'Duración sin definir'}
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ display: 'grid', gap: '0.75rem' }}>
                        {student.payments.map((payment) => {
                          const styles = getStatusStyles(payment);
                          const paymentKey = `${student.id}-${payment.year}-${payment.month}`;
                          const isUpdating = updatingKey === paymentKey;

                          return (
                            <div
                              key={paymentKey}
                              style={{
                                border: `1px solid ${styles.border}`,
                                background: styles.background,
                                borderRadius: '12px',
                                padding: '0.9rem 1rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                gap: '1rem',
                                flexWrap: 'wrap',
                                opacity: payment.isApplicable ? 1 : 0.55
                              }}
                            >
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: styles.color, fontWeight: 700, marginBottom: '0.25rem' }}>
                                  {styles.icon}
                                  {monthLabel(payment.month, payment.year)}
                                </div>
                                <div style={{ color: 'var(--text-main)', fontSize: '0.92rem' }}>
                                  {payment.amount ? `${payment.amount} €` : 'Sin importe'}
                                </div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.25rem' }}>
                                  Vence el {payment.dueDate ? new Date(payment.dueDate).toLocaleDateString('es-ES') : '1 del mes'}
                                </div>
                                {!payment.isApplicable && (
                                  <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.25rem' }}>
                                    Fuera de la duración del curso.
                                  </div>
                                )}
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                {(() => {
                                  const isPaid = payment.visualStatus === 'PAID' || payment.isPaid || payment.status === 'PAID';
                                  return (
                                    <button
                                      type="button"
                                      disabled={!isPaid}
                                      onClick={() => isPaid && handleDownloadInvoice(student, payment)}
                                      className="btn-secondary"
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.35rem',
                                        padding: '0.35rem 0.65rem',
                                        fontSize: '0.8rem',
                                        borderRadius: '6px',
                                        opacity: isPaid ? 1 : 0.5,
                                        cursor: isPaid ? 'pointer' : 'not-allowed'
                                      }}
                                      title={isPaid ? 'Descargar Factura Oficial en PDF' : 'Factura disponible únicamente tras registrar el pago'}
                                    >
                                      <FileText size={14} /> Factura
                                    </button>
                                  );
                                })()}
                                <span style={{ color: styles.color, fontWeight: 700 }}>{styles.label}</span>
                                <button
                                  disabled={isUpdating || !payment.isApplicable}
                                  onClick={() => togglePayment(student.id, payment)}
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
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};

export default TeacherPayments;
