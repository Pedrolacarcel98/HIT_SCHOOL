import React, { useEffect, useState } from 'react';
import { Award, CheckCircle2 } from 'lucide-react';

const GradesTab: React.FC<{ courseId: string }> = ({ courseId }) => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeacherAssignments = async () => {
      try {
        const token = localStorage.getItem('token');
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const res = await fetch(`${apiUrl}/api/assignments/teacher`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const allAssignments = await res.json();
          // Filtrar por curso y solo las que tengan entregas
          const courseAssignments = allAssignments.filter((a: any) => 
            a.courseId === courseId && a.submissions && a.submissions.length > 0
          );
          setAssignments(courseAssignments);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTeacherAssignments();
  }, [courseId]);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando calificaciones...</div>;
  }

  // Extraer todas las entregas aplanadas para mostrarlas
  const allSubmissions = assignments.flatMap(assignment => 
    assignment.submissions.map((sub: any) => ({
      ...sub,
      assignmentTitle: assignment.title,
      isTest: assignment.material?.type === 'FORM',
      studentName: sub.student?.profile ? `${sub.student.profile.firstName} ${sub.student.profile.lastName}` : sub.student?.email
    }))
  ).sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  return (
    <div className="animate-fade-in" style={{ padding: '2rem 1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ background: 'var(--primary-light)', padding: '0.75rem', borderRadius: '12px', color: 'var(--primary)' }}>
            <Award size={24} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-main)' }}>Calificaciones de la clase</h2>
            <p style={{ margin: '0.2rem 0 0', color: 'var(--text-muted)' }}>Entregas y resultados de todos los alumnos</p>
          </div>
        </div>
        
        {allSubmissions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <Award size={48} style={{ color: 'var(--border)', marginBottom: '1rem', opacity: 0.5 }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Aún no hay tareas entregadas en esta clase.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '1rem', fontWeight: 600 }}>Alumno</th>
                  <th style={{ padding: '1rem', fontWeight: 600 }}>Tarea</th>
                  <th style={{ padding: '1rem', fontWeight: 600 }}>Fecha de entrega</th>
                  <th style={{ padding: '1rem', fontWeight: 600, textAlign: 'right' }}>Calificación</th>
                </tr>
              </thead>
              <tbody>
                {allSubmissions.map(sub => (
                  <tr key={sub.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem', fontWeight: 500 }}>{sub.studentName}</td>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{sub.assignmentTitle}</td>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      {new Date(sub.submittedAt).toLocaleDateString('es-ES')}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      {sub.isTest ? (
                        <span style={{ 
                          display: 'inline-block',
                          background: sub.grade >= 5 ? '#eefcf1' : '#fceeee', 
                          color: sub.grade >= 5 ? '#118d3c' : '#d22d2d', 
                          padding: '0.35rem 0.85rem', 
                          borderRadius: '20px', 
                          fontWeight: 'bold', 
                          fontSize: '0.95rem',
                          border: `1px solid ${sub.grade >= 5 ? '#cbf2d8' : '#f5c6c6'}` 
                        }}>
                          {sub.grade !== null && sub.grade !== undefined ? `${sub.grade.toFixed(1)} / 10` : '- / 10'}
                        </span>
                      ) : (
                        <span style={{ 
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          background: 'var(--primary-light)', 
                          color: 'var(--primary-text)', 
                          padding: '0.35rem 0.85rem', 
                          borderRadius: '20px', 
                          fontWeight: 'bold', 
                          fontSize: '0.9rem',
                          border: '1px solid var(--primary-border)' 
                        }}>
                          <CheckCircle2 size={14} /> Entregado (-/10)
                        </span>
                      )}
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

export default GradesTab;
