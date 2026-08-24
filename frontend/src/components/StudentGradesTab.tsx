import React, { useEffect, useState } from 'react';
import { Award, FileText, CheckCircle2 } from 'lucide-react';

const StudentGradesTab: React.FC<{ courseId: string }> = ({ courseId }) => {
  const [completedAssignments, setCompletedAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const token = localStorage.getItem('token');
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const res = await fetch(`${apiUrl}/api/assignments/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const assignments = await res.json();
          // Filtrar por curso y solo las que tengan entregas
          const courseCompleted = assignments.filter((a: any) => 
            a.courseId === courseId && a.submissions && a.submissions.length > 0
          );
          setCompletedAssignments(courseCompleted);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAssignments();
  }, [courseId]);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando calificaciones...</div>;
  }

  return (
    <div className="animate-fade-in" style={{ padding: '2rem 1.5rem', maxWidth: '900px', margin: '0 auto' }}>
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ background: 'var(--primary-light)', padding: '0.75rem', borderRadius: '12px', color: 'var(--primary)' }}>
            <Award size={24} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-main)' }}>Calificaciones</h2>
            <p style={{ margin: '0.2rem 0 0', color: 'var(--text-muted)' }}>Registro de tus tareas completadas y resultados</p>
          </div>
        </div>
        
        {completedAssignments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <Award size={48} style={{ color: 'var(--border)', marginBottom: '1rem', opacity: 0.5 }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Aún no has completado ninguna tarea en esta clase.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {completedAssignments.map(assignment => {
              const submission = assignment.submissions[0];
              const isTest = assignment.material?.type === 'FORM';
              const grade = submission.grade;
              
              return (
                <div key={assignment.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem', border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--surface-alt)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ color: 'var(--primary)', padding: '0.5rem', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <FileText size={20} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>{assignment.title}</h3>
                      <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Entregado el {new Date(submission.submittedAt).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {isTest ? (
                      <div style={{ background: grade >= 5 ? '#eefcf1' : '#fceeee', color: grade >= 5 ? '#118d3c' : '#d22d2d', padding: '0.5rem 1rem', borderRadius: '20px', fontWeight: 'bold', fontSize: '1.1rem', border: `1px solid ${grade >= 5 ? '#cbf2d8' : '#f5c6c6'}` }}>
                        {grade !== null && grade !== undefined ? `${grade.toFixed(1)} / 10` : '- / 10'}
                      </div>
                    ) : (
                      <div style={{ background: 'var(--primary-light)', color: 'var(--primary-text)', padding: '0.5rem 1rem', borderRadius: '20px', fontWeight: 'bold', fontSize: '1rem', border: '1px solid var(--primary-border)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <CheckCircle2 size={16} /> Entregado (-/10)
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentGradesTab;
