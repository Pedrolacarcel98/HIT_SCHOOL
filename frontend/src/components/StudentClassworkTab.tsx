import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock3, FileText, Search, X, ExternalLink, Send, Link, PenTool, Check } from 'lucide-react';
import DocumentViewer from './DocumentViewer';
import FormPlayer from './FormPlayer';
import ExamReviewModal from './ExamReviewModal';
import { useParent } from '../context/ParentContext';
import type { ReviewQuestion } from './ExamReviewModal';

interface AssignedMaterial {
  id: string;
  title: string;
  description: string;
  level: string;
  category: string;
  teacher: string;
  assignedAt: string;
  deadline?: string;
  rawDeadline?: string;
  status: 'PENDING' | 'COMPLETED';
  url: string;
  type?: string;
  formData?: any;
  submissionContent?: string | null;
  submissionGrade?: number | null;
  submissionFeedback?: string | null;
  submittedAt?: string | null;
  structuredStepId?: string;
  structuredTaskId?: string;
}

interface StructuredTask {
  id: string;
  title: string;
  assignmentType: 'CLASS' | 'INDIVIDUAL';
  isSequential: boolean;
  steps: Array<{
    id: string;
    order: number;
    title: string;
    isCompleted?: boolean;
    submission?: any;
    material?: { id: string; title: string; type: string; url?: string | null; description?: string; level?: string; category?: string; formData?: any } | null;
  }>;
}

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

const StudentClassworkTab: React.FC<{ courseId: string }> = ({ courseId }) => {
  const [assignedMaterials, setAssignedMaterials] = useState<AssignedMaterial[]>([]);
  const [structuredTasks, setStructuredTasks] = useState<StructuredTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AssignedMaterial['status']>('ALL');
  const [viewingMaterial, setViewingMaterial] = useState<AssignedMaterial | null>(null);
  const [reviewingMaterial, setReviewingMaterial] = useState<AssignedMaterial | null>(null);
  const { selectedStudentId } = useParent();
  const userRole = localStorage.getItem('userRole');

  // Formulario de Entrega
  const [deliveryType, setDeliveryType] = useState<'TEXT' | 'LINK' | 'SIMPLE'>('TEXT');
  const [textSubmission, setTextSubmission] = useState('');
  const [urlSubmission, setUrlSubmission] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const fetchAssignedMaterials = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const studentParam = selectedStudentId ? `?studentId=${selectedStudentId}` : '';
      const res = await fetch(`${apiUrl}/api/assignments/me${studentParam}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const assignments = await res.json();
        // Filtrar solo los del curso actual
        const courseAssignments = assignments.filter((a: any) => a.courseId === courseId);
        
        setAssignedMaterials(courseAssignments.map((assignment: any) => {
          const sub = assignment.submissions && assignment.submissions.length > 0 ? assignment.submissions[0] : null;
          return {
            id: assignment.id,
            title: assignment.title,
            description: assignment.description || (assignment.material ? assignment.material.description || assignment.material.title : ''),
            level: assignment.material ? (assignment.material.level || 'GENERAL') : 'GENERAL',
            category: assignment.category || 'GRAMMAR_VOCABULARY',
            teacher: assignment.teacher && assignment.teacher.profile ? `${assignment.teacher.profile.firstName} ${assignment.teacher.profile.lastName}`.trim() : 'Profesor',
            assignedAt: new Date(assignment.createdAt || new Date()).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }),
            deadline: assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : undefined,
            rawDeadline: assignment.dueDate,
            status: sub ? 'COMPLETED' : 'PENDING',
            url: assignment.material ? assignment.material.url : '',
            type: assignment.material ? assignment.material.type : (sub?.content?.includes('"answers"') ? 'FORM' : 'DOCUMENT'),
            formData: assignment.material ? assignment.material.formData : null,
            submissionContent: sub?.content,
            submissionGrade: sub?.grade,
            submissionFeedback: sub?.feedback,
            submittedAt: sub?.submittedAt
          };
        }));
      }
      const structuredTasksResponse = await fetch(`${apiUrl}/api/structured-tasks/course/${courseId}${studentParam}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (structuredTasksResponse.ok) setStructuredTasks(await structuredTasksResponse.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignedMaterials();
  }, [courseId, selectedStudentId]);

  const filteredMaterials = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return assignedMaterials.filter((material) => {
      const matchesSearch = !query || `${material.title} ${material.description} ${material.category}`.toLowerCase().includes(query);
      const matchesStatus = statusFilter === 'ALL' || material.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, statusFilter, assignedMaterials]);

  const openMaterialModal = (material: AssignedMaterial) => {
    setViewingMaterial(material);
    setTextSubmission('');
    setUrlSubmission('');
    setSubmitError('');
    setDeliveryType('TEXT');
  };

  const openActionModal = (step: any, task: StructuredTask) => {
    setViewingMaterial({
      id: step.id,
      title: step.title,
      description: step.material?.description || '',
      level: step.material?.level || 'GENERAL',
      category: step.material?.category || 'GRAMMAR_VOCABULARY',
      teacher: '',
      assignedAt: '',
      status: step.isCompleted ? 'COMPLETED' : 'PENDING',
      url: step.material?.url || '',
      type: step.material?.type || 'DOCUMENT',
      formData: step.material?.formData,
      submissionContent: step.submission?.content,
      submissionGrade: step.submission?.grade,
      submissionFeedback: step.submission?.feedback,
      submittedAt: step.submission?.submittedAt,
      structuredStepId: step.id,
      structuredTaskId: task.id
    });
    setTextSubmission('');
    setUrlSubmission('');
    setSubmitError('');
    if (step.material?.type === 'FORM') {
       setDeliveryType('TEXT'); 
    } else {
       setDeliveryType('LINK');
    }
  };

  const submitDirectly = async (stepId: string) => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/structured-tasks/steps/${stepId}/complete`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
      });
      if (res.ok) {
        await fetchAssignedMaterials();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTick = (step: any, task: StructuredTask) => {
    if (step.isCompleted) return;
    
    if (step.material?.type === 'VIDEO' || !step.material) {
      submitDirectly(step.id);
    } else {
      openActionModal(step, task);
    }
  };

  const handleSubmitAssignment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!viewingMaterial) return;

    let finalContent = '';
    if (deliveryType === 'TEXT') {
      if (!textSubmission.trim()) {
        setSubmitError('Por favor, escribe tu respuesta o redacción antes de entregar.');
        return;
      }
      finalContent = textSubmission.trim();
    } else if (deliveryType === 'LINK') {
      if (!urlSubmission.trim()) {
        setSubmitError('Por favor, introduce el enlace a tu documento en la nube.');
        return;
      }
      if (!/^https?:\/\//i.test(urlSubmission.trim())) {
        setSubmitError('El enlace debe ser una URL válida (ej. https://docs.google.com/...)');
        return;
      }
      finalContent = urlSubmission.trim();
    } else {
      finalContent = viewingMaterial.structuredStepId ? '' : 'Tarea completada por el alumno.';
    }

    try {
      setIsSubmitting(true);
      setSubmitError('');
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      
      const isStructured = Boolean(viewingMaterial.structuredStepId);
      const url = isStructured 
        ? `${apiUrl}/api/structured-tasks/steps/${viewingMaterial.structuredStepId}/complete`
        : `${apiUrl}/api/assignments/${viewingMaterial.id}/submit`;
      
      const body = isStructured
        ? { submissionContent: finalContent }
        : { content: finalContent };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setSubmitError(errData.error || 'Error al enviar la tarea.');
        return;
      }

      await fetchAssignedMaterials();
      setViewingMaterial(null);
    } catch (err) {
      console.error(err);
      setSubmitError('Error de conexión al enviar la tarea.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormFinish = async (score: number, total: number, answers: { [key: string]: any }) => {
    if (!viewingMaterial) return;
    const grade = total > 0 ? (score / total) * 10 : 0;
    
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      
      const isStructured = Boolean(viewingMaterial.structuredStepId);
      const url = isStructured 
        ? `${apiUrl}/api/structured-tasks/steps/${viewingMaterial.structuredStepId}/submit-form`
        : `${apiUrl}/api/assignments/${viewingMaterial.id}/submit`;
      
      const body = isStructured
        ? { answers }
        : { content: JSON.stringify({ answers, score, total }), grade };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        await fetchAssignedMaterials();
        setViewingMaterial(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '2rem 1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Barra de Búsqueda y Filtros */}
      <div className="glass-panel" style={{ padding: '1rem 1.25rem', marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 0 }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar tarea o material..."
            style={{ width: '100%', padding: '0.7rem 1rem 0.7rem 2.5rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)', outline: 'none' }}
          />
        </div>
        <div className="scrollable-tabs" style={{ flexWrap: 'wrap' }}>
          {([['ALL', 'Todas'], ['PENDING', 'Pendientes'], ['COMPLETED', 'Completadas']] as const).map(([value, label]) => (
            <button key={value} onClick={() => setStatusFilter(value)} style={{ padding: '0.6rem 0.9rem', borderRadius: '18px', border: statusFilter === value ? '1px solid var(--primary)' : '1px solid var(--border)', background: statusFilter === value ? 'var(--primary-light)' : 'var(--surface)', color: statusFilter === value ? 'var(--primary-text)' : 'var(--text-muted)', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>Cargando tareas de la clase...</div>
      ) : filteredMaterials.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <FileText size={46} style={{ color: 'var(--primary)', opacity: 0.45, marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No hay tareas para mostrar</h2>
          <p style={{ color: 'var(--text-muted)' }}>Prueba con otra búsqueda o cambia el filtro de estado.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '1.25rem' }}>
          {filteredMaterials.map((material) => {
            const examData = parseSavedExam(material.submissionContent);
            const isExam = material.type === 'FORM' || Boolean(examData);

            return (
              <article key={material.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', minHeight: '310px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.15rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#2b6cb0', fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase' }}>
                    <span style={{ padding: '0.45rem', borderRadius: '8px', background: '#eef6fc', display: 'flex' }}><FileText size={18} /></span>
                    {isExam ? 'Examen Interactivo' : material.type === 'VIDEO' ? 'Vídeo' : 'Tarea / Redacción'}
                  </div>
                  <span style={{ padding: '0.2rem 0.55rem', borderRadius: '12px', background: 'var(--primary-light)', color: 'var(--primary-text)', border: '1px solid var(--primary-border)', fontSize: '0.72rem', fontWeight: 700 }}>{material.level}</span>
                </div>
                <h2 style={{ fontSize: '1.1rem', lineHeight: 1.35, marginBottom: '0.55rem' }}>{material.title}</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', lineHeight: 1.45, marginBottom: '1.25rem', flex: 1 }}>{material.description}</p>
                <div style={{ display: 'grid', gap: '0.45rem', borderTop: '1px solid var(--border)', paddingTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {material.deadline && (() => {
                    let color = 'var(--text-muted)';
                    if (material.status === 'PENDING' && material.rawDeadline) {
                      const diff = new Date(material.rawDeadline).getTime() - new Date().getTime();
                      const hours = diff / (1000 * 60 * 60);
                      if (hours < 0) color = '#e53e3e';
                      else if (hours < 48) color = '#d69e2e';
                    }
                    return (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color, fontWeight: color !== 'var(--text-muted)' ? 'bold' : 'normal' }}>
                        <CalendarDays size={14} /> Entrega: {material.deadline}
                      </span>
                    );
                  })()}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginTop: '1.25rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: material.status === 'COMPLETED' ? '#24583e' : '#8d5b12', background: material.status === 'COMPLETED' ? 'var(--primary-light)' : '#fef7e8', padding: '0.3rem 0.65rem', borderRadius: '14px', border: material.status === 'COMPLETED' ? '1px solid var(--primary-border)' : '1px solid #fae0b0', fontSize: '0.82rem', fontWeight: 700 }}>
                    {material.status === 'COMPLETED' ? <><CheckCircle2 size={16} /> Entregado</> : <><Clock3 size={16} /> Pendiente</>}
                  </span>
                  <button
                    onClick={() => {
                      if (material.status === 'COMPLETED' && isExam) {
                        setReviewingMaterial(material);
                      } else {
                        openMaterialModal(material);
                      }
                    }}
                    className="btn-primary"
                    style={{ padding: '0.55rem 0.9rem', fontSize: '0.84rem' }}
                  >
                    {material.status === 'COMPLETED' ? (isExam ? 'Ver Examen' : 'Ver Entrega') : (userRole === 'PARENT' ? 'Ver Detalle' : 'Realizar Tarea')}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {structuredTasks.length > 0 && (
        <section style={{ marginTop: '2rem' }}>
          <h2 style={{ margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', fontSize: '1.2rem' }}>
            <FileText size={20} style={{ color: 'var(--primary)' }} /> Tareas Estructuradas
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {structuredTasks.map((task) => (
              <article key={task.id} className="glass-panel" style={{ padding: '1rem 1.15rem', border: '1px solid var(--primary-border)' }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                  <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1rem' }}>{task.title}</h3>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {task.isSequential && <span style={{ padding: '0.2rem 0.55rem', borderRadius: '12px', background: '#fef3c7', color: '#92400e', fontSize: '0.72rem', fontWeight: 700 }}>Paso a paso</span>}
                    <span style={{ padding: '0.2rem 0.55rem', borderRadius: '12px', background: 'var(--primary-light)', color: 'var(--primary-text)', fontSize: '0.72rem', fontWeight: 700 }}>{task.steps.length} pasos</span>
                  </div>
                </header>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {(() => {
                    let firstIncompleteFound = false;
                    return task.steps.map((step) => {
                      const isBlocked = task.isSequential && firstIncompleteFound;
                      if (!step.isCompleted) firstIncompleteFound = true;
                      
                      return (
                        <div key={step.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', padding: '0.85rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface-alt)', opacity: isBlocked ? 0.6 : 1, pointerEvents: isBlocked ? 'none' : 'auto' }}>
                          <div style={{ paddingTop: '0.15rem' }}>
                            <input 
                              type="checkbox" 
                              checked={step.isCompleted} 
                              disabled={isBlocked || step.isCompleted}
                              onChange={(e) => {
                                if (e.target.checked) handleTick(step, task);
                              }}
                              style={{ width: '22px', height: '22px', cursor: (isBlocked || step.isCompleted) ? 'default' : 'pointer', accentColor: 'var(--primary)' }}
                            />
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', color: 'var(--text-main)', fontSize: '0.95rem' }}>
                              <span style={{ fontWeight: 600, textDecoration: step.isCompleted ? 'line-through' : 'none', color: step.isCompleted ? 'var(--text-muted)' : 'inherit' }}>
                                {step.order}. {step.title}
                              </span>
                            </div>
                            
                            {step.material && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <button 
                                  type="button" 
                                  onClick={() => {
                                    if (step.material?.type === 'FORM') {
                                      openActionModal(step, task);
                                    } else if (step.material?.url) {
                                      window.open(step.material.url, '_blank', 'noopener,noreferrer');
                                    }
                                  }} 
                                  disabled={!step.material?.url && step.material?.type !== 'FORM'} 
                                  style={{ padding: '0.35rem 0.65rem', borderRadius: '10px', border: '1px solid var(--primary-border)', background: 'var(--primary-light)', color: 'var(--primary-text)', fontSize: '0.78rem', fontWeight: 700, cursor: (step.material?.url || step.material?.type === 'FORM') ? 'pointer' : 'default', opacity: (step.material?.url || step.material?.type === 'FORM') ? 1 : 0.6 }}
                                >
                                  [ {step.material.type} ] {step.material.title}
                                </button>
                                
                                {step.isCompleted && step.material.type !== 'VIDEO' && (
                                  <button type="button" onClick={() => openActionModal(step, task)} style={{ padding: '0.35rem 0.65rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
                                    Ver Entrega / Resultados
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Modal Principal de Tarea / Entrega */}
      {viewingMaterial && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'stretch', justifyContent: 'center', zIndex: 100, padding: '0.75rem 1rem 0', overflow: 'hidden' }}>
          <div className="modal-card modal-card--player" style={{ width: '100%', maxWidth: viewingMaterial.type === 'FORM' ? '980px' : '920px', height: 'calc(100vh - 0.75rem)', background: 'var(--background)', borderRadius: '12px 12px 0 0', overflow: 'hidden', display: 'flex', flexDirection: 'column', margin: '0 auto', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
            
            {/* Header del Modal */}
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)' }}>
              <div>
                <span style={{ color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {viewingMaterial.type === 'FORM' ? 'EXAMEN / TEST INTERACTIVO' : 'TRABAJO DE CLASE Y ENTREGA'}
                </span>
                <h2 style={{ margin: '0.2rem 0 0', fontSize: '1.25rem', color: 'var(--text-main)' }}>{viewingMaterial.title}</h2>
              </div>
              <button onClick={() => setViewingMaterial(null)} className="modal-close" aria-label="Cerrar modal"><X size={22} /></button>
            </div>
            
            {/* Contenido del Modal */}
            <div style={{ padding: '1.5rem', flex: 1, minHeight: 0, overflowY: 'auto' }}>
              {viewingMaterial.type === 'FORM' && viewingMaterial.formData ? (
                viewingMaterial.status === 'COMPLETED' ? (
                  <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <CheckCircle2 size={64} style={{ color: '#22c55e', margin: '0 auto 1rem' }} />
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Examen completado con éxito</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                      Puedes consultar el desglose y corrección detallada en la pestaña de Calificaciones.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const target = viewingMaterial;
                        setViewingMaterial(null);
                        setReviewingMaterial(target);
                      }}
                      className="btn-primary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', margin: '0 auto' }}
                    >
                      <FileText size={16} /> Ver Examen Corregido
                    </button>
                  </div>
                ) : (
                  <FormPlayer 
                    title={viewingMaterial.title} 
                    description={viewingMaterial.description} 
                    questions={viewingMaterial.formData.questions} 
                    onFinish={handleFormFinish} 
                  />
                )
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Bloque 1: Instrucciones y Material Adjunto */}
                  {viewingMaterial.description && (
                    <div style={{ padding: '1.15rem 1.25rem', background: 'var(--surface-alt)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                      <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '0.98rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <FileText size={17} style={{ color: 'var(--primary)' }} /> Instrucciones de la tarea
                      </h3>
                      <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-main)', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                        {viewingMaterial.description}
                      </p>
                    </div>
                  )}

                  {viewingMaterial.url && (
                    <div>
                      <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.92rem', color: 'var(--text-muted)' }}>Material de consulta:</h4>
                      <DocumentViewer url={viewingMaterial.url} title={viewingMaterial.title} />
                    </div>
                  )}

                  {/* Bloque 2: Área de Entrega del Alumno */}
                  <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <PenTool size={18} style={{ color: 'var(--primary)' }} /> Tu Entrega
                      </h3>

                      {viewingMaterial.status === 'COMPLETED' ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.3rem 0.75rem',
                          borderRadius: '16px',
                          background: '#eaf4ef',
                          color: '#24583e',
                          border: '1px solid #bfe0d0',
                          fontWeight: 700,
                          fontSize: '0.85rem'
                        }}>
                          <CheckCircle2 size={15} /> Entregada el {viewingMaterial.submittedAt ? new Date(viewingMaterial.submittedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'recientemente'}
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.3rem 0.75rem',
                          borderRadius: '16px',
                          background: '#fef7e8',
                          color: '#8d5b12',
                          border: '1px solid #fae0b0',
                          fontWeight: 600,
                          fontSize: '0.82rem'
                        }}>
                          <Clock3 size={14} /> Pendiente de entrega
                        </span>
                      )}
                    </div>

                    {/* Caso A: Tarea ya completada */}
                    {viewingMaterial.status === 'COMPLETED' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ padding: '1rem', background: 'var(--surface-alt)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                          <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                            Contenido que enviaste:
                          </span>
                          {viewingMaterial.submissionContent && /^https?:\/\//i.test(viewingMaterial.submissionContent) ? (
                            <a
                              href={viewingMaterial.submissionContent}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                color: 'var(--primary)',
                                fontWeight: 600,
                                textDecoration: 'none',
                                padding: '0.5rem 0.85rem',
                                background: 'var(--surface)',
                                borderRadius: '6px',
                                border: '1px solid var(--border)'
                              }}
                            >
                              <ExternalLink size={15} /> Abrir documento entregado en la nube
                            </a>
                          ) : (
                            <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.92rem', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                              {viewingMaterial.submissionContent || 'Tarea marcada como completada.'}
                            </p>
                          )}
                        </div>

                        {/* Calificación y feedback del profesor si existe */}
                        {viewingMaterial.submissionGrade !== null && viewingMaterial.submissionGrade !== undefined ? (
                          <div style={{ padding: '1rem 1.25rem', background: 'var(--primary-light)', borderRadius: '8px', border: '1px solid var(--primary-border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: viewingMaterial.submissionFeedback ? '0.5rem' : 0 }}>
                              <span style={{ fontWeight: 700, color: 'var(--primary-text)', fontSize: '0.9rem' }}>
                                Calificación del profesor:
                              </span>
                              <strong style={{ fontSize: '1.15rem', color: 'var(--primary-text)' }}>
                                {viewingMaterial.submissionGrade.toFixed(1)} / 10
                              </strong>
                            </div>
                            {viewingMaterial.submissionFeedback && (
                              <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: 1.45, borderTop: '1px dashed var(--primary-border)', paddingTop: '0.5rem' }}>
                                💬 <em>"{viewingMaterial.submissionFeedback}"</em>
                              </p>
                            )}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.84rem', fontStyle: 'italic' }}>
                            <Clock3 size={15} /> Tu profesor revisará y calificará esta entrega próximamente.
                          </div>
                        )}
                      </div>
                    ) : userRole === 'PARENT' ? (
                      <div style={{ padding: '1rem 1.25rem', background: '#eaf4ef', borderRadius: '8px', border: '1px solid #bfe0d0', color: '#24583e', fontSize: '0.88rem', fontWeight: 600 }}>
                        🛡️ Vista del Tutor (Modo Solo Lectura): Esta tarea está pendiente de entrega por parte del alumno.
                      </div>
                    ) : (
                      /* Caso B: Formulario interactivo para enviar la entrega */
                      <form onSubmit={handleSubmitAssignment} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                        {submitError && (
                          <div style={{ padding: '0.75rem 1rem', background: '#fdf0f0', color: '#9e2a2b', border: '1px solid #f7caca', borderRadius: '8px', fontSize: '0.88rem' }}>
                            {submitError}
                          </div>
                        )}

                        {/* Selector de tipo de entrega */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                            ¿Cómo deseas realizar tu entrega?
                          </label>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() => setDeliveryType('TEXT')}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                padding: '0.5rem 0.9rem',
                                borderRadius: '8px',
                                border: deliveryType === 'TEXT' ? '1px solid var(--primary)' : '1px solid var(--border)',
                                background: deliveryType === 'TEXT' ? 'var(--primary-light)' : 'var(--surface-alt)',
                                color: deliveryType === 'TEXT' ? 'var(--primary-text)' : 'var(--text-main)',
                                fontWeight: deliveryType === 'TEXT' ? 700 : 500,
                                fontSize: '0.85rem',
                                cursor: 'pointer'
                              }}
                            >
                              <PenTool size={15} /> Redacción / Escribir texto
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeliveryType('LINK')}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                padding: '0.5rem 0.9rem',
                                borderRadius: '8px',
                                border: deliveryType === 'LINK' ? '1px solid var(--primary)' : '1px solid var(--border)',
                                background: deliveryType === 'LINK' ? 'var(--primary-light)' : 'var(--surface-alt)',
                                color: deliveryType === 'LINK' ? 'var(--primary-text)' : 'var(--text-main)',
                                fontWeight: deliveryType === 'LINK' ? 700 : 500,
                                fontSize: '0.85rem',
                                cursor: 'pointer'
                              }}
                            >
                              <Link size={15} /> Enlace en la nube (Docs / Drive / PDF)
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeliveryType('SIMPLE')}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                padding: '0.5rem 0.9rem',
                                borderRadius: '8px',
                                border: deliveryType === 'SIMPLE' ? '1px solid var(--primary)' : '1px solid var(--border)',
                                background: deliveryType === 'SIMPLE' ? 'var(--primary-light)' : 'var(--surface-alt)',
                                color: deliveryType === 'SIMPLE' ? 'var(--primary-text)' : 'var(--text-main)',
                                fontWeight: deliveryType === 'SIMPLE' ? 700 : 500,
                                fontSize: '0.85rem',
                                cursor: 'pointer'
                              }}
                            >
                              <Check size={15} /> Solo marcar realizada
                            </button>
                          </div>
                        </div>

                        {/* Campo: Redacción de Texto */}
                        {deliveryType === 'TEXT' && (
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                Tu Redacción o Respuestas:
                              </label>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {textSubmission.length} caracteres
                              </span>
                            </div>
                            <textarea
                              rows={6}
                              required
                              placeholder="Escribe aquí tu ensayo, respuestas a los ejercicios o redacción para que tu profesor la corrija..."
                              value={textSubmission}
                              onChange={e => setTextSubmission(e.target.value)}
                              style={{
                                width: '100%',
                                padding: '0.85rem 1rem',
                                borderRadius: '8px',
                                border: '1px solid var(--border)',
                                background: 'var(--surface-alt)',
                                color: 'var(--text-main)',
                                fontSize: '0.92rem',
                                lineHeight: '1.5',
                                resize: 'vertical',
                                outline: 'none'
                              }}
                              autoFocus
                            />
                          </div>
                        )}

                        {/* Campo: Enlace a Documento */}
                        {deliveryType === 'LINK' && (
                          <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                              Enlace de tu documento compartido:
                            </label>
                            <input
                              type="url"
                              required
                              placeholder="https://docs.google.com/document/d/... o enlace a Dropbox/OneDrive"
                              value={urlSubmission}
                              onChange={e => setUrlSubmission(e.target.value)}
                              style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                borderRadius: '8px',
                                border: '1px solid var(--border)',
                                background: 'var(--surface-alt)',
                                color: 'var(--text-main)',
                                fontSize: '0.9rem',
                                outline: 'none'
                              }}
                              autoFocus
                            />
                            <small style={{ display: 'block', marginTop: '0.35rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                              Asegúrate de que el documento tenga permisos de lectura abiertos para tu profesor.
                            </small>
                          </div>
                        )}

                        {/* Campo: Simple */}
                        {deliveryType === 'SIMPLE' && (
                          <div style={{ padding: '0.85rem 1rem', background: 'var(--surface-alt)', borderRadius: '8px', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                            Al pulsar en Entregar, se notificará a tu profesor de que has leído y completado la actividad.
                          </div>
                        )}

                        {/* Botón de Enviar */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={() => setViewingMaterial(null)}
                            style={{
                              padding: '0.65rem 1.25rem',
                              borderRadius: '8px',
                              border: '1px solid var(--border)',
                              background: 'transparent',
                              color: 'var(--text-main)',
                              cursor: 'pointer',
                              fontWeight: 600
                            }}
                          >
                            Cerrar
                          </button>

                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="btn-primary"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.65rem 1.5rem',
                              fontSize: '0.92rem'
                            }}
                          >
                            <Send size={16} />
                            {isSubmitting ? 'Entregando...' : 'Entregar Tarea al Profesor'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Revisión de Examen */}
      {reviewingMaterial && (
        <ExamReviewModal
          title={reviewingMaterial.title}
          questions={(reviewingMaterial.formData?.questions || []) as ReviewQuestion[]}
          answers={parseSavedExam(reviewingMaterial.submissionContent)?.answers || {}}
          score={reviewingMaterial.submissionGrade}
          total={parseSavedExam(reviewingMaterial.submissionContent)?.total}
          onClose={() => setReviewingMaterial(null)}
        />
      )}
    </div>
  );
};

export default StudentClassworkTab;
