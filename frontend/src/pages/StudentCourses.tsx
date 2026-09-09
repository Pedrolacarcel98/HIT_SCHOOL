import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CalendarDays, CheckCircle2, Clock3, ExternalLink, FileText, Link, ListChecks, Paperclip, PenTool, Send, X } from 'lucide-react';
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

interface SubmissionAttachment {
  name: string;
  mimeType: string;
  dataUrl: string;
  size?: number;
}

const parseSubmissionContent = (content?: string | null): { text: string; link: string | null; attachment: SubmissionAttachment | null } => {
  if (!content) return { text: '', link: null, attachment: null };

  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const attachment = parsed.attachment && typeof parsed.attachment === 'object' ? {
        name: typeof parsed.attachment.name === 'string' ? parsed.attachment.name : 'archivo-adjunto',
        mimeType: typeof parsed.attachment.mimeType === 'string' ? parsed.attachment.mimeType : 'application/octet-stream',
        dataUrl: typeof parsed.attachment.dataUrl === 'string' ? parsed.attachment.dataUrl : '',
        size: typeof parsed.attachment.size === 'number' ? parsed.attachment.size : undefined
      } : null;

      return {
        text: typeof parsed.text === 'string' ? parsed.text : (typeof parsed.content === 'string' ? parsed.content : ''),
        link: typeof parsed.link === 'string' ? parsed.link : (typeof parsed.url === 'string' ? parsed.url : null),
        attachment
      };
    }
  } catch {
    // Legacy plain text and URL payloads
  }

  return {
    text: content,
    link: /^https?:\/\//i.test(content) ? content : null,
    attachment: null
  };
};

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

const getResourceOpenUrl = (material: { type: string; url?: string | null }) => {
  const rawUrl = material.url || '';
  const googleDocumentId = rawUrl.match(/docs\.google\.com\/document\/d\/([^/?]+)/)?.[1];
  if (material.type === 'DOCUMENT' && googleDocumentId) {
    return `https://docs.google.com/document/d/${googleDocumentId}/preview`;
  }
  const driveFileId = rawUrl.match(/drive\.google\.com\/file\/d\/([^/?]+)/)?.[1]
    || rawUrl.match(/[?&]id=([^&/?]+)/)?.[1];
  if (!driveFileId) return rawUrl;
  if (material.type === 'IMAGE') return `https://lh3.googleusercontent.com/d/${driveFileId}=w1600`;
  return `https://drive.google.com/file/d/${driveFileId}/preview`;
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
  submissions?: { grade?: number | null; content?: string | null; submittedAt?: string | null }[];
}

interface AssignedMaterial {
  id: string;
  deadline?: string | null;
  status?: 'PENDING' | 'COMPLETED';
  material: { id: string; title: string; type: string; level?: string; description?: string | null; url?: string | null; formData?: { questions?: unknown[] } | null };
}

interface DeliveryTarget {
  source: 'ASSIGNMENT' | 'MATERIAL_ASSIGNMENT';
  id: string;
  title: string;
  description?: string | null;
  materialUrl?: string | null;
  completed: boolean;
  submissionContent?: string | null;
  submittedAt?: string | null;
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

const StudentCourses: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [individualContent, setIndividualContent] = useState<IndividualContent[]>([]);
  const [assignedMaterials, setAssignedMaterials] = useState<AssignedMaterial[]>([]);
  const [structuredTasks, setStructuredTasks] = useState<StructuredTask[]>([]);
  const [viewingContent, setViewingContent] = useState<IndividualContent | null>(null);
  const [viewingMaterialAssignment, setViewingMaterialAssignment] = useState<AssignedMaterial | null>(null);
  const [reviewingContent, setReviewingContent] = useState<IndividualContent | null>(null);
  const [deliveryTarget, setDeliveryTarget] = useState<DeliveryTarget | null>(null);
  const [deliveryType, setDeliveryType] = useState<'TEXT' | 'LINK' | 'SIMPLE'>('TEXT');
  const [deliveryText, setDeliveryText] = useState('');
  const [deliveryLink, setDeliveryLink] = useState('');
  const [deliveryAttachment, setDeliveryAttachment] = useState<SubmissionAttachment | null>(null);
  const [deliveryError, setDeliveryError] = useState('');
  const [isSavingDelivery, setIsSavingDelivery] = useState(false);
  const [viewingStructuredForm, setViewingStructuredForm] = useState<{ stepId: string; material: NonNullable<StructuredTaskStep['material']> } | null>(null);
  const [reviewingStructuredForm, setReviewingStructuredForm] = useState<{ title: string; material: NonNullable<StructuredTaskStep['material']>; submission: NonNullable<StructuredTaskStep['submission']> } | null>(null);
  const [viewingStructuredUpload, setViewingStructuredUpload] = useState<{ stepId: string; title: string } | null>(null);
  const [structuredDeliveryText, setStructuredDeliveryText] = useState('');
  const [structuredDeliveryAttachment, setStructuredDeliveryAttachment] = useState<SubmissionAttachment | null>(null);
  const [structuredDeliveryError, setStructuredDeliveryError] = useState('');
  const [isSavingStructuredDelivery, setIsSavingStructuredDelivery] = useState(false);
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

  const resetDeliveryForm = () => {
    setDeliveryType('TEXT');
    setDeliveryText('');
    setDeliveryLink('');
    setDeliveryAttachment(null);
    setDeliveryError('');
  };

  const openDeliveryModal = (target: DeliveryTarget) => {
    setDeliveryTarget(target);
    resetDeliveryForm();
  };

  const handleDeliveryAttachment = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setDeliveryAttachment(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setDeliveryError('El archivo adjunto no puede superar 10 MB.');
      setDeliveryAttachment(null);
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setDeliveryAttachment({
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        dataUrl: String(reader.result || ''),
        size: file.size
      });
      setDeliveryError('');
    };
    reader.readAsDataURL(file);
  };

  const submitDelivery = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!deliveryTarget || userRole !== 'STUDENT') return;

    let content = '';
    let link = '';
    if (deliveryType === 'TEXT') {
      if (!deliveryText.trim() && !deliveryAttachment) {
        setDeliveryError('Escribe una respuesta o adjunta un archivo antes de entregar.');
        return;
      }
      content = deliveryText.trim();
    } else if (deliveryType === 'LINK') {
      if (!deliveryLink.trim() && !deliveryAttachment) {
        setDeliveryError('Introduce un enlace o adjunta un archivo antes de entregar.');
        return;
      }
      if (deliveryLink.trim() && !/^https?:\/\//i.test(deliveryLink.trim())) {
        setDeliveryError('El enlace debe comenzar por http:// o https://.');
        return;
      }
      link = deliveryLink.trim();
      content = link;
    } else {
      content = 'Tarea completada por el alumno.';
    }

    const responseBody = deliveryAttachment
      ? { content, link: link || undefined, attachment: deliveryAttachment }
      : { content };

    try {
      setIsSavingDelivery(true);
      setDeliveryError('');
      const response = await fetch(`${apiUrl}${deliveryTarget.source === 'MATERIAL_ASSIGNMENT' ? `/api/materials/assignments/${deliveryTarget.id}/submit` : `/api/assignments/${deliveryTarget.id}/submit`}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(responseBody)
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setDeliveryError(data.error || 'No se pudo entregar el recurso.');
        return;
      }
      const studentParam = selectedStudentId ? `?studentId=${selectedStudentId}` : '';
      const [assignmentsResponse, materialsResponse] = await Promise.all([
        fetch(`${apiUrl}/api/assignments/me${studentParam}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
        fetch(`${apiUrl}/api/materials/assigned-to-me${studentParam}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      ]);
      if (assignmentsResponse.ok) {
        const assignments = await assignmentsResponse.json();
        setIndividualContent(assignments.filter((assignment: IndividualContent & { courseId?: string }) => !assignment.courseId));
      }
      if (materialsResponse.ok) setAssignedMaterials(await materialsResponse.json());
      setDeliveryTarget(null);
      resetDeliveryForm();
    } catch (error) {
      console.error('Error al entregar recurso:', error);
      setDeliveryError('Error de conexión al entregar el recurso.');
    } finally {
      setIsSavingDelivery(false);
    }
  };

  const openAssignedMaterial = (content: IndividualContent) => {
    if (content.material?.type === 'FORM') {
      if (content.submissions?.length) setReviewingContent(content);
      else setViewingContent(content);
    }
    else openDeliveryModal({
      source: 'ASSIGNMENT',
      id: content.id,
      title: content.title || content.material?.title || 'Tarea',
      description: content.description || content.material?.description,
      materialUrl: content.material?.url || null,
      completed: Boolean(content.submissions?.length),
      submissionContent: content.submissions?.[0]?.content || null,
      submittedAt: content.submissions?.[0]?.submittedAt || null
    });
  };

  const openMaterialAssignment = (assignment: AssignedMaterial) => {
    if (assignment.material.type === 'FORM') setViewingMaterialAssignment(assignment);
    else openDeliveryModal({
      source: 'MATERIAL_ASSIGNMENT',
      id: assignment.id,
      title: assignment.material.title,
      description: assignment.material.description,
      materialUrl: assignment.material.url || null,
      completed: assignment.status === 'COMPLETED'
    });
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

  const openStructuredDelivery = (stepId: string, title: string) => {
    setViewingStructuredUpload({ stepId, title });
    setStructuredDeliveryText('');
    setStructuredDeliveryAttachment(null);
    setStructuredDeliveryError('');
  };

  const handleStructuredDeliveryAttachment = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setStructuredDeliveryAttachment(null);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setStructuredDeliveryError('El archivo adjunto no puede superar 10 MB.');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setStructuredDeliveryAttachment({
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
      dataUrl: String(reader.result || ''),
      size: file.size
    });
    reader.readAsDataURL(file);
  };

  const submitStructuredDelivery = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!viewingStructuredUpload || userRole !== 'STUDENT') return;
    try {
      setIsSavingStructuredDelivery(true);
      setStructuredDeliveryError('');
      const response = await fetch(`${apiUrl}/api/structured-tasks/steps/${viewingStructuredUpload.stepId}/submit-delivery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ content: structuredDeliveryText.trim(), attachment: structuredDeliveryAttachment || undefined })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setStructuredDeliveryError(data.error || 'No se pudo entregar el paso.');
        return;
      }
      const result = await response.json();
      setStructuredTasks((tasks) => tasks.map((task) => ({
        ...task,
        steps: task.steps.map((step) => step.id === viewingStructuredUpload.stepId ? { ...step, isCompleted: true, submission: result.submission } : step)
      })));
      setViewingStructuredUpload(null);
    } catch (error) {
      console.error('Error al entregar paso estructurado:', error);
      setStructuredDeliveryError('Error de conexión al entregar el paso.');
    } finally {
      setIsSavingStructuredDelivery(false);
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
    if (step.material?.url) window.open(getResourceOpenUrl(step.material), '_blank', 'noopener,noreferrer');
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
                                    openStructuredDelivery(step.id, step.title);
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
                              {step.material && (
                                <button
                                  type="button"
                                  onClick={() => openStructuredStep(step)}
                                  disabled={!step.material.url && step.material.type !== 'FORM'}
                                  style={{ padding: '0.35rem 0.65rem', borderRadius: '10px', border: '1px solid var(--primary-border)', background: 'var(--primary-light)', color: 'var(--primary-text)', fontSize: '0.78rem', fontWeight: 700, cursor: (step.material.url || step.material.type === 'FORM') ? 'pointer' : 'default', opacity: (step.material.url || step.material.type === 'FORM') ? 1 : 0.6 }}
                                >
                                  [ {step.material.type} ] {step.material.title}
                                </button>
                              )}
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
                <button className="btn-primary" onClick={() => openAssignedMaterial(content)} style={{ padding: '0.55rem 0.9rem', fontSize: '0.84rem' }}>{isExam ? (completed ? 'Ver Examen' : 'Realizar Examen') : (completed ? 'Ver Entrega' : 'Ver / Entregar')}</button>
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
            const completed = assignment.status === 'COMPLETED';
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
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: completed ? '#24583e' : '#8d5b12', background: completed ? 'var(--primary-light)' : '#fef7e8', padding: '0.3rem 0.65rem', borderRadius: '14px', border: completed ? '1px solid var(--primary-border)' : '1px solid #fae0b0', fontSize: '0.82rem', fontWeight: 700 }}>
                  {completed ? <><CheckCircle2 size={16} /> Entregado</> : <><Clock3 size={16} /> Pendiente</>}
                </span>
                <button className="btn-primary" onClick={() => openMaterialAssignment(assignment)} style={{ padding: '0.55rem 0.9rem', fontSize: '0.84rem' }}>{isExam ? 'Realizar Examen' : (completed ? 'Ver Entrega' : 'Ver / Entregar')}</button>
              </div>
            </article>;
          })}
        </div>
      </section>}
      {deliveryTarget && createPortal(
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(0,0,0,0.65)' }}>
          <div className="modal-card" style={{ width: '100%', maxWidth: '620px', maxHeight: 'calc(100vh - 2rem)', overflowY: 'auto', background: 'var(--background)', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <span style={{ color: 'var(--primary)', fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase' }}>Trabajo de clase y entrega</span>
                <h2 style={{ margin: '0.2rem 0 0', fontSize: '1.25rem', color: 'var(--text-main)' }}>{deliveryTarget.title}</h2>
              </div>
              <button onClick={() => setDeliveryTarget(null)} aria-label="Cerrar entrega" className="modal-close"><X size={22} /></button>
            </div>

            {deliveryTarget.description && (
              <div style={{ padding: '0.9rem 1rem', background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1rem' }}>
                {deliveryTarget.description}
              </div>
            )}

            {deliveryTarget.materialUrl && (
              <a href={deliveryTarget.materialUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none', marginBottom: '1rem' }}>
                <ExternalLink size={15} /> Abrir material de consulta
              </a>
            )}

            {deliveryTarget.completed ? (() => {
              const submitted = parseSubmissionContent(deliveryTarget.submissionContent);
              const submittedText = submitted.text.trim();
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', alignSelf: 'flex-start', padding: '0.35rem 0.75rem', borderRadius: '16px', background: 'var(--primary-light)', color: 'var(--primary-text)', border: '1px solid var(--primary-border)', fontWeight: 700, fontSize: '0.85rem' }}>
                    <CheckCircle2 size={15} /> Entregado
                  </div>
                  <div style={{ padding: '1rem', background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                    <strong style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-main)', fontSize: '0.88rem' }}>Contenido enviado</strong>
                    {submitted.link ? (
                      <a href={submitted.link} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>
                        <ExternalLink size={14} /> Abrir enlace entregado
                      </a>
                    ) : submittedText ? (
                      <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--text-main)', lineHeight: 1.5 }}>{submittedText}</p>
                    ) : (
                      <p style={{ margin: 0, color: 'var(--text-muted)' }}>Tarea marcada como completada.</p>
                    )}
                    {submitted.attachment && submitted.attachment.dataUrl && (
                      <div style={{ marginTop: '0.75rem' }}>
                        <a href={submitted.attachment.dataUrl} target="_blank" rel="noopener noreferrer" download={submitted.attachment.name} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>
                          <Paperclip size={14} /> Descargar adjunto: {submitted.attachment.name}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              );
            })() : userRole === 'PARENT' ? (
              <div style={{ padding: '1rem', background: '#eaf4ef', border: '1px solid #bfe0d0', borderRadius: '8px', color: '#24583e', fontWeight: 600, fontSize: '0.9rem' }}>
                Vista del Tutor: esta tarea está pendiente de entrega por parte del alumno.
              </div>
            ) : (
              <form onSubmit={submitDelivery} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {deliveryError && <div style={{ padding: '0.75rem 1rem', background: '#fdf0f0', color: '#9e2a2b', border: '1px solid #f7caca', borderRadius: '8px', fontSize: '0.88rem' }}>{deliveryError}</div>}

                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>¿Cómo deseas realizar tu entrega?</label>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {([
                      ['TEXT', <PenTool size={15} />, 'Escribir texto'],
                      ['LINK', <Link size={15} />, 'Enlace en la nube'],
                      ['SIMPLE', <CheckCircle2 size={15} />, 'Solo marcar realizada']
                    ] as const).map(([type, icon, label]) => (
                      <button key={type} type="button" onClick={() => setDeliveryType(type)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.9rem', borderRadius: '8px', border: deliveryType === type ? '1px solid var(--primary)' : '1px solid var(--border)', background: deliveryType === type ? 'var(--primary-light)' : 'var(--surface-alt)', color: deliveryType === type ? 'var(--primary-text)' : 'var(--text-main)', fontWeight: deliveryType === type ? 700 : 500, fontSize: '0.85rem', cursor: 'pointer' }}>
                        {icon} {label}
                      </button>
                    ))}
                  </div>
                </div>

                {deliveryType === 'TEXT' && (
                  <textarea rows={5} value={deliveryText} onChange={event => setDeliveryText(event.target.value)} placeholder="Escribe tu respuesta o comentario para el profesor..." style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)', fontSize: '0.92rem', resize: 'vertical', outline: 'none' }} />
                )}

                {deliveryType === 'LINK' && (
                  <input type="url" value={deliveryLink} onChange={event => setDeliveryLink(event.target.value)} placeholder="https://docs.google.com/..." style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none' }} />
                )}

                {deliveryType === 'SIMPLE' && (
                  <div style={{ padding: '0.85rem 1rem', background: 'var(--surface-alt)', borderRadius: '8px', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                    Al pulsar en Entregar, se notificará a tu profesor de que has completado la actividad.
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Paperclip size={15} /> Archivo adjunto opcional
                  </label>
                  <input type="file" onChange={handleDeliveryAttachment} style={{ width: '100%', padding: '0.7rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }} />
                  {deliveryAttachment && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', padding: '0.65rem 0.8rem', borderRadius: '8px', background: 'var(--primary-light)', border: '1px solid var(--primary-border)', color: 'var(--primary-text)', fontSize: '0.83rem', fontWeight: 600 }}>
                      <Paperclip size={15} /> {deliveryAttachment.name}
                      <button type="button" onClick={() => setDeliveryAttachment(null)} style={{ background: 'transparent', border: 'none', color: 'var(--primary-text)', cursor: 'pointer', fontWeight: 800, padding: 0 }}>Quitar</button>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.25rem' }}>
                  <button type="button" onClick={() => setDeliveryTarget(null)} style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
                  <button type="submit" disabled={isSavingDelivery} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.6rem 1.2rem', fontWeight: 700 }}>
                    <Send size={15} /> {isSavingDelivery ? 'Entregando...' : 'Entregar'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>, document.body
      )}
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
          <form onSubmit={submitStructuredDelivery} className="modal-card" style={{ width: '100%', maxWidth: '560px', background: 'var(--background)', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
              <div>
                <span style={{ color: 'var(--primary)', fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase' }}>Entrega de documento</span>
                <h2 style={{ margin: '0.25rem 0 0', fontSize: '1.2rem', color: 'var(--text-main)' }}>{viewingStructuredUpload.title}</h2>
              </div>
              <button type="button" onClick={() => setViewingStructuredUpload(null)} className="modal-close" aria-label="Cerrar entrega"><X size={21} /></button>
            </div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.45 }}>Puedes escribir una breve respuesta, adjuntar un archivo desde el dispositivo, aportar ambos o entregar el paso sin contenido.</p>
            {structuredDeliveryError && <div style={{ padding: '0.75rem 1rem', background: '#fdf0f0', color: '#9e2a2b', border: '1px solid #f7caca', borderRadius: '8px', fontSize: '0.88rem' }}>{structuredDeliveryError}</div>}
            <div>
              <label style={{ display: 'block', marginBottom: '0.45rem', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 700 }}>Breve redacción (opcional)</label>
              <textarea rows={4} value={structuredDeliveryText} onChange={(event) => setStructuredDeliveryText(event.target.value)} placeholder="Escribe un comentario o una breve respuesta..." style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)', resize: 'vertical', outline: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.45rem', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 700 }}>Archivo adjunto (opcional)</label>
              <input type="file" onChange={handleStructuredDeliveryAttachment} style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }} />
              {structuredDeliveryAttachment && <span style={{ display: 'inline-flex', marginTop: '0.5rem', color: 'var(--primary-text)', fontSize: '0.83rem', fontWeight: 700 }}><Paperclip size={15} style={{ marginRight: '0.35rem' }} />{structuredDeliveryAttachment.name}</span>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" onClick={() => setViewingStructuredUpload(null)} style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
              <button type="submit" disabled={isSavingStructuredDelivery} className="btn-primary" style={{ padding: '0.55rem 1.25rem', opacity: isSavingStructuredDelivery ? 0.6 : 1, fontWeight: 700 }}>{isSavingStructuredDelivery ? 'Entregando...' : 'Entregar'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default StudentCourses;
