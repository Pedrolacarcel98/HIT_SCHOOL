import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, FileText, XCircle } from 'lucide-react';
import { useParent } from '../context/ParentContext';
import { generateInvoicePDF } from '../utils/invoice';

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
  };
}

interface MonthTarget {
  month: number;
  year: number;
}

interface MonthlyPaymentCard {
  month: number;
  year: number;
  label: string;
  data: StudentPaymentResponse | null;
  error: string;
}

const StudentPayments: React.FC = () => {
  const [payments, setPayments] = useState<MonthlyPaymentCard[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedStudentId } = useParent();

  const monthsToShow = useMemo<MonthTarget[]>(() => {
    const now = new Date();
    return [0, 1, 2].map((offset) => {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      return {
        month: date.getMonth() + 1,
        year: date.getFullYear()
      };
    });
  }, []);

  const getMonthLabel = (month: number, year: number) => {
    const date = new Date(year, month - 1, 1);
    const raw = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    return raw.charAt(0).toUpperCase() + raw.slice(1).replace(' de ', ' ');
  };

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const studentParam = selectedStudentId ? `&studentId=${selectedStudentId}` : '';

        const results = await Promise.all(
          monthsToShow.map(async ({ month, year }) => {
            try {
              const res = await fetch(`${apiUrl}/api/payments/me?month=${month}&year=${year}${studentParam}`, {
                headers: { Authorization: `Bearer ${token}` }
              });

              const body = await res.json();
              if (!res.ok) {
                return {
                  month,
                  year,
                  label: getMonthLabel(month, year),
                  data: null,
                  error: body.error || 'No se pudo cargar tu estado de pago.'
                } as MonthlyPaymentCard;
              }

              return {
                month,
                year,
                label: getMonthLabel(month, year),
                data: body as StudentPaymentResponse,
                error: ''
              } as MonthlyPaymentCard;
            } catch (fetchError) {
              console.error(fetchError);
              return {
                month,
                year,
                label: getMonthLabel(month, year),
                data: null,
                error: 'No se pudo conectar con el servidor.'
              } as MonthlyPaymentCard;
            }
          })
        );

        setPayments(results);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [monthsToShow, selectedStudentId]);

  const handleDownloadInvoice = (card: MonthlyPaymentCard) => {
    if (!card.data) return;
    const firstName = card.data.student.profile?.firstName || 'Alumno';
    const lastName = card.data.student.profile?.lastName || '';
    const studentName = `${firstName} ${lastName}`.trim();

    generateInvoicePDF({
      studentName,
      studentDni: card.data.student.profile?.dni || null,
      studentEmail: card.data.student.email,
      month: card.month,
      year: card.year,
      monthLabel: card.label,
      amount: card.data.amount || 35,
      paidAt: card.data.paidAt
    });
  };

  return (
    <div className="page-container">
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--text-main)' }}>Mis Pagos</h1>
        <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)' }}>
          Consulta si tu mensualidad esta al dia.
        </p>
      </header>

      <div className="glass-panel">
        {loading && (
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Cargando estado de pago...</p>
        )}

        {!loading && (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {payments.map((payment) => (
              <div
                key={`${payment.year}-${payment.month}`}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: '14px',
                  background: 'var(--surface)',
                  padding: '1.5rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.9rem' }}>
                  <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>{payment.label}</h2>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Clock3 size={14} /> Actualizado automaticamente
                  </span>
                </div>

                {payment.error ? (
                  <div style={{ borderRadius: '10px', border: '1px solid #f7caca', background: '#fdf0f0', color: '#9e2a2b', padding: '1rem' }}>
                    {payment.error}
                  </div>
                ) : payment.data ? (
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
                      <p style={{ margin: 0, color: 'var(--text-main)', fontWeight: 600, fontSize: '1.05rem' }}>
                        {payment.data.student.profile?.firstName || 'Alumno'} {payment.data.student.profile?.lastName || ''}
                      </p>
                      <p style={{ margin: '0.35rem 0 0', color: 'var(--text-muted)', fontSize: '0.92rem' }}>
                        {payment.data.student.email}
                      </p>
                      <p style={{ margin: '0.45rem 0 0', color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: 600 }}>
                        {payment.data.amount ? `${payment.data.amount} €` : 'Importe no disponible'}
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      {(() => {
                        const isPaid = payment.data.visualStatus === 'PAID' || payment.data.isPaid || payment.data.status === 'PAID';
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

                      {payment.data.visualStatus === 'PAID' ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#24583e', background: 'var(--primary-light)', padding: '0.4rem 0.85rem', borderRadius: '20px', border: '1px solid var(--primary-border)', fontWeight: 700 }}>
                          <CheckCircle2 size={18} />
                          Pagado
                        </div>
                      ) : payment.data.visualStatus === 'OVERDUE' ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#9e2a2b', background: '#fdf0f0', padding: '0.4rem 0.85rem', borderRadius: '20px', border: '1px solid #f7caca', fontWeight: 700 }}>
                          <XCircle size={18} />
                          Impago
                        </div>
                      ) : (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#8d5b12', background: '#fef7e8', padding: '0.4rem 0.85rem', borderRadius: '20px', border: '1px solid #fae0b0', fontWeight: 700 }}>
                          <XCircle size={18} />
                          Pendiente
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentPayments;
