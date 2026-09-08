import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, FileText, XCircle, CalendarDays } from 'lucide-react';
import { useParent } from '../context/ParentContext';
import { generateInvoicePDF, generateStatementPDF } from '../utils/invoice';
import { getPaymentVisualStatus } from '../utils/paymentStatus';

interface AcademyEnrollment {
  id: string;
  monthlyFee: number;
  startDate: string;
  endDate: string | null;
}

interface StudentPaymentResponse {
  month: number;
  year: number;
  amount: number | null;
  dueDate: string | null;
  paidAt: string | null;
  isPaid: boolean;
  status: 'PENDING' | 'PAID';
  isOverdue: boolean;
  visualStatus: 'PAID' | 'PENDING' | 'OVERDUE';
  isApplicable: boolean;
  updatedAt: string | null;
  student: {
    id: string;
    email: string;
    profile?: {
      firstName: string;
      lastName: string;
      dni?: string | null;
    };
    enrollments?: AcademyEnrollment[];
    parent?: {
      profile?: {
        firstName: string;
        lastName: string;
        dni?: string | null;
      } | null;
    } | null;
  };
}

interface MonthlyPaymentCard {
  month: number;
  year: number;
  label: string;
  data: StudentPaymentResponse | null;
  error: string;
}

interface EnrollmentGroup {
  enrollment: AcademyEnrollment;
  payments: MonthlyPaymentCard[];
}

const StudentPayments: React.FC = () => {
  const [groupedPayments, setGroupedPayments] = useState<EnrollmentGroup[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const { selectedStudentId, selectedStudent } = useParent();

  const getMonthLabel = (month: number, year: number) => {
    const date = new Date(year, month - 1, 1);
    const raw = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    return raw.charAt(0).toUpperCase() + raw.slice(1).replace(' de ', ' ');
  };

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);
        setErrorMsg('');
        const token = localStorage.getItem('token');
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const studentParam = selectedStudentId ? `&studentId=${selectedStudentId}` : '';

        const res = await fetch(`${apiUrl}/api/payments/me?all=true${studentParam}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!res.ok) {
          const body = await res.json();
          setErrorMsg(body.error || 'No se pudo cargar tu estado de pago.');
          return;
        }

        const body: StudentPaymentResponse[] = await res.json();
        
        if (body.length === 0) {
          setGroupedPayments([]);
          return;
        }

        const enrollments = body[0].student.enrollments || [];
        
        const cards = body.map(paymentData => ({
          month: paymentData.month,
          year: paymentData.year,
          label: getMonthLabel(paymentData.month, paymentData.year),
          data: paymentData,
          error: ''
        }));

        const groups: EnrollmentGroup[] = enrollments.map(enr => ({
          enrollment: enr,
          payments: []
        }));

        cards.forEach(card => {
           const cardDate = new Date(card.year, card.month - 1, 1);
           const enrMatch = groups.find(g => {
             const sd = new Date(g.enrollment.startDate);
             const sdMonth = new Date(sd.getFullYear(), sd.getMonth(), 1);
             let edMonth = new Date(3000, 0, 1);
             if (g.enrollment.endDate) {
               const ed = new Date(g.enrollment.endDate);
               edMonth = new Date(ed.getFullYear(), ed.getMonth(), 1);
             }
             return cardDate.getTime() >= sdMonth.getTime() && cardDate.getTime() <= edMonth.getTime();
           });

           if (enrMatch) {
             enrMatch.payments.push(card);
           }
        });

        groups.forEach(g => {
          g.payments.sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            return b.month - a.month;
          });
        });
        
        // Sort enrollments descending by start date
        groups.sort((a, b) => new Date(b.enrollment.startDate).getTime() - new Date(a.enrollment.startDate).getTime());

        setGroupedPayments(groups);
      } catch (fetchError) {
        console.error(fetchError);
        setErrorMsg('No se pudo conectar con el servidor.');
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [selectedStudentId]);

  const handleDownloadInvoice = (card: MonthlyPaymentCard) => {
    if (!card.data) return;
    const firstName = card.data.student.profile?.firstName || 'Alumno';
    const lastName = card.data.student.profile?.lastName || '';
    const studentName = `${firstName} ${lastName}`.trim();

    const billedName = card.data.student.parent?.profile 
      ? `${card.data.student.parent.profile.firstName} ${card.data.student.parent.profile.lastName}`.trim()
      : studentName;
    const billedDni = card.data.student.parent?.profile?.dni || card.data.student.profile?.dni || null;

    generateInvoicePDF({
      studentName: billedName,
      studentDni: billedDni,
      studentEmail: card.data.student.email,
      month: card.month,
      year: card.year,
      monthLabel: card.label,
      amount: card.data.amount || 35,
      paidAt: card.data.paidAt
    });
  };

  const handleDownloadStatement = () => {
    if (groupedPayments.length === 0) return;
    const firstGroup = groupedPayments[0];
    const student = firstGroup.payments[0]?.data?.student;
    if (!student) return;

    const studentName = `${student.profile?.firstName || 'Alumno'} ${student.profile?.lastName || ''}`.trim();
    
    // Flatten all payments from all groups
    const allPayments = groupedPayments.flatMap(g => 
      g.payments.map(p => ({
        monthLabel: p.label,
        amount: p.data?.amount || g.enrollment.monthlyFee || 35,
        isPaid: p.data?.isPaid || false,
        paidAt: p.data?.paidAt
      }))
    );

    const billedName = student.parent?.profile 
      ? `${student.parent.profile.firstName} ${student.parent.profile.lastName}`.trim()
      : studentName;
    const billedDni = student.parent?.profile?.dni || student.profile?.dni || null;

    generateStatementPDF({
      studentName: billedName,
      studentDni: billedDni,
      studentEmail: student.email,
      payments: allPayments
    });
  };

  const isParent = !!selectedStudentId;
  const childName = selectedStudent?.profile 
    ? `${selectedStudent.profile.firstName || ''} ${selectedStudent.profile.lastName || ''}`.trim()
    : 'tu hijo';

  return (
    <div className="page-container">
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--text-main)' }}>
            {isParent ? `Pagos de ${childName}` : 'Mis Pagos'}
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)' }}>
            {isParent 
              ? `Consulta si la mensualidad de ${childName} está al día.` 
              : 'Consulta si tu mensualidad está al día.'}
          </p>
        </div>
        {groupedPayments.length > 0 && (
          <button
            onClick={handleDownloadStatement}
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

      {errorMsg && (
        <div style={{ borderRadius: '10px', border: '1px solid #f7caca', background: '#fdf0f0', color: '#9e2a2b', padding: '1rem', marginBottom: '1rem' }}>
          {errorMsg}
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Cargando estado de pago...</p>
      ) : groupedPayments.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>No tienes periodos de matrícula registrados.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {groupedPayments.map((group) => (
            <div key={group.enrollment.id} className="glass-panel" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                <CalendarDays size={20} style={{ color: 'var(--primary)' }} />
                <h2 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text-main)' }}>
                  Periodo de Matrícula: {new Date(group.enrollment.startDate).toLocaleDateString()} {group.enrollment.endDate ? `- ${new Date(group.enrollment.endDate).toLocaleDateString()}` : '(Activa)'}
                </h2>
                <span style={{ marginLeft: 'auto', background: 'var(--surface-alt)', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600 }}>
                  {group.enrollment.monthlyFee} € / mes
                </span>
              </div>

              {group.payments.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No hay pagos generados para este periodo.</p>
              ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {group.payments.map((payment) => (
                    <div
                      key={`${payment.year}-${payment.month}`}
                      style={{
                        border: '1px solid var(--border)',
                        borderRadius: '12px',
                        background: 'var(--surface-alt)',
                        padding: '1.25rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.9rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>{payment.label}</h3>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Clock3 size={14} /> Actualizado automáticamente
                        </span>
                      </div>

                      {payment.data && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '1rem',
                            flexWrap: 'wrap'
                          }}
                        >
                          <div>
                            <p style={{ margin: '0.45rem 0 0', color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: 600 }}>
                              {payment.data.amount ? `${payment.data.amount} €` : 'Importe no disponible'}
                            </p>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                            {(() => {
                              const visualStatus = getPaymentVisualStatus(payment.data.isPaid, payment.month, payment.year);
                              const isPaid = visualStatus === 'PAID';
                              return (
                                <button
                                  type="button"
                                  disabled={!isPaid}
                                  onClick={() => isPaid && handleDownloadInvoice(payment)}
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

                            {getPaymentVisualStatus(payment.data!.isPaid, payment.month, payment.year) === 'PAID' ? (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#047857', background: '#d1fae5', padding: '0.4rem 0.85rem', borderRadius: '20px', fontWeight: 700 }}>
                                <CheckCircle2 size={18} />
                                Pagado
                              </div>
                            ) : getPaymentVisualStatus(payment.data!.isPaid, payment.month, payment.year) === 'OVERDUE' ? (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#b91c1c', background: '#fee2e2', padding: '0.4rem 0.85rem', borderRadius: '20px', fontWeight: 700 }}>
                                <XCircle size={18} />
                                Impago
                              </div>
                            ) : (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#b45309', background: '#fef3c7', padding: '0.4rem 0.85rem', borderRadius: '20px', fontWeight: 700 }}>
                                <XCircle size={18} />
                                Pendiente
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentPayments;
