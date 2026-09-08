import React, { useEffect, useState } from 'react';
import { Users, BookOpen, AlertTriangle, CheckSquare, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DashboardTeacherData {
  activeStudents: number;
  activeCourses: number;
  unscoredSubmissions: number;
  overduePayments: number;
  latestSubmissions: {
    id: string;
    taskId: string;
    studentName: string;
    taskTitle: string;
    courseTitle: string;
    submittedAt: string;
  }[];
}

const DashboardTeacher: React.FC = () => {
  const [data, setData] = useState<DashboardTeacherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const res = await fetch(`${apiUrl}/api/dashboard/teacher`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!res.ok) {
          throw new Error('Error al obtener el dashboard');
        }
        const json = await res.json();
        setData(json);
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

  if (error || !data) {
    return (
      <div className="page-container">
        <div style={{ padding: '1rem', background: '#fdf0f0', border: '1px solid #f7caca', color: '#9e2a2b', borderRadius: '8px' }}>
          {error || 'Error al cargar el resumen.'}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container animate-fade-in">
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--text-main)' }}>Inicio</h1>
        <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)' }}>Resumen general de tu actividad en HitSchool.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }} onClick={() => navigate('/teacher/enrollments')}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={24} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Alumnos Activos</p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{data.activeStudents}</p>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }} onClick={() => navigate('/teacher/courses')}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={24} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Cursos</p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{data.activeCourses}</p>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }} onClick={() => navigate('/teacher/grades')}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckSquare size={24} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Pendientes Calificar</p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{data.unscoredSubmissions}</p>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }} onClick={() => navigate('/teacher/payments')}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Avisos Impago</p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{data.overduePayments}</p>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
          <Clock size={20} color="var(--primary)" /> Últimas Entregas (Sin Nota)
        </h2>

        {data.latestSubmissions.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>No hay tareas pendientes de calificar.</p>
        ) : (
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>ALUMNO</th>
                  <th style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>TAREA</th>
                  <th style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>CURSO</th>
                  <th style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>FECHA ENT.</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}></th>
                </tr>
              </thead>
              <tbody>
                {data.latestSubmissions.map(sub => (
                  <tr key={sub.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem 0.75rem', fontWeight: 500, color: 'var(--text-main)' }}>{sub.studentName}</td>
                    <td style={{ padding: '1rem 0.75rem', color: 'var(--text-main)' }}>{sub.taskTitle}</td>
                    <td style={{ padding: '1rem 0.75rem', color: 'var(--text-muted)' }}>{sub.courseTitle}</td>
                    <td style={{ padding: '1rem 0.75rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      {new Date(sub.submittedAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '1rem 0.75rem', textAlign: 'right' }}>
                      <button
                        onClick={() => navigate('/teacher/grades')}
                        style={{
                          background: 'var(--primary)',
                          color: '#fff',
                          border: 'none',
                          padding: '0.4rem 0.75rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.85rem'
                        }}
                      >
                        Calificar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardTeacher;
