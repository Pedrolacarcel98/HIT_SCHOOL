import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, CheckCircle2, ChevronDown, ChevronUp, Clock3, Download, Eye, FileText, Search, X, ExternalLink, Send, Link, PenTool, Check, Lock, Layers } from 'lucide-react';
import DocumentViewer from './DocumentViewer';
import AudioPlayer from './AudioPlayer';
import VideoPlayer from './VideoPlayer';
import FormPlayer from './FormPlayer';
import ExamReviewModal from './ExamReviewModal';
import AttachmentViewerModal, { isAttachmentImage } from './AttachmentViewerModal';
import type { AttachmentData } from './AttachmentViewerModal';
import { useParent } from '../context/ParentContext';
import type { ReviewQuestion } from './ExamReviewModal';

const SKILL_CATEGORIES = [
  { id: 'GRAMMAR_VOCABULARY', label: 'Grammar and Vocabulary' },
  { id: 'READING', label: 'Reading' },
  { id: 'SPEAKING', label: 'Speaking' },
  { id: 'WRITING', label: 'Writing' },
  { id: 'LISTENING', label: 'Listening' },
  { id: 'MOCK_EXAM', label: 'Mock Exams' }
];

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
  category?: string;
  assignmentType: 'CLASS' | 'INDIVIDUAL';
  isSequential: boolean;
  dueDate?: string | null;
  publishAt?: string | null;
  steps: Array<{
    id: string;
    order: number;
    title: string;
    requiresSubmission?: boolean;
    isEvaluable?: boolean;
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

interface SubmissionAttachment {
  name: string;
  mimeType: string;
  dataUrl: string;
  size?: number;
}

interface ParsedSubmissionData {
  text: string;
  link: string | null;
  attachment: SubmissionAttachment | null;
}

const parseSubmissionContent = (content?: string | null): ParsedSubmissionData => {
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

const formatDateTime = (value?: string | null) => value
  ? new Date(value).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
  : '';

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

const getResourceDownloadUrl = (material: { type: string; url?: string | null }) => {
  const rawUrl = material.url || '';
  const googleDocumentId = rawUrl.match(/docs\.google\.com\/document\/d\/([^/?]+)/)?.[1];
  if (material.type === 'DOCUMENT' && googleDocumentId) {
    return `https://docs.google.com/document/d/${googleDocumentId}/export?format=pdf`;
  }
  const driveFileId = rawUrl.match(/drive\.google\.com\/file\/d\/([^/?]+)/)?.[1]
    || rawUrl.match(/[?&]id=([^&/?]+)/)?.[1];
  if (driveFileId) return `https://drive.google.com/uc?export=download&id=${driveFileId}`;
  return rawUrl;
};

const getImageDisplayUrl = (url?: string | null) => {
  if (!url) return '';
  const driveFileId = url.match(/drive\.google\.com\/file\/d\/([^/?]+)/)?.[1] || url.match(/[?&]id=([^&/?]+)/)?.[1] || url.match(/lh3\.googleusercontent\.com\/d\/([^=/?]+)/)?.[1];
  return driveFileId ? `https://lh3.googleusercontent.com/d/${driveFileId}=w1600` : url;
};

interface StudentClassworkTabProps {
  courseId: string;
  viewMode?: 'PENDING' | 'COMPLETED';
}

const StudentClassworkTab: React.FC<StudentClassworkTabProps> = ({ courseId, viewMode = 'PENDING' }) => {
  const [assignedMaterials] = useState<AssignedMaterial[]>([]);
  const [structuredTasks, setStructuredTasks] = useState<StructuredTask[]>([]);
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AssignedMaterial['status']>('ALL');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => Object.fromEntries(SKILL_CATEGORIES.map((category) => [category.id, true])));
  const [viewingMaterial, setViewingMaterial] = useState<AssignedMaterial | null>(null);
  const [reviewingMaterial, setReviewingMaterial] = useState<AssignedMaterial | null>(null);
  const [viewingAttachment, setViewingAttachment] = useState<AttachmentData | null>(null);
  const { selectedStudentId } = useParent();
  const userRole = localStorage.getItem('userRole');

  const toggleTaskExpand = (taskId: string) => {
    setExpandedTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  // Formulario de Entrega
  const [deliveryType, setDeliveryType] = useState<'TEXT' | 'LINK' | 'SIMPLE'>('TEXT');
  const [textSubmission, setTextSubmission] = useState('');
  const [urlSubmission, setUrlSubmission] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<SubmissionAttachment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const fetchAssignedMaterials = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const studentParam = selectedStudentId ? `?studentId=${selectedStudentId}` : '';
      const structuredTasksResponse = await fetch(`${apiUrl}/api/structured-tasks/course/${courseId}${studentParam}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (structuredTasksResponse.ok) setStructuredTasks(await structuredTasksResponse.json());
    } catch (err) {
      console.error(err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignedMaterials();
  }, [courseId, selectedStudentId]);

  const isTaskCompleted = (task: StructuredTask) => {
    return task.steps.length > 0 && task.steps.every((s) => Boolean(s.isCompleted));
  };

  const filteredTasksByMode = useMemo(() => {
    return structuredTasks.filter((task) => {
      const isDone = isTaskCompleted(task);
      return viewMode === 'COMPLETED' ? isDone : !isDone;
    });
  }, [structuredTasks, viewMode]);

  const filteredMaterials = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return assignedMaterials.filter((material) => {
      const matchesSearch = !query || `${material.title} ${material.description} ${material.category}`.toLowerCase().includes(query);
      const matchesStatus = statusFilter === 'ALL' || material.status === statusFilter;
      const matchesMode = viewMode === 'COMPLETED' ? material.status === 'COMPLETED' : material.status !== 'COMPLETED';
      return matchesSearch && matchesStatus && matchesMode;
    });
  }, [searchTerm, statusFilter, assignedMaterials, viewMode]);

  const groupedMaterials = useMemo(() => SKILL_CATEGORIES.map((category) => ({
    ...category,
    materials: filteredMaterials.filter((material) => material.category === category.id),
    structuredTasks: filteredTasksByMode.filter((task) => (task.category || 'GRAMMAR_VOCABULARY') === category.id)
  })), [filteredMaterials, filteredTasksByMode]);

  const uncategorizedStructuredTasks = useMemo(() => filteredTasksByMode.filter((task) => !SKILL_CATEGORIES.some((category) => category.id === (task.category || 'GRAMMAR_VOCABULARY'))), [filteredTasksByMode]);

  const toggleCategory = (categoryId: string) => setExpandedCategories((categories) => ({ ...categories, [categoryId]: !categories[categoryId] }));

  const openMaterialModal = (material: AssignedMaterial) => {
    setViewingMaterial(material);
    setTextSubmission('');
    setUrlSubmission('');
    setAttachmentFile(null);
    setSubmitError('');
    setDeliveryType('TEXT');
  };

  const isStepBlocked = (step: any, task: StructuredTask) => {
    if (!task.isSequential || step.isCompleted) return false;
    return task.steps.some((s) => s.order < step.order && !s.isCompleted);
  };

  const openActionModal = (step: any, task: StructuredTask) => {
    if (isStepBlocked(step, task)) return;
    const submission = step.submission || null;
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
      submissionContent: submission?.content || null,
      submissionGrade: submission?.grade ?? null,
      submissionFeedback: submission?.feedback || null,
      submittedAt: submission?.submittedAt || null,
      structuredStepId: step.id,
      structuredTaskId: task.id
    });
    setTextSubmission('');
    setUrlSubmission('');
    setAttachmentFile(null);
    setSubmitError('');
    if (step.material?.type === 'FORM') {
       setDeliveryType('TEXT'); 
    } else {
       setDeliveryType('TEXT');
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
        await fetchAssignedMaterials(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTick = (step: any, task: StructuredTask) => {
    if (step.isCompleted || isStepBlocked(step, task)) return;

    if (step.material || step.isEvaluable) {
      openActionModal(step, task);
      return;
    }

    if (!step.isEvaluable) {
      submitDirectly(step.id);
      return;
    }
  };

  const openStructuredResource = (step: StructuredTask['steps'][number], task: StructuredTask) => {
    if (!step.material || isStepBlocked(step, task)) return;
    if (step.isCompleted || step.submission) {
      openActionModal(step, task);
      return;
    }
    if (step.material.type === 'FORM') {
      openActionModal(step, task);
      return;
    }
    if (step.material.url) window.open(getResourceOpenUrl(step.material), '_blank', 'noopener,noreferrer');
  };

  const handleSubmitAssignment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!viewingMaterial) return;

    let finalContent = '';
    let finalLink = '';
    if (deliveryType === 'TEXT') {
      if (!viewingMaterial.structuredStepId && !textSubmission.trim() && !attachmentFile) {
        setSubmitError('Por favor, escribe tu respuesta o redacción antes de entregar.');
        return;
      }
      finalContent = textSubmission.trim();
    } else if (deliveryType === 'LINK') {
      if (!urlSubmission.trim() && !attachmentFile) {
        setSubmitError('Por favor, introduce el enlace a tu documento en la nube.');
        return;
      }
      if (urlSubmission.trim() && !/^https?:\/\//i.test(urlSubmission.trim())) {
        setSubmitError('El enlace debe ser una URL válida (ej. https://docs.google.com/...)');
        return;
      }
      finalLink = urlSubmission.trim();
      finalContent = finalLink;
    } else {
      finalContent = viewingMaterial.structuredStepId ? '' : 'Tarea completada por el alumno.';
    }

    const payload = attachmentFile
      ? JSON.stringify({
          text: finalContent,
          link: finalLink || null,
          attachment: attachmentFile
        })
      : finalContent;

    try {
      setIsSubmitting(true);
      setSubmitError('');
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      
      const isStructured = Boolean(viewingMaterial.structuredStepId);
      const url = isStructured 
        ? `${apiUrl}/api/structured-tasks/steps/${viewingMaterial.structuredStepId}/submit-delivery`
        : `${apiUrl}/api/assignments/${viewingMaterial.id}/submit`;
      
      const body = isStructured
        ? { content: finalContent, link: finalLink || undefined, attachment: attachmentFile || undefined }
        : { content: attachmentFile ? finalContent : payload, link: finalLink || undefined, attachment: attachmentFile || undefined };

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

      await fetchAssignedMaterials(true);
      setViewingMaterial(null);
      setAttachmentFile(null);
    } catch (err) {
      console.error(err);
      setSubmitError('Error de conexión al enviar la tarea.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAttachmentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setAttachmentFile(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setSubmitError('El archivo adjunto no puede superar 10 MB.');
      setAttachmentFile(null);
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAttachmentFile({
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        dataUrl: String(reader.result || ''),
        size: file.size
      });
      setSubmitError('');
    };
    reader.readAsDataURL(file);
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
        await fetchAssignedMaterials(true);
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
      ) : filteredMaterials.length === 0 && filteredTasksByMode.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          {viewMode === 'COMPLETED' ? (
            <>
              <CheckCircle2 size={46} style={{ color: '#16a34a', opacity: 0.7, marginBottom: '1rem' }} />
              <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No hay tareas completadas todavía</h2>
              <p style={{ color: 'var(--text-muted)' }}>Cuando completes todos los pasos de una tarea de clase, se trasladará automáticamente a esta pestaña.</p>
            </>
          ) : (
            <>
              <FileText size={46} style={{ color: 'var(--primary)', opacity: 0.45, marginBottom: '1rem' }} />
              <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No hay tareas pendientes</h2>
              <p style={{ color: 'var(--text-muted)' }}>{searchTerm ? 'Prueba con otra búsqueda o cambia el filtro de estado.' : '¡Genial! Todas las tareas de esta clase están al día.'}</p>
            </>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {groupedMaterials.map((group) => {
            const isExpanded = Boolean(expandedCategories[group.id]);
            return (
            <section key={group.id} className="glass-panel" style={{ padding: '1.25rem' }}>
              <header onClick={() => toggleCategory(group.id)} role="button" tabIndex={0} aria-expanded={isExpanded} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleCategory(group.id); } }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.65rem', cursor: 'pointer', userSelect: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <h2 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>{group.label}</h2>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '12px', background: group.materials.length + group.structuredTasks.length ? 'var(--primary-light)' : 'var(--surface-alt)', color: group.materials.length + group.structuredTasks.length ? 'var(--primary-text)' : 'var(--text-muted)' }}>{group.materials.length + group.structuredTasks.length} {group.materials.length + group.structuredTasks.length === 1 ? 'tarea' : 'tareas'}</span>
                </div>
                {isExpanded ? <ChevronUp size={20} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={20} style={{ color: 'var(--text-muted)' }} />}
              </header>
              {isExpanded && <>
              <div style={{ borderTop: '1px solid var(--border)', marginTop: '0.85rem', paddingTop: '1rem' }}>
              {group.materials.length === 0 && group.structuredTasks.length === 0 ? (
                <p style={{ margin: 0, padding: '0.5rem 0', color: 'var(--text-muted)', fontSize: '0.88rem', fontStyle: 'italic' }}>No hay tareas asignadas en esta materia.</p>
              ) : (
              <><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '1.25rem' }}>
          {group.materials.map((material) => {
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
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.5, margin: '0 0 1.25rem', flex: 1 }}>{material.description || 'Sin descripción adicional para este recurso.'}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: material.status === 'COMPLETED' ? '#2f855a' : '#c05621', fontWeight: 600 }}>
                    {material.status === 'COMPLETED' ? <CheckCircle2 size={16} /> : <Clock3 size={16} />}
                    {material.status === 'COMPLETED' ? 'Completado' : 'Pendiente'}
                  </span>
                  <button
                    type="button"
                    onClick={() => openMaterialModal(material)}
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
              {group.structuredTasks.map((task) => {
                const completedCount = task.steps.filter((step) => step.isCompleted).length;
                const progress = task.steps.length ? Math.round((completedCount / task.steps.length) * 100) : 0;
                const isTaskExpanded = Boolean(expandedTasks[task.id]);
                return (
                <article key={task.id} className="glass-panel" style={{ marginTop: '1rem', padding: '1rem 1.15rem', border: '1px solid var(--primary-border)' }}>
                  <header
                    onClick={() => toggleTaskExpand(task.id)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '0.75rem',
                      flexWrap: 'wrap',
                      marginBottom: isTaskExpanded ? '0.75rem' : 0,
                      cursor: 'pointer'
                    }}
                  >
                    <div>
                      <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1rem' }}>{task.title}</h3>
                      <span style={{ display: 'block', marginTop: '0.25rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{completedCount} de {task.steps.length} pasos completados - {progress}%</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>
                      {task.publishAt && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.55rem', borderRadius: '12px', background: '#eef2ff', border: '1px solid #c7d2fe', color: '#3730a3', fontSize: '0.72rem', fontWeight: 700 }}><Clock3 size={13} /> Programada: {formatDateTime(task.publishAt)}</span>}
                      {task.dueDate && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.55rem', borderRadius: '12px', background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', fontSize: '0.72rem', fontWeight: 700 }}><CalendarDays size={13} /> Entrega: {formatDateTime(task.dueDate)}</span>}
                      {task.isSequential && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.55rem', borderRadius: '12px', background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', fontSize: '0.72rem', fontWeight: 700 }}>
                          <Layers size={13} /> Paso a paso
                        </span>
                      )}
                      <span style={{ padding: '0.2rem 0.55rem', borderRadius: '12px', background: 'var(--primary-light)', color: 'var(--primary-text)', fontSize: '0.72rem', fontWeight: 700 }}>{task.steps.length} pasos</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTaskExpand(task.id);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: '0.25rem 0.65rem',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          background: 'var(--surface-alt)',
                          color: 'var(--text-main)',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {isTaskExpanded ? <><ChevronUp size={14} /> Plegar</> : <><ChevronDown size={14} /> Desplegar</>}
                      </button>
                    </div>
                  </header>
                  {isTaskExpanded && (
                    <>
                      <div style={{ width: '100%', height: '8px', borderRadius: '999px', overflow: 'hidden', background: 'var(--surface-alt)', border: '1px solid var(--border)', marginBottom: '0.75rem' }}>
                        <div style={{ width: `${progress}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.2s ease' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {(() => {
                      let firstIncompleteFound = false;
                      return task.steps.map((step) => {
                        const isBlocked = Boolean(task.isSequential && firstIncompleteFound && !step.isCompleted);
                        if (!step.isCompleted) firstIncompleteFound = true;

                        return (
                          <div
                            key={step.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.85rem',
                              padding: '0.75rem',
                              border: isBlocked ? '1px dashed var(--border)' : '1px solid var(--border)',
                              borderRadius: '8px',
                              background: isBlocked ? 'var(--surface)' : 'var(--surface-alt)',
                              opacity: isBlocked ? 0.65 : 1
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={Boolean(step.isCompleted)}
                              disabled={isBlocked || Boolean(step.isCompleted)}
                              onChange={(event) => {
                                if (event.target.checked) handleTick(step, task);
                              }}
                              style={{
                                width: '20px',
                                height: '20px',
                                cursor: (isBlocked || step.isCompleted) ? 'default' : 'pointer',
                                accentColor: 'var(--primary)'
                              }}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <strong
                                  style={{
                                    fontSize: '0.9rem',
                                    color: step.isCompleted ? 'var(--text-muted)' : 'var(--text-main)',
                                    textDecoration: step.isCompleted ? 'line-through' : 'none'
                                  }}
                                >
                                  {step.order}. {step.title}
                                </strong>
                                {isBlocked && (
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.3rem',
                                      fontSize: '0.74rem',
                                      fontWeight: 600,
                                      padding: '0.15rem 0.5rem',
                                      borderRadius: '8px',
                                      background: '#f1f5f9',
                                      color: '#64748b',
                                      border: '1px solid #cbd5e1'
                                    }}
                                  >
                                    <Lock size={12} /> Bloqueado: completa el paso anterior
                                  </span>
                                )}
                              </div>

                              {step.material && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.45rem' }}>
                                  <button
                                    type="button"
                                    onClick={() => openStructuredResource(step, task)}
                                    disabled={isBlocked || (!step.material.url && step.material.type !== 'FORM')}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.35rem',
                                      padding: '0.35rem 0.65rem',
                                      borderRadius: '10px',
                                      border: isBlocked ? '1px solid var(--border)' : '1px solid var(--primary-border)',
                                      background: isBlocked ? 'var(--surface-alt)' : 'var(--primary-light)',
                                      color: isBlocked ? 'var(--text-muted)' : 'var(--primary-text)',
                                      fontSize: '0.78rem',
                                      fontWeight: 700,
                                      cursor: isBlocked ? 'not-allowed' : 'pointer',
                                      opacity: isBlocked ? 0.6 : 1
                                    }}
                                  >
                                    {isBlocked && <Lock size={12} />}
                                    {step.material.title}
                                  </button>
                                  {!isBlocked && step.material.type === 'DOCUMENT' && step.material.url && (
                                    <a
                                      href={getResourceDownloadUrl(step.material)}
                                      download
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title="Descargar documento en PDF"
                                      aria-label={`Descargar ${step.material.title} en PDF`}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '0.35rem',
                                        borderRadius: '8px',
                                        border: '1px solid var(--primary-border)',
                                        background: 'var(--surface)',
                                        color: 'var(--primary-text)'
                                      }}
                                    >
                                      <Download size={15} />
                                    </a>
                                  )}
                                </div>
                              )}

                              {(() => {
                                const isExam = step.material?.type === 'FORM' || Boolean(parseSavedExam(step.submission?.content));
                                if (isExam && (step.isCompleted || step.submission)) {
                                  return (
                                    <div style={{ marginTop: '0.45rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.65rem', borderRadius: '12px', background: '#ecfdf5', border: '1px solid #a7f3d0', fontSize: '0.78rem', color: '#15803d', fontWeight: 600 }}>
                                      <CheckCircle2 size={13} />
                                      <span>
                                        Examen entregado y corregido
                                        {typeof step.submission?.grade === 'number' ? ` · Nota: ${step.submission.grade.toFixed(1)}/10` : ''}
                                      </span>
                                    </div>
                                  );
                                }
                                if (step.submission?.content) {
                                  const submission = parseSubmissionContent(step.submission.content);
                                  if (submission.text || submission.link || submission.attachment?.name) {
                                    return (
                                      <div style={{ marginTop: '0.5rem', padding: '0.55rem 0.7rem', borderRadius: '7px', background: 'var(--surface)', border: '1px solid var(--primary-border)', fontSize: '0.78rem', color: 'var(--text-main)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--primary-text)', fontWeight: 700, marginBottom: '0.2rem' }}>
                                          <CheckCircle2 size={13} /> Tu entrega:
                                        </div>
                                        {submission.text && <span style={{ display: 'block', whiteSpace: 'pre-wrap' }}>{submission.text}</span>}
                                        {submission.link && <a href={submission.link} target="_blank" rel="noopener noreferrer" style={{ display: 'block', color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>Abrir enlace entregado</a>}
                                        {submission.attachment?.name && <span style={{ display: 'block', color: 'var(--primary-text)', fontWeight: 600 }}>Archivo: {submission.attachment.name}</span>}
                                      </div>
                                    );
                                  }
                                }
                                if (step.isCompleted) {
                                  return (
                                    <div style={{ marginTop: '0.45rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.55rem', borderRadius: '10px', background: '#ecfdf5', border: '1px solid #a7f3d0', fontSize: '0.75rem', color: '#15803d', fontWeight: 600 }}>
                                      <CheckCircle2 size={12} /> Completado
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </>
              )}
            </article>
          );
          })}</>
              )}
              </div>
              </>}
            </section>
            );
          })}
        </div>
      )}

      {uncategorizedStructuredTasks.length > 0 && (
        <section style={{ marginTop: '2rem' }}>
          <h2 style={{ margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', fontSize: '1.2rem' }}>
            <FileText size={20} style={{ color: 'var(--primary)' }} /> Tareas Estructuradas
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {uncategorizedStructuredTasks.map((task) => {
              const completedCount = task.steps.filter((step) => step.isCompleted).length;
              const progress = task.steps.length ? Math.round((completedCount / task.steps.length) * 100) : 0;
              const isTaskExpanded = Boolean(expandedTasks[task.id]);
              return (
              <article key={task.id} className="glass-panel" style={{ padding: '1rem 1.15rem', border: '1px solid var(--primary-border)' }}>
                <header
                  onClick={() => toggleTaskExpand(task.id)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '0.75rem',
                    flexWrap: 'wrap',
                    marginBottom: isTaskExpanded ? '0.75rem' : 0,
                    cursor: 'pointer'
                  }}
                >
                  <div>
                    <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1rem' }}>{task.title}</h3>
                    <span style={{ display: 'block', marginTop: '0.25rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{completedCount} de {task.steps.length} pasos completados - {progress}%</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>
                    {task.publishAt && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.55rem', borderRadius: '12px', background: '#eef2ff', border: '1px solid #c7d2fe', color: '#3730a3', fontSize: '0.72rem', fontWeight: 700 }}><Clock3 size={13} /> Programada: {formatDateTime(task.publishAt)}</span>}
                    {task.dueDate && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.55rem', borderRadius: '12px', background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', fontSize: '0.72rem', fontWeight: 700 }}><CalendarDays size={13} /> Entrega: {formatDateTime(task.dueDate)}</span>}
                    {task.isSequential && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.55rem', borderRadius: '12px', background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', fontSize: '0.72rem', fontWeight: 700 }}>
                        <Layers size={13} /> Paso a paso
                      </span>
                    )}
                    <span style={{ padding: '0.2rem 0.55rem', borderRadius: '12px', background: 'var(--primary-light)', color: 'var(--primary-text)', fontSize: '0.72rem', fontWeight: 700 }}>{task.steps.length} pasos</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTaskExpand(task.id);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.25rem 0.65rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--surface-alt)',
                        color: 'var(--text-main)',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {isTaskExpanded ? <><ChevronUp size={14} /> Plegar</> : <><ChevronDown size={14} /> Desplegar</>}
                    </button>
                  </div>
                </header>
                {isTaskExpanded && (
                  <>
                    <div style={{ width: '100%', height: '8px', borderRadius: '999px', overflow: 'hidden', background: 'var(--surface-alt)', border: '1px solid var(--border)', marginBottom: '0.75rem' }}>
                      <div style={{ width: `${progress}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.2s ease' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {(() => {
                    let firstIncompleteFound = false;
                    return task.steps.map((step) => {
                      const isBlocked = Boolean(task.isSequential && firstIncompleteFound && !step.isCompleted);
                      if (!step.isCompleted) firstIncompleteFound = true;
                      
                      return (
                        <div
                          key={step.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.85rem',
                            padding: '0.75rem',
                            border: isBlocked ? '1px dashed var(--border)' : '1px solid var(--border)',
                            borderRadius: '8px',
                            background: isBlocked ? 'var(--surface)' : 'var(--surface-alt)',
                            opacity: isBlocked ? 0.65 : 1
                          }}
                        >
                          <input 
                            type="checkbox" 
                            checked={Boolean(step.isCompleted)} 
                            disabled={isBlocked || Boolean(step.isCompleted)}
                            onChange={(e) => {
                              if (e.target.checked) handleTick(step, task);
                            }}
                            style={{
                              width: '20px',
                              height: '20px',
                              cursor: (isBlocked || step.isCompleted) ? 'default' : 'pointer',
                              accentColor: 'var(--primary)'
                            }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <strong
                                style={{
                                  fontSize: '0.9rem',
                                  color: step.isCompleted ? 'var(--text-muted)' : 'var(--text-main)',
                                  textDecoration: step.isCompleted ? 'line-through' : 'none'
                                }}
                              >
                                {step.order}. {step.title}
                              </strong>
                              {isBlocked && (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    fontSize: '0.74rem',
                                    fontWeight: 600,
                                    padding: '0.15rem 0.5rem',
                                    borderRadius: '8px',
                                    background: '#f1f5f9',
                                    color: '#64748b',
                                    border: '1px solid #cbd5e1'
                                  }}
                                >
                                  <Lock size={12} /> Bloqueado: completa el paso anterior
                                </span>
                              )}
                            </div>
                            
                            {step.material && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.45rem' }}>
                                <button 
                                  type="button" 
                                  onClick={() => openStructuredResource(step, task)}
                                  disabled={isBlocked || (!step.material?.url && step.material?.type !== 'FORM')} 
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    padding: '0.35rem 0.65rem',
                                    borderRadius: '10px',
                                    border: isBlocked ? '1px solid var(--border)' : '1px solid var(--primary-border)',
                                    background: isBlocked ? 'var(--surface-alt)' : 'var(--primary-light)',
                                    color: isBlocked ? 'var(--text-muted)' : 'var(--primary-text)',
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    cursor: isBlocked ? 'not-allowed' : 'pointer',
                                    opacity: isBlocked ? 0.6 : 1
                                  }}
                                >
                                  {isBlocked && <Lock size={12} />}
                                  {step.material.title}
                                </button>
                                {!isBlocked && step.material.type === 'DOCUMENT' && step.material.url && (
                                  <a
                                    href={getResourceDownloadUrl(step.material)}
                                    download
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Descargar documento en PDF"
                                    aria-label={`Descargar ${step.material.title} en PDF`}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      padding: '0.35rem',
                                      borderRadius: '8px',
                                      border: '1px solid var(--primary-border)',
                                      background: 'var(--surface)',
                                      color: 'var(--primary-text)'
                                    }}
                                  >
                                    <Download size={15} />
                                  </a>
                                )}
                              </div>
                            )}
                            {(() => {
                              const isExam = step.material?.type === 'FORM' || Boolean(parseSavedExam(step.submission?.content));
                              if (isExam && (step.isCompleted || step.submission)) {
                                return (
                                  <div style={{ marginTop: '0.45rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.65rem', borderRadius: '12px', background: '#ecfdf5', border: '1px solid #a7f3d0', fontSize: '0.78rem', color: '#15803d', fontWeight: 600 }}>
                                    <CheckCircle2 size={13} />
                                    <span>
                                      Examen entregado y corregido
                                      {typeof step.submission?.grade === 'number' ? ` · Nota: ${step.submission.grade.toFixed(1)}/10` : ''}
                                    </span>
                                  </div>
                                );
                              }
                              if (step.submission?.content) {
                                const submission = parseSubmissionContent(step.submission.content);
                                if (submission.text || submission.link || submission.attachment?.name) {
                                  return (
                                    <div style={{ marginTop: '0.5rem', padding: '0.55rem 0.7rem', borderRadius: '7px', background: 'var(--surface)', border: '1px solid var(--primary-border)', fontSize: '0.78rem', color: 'var(--text-main)' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--primary-text)', fontWeight: 700, marginBottom: '0.2rem' }}>
                                        <CheckCircle2 size={13} /> Tu entrega:
                                      </div>
                                      {submission.text && <span style={{ display: 'block', whiteSpace: 'pre-wrap' }}>{submission.text}</span>}
                                      {submission.link && <a href={submission.link} target="_blank" rel="noopener noreferrer" style={{ display: 'block', color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>Abrir enlace entregado</a>}
                                      {submission.attachment?.name && <span style={{ display: 'block', color: 'var(--primary-text)', fontWeight: 600 }}>Archivo: {submission.attachment.name}</span>}
                                    </div>
                                  );
                                }
                              }
                              if (step.isCompleted) {
                                return (
                                  <div style={{ marginTop: '0.45rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.55rem', borderRadius: '10px', background: '#ecfdf5', border: '1px solid #a7f3d0', fontSize: '0.75rem', color: '#15803d', fontWeight: 600 }}>
                                    <CheckCircle2 size={12} /> Completado
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
                </>
              )}
            </article>
          );
          })}
          </div>
        </section>
      )}

      {/* Modal Principal de Tarea / Entrega */}
      {viewingMaterial && createPortal(
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
                    onClose={() => setViewingMaterial(null)}
                    allowRetry={false}
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <h4 style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-muted)' }}>Material de consulta:</h4>
                        <a
                          href={getResourceOpenUrl({ type: viewingMaterial.type || 'DOCUMENT', url: viewingMaterial.url })}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-secondary"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.8rem',
                            padding: '0.3rem 0.65rem',
                            textDecoration: 'none'
                          }}
                        >
                          <ExternalLink size={13} /> Abrir en pestaña nueva
                        </a>
                      </div>
                      {viewingMaterial.type === 'VIDEO' ? (
                        <VideoPlayer url={viewingMaterial.url} title={viewingMaterial.title} />
                      ) : viewingMaterial.type === 'AUDIO' ? (
                        <AudioPlayer src={viewingMaterial.url} title={viewingMaterial.title} />
                      ) : viewingMaterial.type === 'IMAGE' ? (
                        <img
                          src={getImageDisplayUrl(viewingMaterial.url)}
                          alt={viewingMaterial.title}
                          referrerPolicy="no-referrer"
                          style={{ maxWidth: '100%', maxHeight: 450, borderRadius: '8px', objectFit: 'contain', display: 'block', margin: '0 auto' }}
                        />
                      ) : (
                        <DocumentViewer url={viewingMaterial.url} title={viewingMaterial.title} />
                      )}
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
                        {(() => {
                          const submissionDetails = parseSubmissionContent(viewingMaterial.submissionContent);
                          const renderedLink = submissionDetails.link?.trim();
                          const hasAttachment = Boolean(submissionDetails.attachment && submissionDetails.attachment.dataUrl);
                          const renderedText = submissionDetails.text?.trim();

                          return (
                            <div style={{ padding: '1rem', background: 'var(--surface-alt)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                              <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                                Contenido que enviaste:
                              </span>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {renderedLink && (
                                  <a
                                    href={renderedLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.4rem',
                                      color: 'var(--primary)',
                                      fontWeight: 700,
                                      fontSize: '0.92rem',
                                      textDecoration: 'none',
                                      padding: '0.65rem 0.9rem',
                                      background: 'var(--surface-alt)',
                                      borderRadius: '8px',
                                      border: '1px solid var(--border)'
                                    }}
                                  >
                                    <ExternalLink size={15} /> Abrir documento entregado en la nube
                                  </a>
                                )}

                                {renderedText && (
                                  <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.92rem', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                                    {renderedText}
                                  </p>
                                )}

                                {hasAttachment && submissionDetails.attachment && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', padding: '0.65rem 0.85rem', background: 'var(--surface-alt)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
                                        <FileText size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }} title={submissionDetails.attachment.name}>
                                          {submissionDetails.attachment.name}
                                        </span>
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <button
                                          type="button"
                                          onClick={() => setViewingAttachment(submissionDetails.attachment)}
                                          className="btn-secondary"
                                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.65rem', fontSize: '0.78rem' }}
                                          title="Ver archivo online sin descargar"
                                        >
                                          <Eye size={13} /> Ver en línea
                                        </button>
                                        <a
                                          href={submissionDetails.attachment.dataUrl}
                                          download={submissionDetails.attachment.name}
                                          className="btn-secondary"
                                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.65rem', fontSize: '0.78rem', textDecoration: 'none' }}
                                          title="Descargar archivo"
                                        >
                                          <Download size={13} /> Descargar
                                        </a>
                                      </div>
                                    </div>
                                    {isAttachmentImage(submissionDetails.attachment) && (
                                      <div style={{ marginTop: '0.35rem' }}>
                                        <img
                                          src={submissionDetails.attachment.dataUrl}
                                          alt={submissionDetails.attachment.name}
                                          onClick={() => setViewingAttachment(submissionDetails.attachment)}
                                          style={{
                                            maxHeight: '160px',
                                            maxWidth: '100%',
                                            borderRadius: '6px',
                                            border: '1px solid var(--border)',
                                            cursor: 'pointer',
                                            objectFit: 'contain',
                                            background: '#fff',
                                            display: 'block'
                                          }}
                                          title="Clic para ampliar y rotar"
                                        />
                                      </div>
                                    )}
                                  </div>
                                )}

                                {!renderedLink && !renderedText && !hasAttachment && (
                                  <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.92rem', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                                    Tarea marcada como completada.
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })()}

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
                        {!viewingMaterial.structuredStepId && <div>
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
                        </div>}

                        {viewingMaterial.structuredStepId && (
                          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.45 }}>
                            Puedes añadir una breve respuesta, un archivo adjunto o entregar el paso sin contenido.
                          </p>
                        )}

                        {/* Campo: Redacción de Texto */}
                        {deliveryType === 'TEXT' && (
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                {viewingMaterial.structuredStepId ? 'Breve redacción (opcional):' : 'Tu Redacción o Respuestas:'}
                              </label>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {textSubmission.length} caracteres
                              </span>
                            </div>
                            <textarea
                              rows={6}
                              required={!viewingMaterial.structuredStepId}
                              placeholder={viewingMaterial.structuredStepId ? 'Escribe una breve respuesta o comentario...' : 'Escribe aquí tu ensayo, respuestas a los ejercicios o redacción para que tu profesor la corrija...'}
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

                        {viewingMaterial.type !== 'FORM' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                              Archivo adjunto (opcional)
                            </label>
                            <input
                              type="file"
                              onChange={handleAttachmentChange}
                              style={{ width: '100%', padding: '0.7rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                            />
                            {attachmentFile && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', padding: '0.7rem 0.8rem', borderRadius: '8px', background: 'var(--primary-light)', border: '1px solid var(--primary-border)', color: 'var(--primary-text)', fontSize: '0.83rem' }}>
                                <Check size={15} />
                                <span>{attachmentFile.name}</span>
                                <button type="button" onClick={() => setAttachmentFile(null)} style={{ background: 'transparent', border: 'none', color: 'var(--primary-text)', cursor: 'pointer', fontWeight: 700, padding: 0 }}>
                                  Quitar
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Campo: Enlace a Documento */}
                        {!viewingMaterial.structuredStepId && deliveryType === 'LINK' && (
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
                        {!viewingMaterial.structuredStepId && deliveryType === 'SIMPLE' && (
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
        </div>, document.body
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

      {/* Visor Online de Archivos Adjuntos */}
      <AttachmentViewerModal
        attachment={viewingAttachment}
        onClose={() => setViewingAttachment(null)}
      />
    </div>
  );
};

export default StudentClassworkTab;
