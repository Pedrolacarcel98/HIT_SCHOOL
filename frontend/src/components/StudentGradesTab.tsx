import React, { useEffect, useState } from 'react';
import { Award, FileText, CheckCircle2, Clock3, ExternalLink, MessageSquare, X } from 'lucide-react';
import ExamReviewModal from './ExamReviewModal';

interface ParsedExamData {
  answers: Record<string, string | number>;
  score?: number | null;
  total?: number | null;
}

const parseSavedExam = (content?: string | null): ParsedExamData | null => {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content);
    if (parsed.answers || typeof parsed.score === 'number') {
      return {
        answers: parsed.answers || {},
        score: typeof parsed.score === 'number' ? parsed.score : null,
        total: typeof parsed.total === 'number' ? parsed.total : null
      };
    }
    return null;
  } catch {
    return null;
  }
};

const StudentGradesTab: React.FC<{ courseId: string }> = ({ courseId }) => {
  const [completedAssignments, setCompletedAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingFeedback, setViewingFeedback] = useState<{ title: string; feedback: string } | null>(null);
  const [reviewingExam, setReviewingExam] = useState<{ title: string; questions?: any[]; answers: Record<string, any>; score: number | null; total?: number | null } | null>(null);

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
    <div className="animate-fade-in" style={{ padding: '2rem 1.5rem', maxWidth: '950px', margin: '0 auto' }}>
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ background: 'var(--primary-light)', padding: '0.75rem', borderRadius: '12px', color: 'var(--primary)' }}>
            <Award size={24} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-main)' }}>Calificaciones</h2>
            <p style={{ margin: '0.2rem 0 0', color: 'var(--text-muted)' }}>Registro de tus tareas completadas, notas y feedback del profesor</p>
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
              const examData = parseSavedExam(submission?.content);
              const isTest = assignment.material?.type === 'FORM' || Boolean(examData);
              const hasGrade = submission.grade !== null && submission.grade !== undefined;
              const grade = submission.grade;
              const feedback = submission.feedback;
              const submittedDocumentUrl = typeof submission.content === 'string' && /^https?:\/\//i.test(submission.content)
                ? submission.content
                : '';
              const linkedMaterialUrl = assignment.material?.url || '';
              const documentUrl = submittedDocumentUrl || linkedMaterialUrl;
              
              return (
                <div key={assignment.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem', border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--surface-alt)', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: '220px' }}>
                    <div style={{ color: 'var(--primary)', padding: '0.5rem', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <FileText size={20} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-main)' }}>{assignment.title}</h3>
                      <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        Entregado el {new Date(submission.submittedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        {examData && examData.total !== null && examData.score !== null && (
                          <span style={{ marginLeft: '6px', fontWeight: 600, color: 'var(--primary)' }}>
                            · {examData.score} / {examData.total} aciertos
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {feedback && (
                      <button
                        type="button"
                        onClick={() => setViewingFeedback({ title: assignment.title, feedback })}
                        className="btn-secondary"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.45rem 0.8rem',
                          fontSize: '0.82rem',
                          borderRadius: '8px'
                        }}
                      >
                        <MessageSquare size={14} style={{ color: 'var(--primary)' }} /> Feedback del profesor
                      </button>
                    )}

                    {isTest && (
                      <button
                        type="button"
                        onClick={() => setReviewingExam({
                          title: assignment.title,
                          questions: assignment.material?.formData?.questions || [],
                          answers: examData?.answers || {},
                          score: submission.grade,
                          total: examData?.total
                        })}
                        className="btn-secondary"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.45rem 0.75rem',
                          borderRadius: '8px',
                          fontSize: '0.82rem'
                        }}
                      >
                        <FileText size={14} /> Revisar Examen
                      </button>
                    )}

                    {!isTest && documentUrl && (
                      <button
                        type="button"
                        onClick={() => window.open(documentUrl, '_blank', 'noopener,noreferrer')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          border: '1px solid var(--border)',
                          background: 'var(--surface)',
                          color: 'var(--text-main)',
                          padding: '0.45rem 0.75rem',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: 500,
                          fontSize: '0.82rem'
                        }}
                      >
                        <ExternalLink size={14} /> Abrir documento
                      </button>
                    )}

                    {hasGrade ? (
                      <div style={{
                        background: grade >= 5 ? '#eaf4ef' : '#fdf0f0',
                        color: grade >= 5 ? '#24583e' : '#9e2a2b',
                        padding: '0.45rem 0.9rem',
                        borderRadius: '20px',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        border: `1px solid ${grade >= 5 ? '#bfe0d0' : '#f7caca'}`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}>
                        <CheckCircle2 size={16} /> {grade.toFixed(1)} / 10
                      </div>
                    ) : (
                      <div style={{
                        background: '#fef7e8',
                        color: '#8d5b12',
                        padding: '0.45rem 0.85rem',
                        borderRadius: '20px',
                        fontWeight: 600,
                        fontSize: '0.84rem',
                        border: '1px solid #fae0b0',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}>
                        <Clock3 size={15} /> Pendiente de corregir
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Revisión de Examen */}
      {reviewingExam && (
        <ExamReviewModal
          title={reviewingExam.title}
          questions={reviewingExam.questions}
          answers={reviewingExam.answers}
          score={reviewingExam.score}
          total={reviewingExam.total}
          onClose={() => setReviewingExam(null)}
        />
      )}

      {/* Modal: Comentarios del Profesor */}
      {viewingFeedback && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 90,
          padding: '1rem'
        }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '520px', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase' }}>
                  FEEDBACK DEL PROFESOR
                </span>
                <h3 style={{ margin: '0.2rem 0 0', fontSize: '1.15rem', color: 'var(--text-main)' }}>
                  {viewingFeedback.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingFeedback(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ background: 'var(--surface-alt)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border)', color: 'var(--text-main)', fontSize: '0.92rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
              {viewingFeedback.feedback}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button type="button" onClick={() => setViewingFeedback(null)} className="btn-secondary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.88rem' }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentGradesTab;

