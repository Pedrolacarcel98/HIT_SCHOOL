import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  Search,
  X,
  ExternalLink,
  Send,
  Link as LinkIcon,
  PenTool,
  Paperclip,
  ChevronDown,
  ChevronUp,
  ListChecks,
  FileText
} from 'lucide-react';
import FormPlayer from './FormPlayer';
import ExamReviewModal, { type ReviewQuestion } from './ExamReviewModal';
import TaskCard, { type TaskItem, type TaskStepItem } from './TaskCard';
import { useParent } from '../context/ParentContext';

const SKILL_CATEGORIES = [
  { id: 'GRAMMAR_VOCABULARY', label: 'Grammar and Vocabulary' },
  { id: 'READING', label: 'Reading' },
  { id: 'SPEAKING', label: 'Speaking' },
  { id: 'WRITING', label: 'Writing' },
  { id: 'LISTENING', label: 'Listening' },
  { id: 'MOCK_EXAM', label: 'Mock Exams' }
];

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
    // legacy text
  }
  return {
    text: content,
    link: /^https?:\/\//i.test(content) ? content : null,
    attachment: null
  };
};

const parseSavedExam = (content?: string | null) => {
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
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>(
    () => Object.fromEntries(SKILL_CATEGORIES.map(cat => [cat.id, true]))
  );

  const { selectedStudentId } = useParent();
  const userRole = localStorage.getItem('userRole');

  // Modal: Realizar Form / Examen
  const [viewingForm, setViewingForm] = useState<{ stepId: string; material: any; title: string } | null>(null);

  // Modal: Revisar Examen Realizado
  const [reviewingExam, setReviewingExam] = useState<{ title: string; questions: ReviewQuestion[]; answers: any; score: number | null; total?: number | null } | null>(null);

  // Modal: Entregar Paso Manual
  const [deliveryTarget, setDeliveryTarget] = useState<{ stepId: string; title: string; description?: string; materialUrl?: string | null; isSequential?: boolean; requiresSubmission?: boolean } | null>(null);
  const [deliveryType, setDeliveryType] = useState<'TEXT' | 'LINK' | 'SIMPLE'>('TEXT');
  const [deliveryText, setDeliveryText] = useState('');
  const [deliveryLink, setDeliveryLink] = useState('');
  const [deliveryAttachment, setDeliveryAttachment] = useState<SubmissionAttachment | null>(null);
  const [deliveryError, setDeliveryError] = useState('');
  const [isSubmittingDelivery, setIsSubmittingDelivery] = useState(false);

  // Modal: Revisar Entrega Manual Realizada
  const [reviewingSubmission, setReviewingSubmission] = useState<{ title: string; submission: any; step: any } | null>(null);

  const toggleTopic = (topicId: string) => {
    setExpandedTopics(prev => ({ ...prev, [topicId]: !prev[topicId] }));
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const studentParam = selectedStudentId ? `?studentId=${selectedStudentId}` : '';
      const res = await fetch(`${apiUrl}/api/structured-tasks/course/${courseId}${studentParam}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setTasks(await res.json());
      }
    } catch (err) {
      console.error('Error fetching student tasks', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [courseId, selectedStudentId]);


  // Abrir modal de acción para un paso
  const handleOpenStep = (step: TaskStepItem, task: TaskItem) => {
    if (step.material?.type === 'FORM') {
      if (step.isCompleted && step.submission) {
        handleReviewStep(step, task);
        return;
      }
      setViewingForm({
        stepId: step.id,
        material: step.material,
        title: step.title || step.material.title
      });
      return;
    }

    // Si ya está completado con entrega, permitir verla
    if (step.isCompleted && step.submission) {
      setReviewingSubmission({
        title: step.title,
        submission: step.submission,
        step
      });
      return;
    }

    // Si ya está completado sin entrega, abrir directamente el material si existe
    if (step.isCompleted && !step.submission) {
      if (step.material?.url) {
        window.open(step.material.url, '_blank', 'noopener,noreferrer');
      }
      return;
    }

    const isPassiveMedia = Boolean(step.material && ['VIDEO', 'AUDIO', 'IMAGE'].includes(step.material.type));
    const requiresSub = !isPassiveMedia && Boolean(step.requiresSubmission);

    setDeliveryTarget({
      stepId: step.id,
      title: step.title,
      description: step.material?.description || task.description || undefined,
      materialUrl: step.material?.url || null,
      isSequential: task.isSequential,
      requiresSubmission: requiresSub
    });
    setDeliveryType(requiresSub ? 'TEXT' : 'SIMPLE');
    setDeliveryText('');
    setDeliveryLink('');
    setDeliveryAttachment(null);
    setDeliveryError('');
  };

  // Revisar paso completado
  const handleReviewStep = (step: TaskStepItem, _task: TaskItem) => {
    if (step.material?.type === 'FORM') {
      const parsed = parseSavedExam(step.submission?.content);
      setReviewingExam({
        title: step.material.title || step.title,
        questions: (step.material.formData?.questions as ReviewQuestion[]) || [],
        answers: parsed?.answers || {},
        score: step.submission?.grade ?? parsed?.score ?? null,
        total: parsed?.total || step.material.formData?.questions?.length || 0
      });
      return;
    }

    if (step.submission) {
      setReviewingSubmission({
        title: step.title,
        submission: step.submission,
        step
      });
    } else if (step.material?.url) {
      window.open(step.material.url, '_blank', 'noopener,noreferrer');
    }
  };

  // Enviar entrega de paso manual
  const submitDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryTarget || userRole !== 'STUDENT') return;

    let content = '';
    let link = '';
    let hasSubmissionContent = false;
    if (deliveryType === 'TEXT') {
      if (!deliveryText.trim() && !deliveryAttachment) {
        setDeliveryError('Por favor, escribe tu respuesta o adjunta un archivo antes de entregar.');
        return;
      }
      content = deliveryText.trim();
      hasSubmissionContent = true;
    } else if (deliveryType === 'LINK') {
      if (!deliveryLink.trim() && !deliveryAttachment) {
        setDeliveryError('Por favor, introduce el enlace a tu trabajo en la nube.');
        return;
      }
      if (deliveryLink.trim() && !/^https?:\/\//i.test(deliveryLink.trim())) {
        setDeliveryError('El enlace debe comenzar por http:// o https://');
        return;
      }
      link = deliveryLink.trim();
      content = link;
      hasSubmissionContent = true;
    } else if (deliveryAttachment) {
      hasSubmissionContent = true;
    }

    const payload = hasSubmissionContent
      ? (deliveryAttachment
          ? JSON.stringify({ text: content, link: link || null, attachment: deliveryAttachment })
          : content)
      : undefined;

    try {
      setIsSubmittingDelivery(true);
      setDeliveryError('');
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/api/structured-tasks/steps/${deliveryTarget.stepId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload !== undefined ? { submissionContent: payload } : {})
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setDeliveryError(errData.error || 'Error al entregar el paso.');
        return;
      }

      setDeliveryTarget(null);
      await fetchTasks();
    } catch (err) {
      console.error(err);
      setDeliveryError('Error de conexión al enviar la entrega.');
    } finally {
      setIsSubmittingDelivery(false);
    }
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

  // Filtrar tareas por búsqueda y estado
  const filteredTasks = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return tasks.filter((t) => {
      const matchesSearch = !query || `${t.title} ${t.description || ''} ${t.category || ''}`.toLowerCase().includes(query);
      const isCompleted = (t.steps || []).length > 0 && (t.steps || []).every((s: any) => s.isCompleted);
      const matchesStatus = statusFilter === 'ALL' || (statusFilter === 'COMPLETED' ? isCompleted : !isCompleted);
      return matchesSearch && matchesStatus;
    });
  }, [tasks, searchTerm, statusFilter]);

  // Agrupar tareas filtradas por Disciplina
  const groupedTasks = useMemo(() => {
    return SKILL_CATEGORIES.map(cat => ({
      ...cat,
      tasks: filteredTasks.filter(t => (t.category || 'GRAMMAR_VOCABULARY') === cat.id)
    }));
  }, [filteredTasks]);

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 0' }}>
      {/* Cabecera y Filtros */}
      <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ListChecks style={{ color: 'var(--primary)' }} /> Tareas
          </h2>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Trabajos, actividades y exámenes interactivos organizados por disciplina.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', minWidth: '220px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por título o disciplina..."
              style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.25rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)', outline: 'none', fontSize: '0.88rem' }}
            />
          </div>

          <div className="scrollable-tabs">
            {([['ALL', 'Todas'], ['PENDING', 'Pendientes'], ['COMPLETED', 'Completadas']] as const).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setStatusFilter(val)}
                style={{
                  padding: '0.5rem 0.9rem',
                  borderRadius: '16px',
                  border: statusFilter === val ? '1px solid var(--primary)' : '1px solid var(--border)',
                  background: statusFilter === val ? 'var(--primary-light)' : 'var(--surface)',
                  color: statusFilter === val ? 'var(--primary-text)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
          Cargando tareas de la clase...
        </div>
      ) : tasks.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <FileText size={46} style={{ color: 'var(--primary)', opacity: 0.45, marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>Aún no hay tareas en esta clase</h2>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Tu profesor publicará aquí las actividades y ejercicios del curso.</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>No hay tareas que coincidan con los filtros aplicados.</p>
        </div>
      ) : (
        /* Acordeones por Disciplina idénticos al profesor */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {groupedTasks.map(group => {
            const isExpanded = !!expandedTopics[group.id];
            if (group.tasks.length === 0 && (searchTerm || statusFilter !== 'ALL')) {
              // Ocultar categorías vacías si hay búsqueda activa
              return null;
            }

            return (
              <div key={group.id} className="glass-panel" style={{ padding: '1.25rem 1.5rem', borderRadius: '12px' }}>
                <div
                  onClick={() => toggleTopic(group.id)}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleTopic(group.id); } }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>
                      {group.label}
                    </h3>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '12px', background: group.tasks.length > 0 ? 'var(--primary-light)' : 'var(--surface-alt)', color: group.tasks.length > 0 ? 'var(--primary-text)' : 'var(--text-muted)' }}>
                      {group.tasks.length} {group.tasks.length === 1 ? 'tarea' : 'tareas'}
                    </span>
                  </div>

                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
                    aria-label={isExpanded ? 'Contraer disciplina' : 'Expandir disciplina'}
                  >
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                </div>

                {isExpanded && (
                  <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {group.tasks.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', margin: '0.5rem 0', paddingLeft: '0.5rem', fontSize: '0.88rem' }}>
                        Sin tareas asignadas en esta disciplina.
                      </p>
                    ) : (
                      group.tasks.map((task) => {
                        const taskItem: TaskItem = {
                          id: task.id,
                          title: task.title,
                          description: task.description,
                          dueDate: task.dueDate,
                          category: task.category,
                          isSequential: task.isSequential,
                          isTemplate: task.isTemplate,
                          assignmentType: task.assignmentType,
                          courseId: task.courseId,
                          steps: (task.steps || []).map((s: any) => ({
                            id: s.id,
                            order: s.order,
                            title: s.title,
                            materialId: s.materialId,
                            material: s.material,
                            requiresSubmission: s.requiresSubmission,
                            isEvaluable: s.isEvaluable,
                            isCompleted: s.isCompleted,
                            submission: s.submission
                          }))
                        };

                        return (
                          <TaskCard
                            key={task.id}
                            task={taskItem}
                            mode="STUDENT"
                            onOpenStep={(step) => handleOpenStep(step, taskItem)}
                            onReviewStep={(step) => handleReviewStep(step, taskItem)}
                          />
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: FormPlayer para Examen Interactivo */}
      {viewingForm && createPortal(
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(5px)' }}>
          <div className="modal-card modal-card--player" style={{ width: '100%', maxWidth: '980px', maxHeight: '90vh', overflowY: 'auto', background: 'var(--background)', borderRadius: '14px', padding: '1.5rem', margin: 'auto', position: 'relative' }}>
            <button onClick={() => setViewingForm(null)} aria-label="Cerrar examen" className="modal-close"><X size={22} /></button>
            {userRole === 'PARENT' ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#24583e', background: '#eaf4ef', borderRadius: '10px', border: '1px solid #bfe0d0', margin: '2rem 0', fontWeight: 600 }}>
                Vista del Tutor (Solo Lectura): el examen debe ser realizado directamente por el alumno.
              </div>
            ) : (
              <FormPlayer
                title={viewingForm.title}
                description={viewingForm.material?.description || undefined}
                questions={(viewingForm.material?.formData?.questions as never[]) || []}
                onFinish={async (_score, _total, answers) => {
                  try {
                    const token = localStorage.getItem('token');
                    const response = await fetch(`${apiUrl}/api/structured-tasks/steps/${viewingForm.stepId}/submit-form`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ answers })
                    });
                    if (response.ok) {
                      await fetchTasks();
                    }
                  } catch (err) {
                    console.error('Error al enviar respuestas:', err);
                  }
                }}
                onClose={() => setViewingForm(null)}
              />
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Revisar Examen Realizado */}
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

      {/* Modal: Entregar Paso Manual */}
      {deliveryTarget && createPortal(
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(5px)' }}>
          <div className="modal-card" style={{ width: '100%', maxWidth: '620px', maxHeight: 'calc(100vh - 2rem)', overflowY: 'auto', background: 'var(--background)', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <span style={{ color: 'var(--primary)', fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase' }}>Entrega de Tarea</span>
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
              <div style={{ marginBottom: '1.25rem' }}>
                <a
                  href={deliveryTarget.materialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
                >
                  <ExternalLink size={16} /> Abrir material adjunto original
                </a>
              </div>
            )}

            {userRole === 'PARENT' ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', background: 'var(--surface-alt)', borderRadius: '8px', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                Vista del Tutor (Solo Lectura): las entregas deben ser realizadas por el alumno.
              </div>
            ) : (
              <form onSubmit={submitDelivery} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {deliveryTarget.requiresSubmission !== false && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <button
                      type="button"
                      onClick={() => setDeliveryType('TEXT')}
                      className={`btn-tab ${deliveryType === 'TEXT' ? 'active' : ''}`}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.5rem', fontSize: '0.85rem', borderRadius: '6px', cursor: 'pointer', border: deliveryType === 'TEXT' ? '1px solid var(--primary)' : '1px solid var(--border)', background: deliveryType === 'TEXT' ? 'var(--primary-light)' : 'transparent', color: deliveryType === 'TEXT' ? 'var(--primary-text)' : 'var(--text-main)', fontWeight: deliveryType === 'TEXT' ? 700 : 500 }}
                    >
                      <PenTool size={15} /> Redacción
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryType('LINK')}
                      className={`btn-tab ${deliveryType === 'LINK' ? 'active' : ''}`}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.5rem', fontSize: '0.85rem', borderRadius: '6px', cursor: 'pointer', border: deliveryType === 'LINK' ? '1px solid var(--primary)' : '1px solid var(--border)', background: deliveryType === 'LINK' ? 'var(--primary-light)' : 'transparent', color: deliveryType === 'LINK' ? 'var(--primary-text)' : 'var(--text-main)', fontWeight: deliveryType === 'LINK' ? 700 : 500 }}
                    >
                      <LinkIcon size={15} /> Enlace Nube
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryType('SIMPLE')}
                      className={`btn-tab ${deliveryType === 'SIMPLE' ? 'active' : ''}`}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.5rem', fontSize: '0.85rem', borderRadius: '6px', cursor: 'pointer', border: deliveryType === 'SIMPLE' ? '1px solid var(--primary)' : '1px solid var(--border)', background: deliveryType === 'SIMPLE' ? 'var(--primary-light)' : 'transparent', color: deliveryType === 'SIMPLE' ? 'var(--primary-text)' : 'var(--text-main)', fontWeight: deliveryType === 'SIMPLE' ? 700 : 500 }}
                    >
                      <CheckCircle2 size={15} /> Marcar Hecho
                    </button>
                  </div>
                )}

                {deliveryType === 'TEXT' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Tu respuesta o redacción</label>
                    <textarea
                      value={deliveryText}
                      onChange={(e) => setDeliveryText(e.target.value)}
                      rows={5}
                      placeholder="Escribe aquí tu entrega..."
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)', resize: 'vertical' }}
                    />
                  </div>
                )}

                {deliveryType === 'LINK' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Enlace del documento (Google Docs, Drive, etc.)</label>
                    <input
                      type="url"
                      value={deliveryLink}
                      onChange={(e) => setDeliveryLink(e.target.value)}
                      placeholder="https://docs.google.com/..."
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                    />
                  </div>
                )}

                {deliveryType === 'SIMPLE' && (
                  <div style={{ padding: '0.85rem 1rem', background: '#eaf4ef', borderRadius: '8px', border: '1px solid #bfe0d0', color: '#24583e', fontSize: '0.88rem' }}>
                    Al pulsar en Entregar, se marcará este paso como completado y el profesor podrá revisarlo.
                  </div>
                )}

                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', cursor: 'pointer' }}>
                    <Paperclip size={15} /> Archivo adjunto opcional (PDF, imagen - Máx. 10MB)
                  </label>
                  <input type="file" onChange={handleDeliveryAttachment} style={{ fontSize: '0.85rem', color: 'var(--text-main)' }} />
                  {deliveryAttachment && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>✓ {deliveryAttachment.name} ({deliveryAttachment.size ? `${(deliveryAttachment.size / 1024 / 1024).toFixed(2)} MB` : 'Listo'})</span>
                      <button type="button" onClick={() => setDeliveryAttachment(null)} style={{ background: 'none', border: 'none', color: '#c53030', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}>Quitar</button>
                    </div>
                  )}
                </div>

                {deliveryError && (
                  <div style={{ padding: '0.75rem', background: '#fee2e2', border: '1px solid #ef4444', borderRadius: '6px', color: '#b91c1c', fontSize: '0.85rem' }}>
                    {deliveryError}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button type="button" onClick={() => setDeliveryTarget(null)} className="btn-secondary">Cancelar</button>
                  <button type="submit" disabled={isSubmittingDelivery} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Send size={15} /> {isSubmittingDelivery ? 'Entregando...' : 'Confirmar Entrega'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Revisar Entrega Manual Realizada */}
      {reviewingSubmission && createPortal(
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(5px)' }}>
          <div className="modal-card" style={{ width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', background: 'var(--background)', borderRadius: '14px', padding: '1.75rem', position: 'relative' }}>
            <button onClick={() => setReviewingSubmission(null)} aria-label="Cerrar revisión" className="modal-close"><X size={22} /></button>
            <h2 style={{ margin: '0 0 1rem', fontSize: '1.35rem', color: 'var(--text-main)' }}>Detalles de la Entrega</h2>

            <div style={{ marginBottom: '1.25rem', padding: '1rem', background: 'var(--surface-alt)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <h4 style={{ margin: '0 0 0.4rem', color: 'var(--text-main)' }}>{reviewingSubmission.title}</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Entregado el: {reviewingSubmission.submission?.submittedAt ? new Date(reviewingSubmission.submission.submittedAt).toLocaleString('es-ES') : 'Fecha no disponible'}
              </p>
            </div>

            {(() => {
              const parsed = parseSubmissionContent(reviewingSubmission.submission?.content);
              return (
                <>
                  {parsed.text && (
                    <div style={{ marginBottom: '1.25rem' }}>
                      <h4 style={{ margin: '0 0 0.4rem', color: 'var(--text-main)', fontSize: '0.92rem' }}>Tu respuesta / redacción:</h4>
                      <div style={{ padding: '0.85rem', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.9rem', whiteSpace: 'pre-wrap', maxHeight: '200px', overflowY: 'auto' }}>
                        {parsed.text}
                      </div>
                    </div>
                  )}

                  {parsed.link && (
                    <div style={{ marginBottom: '1.25rem' }}>
                      <h4 style={{ margin: '0 0 0.4rem', color: 'var(--text-main)', fontSize: '0.92rem' }}>Enlace entregado:</h4>
                      <a href={parsed.link} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary)', wordBreak: 'break-all', fontWeight: 600 }}>
                        <LinkIcon size={16} /> {parsed.link}
                      </a>
                    </div>
                  )}

                  {parsed.attachment && (
                    <div style={{ marginBottom: '1.25rem' }}>
                      <h4 style={{ margin: '0 0 0.4rem', color: 'var(--text-main)', fontSize: '0.92rem' }}>Archivo Adjunto:</h4>
                      <a href={parsed.attachment.dataUrl} download={parsed.attachment.name} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary)', fontWeight: 600 }}>
                        <Paperclip size={16} /> Descargar {parsed.attachment.name}
                      </a>
                    </div>
                  )}
                </>
              );
            })()}

            {/* Calificación y Feedback del Profesor */}
            {reviewingSubmission.submission?.grade !== null && reviewingSubmission.submission?.grade !== undefined && (
              <div style={{ padding: '1rem', background: '#eaf4ef', borderRadius: '8px', border: '1px solid #bfe0d0', color: '#24583e', marginBottom: '1rem' }}>
                <strong>Calificación del Paso: {reviewingSubmission.submission.grade} / 10</strong>
              </div>
            )}

            {reviewingSubmission.submission?.feedback && (
              <div style={{ padding: '0.9rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1', color: '#334155', fontSize: '0.9rem' }}>
                <strong style={{ display: 'block', marginBottom: '0.3rem', color: '#0f172a' }}>Comentarios del Profesor:</strong>
                <p style={{ margin: 0, fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>"{reviewingSubmission.submission.feedback}"</p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn-secondary" onClick={() => setReviewingSubmission(null)}>Cerrar</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default StudentClassworkTab;
