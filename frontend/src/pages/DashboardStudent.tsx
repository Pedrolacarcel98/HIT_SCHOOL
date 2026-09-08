import React, { useEffect, useState } from 'react';
import { CircleDollarSign, AlertTriangle, BookOpen, Award, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

const DashboardStudent: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardStudentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

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

  const userRole = localStorage.getItem('userRole');

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
      </div>
    </div>
  );
};

export default DashboardStudent;
