import React, { useEffect, useMemo, useState } from 'react';
import { CircleDollarSign, AlertTriangle, BookOpen, Award, CheckCircle2, FileText, Receipt } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useParent } from '../context/ParentContext';
import { generateFamilyMonthlyInvoicePDF, generateFamilyStatementPDF } from '../utils/invoice';

interface DashboardStudentData {
  student: { id: string; name: string };
  hasParent: boolean;
  payments: {
    pendingCount: number;
    nextDueDate: string | null;
  };
  assignments: {
    pendingCount: number;
    upcoming: { id: string; title: string; course: string; deadline: string | null }[];
  };
  grades: { courseTitle: string; average: number }[];
}

interface FamilyPaymentLine {
  studentId: string;
  studentName: string;
  studentDni?: string | null;
  studentEmail?: string | null;
  month: number;
  year: number;
  monthLabel: string;
  amount: number;
  isPaid: boolean;
  paidAt?: string | Date | null;
}

const DashboardStudent: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardStudentData[]>([]);
  const [familyPayments, setFamilyPayments] = useState<FamilyPaymentLine[]>([]);
  const [familyMonthKey, setFamilyMonthKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { childrenList, parentName, parentUser } = useParent();
  const userRole = localStorage.getItem('userRole');

  const getMonthLabel = (month: number, year: number) => {
    const date = new Date(year, month - 1, 1);
    const raw = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    return raw.charAt(0).toUpperCase() + raw.slice(1).replace(' de ', ' ');
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const res = await fetch(`${apiUrl}/api/dashboard/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!res.ok) {
          throw new Error('Error al obtener el dashboard');
        }
        const json = await res.json();
        setDashboardData(json.data);
      } catch (err) {
        setError('No se pudo cargar el dashboard.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (userRole !== 'PARENT' || childrenList.length === 0) return;

    const fetchFamilyPayments = async () => {
      try {
        const token = localStorage.getItem('token');
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const results = await Promise.all(childrenList.map(async (child) => {
          const res = await fetch(`${apiUrl}/api/payments/me?all=true&studentId=${child.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (!res.ok) return [] as FamilyPaymentLine[];
          const payments = await res.json();
          const studentName = child.profile?.firstName || child.profile?.lastName
            ? `${child.profile?.firstName || ''} ${child.profile?.lastName || ''}`.trim()
            : child.email;

          return payments
            .filter((payment: any) => payment?.isPaid)
            .map((payment: any) => ({
              studentId: child.id,
              studentName,
              studentDni: child.profile?.dni || null,
              studentEmail: child.email,
              month: payment.month,
              year: payment.year,
              monthLabel: getMonthLabel(payment.month, payment.year),
              amount: Number(payment.amount) || 0,
              isPaid: Boolean(payment.isPaid),
              paidAt: payment.paidAt
            }));
        }));
        setFamilyPayments(results.flat());
      } catch (err) {
        console.error('Error al cargar pagos familiares:', err);
        setFamilyPayments([]);
      }
    };

    fetchFamilyPayments();
  }, [userRole, childrenList]);

  const familyMonthOptions = useMemo(() => {
    const optionMap = new Map<string, string>();
    familyPayments.forEach((payment) => {
      const key = `${payment.year}-${String(payment.month).padStart(2, '0')}`;
      optionMap.set(key, payment.monthLabel);
    });
    return Array.from(optionMap.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [familyPayments]);

  useEffect(() => {
    if (!familyMonthKey && familyMonthOptions.length > 0) {
      setFamilyMonthKey(familyMonthOptions[0][0]);
    }
  }, [familyMonthKey, familyMonthOptions]);

  const handleDownloadFamilyStatement = () => {
    if (familyPayments.length === 0) return;
    generateFamilyStatementPDF({
      parentName,
      parentDni: parentUser?.profile?.dni || null,
      parentEmail: parentUser?.email || null,
      payments: familyPayments
    });
  };

  const handleDownloadFamilyInvoice = () => {
    if (!familyMonthKey) return;
    const [yearValue, monthValue] = familyMonthKey.split('-').map(Number);
    const payments = familyPayments.filter((payment) => payment.year === yearValue && payment.month === monthValue);
    if (payments.length === 0) return;
    generateFamilyMonthlyInvoicePDF({
      parentName,
      parentDni: parentUser?.profile?.dni || null,
      parentEmail: parentUser?.email || null,
      month: monthValue,
      year: yearValue,
      monthLabel: payments[0].monthLabel,
      payments
    });
  };

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <p style={{ color: 'var(--text-muted)' }}>Cargando resumen...</p>
      </div>
    );
  }

  if (error || dashboardData.length === 0) {
    return (
      <div className="page-container">
        <div style={{ padding: '1rem', background: '#fdf0f0', border: '1px solid #f7caca', color: '#9e2a2b', borderRadius: '8px' }}>
          {error || 'No hay datos disponibles.'}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container animate-fade-in">
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--text-main)' }}>Inicio</h1>
        <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)' }}>Resumen de actividad.</p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        {dashboardData.map(data => (
          <div key={data.student.id}>
            {userRole === 'PARENT' && (
              <h2 style={{ fontSize: '1.4rem', color: 'var(--text-main)', borderBottom: '2px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
                Resumen de {data.student.name}
              </h2>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              
              {/* Tarjeta de Pagos (Solo para Padres o Alumnos Independientes) */}
              {(!data.hasParent || userRole === 'PARENT') && (
                <div className="glass-panel" style={{ padding: '1.5rem', cursor: 'pointer' }} onClick={() => navigate('/student/payments')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <CircleDollarSign size={20} color="var(--primary)" />
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>Pagos</h3>
                  </div>
                  {data.payments.pendingCount > 0 ? (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#dc2626' }}>
                        <AlertTriangle size={18} />
                        <span style={{ fontWeight: 'bold' }}>{data.payments.pendingCount} pagos pendientes</span>
                      </div>
                      {data.payments.nextDueDate && (
                        <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          Próximo vencimiento: {new Date(data.payments.nextDueDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#16a34a' }}>
                      <CheckCircle2 size={18} />
                      <span style={{ fontWeight: 'bold' }}>Todo al día</span>
                    </div>
                  )}
                </div>
              )}

              {/* Tarjeta de Tareas */}
              <div className="glass-panel" style={{ padding: '1.5rem', cursor: 'pointer' }} onClick={() => navigate('/student/courses')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <BookOpen size={20} color="var(--primary)" />
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>Tareas Pendientes</h3>
                </div>
                {data.assignments.pendingCount > 0 ? (
                  <div>
                    <div style={{ color: '#d97706', fontWeight: 'bold', marginBottom: '0.75rem' }}>
                      {data.assignments.pendingCount} tareas sin entregar
                    </div>
                    {data.assignments.upcoming.length > 0 && (
                      <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {data.assignments.upcoming.map(t => (
                          <li key={t.id} style={{ marginBottom: '0.25rem' }}>
                            <strong>{t.title}</strong> - {t.course} 
                            {t.deadline && ` (Hasta ${new Date(t.deadline).toLocaleDateString()})`}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#16a34a' }}>
                    <CheckCircle2 size={18} />
                    <span style={{ fontWeight: 'bold' }}>No tienes tareas pendientes</span>
                  </div>
                )}
              </div>

              {/* Tarjeta de Calificaciones */}
              <div className="glass-panel" style={{ padding: '1.5rem', cursor: 'pointer' }} onClick={() => navigate('/student/grades')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <Award size={20} color="var(--primary)" />
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>Media de Calificaciones</h3>
                </div>
                {data.grades.length > 0 ? (
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                    {data.grades.map(g => (
                      <li key={g.courseTitle} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{g.courseTitle}</span>
                        <strong style={{ color: 'var(--text-main)' }}>{g.average.toFixed(1)}/10</strong>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Aún no hay calificaciones.</p>
                )}
              </div>

            </div>
          </div>
        ))}

        {userRole === 'PARENT' && (
          <section className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <CircleDollarSign size={22} style={{ color: 'var(--primary)' }} /> Documentación y Pagos Conjuntos (Familia)
              </h2>
              <p style={{ margin: '0.35rem 0 0', color: 'var(--text-muted)' }}>
                Descarga la documentación de cobros unificada para todos tus hijos matriculados.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleDownloadFamilyStatement}
                disabled={familyPayments.length === 0}
                className="btn-primary"
                style={{ opacity: familyPayments.length === 0 ? 0.55 : 1, cursor: familyPayments.length === 0 ? 'not-allowed' : 'pointer' }}
              >
                <FileText size={17} /> Descargar Extracto Conjunto
              </button>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
                <select
                  value={familyMonthKey}
                  onChange={(event) => setFamilyMonthKey(event.target.value)}
                  disabled={familyMonthOptions.length === 0}
                  aria-label="Mes de factura mensual conjunta"
                  style={{ padding: '0.7rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: '#ffffff', color: 'var(--text-main)', fontWeight: 600 }}
                >
                  {familyMonthOptions.length === 0 ? (
                    <option value="">Sin mensualidades pagadas</option>
                  ) : familyMonthOptions.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleDownloadFamilyInvoice}
                  disabled={!familyMonthKey}
                  className="btn-primary"
                  style={{ opacity: !familyMonthKey ? 0.55 : 1, cursor: !familyMonthKey ? 'not-allowed' : 'pointer' }}
                >
                  <Receipt size={17} /> Descargar Factura Mensual Conjunta
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default DashboardStudent;
