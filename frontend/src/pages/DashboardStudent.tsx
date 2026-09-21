import React, { useEffect, useMemo, useState } from 'react';
import { 
  CircleDollarSign, 
  AlertTriangle, 
  BookOpen, 
  Award, 
  CheckCircle2, 
  FileText, 
  Receipt,
  ArrowRight,
  Clock,
  Calendar,
  Rocket,
  ChevronRight,
  MessageSquare
} from 'lucide-react';
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

interface CurrentUser {
  profile?: {
    firstName?: string | null;
  } | null;
}

const getTimeGreeting = (name: string) => {
  const hour = new Date().getHours();
  if (hour < 13) return { text: `¡Buenos días, ${name}!`, icon: '☕' };
  if (hour < 20) return { text: `¡Buenas tardes, ${name}!`, icon: '🌤️' };
  return { text: `¡Buenas noches, ${name}!`, icon: '🌙' };
};

const getInitials = (name: string) => {
  if (!name) return 'HS';
  return name
    .split(' ')
    .filter(Boolean)
    .map(p => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

const getAvatarStyle = (name: string) => {
  const styles = [
    { bg: 'var(--primary-light)', text: 'var(--primary-text)' },
    { bg: '#e0f2fe', text: '#0369a1' },
    { bg: '#f3e8ff', text: '#6b21a8' },
    { bg: '#fef3c7', text: '#92400e' },
    { bg: '#ffe4e6', text: '#9f1239' }
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return styles[hash % styles.length];
};

const DashboardStudent: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardStudentData[]>([]);
  const [familyPayments, setFamilyPayments] = useState<FamilyPaymentLine[]>([]);
  const [familyMonthKey, setFamilyMonthKey] = useState('');
  const [accountName, setAccountName] = useState('');
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
        const headers = { Authorization: `Bearer ${token}` };
        const [res, profileRes] = await Promise.all([
          fetch(`${apiUrl}/api/dashboard/me`, { headers }),
          fetch(`${apiUrl}/api/auth/me`, { headers })
        ]);
        
        if (!res.ok) {
          throw new Error('Error al obtener el dashboard');
        }
        const json = await res.json();
        setDashboardData(json.data);
        if (profileRes.ok) {
          const currentUser = await profileRes.json() as CurrentUser;
          setAccountName(currentUser.profile?.firstName?.trim() || '');
        }
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

  const currentDateLabel = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'short'
  });

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
        <div style={{ padding: '1.25rem', background: '#fdf0f0', border: '1px solid #f7caca', color: '#9e2a2b', borderRadius: '12px' }}>
          {error || 'No hay datos disponibles.'}
        </div>
      </div>
    );
  }

  const totalPendingAssignments = dashboardData.reduce((acc, curr) => acc + curr.assignments.pendingCount, 0);
  const greeting = getTimeGreeting(accountName);

  return (
    <div className="page-container animate-fade-in">
      {/* Hero Bar Contextual */}
      <section className="dashboard-hero">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '1.25rem' }}>{greeting.icon}</span>
            <h1 style={{ margin: 0, fontSize: '1.55rem', color: 'var(--text-main)' }}>
              {greeting.text}
            </h1>
          </div>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.92rem' }}>
            {userRole === 'PARENT'
              ? 'Supervisión en tiempo real del progreso académico y cuotas de tus hijos.'
              : totalPendingAssignments > 0
                ? `Tienes ${totalPendingAssignments} ${totalPendingAssignments === 1 ? 'tarea o reto pendiente' : 'tareas o retos pendientes'} para completar. ¡Vamos a por ello!`
                : '¡Estás al día con todos tus ejercicios y clases! Sigue con este excelente ritmo.'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.4rem', 
            padding: '0.4rem 0.85rem', 
            borderRadius: '999px', 
            background: 'var(--surface)', 
            border: '1px solid var(--border)',
            fontSize: '0.82rem',
            color: 'var(--text-muted)',
            textTransform: 'capitalize'
          }}>
            <Calendar size={14} color="var(--primary)" />
            {currentDateLabel}
          </div>
        </div>
      </section>

      {/* Atajos Rápidos del Alumno */}
      <section className="dashboard-quick-actions" aria-label="Accesos directos del alumno">
        <button 
          onClick={() => navigate('/student/courses')} 
          className="quick-action-pill"
          type="button"
        >
          <BookOpen size={15} color="var(--primary)" /> Mis Clases y Tareas
        </button>

        <button 
          onClick={() => navigate('/student/grades')} 
          className="quick-action-pill"
          type="button"
        >
          <Award size={15} color="#7c3aed" /> Mis Calificaciones
        </button>

        <button 
          onClick={() => navigate('/student/chat')} 
          className="quick-action-pill"
          type="button"
        >
          <MessageSquare size={15} color="var(--primary)" /> Chat con Profesor
        </button>

        {(!dashboardData[0]?.hasParent || userRole === 'PARENT') && (
          <button 
            onClick={() => navigate('/student/payments')} 
            className="quick-action-pill"
            type="button"
          >
            <CircleDollarSign size={15} color="#0284c7" /> Mis Recibos y Cuotas
          </button>
        )}
      </section>

      {/* Secciones por Alumno */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        {dashboardData.map(data => {
          const studentInitials = getInitials(data.student.name);
          const avatar = getAvatarStyle(data.student.name);

          // Cálculo de media global si existen asignaturas
          const overallAverage = data.grades.length > 0 
            ? (data.grades.reduce((acc, g) => acc + g.average, 0) / data.grades.length).toFixed(1)
            : null;

          return (
            <div key={data.student.id}>
              {userRole === 'PARENT' && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.85rem', 
                  marginBottom: '1.25rem',
                  paddingBottom: '0.75rem',
                  borderBottom: '2px solid var(--border)' 
                }}>
                  <div style={{ 
                    width: '42px', 
                    height: '42px', 
                    borderRadius: '50%', 
                    background: avatar.bg, 
                    color: avatar.text, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontWeight: 800,
                    fontSize: '0.9rem' 
                  }}>
                    {studentInitials}
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text-main)' }}>
                      Progreso de {data.student.name}
                    </h2>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Expediente académico y actividad reciente
                    </span>
                  </div>
                </div>
              )}

              {/* Bento Grid del Alumno */}
              <div className="dashboard-bento" style={{ marginBottom: '1.25rem' }}>
                {/* Tarjeta 1: Retos y Tareas Pendientes (Bento Col 7 / Destacada) */}
                <div 
                  className="bento-col-7 dashboard-card dashboard-card--primary dashboard-card--interactive"
                  onClick={() => navigate('/student/courses')}
                  style={{ justifyContent: 'space-between', minHeight: '260px' }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div style={{ 
                          width: '42px', 
                          height: '42px', 
                          borderRadius: '10px', 
                          background: 'var(--surface)', 
                          border: '1px solid var(--primary-border)', 
                          color: 'var(--primary)', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          boxShadow: 'var(--shadow-sm)'
                        }}>
                          <Rocket size={22} />
                        </div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>
                            Tareas & Retos Pendientes
                          </h3>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            Trabajo asignado para resolver
                          </span>
                        </div>
                      </div>

                      {data.assignments.pendingCount > 0 ? (
                        <span className="dashboard-stat-badge" style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>
                          <Clock size={12} /> {data.assignments.pendingCount} pendientes
                        </span>
                      ) : (
                        <span className="dashboard-stat-badge" style={{ background: 'var(--primary-light)', color: 'var(--primary-text)', border: '1px solid var(--primary-border)' }}>
                          <CheckCircle2 size={12} /> Todo al día
                        </span>
                      )}
                    </div>

                    {data.assignments.pendingCount === 0 ? (
                      <div style={{ 
                        textAlign: 'center', 
                        padding: '1.75rem 1rem', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        gap: '0.5rem' 
                      }}>
                        <div style={{ 
                          width: '48px', 
                          height: '48px', 
                          borderRadius: '50%', 
                          background: 'var(--primary-light)', 
                          color: 'var(--primary)', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center' 
                        }}>
                          <CheckCircle2 size={26} />
                        </div>
                        <strong style={{ fontSize: '0.98rem', color: 'var(--text-main)' }}>
                          ¡Enhorabuena! Has completado todos tus ejercicios
                        </strong>
                        <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)', maxWidth: '380px' }}>
                          No tienes ninguna entrega pendiente. Cuando tu profesor publique un nuevo cuestionario o documento, lo verás aquí.
                        </p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                        {data.assignments.upcoming.slice(0, 3).map(task => (
                          <div 
                            key={task.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0.75rem 1rem',
                              borderRadius: '10px',
                              background: 'var(--surface)',
                              border: '1px solid var(--border)',
                              gap: '0.75rem',
                              flexWrap: 'wrap'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: '180px' }}>
                              <FileText size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
                              <div>
                                <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)', display: 'block' }}>
                                  {task.title}
                                </strong>
                                <span style={{ 
                                  fontSize: '0.72rem', 
                                  color: 'var(--text-muted)',
                                  background: 'var(--surface-alt)',
                                  padding: '0.1rem 0.45rem',
                                  borderRadius: '5px',
                                  display: 'inline-block',
                                  marginTop: '0.15rem'
                                }}>
                                  {task.course}
                                </span>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                              {task.deadline ? (
                                <span style={{ 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  gap: '0.3rem', 
                                  fontSize: '0.78rem',
                                  color: '#b45309',
                                  background: '#fffbeb',
                                  padding: '0.2rem 0.55rem',
                                  borderRadius: '6px',
                                  border: '1px solid #fde68a',
                                  fontWeight: 600
                                }}>
                                  <Clock size={12} /> Hasta {new Date(task.deadline).toLocaleDateString()}
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                  Sin fecha límite
                                </span>
                              )}

                              <span style={{ fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                                Entrar <ChevronRight size={14} />
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    paddingTop: '0.85rem', 
                    borderTop: '1px solid rgba(130, 194, 142, 0.25)', 
                    marginTop: '1rem' 
                  }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {data.assignments.pendingCount > 0 ? 'Haz clic para ver las instrucciones y entregar' : 'Tu trabajo está al día'}
                    </span>
                    <span style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '0.25rem', 
                      color: 'var(--primary)', 
                      fontWeight: 700, 
                      fontSize: '0.86rem' 
                    }}>
                      Ir a Trabajo de Clase <ArrowRight size={14} />
                    </span>
                  </div>
                </div>

                {/* Tarjeta 2: Calificaciones y Rendimiento (Bento Col 5) */}
                <div 
                  className="bento-col-5 dashboard-card dashboard-card--purple dashboard-card--interactive"
                  onClick={() => navigate('/student/grades')}
                  style={{ justifyContent: 'space-between', minHeight: '260px' }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div style={{ 
                          width: '42px', 
                          height: '42px', 
                          borderRadius: '10px', 
                          background: '#ffffff', 
                          border: '1px solid #e9d5ff', 
                          color: '#7c3aed', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          boxShadow: 'var(--shadow-sm)'
                        }}>
                          <Award size={22} />
                        </div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>
                            Mis Notas & Progreso
                          </h3>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            Evaluación continua
                          </span>
                        </div>
                      </div>

                      {overallAverage && (
                        <span className="dashboard-stat-badge" style={{ background: '#f3e8ff', color: '#6b21a8', border: '1px solid #e9d5ff' }}>
                          ⭐ {overallAverage} / 10
                        </span>
                      )}
                    </div>

                    {data.grades.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '1.75rem 1rem', color: 'var(--text-muted)' }}>
                        <p style={{ margin: 0, fontSize: '0.88rem' }}>Aún no se han publicado calificaciones oficiales.</p>
                        <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem' }}>Las notas de exámenes y ejercicios aparecerán aquí.</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {data.grades.map(g => {
                          const percentage = Math.min(Math.max((g.average / 10) * 100, 0), 100);
                          return (
                            <div key={g.courseTitle} style={{ background: '#ffffff', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #f3e8ff' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                                <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                  {g.courseTitle}
                                </span>
                                <strong style={{ fontSize: '0.88rem', color: 'var(--primary-text)' }}>
                                  {g.average.toFixed(1)} <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>/ 10</span>
                                </strong>
                              </div>
                              <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                                <div style={{ 
                                  width: `${percentage}%`, 
                                  height: '100%', 
                                  background: 'linear-gradient(90deg, var(--primary) 0%, var(--primary-pastel) 100%)',
                                  borderRadius: '999px',
                                  transition: 'width 0.4s ease'
                                }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    paddingTop: '0.85rem', 
                    borderTop: '1px solid rgba(233, 213, 255, 0.6)', 
                    marginTop: '1rem' 
                  }}>
                    <span style={{ fontSize: '0.82rem', color: '#6b21a8', fontWeight: 600 }}>
                      Ver desglose por competencias
                    </span>
                    <span style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '0.25rem', 
                      color: '#7c3aed', 
                      fontWeight: 700, 
                      fontSize: '0.86rem' 
                    }}>
                      Boletín <ArrowRight size={14} />
                    </span>
                  </div>
                </div>

                {/* Tarjeta 3: Estado de Pagos / Cuota (Bento Col 12 - Solo si no tiene tutor o es padre) */}
                {(!data.hasParent || userRole === 'PARENT') && (
                  <div 
                    className={`bento-col-12 dashboard-card ${data.payments.pendingCount > 0 ? 'dashboard-card--rose' : 'dashboard-card--primary'} dashboard-card--interactive`}
                    onClick={() => navigate('/student/payments')}
                    style={{ padding: '1.15rem 1.35rem', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                      <div style={{ 
                        width: '42px', 
                        height: '42px', 
                        borderRadius: '10px', 
                        background: '#ffffff', 
                        color: data.payments.pendingCount > 0 ? '#e11d48' : 'var(--primary)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        border: `1px solid ${data.payments.pendingCount > 0 ? '#fecdd3' : 'var(--primary-border)'}`,
                        flexShrink: 0
                      }}>
                        {data.payments.pendingCount > 0 ? <AlertTriangle size={22} /> : <CheckCircle2 size={22} />}
                      </div>
                      <div>
                        <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)', display: 'block' }}>
                          {data.payments.pendingCount > 0 
                            ? `${data.payments.pendingCount} mensualidad pendiente de abonar` 
                            : 'Cuota de academia al día ✨'}
                        </strong>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          {data.payments.pendingCount > 0
                            ? (data.payments.nextDueDate ? `Vencimiento: ${new Date(data.payments.nextDueDate).toLocaleDateString()}` : 'Revisa el centro de pagos')
                            : 'Tu matrícula está activa y puedes acceder a todas las clases y recursos.'}
                        </span>
                      </div>
                    </div>

                    <span style={{ 
                      fontSize: '0.84rem', 
                      fontWeight: 700, 
                      color: data.payments.pendingCount > 0 ? '#be123c' : 'var(--primary-text)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}>
                      Consultar recibos <ArrowRight size={14} />
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Centro de Facturación Familiar (Exclusivo Padres) */}
        {userRole === 'PARENT' && (
          <section className="glass-panel" style={{ 
            padding: '1.75rem', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1.25rem',
            background: 'linear-gradient(135deg, #ffffff 0%, #f3faf5 100%)',
            border: '1px solid var(--primary-border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ 
                width: '44px', 
                height: '44px', 
                borderRadius: '12px', 
                background: 'var(--surface)', 
                border: '1px solid var(--primary-border)', 
                color: 'var(--primary)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                boxShadow: 'var(--shadow-sm)' 
              }}>
                <Receipt size={22} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)' }}>
                  Centro de Facturación Familiar
                </h2>
                <p style={{ margin: '0.2rem 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Descarga recibos oficiales y facturas conjuntas agrupadas para todos tus hijos matriculados.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap', paddingTop: '0.5rem' }}>
              <button
                type="button"
                onClick={handleDownloadFamilyStatement}
                disabled={familyPayments.length === 0}
                className="btn-primary"
                style={{ 
                  opacity: familyPayments.length === 0 ? 0.55 : 1, 
                  cursor: familyPayments.length === 0 ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.86rem',
                  padding: '0.65rem 1.15rem'
                }}
              >
                <FileText size={16} /> Extracto Familiar Completo (PDF)
              </button>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
                <select
                  value={familyMonthKey}
                  onChange={(event) => setFamilyMonthKey(event.target.value)}
                  disabled={familyMonthOptions.length === 0}
                  aria-label="Mes de factura mensual conjunta"
                  style={{ 
                    padding: '0.65rem 0.95rem', 
                    borderRadius: '8px', 
                    border: '1px solid var(--border)', 
                    background: '#ffffff', 
                    color: 'var(--text-main)', 
                    fontWeight: 600,
                    fontSize: '0.86rem' 
                  }}
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
                  style={{ 
                    opacity: !familyMonthKey ? 0.55 : 1, 
                    cursor: !familyMonthKey ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: '0.86rem',
                    padding: '0.65rem 1.15rem'
                  }}
                >
                  <Receipt size={16} /> Factura Mensual Conjunta (PDF)
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
