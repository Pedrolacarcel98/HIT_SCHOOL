import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CalendarDays, CheckCircle2, Clock3, FileText, ListChecks, X } from 'lucide-react';
import FormPlayer from '../components/FormPlayer';
import ExamReviewModal from '../components/ExamReviewModal';
import { useParent } from '../context/ParentContext';
import type { ReviewQuestion } from '../components/ExamReviewModal';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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

const parseSavedAnswers = (content?: string | null): Record<string, string | number> => {
  const parsed = parseSavedExam(content);
  return parsed ? parsed.answers : {};
};

interface Course {
  id: string;
  title: string;
  teacherId: string;
  createdAt: string;
}

interface IndividualContent {
  id: string;
  title: string;
  description?: string;
  category?: string;
  dueDate?: string;
  material?: { id?: string; title: string; type: string; level?: string; description?: string; url?: string; formData?: { questions?: unknown[] } } | null;
  submissions?: { grade?: number | null; content?: string | null }[];
}

interface AssignedMaterial {
  id: string;
  deadline?: string | null;
  material: { id: string; title: string; type: string; level?: string; description?: string | null; url?: string | null; formData?: { questions?: unknown[] } | null };
}

interface StructuredTaskStep {
  id: string;
  order: number;
  title: string;
  isCompleted: boolean;
  material?: { id: string; title: string; type: string; url?: string | null; description?: string | null; formData?: { questions?: unknown[] } | null } | null;
  submission?: { id: string; content: string | null; grade: number | null; feedback: string | null; submittedAt: string } | null;
}

interface StructuredTask {
  id: string;
  title: string;
  isSequential: boolean;
  steps: StructuredTaskStep[];
}

const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [individualContent, setIndividualContent] = useState<IndividualContent[]>([]);
  const [assignedMaterials, setAssignedMaterials] = useState<AssignedMaterial[]>([]);
  const [structuredTasks, setStructuredTasks] = useState<StructuredTask[]>([]);
  const [viewingContent, setViewingContent] = useState<IndividualContent | null>(null);
  const [viewingMaterialAssignment, setViewingMaterialAssignment] = useState<AssignedMaterial | null>(null);
  const [reviewingContent, setReviewingContent] = useState<IndividualContent | null>(null);
  const [viewingStructuredForm, setViewingStructuredForm] = useState<{ stepId: string; material: NonNullable<StructuredTaskStep['material']> } | null>(null);
  const [reviewingStructuredForm, setReviewingStructuredForm] = useState<{ title: string; material: NonNullable<StructuredTaskStep['material']>; submission: NonNullable<StructuredTaskStep['submission']> } | null>(null);
  const [viewingStructuredUpload, setViewingStructuredUpload] = useState<{ stepId: string; title: string } | null>(null);
  const [uploadUrl, setUploadUrl] = useState('');
  const { selectedStudent, selectedStudentId } = useParent();
  const userRole = localStorage.getItem('userRole');

  const activeStudentName = selectedStudent?.profile?.firstName || 'Alumno';

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('userRole');
    if (!token || (role !== 'STUDENT' && role !== 'PARENT')) {
      navigate('/');
    }
  }, [navigate]);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const studentParam = selectedStudentId ? `?studentId=${selectedStudentId}` : '';
        const res = await fetch(`${apiUrl}/api/courses${studentParam}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) setCourses(await res.json());
        const assignmentsResponse = await fetch(`${apiUrl}/api/assignments/me${studentParam}`, { headers: { Authorization: `Bearer ${token}` } });
        if (assignmentsResponse.ok) {
          const assignments = await assignmentsResponse.json();
          setIndividualContent(assignments.filter((assignment: IndividualContent & { courseId?: string }) => !assignment.courseId));
        }
        const materialsResponse = await fetch(`${apiUrl}/api/materials/assigned-to-me${studentParam}`, { headers: { Authorization: `Bearer ${token}` } });
        if (materialsResponse.ok) setAssignedMaterials(await materialsResponse.json());
        const structuredTasksResponse = await fetch(`${apiUrl}/api/structured-tasks/me${studentParam}`, { headers: { Authorization: `Bearer ${token}` } });
        if (structuredTasksResponse.ok) setStructuredTasks(await structuredTasksResponse.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, [selectedStudentId]);

  const handleExamFinish = async (score: number, total: number, answers: { [key: string]: any }) => {
    if (!viewingContent && !viewingMaterialAssignment) return;
    try {
      const isMaterialAssignment = Boolean(viewingMaterialAssignment);
      const targetId = viewingContent?.id || viewingMaterialAssignment?.id;
      const response = await fetch(`${apiUrl}${isMaterialAssignment ? `/api/materials/assignments/${targetId}/submit` : `/api/assignments/${targetId}/submit`}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ content: JSON.stringify({ answers, score, total }), grade: total ? (score / total) * 10 : 0 })
      });
      if (response.ok) { setViewingContent(null); setViewingMaterialAssignment(null); }
    } catch (error) {
      console.error('Error al entregar el examen:', error);
    }
  };

  const openAssignedMaterial = (content: IndividualContent) => {
    if (content.material?.type === 'FORM') {
      if (content.submissions?.length) setReviewingContent(content);
      else setViewingContent(content);
    }
    else if (content.material?.url) window.open(content.material.url, '_blank', 'noopener,noreferrer');
  };

  const openMaterialAssignment = (assignment: AssignedMaterial) => {
    if (assignment.material.type === 'FORM') setViewingMaterialAssignment(assignment);
    else if (assignment.material.url) window.open(assignment.material.url, '_blank', 'noopener,noreferrer');
  };

  const completeStructuredStep = async (stepId: string, submissionContent?: string) => {
    if (userRole !== 'STUDENT') return;
    const body = submissionContent ? { submissionContent } : {};
    const response = await fetch(`${apiUrl}/api/structured-tasks/steps/${stepId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify(body)
    });
    if (response.ok) {
      setStructuredTasks((tasks) => tasks.map((task) => ({
        ...task,
        steps: task.steps.map((step) => step.id === stepId ? { ...step, isCompleted: true } : step)
      })));
      setViewingStructuredUpload(null);
    }
  };

  const openStructuredStep = async (step: StructuredTaskStep) => {
    if (step.material?.type === 'FORM') {
      if (step.isCompleted && step.submission) {
        setReviewingStructuredForm({ title: step.material.title, material: step.material, submission: step.submission });
        return;
      }
      setViewingStructuredForm({ stepId: step.id, material: step.material });
      return;
    }
    if (step.material?.url) window.open(step.material.url, '_blank', 'noopener,noreferrer');
  };

  const assignedMaterialIds = new Set(individualContent.map(content => content.material?.id).filter(Boolean));

  return (
    <div className="page-container animate-fade-in">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <BookOpen style={{ color: 'var(--primary)' }} /> Mis Clases
          </h1>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--text-muted)' }}>
            {userRole === 'PARENT' ? `Clases matriculadas de ${activeStudentName}` : 'Aquí verás todas las clases en las que estás matriculado.'}
          </p>
        </div>
      </header>

      {loading ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
          Cargando tus clases...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '1.25rem' }}>
          {courses.map(course => (
            <div 
              key={course.id} 
              className="glass-panel" 
              style={{ cursor: 'pointer', transition: 'all 0.2s ease', padding: '1.5rem', border: '1px solid var(--border)' }}
              onClick={() => navigate(`/student/course/${course.id}`)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = 'var(--primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ background: 'var(--primary)', padding: '0.75rem', borderRadius: '12px', color: 'white' }}>
                  <BookOpen size={24} />
                </div>
                <h3 style={{ margin: 0, color: 'var(--text)', fontSize: '1.2rem' }}>{course.title}</h3>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>Haz clic para ver el material, tareas y calificaciones →</p>
            </div>
          ))}
          {courses.length === 0 && (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem', gridColumn: '1 / -1' }}>
              <BookOpen size={40} style={{ color: 'var(--primary)', opacity: 0.5, marginBottom: '1rem' }} />
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                {userRole === 'PARENT' ? `Aún no hay clases matriculadas para ${activeStudentName}.` : 'Aún no estás matriculado en ninguna clase.'}
              </p>
            </div>
          )}
        </div>
      )}

      {structuredTasks.length > 0 && (
        <section style={{ marginTop: '2.5rem' }}>
          <h2 style={{ margin: '0 0 1rem', fontSize: '1.35rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-main)' }}>
            <ListChecks style={{ color: 'var(--primary)' }} /> Tareas Estructuradas
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {structuredTasks.map((task) => {
              const completedCount = task.steps.filter((step) => step.isCompleted).length;
              const progress = task.steps.length ? Math.round((completedCount / task.steps.length) * 100) : 0;
              return (
                <article key={task.id} className="glass-panel" style={{ padding: '1.25rem', border: '1px solid var(--primary-border)' }}>
                  <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>{task.title}</h3>
                      <span style={{ display: 'block', marginTop: '0.3rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>{completedCount} de {task.steps.length} pasos completados - {progress}%</span>
                    </div>
                    <div style={{ width: 'min(180px, 100%)', height: '8px', borderRadius: '999px', overflow: 'hidden', background: 'var(--surface-alt)', border: '1px solid var(--border)' }}>
                      <div style={{ width: `${progress}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.2s ease' }} />
                    </div>
                  </header>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {(() => {
                      let firstIncompleteFound = false;
                      return task.steps.map((step) => {
                        const isBlocked = task.isSequential && firstIncompleteFound;
                        if (!step.isCompleted) firstIncompleteFound = true;
                        
                        const materialAction = step.material?.type === 'FORM'
                          ? (step.isCompleted ? 'Ver Examen Corregido' : 'Realizar Test')
                          : step.material?.type === 'VIDEO' ? 'Ver Vídeo' : step.material?.type === 'DOCUMENT' ? 'Ver Documento' : step.material ? 'Abrir Material' : 'Ver Paso';

                        return (
                          <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface-alt)', opacity: isBlocked ? 0.6 : 1, pointerEvents: isBlocked ? 'none' : 'auto' }}>
                            <input 
                              type="checkbox" 
                              checked={step.isCompleted} 
                              disabled={isBlocked || step.isCompleted}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  if (step.material?.type === 'VIDEO' || !step.material) {
                                    completeStructuredStep(step.id);
                                  } else if (step.material?.type === 'DOCUMENT') {
                                    setViewingStructuredUpload({ stepId: step.id, title: step.title });
                                    setUploadUrl('');
                                  } else if (step.material?.type === 'FORM') {
                                    if (!step.isCompleted) setViewingStructuredForm({ stepId: step.id, material: step.material });
                                  }
                                }
                              }}
                              style={{ width: '22px', height: '22px', cursor: (isBlocked || step.isCompleted) ? 'default' : 'pointer', accentColor: 'var(--primary)' }}
                            />
                            
                            <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                                <span style={{ textDecoration: step.isCompleted ? 'line-through' : 'none', color: step.isCompleted ? 'var(--text-muted)' : 'inherit' }}>
                                  <strong style={{ marginRight: '0.35rem' }}>{step.order}.</strong>{step.title}
                                </span>
                              </div>
                              <button 
                                type="button" 
                                onClick={() => openStructuredStep(step)} 
                                disabled={(userRole === 'PARENT' && !step.material?.url) && step.material?.type !== 'FORM'} 
                                className="btn-secondary" 
                                style={{ padding: '0.4rem 0.7rem', fontSize: '0.8rem', opacity: (userRole === 'PARENT' && !step.material?.url && step.material?.type !== 'FORM') ? 0.55 : 1 }}
                              >
                                {step.isCompleted && step.material?.type !== 'FORM' ? 'Ver de nuevo' : materialAction}
                              </button>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {individualContent.length > 0 && <section style={{ marginTop: '2rem' }}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.35rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}><FileText style={{ color: 'var(--primary)' }} /> Contenido asignado individualmente</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '1.25rem' }}>
          {individualContent.map(content => {
            const isExam = content.material?.type === 'FORM';
            const completed = Boolean(content.submissions?.length);
            return <article key={content.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', minHeight: '310px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.15rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#2b6cb0', fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase' }}>
                  <span style={{ padding: '0.45rem', borderRadius: '8px', background: '#eef6fc', display: 'flex' }}><FileText size={18} /></span>
                  {isExam ? 'Examen Interactivo' : content.material?.type === 'VIDEO' ? 'Vídeo' : 'Tarea / Redacción'}
                </div>
                <span style={{ padding: '0.2rem 0.55rem', borderRadius: '12px', background: 'var(--primary-light)', color: 'var(--primary-text)', border: '1px solid var(--primary-border)', fontSize: '0.72rem', fontWeight: 700 }}>{content.material?.level || 'GENERAL'}</span>
              </div>
              <h3 style={{ fontSize: '1.1rem', lineHeight: 1.35, margin: '0 0 0.55rem' }}>{content.title || content.material?.title}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', lineHeight: 1.45, marginBottom: '1.25rem', flex: 1 }}>{content.description || content.material?.description || 'Sin descripción disponible.'}</p>
              <div style={{ display: 'grid', gap: '0.45rem', borderTop: '1px solid var(--border)', paddingTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {content.dueDate && <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><CalendarDays size={14} /> Entrega: {new Date(content.dueDate).toLocaleDateString('es-ES')}</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginTop: '1.25rem' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: completed ? '#24583e' : '#8d5b12', background: completed ? 'var(--primary-light)' : '#fef7e8', padding: '0.3rem 0.65rem', borderRadius: '14px', border: completed ? '1px solid var(--primary-border)' : '1px solid #fae0b0', fontSize: '0.82rem', fontWeight: 700 }}>
                  {completed ? <><CheckCircle2 size={16} /> Entregado</> : <><Clock3 size={16} /> Pendiente</>}
                </span>
                <button className="btn-primary" onClick={() => openAssignedMaterial(content)} style={{ padding: '0.55rem 0.9rem', fontSize: '0.84rem' }}>{isExam ? (completed ? 'Ver Examen' : 'Realizar Examen') : 'Ver / Abrir'}</button>
              </div>
            </article>;
          })}
        </div>
      </section>}
      {assignedMaterials.length > 0 && <section style={{ marginTop: '2rem' }}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.35rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}><FileText style={{ color: 'var(--primary)' }} /> Material asignado directamente</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '1.25rem' }}>
          {assignedMaterials.filter(assignment => !assignedMaterialIds.has(assignment.material.id)).map(assignment => {
            const isExam = assignment.material.type === 'FORM';
            return <article key={assignment.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', minHeight: '310px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.15rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#2b6cb0', fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase' }}>
                  <span style={{ padding: '0.45rem', borderRadius: '8px', background: '#eef6fc', display: 'flex' }}><FileText size={18} /></span>
                  {isExam ? 'Examen Interactivo' : assignment.material.type === 'VIDEO' ? 'Vídeo' : 'Documento'}
                </div>
                <span style={{ padding: '0.2rem 0.55rem', borderRadius: '12px', background: 'var(--primary-light)', color: 'var(--primary-text)', border: '1px solid var(--primary-border)', fontSize: '0.72rem', fontWeight: 700 }}>{assignment.material.level || 'GENERAL'}</span>
              </div>
              <h3 style={{ fontSize: '1.1rem', lineHeight: 1.35, margin: '0 0 0.55rem' }}>{assignment.material.title}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', lineHeight: 1.45, marginBottom: '1.25rem', flex: 1 }}>{assignment.material.description || 'Sin descripción disponible.'}</p>
              <div style={{ display: 'grid', gap: '0.45rem', borderTop: '1px solid var(--border)', paddingTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {assignment.deadline && <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><CalendarDays size={14} /> Entrega: {new Date(assignment.deadline).toLocaleDateString('es-ES')}</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginTop: '1.25rem' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#8d5b12', background: '#fef7e8', padding: '0.3rem 0.65rem', borderRadius: '14px', border: '1px solid #fae0b0', fontSize: '0.82rem', fontWeight: 700 }}><Clock3 size={16} /> Pendiente</span>
                <button className="btn-primary" onClick={() => openMaterialAssignment(assignment)} disabled={!isExam && !assignment.material.url} style={{ padding: '0.55rem 0.9rem', fontSize: '0.84rem', opacity: isExam || assignment.material.url ? 1 : 0.6 }}>{isExam ? 'Realizar Examen' : 'Ver / Abrir'}</button>
              </div>
            </article>;
          })}
        </div>
      </section>}
      {viewingContent?.material?.type === 'FORM' && viewingContent.material.formData && createPortal(<div className="modal-backdrop" style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'stretch', justifyContent: 'center', padding: '0.75rem 1rem 0', background: 'rgba(255,255,255,0.2)' }}>
        <div className="modal-card modal-card--player" style={{ width: '100%', maxWidth: '980px', height: 'calc(100vh - 0.75rem)', overflowY: 'auto', background: 'var(--background)', borderRadius: '12px 12px 0 0', padding: '1rem' }}>
          <button onClick={() => setViewingContent(null)} aria-label="Cerrar examen" className="modal-close"><X size={22} /></button>
          {userRole === 'PARENT' ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#24583e', background: '#eaf4ef', borderRadius: '10px', border: '1px solid #bfe0d0', margin: '2rem 0', fontWeight: 600 }}>
              🛡️ Vista del Tutor (Modo Solo Lectura): Los exámenes interactivos deben ser realizados directamente por el alumno desde su propia cuenta.
            </div>
          ) : (
            <FormPlayer title={viewingContent.title} description={viewingContent.description} questions={viewingContent.material.formData.questions as never[] || []} onFinish={handleExamFinish} />
          )}
        </div>
      </div>, document.body)}
      {viewingMaterialAssignment?.material.type === 'FORM' && viewingMaterialAssignment.material.formData && createPortal(<div className="modal-backdrop" style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'stretch', justifyContent: 'center', padding: '0.75rem 1rem 0', background: 'rgba(255,255,255,0.2)' }}>
        <div className="modal-card modal-card--player" style={{ width: '100%', maxWidth: '980px', height: 'calc(100vh - 0.75rem)', overflowY: 'auto', background: 'var(--background)', borderRadius: '12px 12px 0 0', padding: '1rem' }}>
          <button onClick={() => setViewingMaterialAssignment(null)} aria-label="Cerrar examen" className="modal-close"><X size={22} /></button>
          {userRole === 'PARENT' ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#24583e', background: '#eaf4ef', borderRadius: '10px', border: '1px solid #bfe0d0', margin: '2rem 0', fontWeight: 600 }}>
              🛡️ Vista del Tutor (Modo Solo Lectura): Los exámenes interactivos deben ser realizados directamente por el alumno desde su propia cuenta.
            </div>
          ) : (
            <FormPlayer title={viewingMaterialAssignment.material.title} description={viewingMaterialAssignment.material.description || undefined} questions={(viewingMaterialAssignment.material.formData.questions || []) as any[]} onFinish={handleExamFinish} />
          )}
        </div>
      </div>, document.body)}
      {reviewingContent?.material?.type === 'FORM' && reviewingContent.material.formData && (
        <ExamReviewModal
          title={reviewingContent.title}
          questions={reviewingContent.material.formData.questions as ReviewQuestion[] || []}
          answers={parseSavedAnswers(reviewingContent.submissions?.[0]?.content)}
          score={reviewingContent.submissions?.[0]?.grade}
          total={parseSavedExam(reviewingContent.submissions?.[0]?.content)?.total}
          onClose={() => setReviewingContent(null)}
        />
      )}
      {viewingStructuredForm && createPortal(<div className="modal-backdrop" style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'stretch', justifyContent: 'center', padding: '0.75rem 1rem 0', background: 'rgba(255,255,255,0.2)' }}>
        <div className="modal-card modal-card--player" style={{ width: '100%', maxWidth: '980px', height: 'calc(100vh - 0.75rem)', overflowY: 'auto', background: 'var(--background)', borderRadius: '12px 12px 0 0', padding: '1rem' }}>
          <button onClick={() => setViewingStructuredForm(null)} aria-label="Cerrar examen" className="modal-close"><X size={22} /></button>
          {userRole === 'PARENT' ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#24583e', background: '#eaf4ef', borderRadius: '10px', border: '1px solid #bfe0d0', margin: '2rem 0', fontWeight: 600 }}>Vista del Tutor: el examen debe realizarlo el alumno.</div>
          ) : (
            <FormPlayer
              title={viewingStructuredForm.material.title}
              description={viewingStructuredForm.material.description || undefined}
              questions={viewingStructuredForm.material.formData?.questions as never[] || []}
              onFinish={async (_score, _total, answers) => {
                const response = await fetch(`${apiUrl}/api/structured-tasks/steps/${viewingStructuredForm.stepId}/submit-form`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
                  body: JSON.stringify({ answers })
                });
                if (response.ok) {
                  const result = await response.json();
                  setStructuredTasks((tasks) => tasks.map((task) => ({
                    ...task,
                    steps: task.steps.map((step) => step.id === viewingStructuredForm.stepId ? { ...step, isCompleted: true, submission: result.submission } : step)
                  })));
                  setViewingStructuredForm(null);
                }
              }}
            />
          )}
        </div>
      </div>, document.body)}
      {reviewingStructuredForm && (
        <ExamReviewModal
          title={reviewingStructuredForm.title}
          questions={reviewingStructuredForm.material.formData?.questions as ReviewQuestion[] || []}
          answers={parseSavedAnswers(reviewingStructuredForm.submission.content)}
          score={reviewingStructuredForm.submission.grade}
          total={parseSavedExam(reviewingStructuredForm.submission.content)?.total}
          onClose={() => setReviewingStructuredForm(null)}
        />
      )}
      
      {viewingStructuredUpload && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(0,0,0,0.65)' }}>
          <div className="modal-card" style={{ width: '100%', maxWidth: '500px', background: 'var(--background)', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
            <h2 style={{ margin: '0 0 1rem', fontSize: '1.2rem', color: 'var(--text-main)' }}>Entregar {viewingStructuredUpload.title}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>Introduce el enlace de tu documento en la nube para entregarlo al profesor.</p>
            <input 
              type="url" 
              placeholder="https://docs.google.com/..." 
              value={uploadUrl} 
              onChange={e => setUploadUrl(e.target.value)} 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)', outline: 'none', marginBottom: '1.5rem' }} 
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button onClick={() => setViewingStructuredUpload(null)} style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
              <button onClick={() => completeStructuredStep(viewingStructuredUpload.stepId, uploadUrl)} disabled={!uploadUrl.trim()} className="btn-primary" style={{ padding: '0.55rem 1.25rem', opacity: !uploadUrl.trim() ? 0.6 : 1, fontWeight: 700 }}>Entregar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
