import React, { useEffect, useState } from 'react';
import { 
  Users, 
  BookOpen, 
  AlertTriangle, 
  CheckSquare, 
  Clock, 
  ArrowRight, 
  FolderPlus, 
  GraduationCap, 
  MessageSquare,
  CheckCircle2,
  FileText,
  Calendar,
  FolderArchive,
  CircleDollarSign
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DashboardTeacherData {
  activeStudents: number;
  activeCourses: number;
  unscoredSubmissions: number;
  overduePayments: number;
  activeMaterials?: number;
  latestSubmissions: {
    id: string;
    taskId: string;
    studentName: string;
    taskTitle: string;
    courseTitle: string;
    submittedAt: string;
  }[];
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

const DashboardTeacher: React.FC = () => {
  const [data, setData] = useState<DashboardTeacherData | null>(null);
  const [accountName, setAccountName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const headers = { Authorization: `Bearer ${token}` };
        const [res, profileRes] = await Promise.all([
          fetch(`${apiUrl}/api/dashboard/teacher`, { headers }),
          fetch(`${apiUrl}/api/auth/me`, { headers })
        ]);
        
        if (!res.ok) {
          throw new Error('Error al obtener el dashboard');
        }
        const json = await res.json();
        setData(json);
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

  const userRole = localStorage.getItem('userRole');
  const isAdmin = userRole === 'ADMIN';

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

  if (error || !data) {
    return (
      <div className="page-container">
        <div style={{ padding: '1.25rem', background: '#fdf0f0', border: '1px solid #f7caca', color: '#9e2a2b', borderRadius: '12px' }}>
          {error || 'Error al cargar el resumen.'}
        </div>
      </div>
    );
  }

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
            {isAdmin
              ? (data.unscoredSubmissions > 0
                  ? `Hay ${data.unscoredSubmissions} ${data.unscoredSubmissions === 1 ? 'entrega pendiente de revisión en la academia.' : 'entregas pendientes de revisión en la academia.'}`
                  : 'Todas las entregas y tareas de la academia están al día.')
              : (data.unscoredSubmissions > 0
                  ? `Tienes ${data.unscoredSubmissions} ${data.unscoredSubmissions === 1 ? 'tarea esperando tu corrección y feedback.' : 'tareas esperando tu corrección y feedback.'}`
                  : 'Todo el trabajo de tus alumnos está al día. ¡Excelente labor docente!')
            }
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.35rem', 
            padding: '0.35rem 0.85rem', 
            borderRadius: '999px', 
            fontSize: '0.82rem', 
            fontWeight: 700,
            background: isAdmin ? '#fef3c7' : 'var(--primary-light)',
            color: isAdmin ? '#b45309' : 'var(--primary-text)',
            border: `1px solid ${isAdmin ? '#fde68a' : 'var(--primary-border)'}`
          }}>
            {isAdmin ? 'Admin' : 'Profesor'}
          </span>

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

      {/* Atajos Rápidos */}
      <section className="dashboard-quick-actions" aria-label="Accesos directos">
        <button 
          onClick={() => navigate('/teacher/courses')} 
          className="quick-action-pill"
          type="button"
        >
          <BookOpen size={15} color="var(--primary)" /> Mis Clases
        </button>

        {!isAdmin && (
          <button 
            onClick={() => navigate('/teacher/grades')} 
            className="quick-action-pill"
            type="button"
          >
            <CheckSquare size={15} color="#7c3aed" /> Calificaciones
          </button>
        )}

        <button 
          onClick={() => navigate('/teacher/materials')} 
          className="quick-action-pill"
          type="button"
        >
          <FolderPlus size={15} color="#0284c7" /> Subir Material
        </button>

        <button 
          onClick={() => navigate('/teacher/students')} 
          className="quick-action-pill"
          type="button"
        >
          <GraduationCap size={15} color="var(--primary)" /> Fichas Alumnos
        </button>

        {isAdmin && (
          <button 
            onClick={() => navigate('/teacher/payments')} 
            className="quick-action-pill"
            type="button"
          >
            <CircleDollarSign size={15} color="#e11d48" /> Control Pagos
          </button>
        )}

        <button 
          onClick={() => navigate('/teacher/chat')} 
          className="quick-action-pill"
          type="button"
        >
          <MessageSquare size={15} color={isAdmin ? 'var(--primary)' : '#0f766e'} /> Mensajes
        </button>
      </section>

      {/* Bento Grid Principal */}
      <div className="dashboard-bento">
        {/* Tarjeta Hero: Tareas Pendientes de Calificar (Doble ancho / Columna 6) */}
        <div 
          className="bento-col-6 dashboard-card dashboard-card--primary dashboard-card--interactive"
          onClick={() => navigate('/teacher/grades')}
          style={{ justifyContent: 'space-between', minHeight: '220px' }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div style={{ 
                width: '46px', 
                height: '46px', 
                borderRadius: '12px', 
                background: 'var(--surface)', 
                border: '1px solid var(--primary-border)',
                color: 'var(--primary)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <CheckSquare size={24} />
              </div>
            </div>

            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              {isAdmin ? 'Entregas por Calificar (Academia)' : 'Entregas por Calificar'}
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', marginTop: '0.2rem' }}>
              <span style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'Quicksand, sans-serif' }}>
                {data.unscoredSubmissions}
              </span>
              <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                {data.unscoredSubmissions === 1 ? 'tarea pendiente' : 'tareas pendientes'}
              </span>
            </div>
          </div>

          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            paddingTop: '1rem', 
            borderTop: '1px solid rgba(130, 194, 142, 0.25)', 
            marginTop: '1rem' 
          }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--primary-text)', fontWeight: 600 }}>
              {data.unscoredSubmissions > 0
                ? (isAdmin ? 'Supervisar revisiones y notas docentes' : 'Revisar y enviar feedback a los alumnos')
                : (isAdmin ? 'Bandeja de corrección de la academia al día' : 'Bandeja de corrección al día')}
            </span>
            <span style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.25rem', 
              color: 'var(--primary)', 
              fontWeight: 700, 
              fontSize: '0.88rem' 
            }}>
              Ir a Calificar <ArrowRight size={15} />
            </span>
          </div>
        </div>

        {/* Sub-grid de métricas compactas (Columna 6) */}
        <div className="bento-col-6" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1.25rem' }}>
            {/* Alumnos Activos */}
            <div 
              className="dashboard-card dashboard-card--sky dashboard-card--interactive"
              onClick={() => navigate('/teacher/students')}
              style={{ padding: '1.25rem' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#ffffff', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #bae6fd' }}>
                  <Users size={20} />
                </div>
                <span style={{ fontSize: '0.74rem', color: '#0369a1', fontWeight: 700, textTransform: 'uppercase' }}>Alumnos</span>
              </div>
              <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'Quicksand, sans-serif' }}>
                {data.activeStudents}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                {isAdmin ? 'Matriculados en academia' : 'Alumnos en tus aulas'}
              </span>
            </div>

            {/* Cursos Activos */}
            <div 
              className="dashboard-card dashboard-card--purple dashboard-card--interactive"
              onClick={() => navigate('/teacher/courses')}
              style={{ padding: '1.25rem' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#ffffff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e9d5ff' }}>
                  <BookOpen size={20} />
                </div>
                <span style={{ fontSize: '0.74rem', color: '#6b21a8', fontWeight: 700, textTransform: 'uppercase' }}>Aulas</span>
              </div>
              <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'Quicksand, sans-serif' }}>
                {data.activeCourses}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                {isAdmin ? 'Cursos en la academia' : 'Tus cursos impartidos'}
              </span>
            </div>
          </div>

          {/* Card Condicional: Control de Pagos para ADMIN vs Biblioteca de Material Didáctico para TEACHER */}
          {isAdmin ? (
            <div 
              className={`dashboard-card ${data.overduePayments > 0 ? 'dashboard-card--rose' : 'dashboard-card--primary'} dashboard-card--interactive`}
              onClick={() => navigate('/teacher/payments')}
              style={{ padding: '1.15rem 1.35rem', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '10px', 
                  background: '#ffffff', 
                  color: data.overduePayments > 0 ? '#e11d48' : 'var(--primary)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  border: `1px solid ${data.overduePayments > 0 ? '#fecdd3' : 'var(--primary-border)'}`,
                  flexShrink: 0
                }}>
                  {data.overduePayments > 0 ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {data.overduePayments > 0 ? `${data.overduePayments} avisos de impago` : 'Mensualidades al día'}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {data.overduePayments > 0 ? 'Recibos pendientes de regularizar' : 'Sin incidencias de cobro registradas'}
                  </p>
                </div>
              </div>

              <span style={{ 
                fontSize: '0.82rem', 
                fontWeight: 700, 
                color: data.overduePayments > 0 ? '#be123c' : 'var(--primary-text)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.2rem'
              }}>
                Ver pagos <ArrowRight size={14} />
              </span>
            </div>
          ) : (
            <div 
              className="dashboard-card dashboard-card--amber dashboard-card--interactive"
              onClick={() => navigate('/teacher/materials')}
              style={{ padding: '1.15rem 1.35rem', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '10px', 
                  background: '#ffffff', 
                  color: '#d97706', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  border: '1px solid #fde68a',
                  flexShrink: 0
                }}>
                  <FolderArchive size={20} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Biblioteca de Material Didáctico
                  </p>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {typeof data.activeMaterials === 'number' && data.activeMaterials > 0
                      ? `${data.activeMaterials} recursos y cuestionarios disponibles`
                      : 'Gestionar recursos didácticos y exámenes'}
                  </p>
                </div>
              </div>

              <span style={{ 
                fontSize: '0.82rem', 
                fontWeight: 700, 
                color: '#b45309',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.2rem'
              }}>
                Ver materiales <ArrowRight size={14} />
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Centro de Entregas Recientes (Feed Enriquecido) */}
      <section className="glass-panel" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ 
              width: '36px', 
              height: '36px', 
              borderRadius: '9px', 
              background: 'var(--primary-light)', 
              color: 'var(--primary)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <Clock size={19} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)' }}>
                {isAdmin ? 'Últimas Entregas de Alumnos (Academia)' : 'Últimas Entregas de Alumnos'}
              </h2>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {isAdmin
                  ? 'Trabajos y respuestas de la academia pendientes de revisión y nota'
                  : 'Trabajos y respuestas de tus clases pendientes de revisión y nota'}
              </p>
            </div>
          </div>

          {data.latestSubmissions.length > 0 && (
            <span style={{ 
              padding: '0.3rem 0.75rem', 
              borderRadius: '999px', 
              background: 'var(--surface-alt)', 
              border: '1px solid var(--border)', 
              fontSize: '0.8rem', 
              fontWeight: 700, 
              color: 'var(--text-muted)' 
            }}>
              {data.latestSubmissions.length} pendientes
            </span>
          )}
        </div>

        {data.latestSubmissions.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '3rem 1.5rem', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            gap: '0.75rem' 
          }}>
            <div style={{ 
              width: '54px', 
              height: '54px', 
              borderRadius: '50%', 
              background: 'var(--primary-light)', 
              color: 'var(--primary)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <CheckCircle2 size={26} />
            </div>
            <strong style={{ fontSize: '1.05rem', color: 'var(--text-main)' }}>
              ¡Todo corregido! No hay tareas pendientes
            </strong>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0, maxWidth: '420px' }}>
              {isAdmin
                ? 'No hay tareas pendientes de calificar en la academia. Todo el claustro docente está al día.'
                : 'Los alumnos de tus clases no tienen trabajos sin calificar. Cuando entreguen un examen o redacción, aparecerá aquí al instante.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {data.latestSubmissions.map(sub => {
              const avatar = getAvatarStyle(sub.studentName);
              const initials = getInitials(sub.studentName);
              const formattedDate = new Date(sub.submittedAt).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div 
                  key={sub.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.9rem 1.15rem',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    gap: '1rem',
                    flexWrap: 'wrap',
                    transition: 'all 0.2s ease'
                  }}
                  className="dashboard-card--interactive"
                  onClick={() => navigate(`/teacher/grades?student=${encodeURIComponent(sub.studentName)}`)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: '220px' }}>
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
                      fontSize: '0.88rem',
                      flexShrink: 0
                    }}>
                      {initials}
                    </div>

                    <div>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)', display: 'block' }}>
                        {sub.studentName}
                      </strong>
                      <span style={{ 
                        display: 'inline-block',
                        fontSize: '0.76rem', 
                        color: 'var(--text-muted)',
                        background: 'var(--surface-alt)',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '6px',
                        marginTop: '0.2rem',
                        border: '1px solid var(--border-light)'
                      }}>
                        {sub.courseTitle}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '200px' }}>
                    <FileText size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '0.92rem', color: 'var(--text-main)', fontWeight: 600 }}>
                      {sub.taskTitle}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      <Clock size={14} />
                      {formattedDate}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/teacher/grades?student=${encodeURIComponent(sub.studentName)}`);
                      }}
                      className="btn-primary"
                      style={{
                        padding: '0.45rem 0.95rem',
                        fontSize: '0.84rem',
                        borderRadius: '8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      Calificar <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default DashboardTeacher;
