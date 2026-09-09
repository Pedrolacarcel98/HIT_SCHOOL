import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Search,
  Trash2,
  X,
  BookmarkPlus,
  ListChecks,
  FileText,
  Video,
  Headphones,
  ClipboardCheck,
  Image as ImageIcon
} from 'lucide-react';
import ExamReviewModal from './ExamReviewModal';
import TaskCard, { type TaskItem } from './TaskCard';

const SKILL_CATEGORIES = [
  { id: 'GRAMMAR_VOCABULARY', label: 'Grammar and Vocabulary' },
  { id: 'READING', label: 'Reading' },
  { id: 'SPEAKING', label: 'Speaking' },
  { id: 'WRITING', label: 'Writing' },
  { id: 'LISTENING', label: 'Listening' },
  { id: 'MOCK_EXAM', label: 'Mock Exams' }
];

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface MaterialItem {
  id: string;
  title: string;
  type: 'DOCUMENT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FORM';
  level?: string;
  description?: string | null;
  url?: string | null;
  formData?: { questions?: any[] } | null;
}

interface ExamReviewData {
  title: string;
  questions: any[];
  answers: Record<string, any>;
  score: number | null;
  total?: number | null;
}

interface StepDraft {
  id: string;
  title: string;
  materialId?: string | null;
  requiresSubmission: boolean;
}

const ClassworkTab: React.FC<{ courseId: string }> = ({ courseId }) => {
  const [structuredTasks, setStructuredTasks] = useState<any[]>([]);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>(
    () => Object.fromEntries(SKILL_CATEGORIES.map(cat => [cat.id, true]))
  );

  // Modal para Crear / Editar Tarea en esta clase
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskCategory, setTaskCategory] = useState('GRAMMAR_VOCABULARY');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskTerm, setTaskTerm] = useState(1);
  const [taskIsSequential, setTaskIsSequential] = useState(false);
  const [taskIsTemplate, setTaskIsTemplate] = useState(false);
  const [taskSteps, setTaskSteps] = useState<StepDraft[]>([]);
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [taskFormError, setTaskFormError] = useState('');

  // Selector de Material para un paso
  const [materialPickerStepIndex, setMaterialPickerStepIndex] = useState<number | null>(null);
  const [materialSearch, setMaterialSearch] = useState('');
  const [materialTypeFilter, setMaterialTypeFilter] = useState<'ALL' | MaterialItem['type']>('ALL');

  // Catálogo de Plantillas
  const [templateCatalog, setTemplateCatalog] = useState<any[]>([]);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);

  // Visor de Examen de un paso
  const [reviewingExam, setReviewingExam] = useState<ExamReviewData | null>(null);

  useEffect(() => {
    fetchStructuredTasks();
    fetchMaterials();
  }, [courseId]);

  const toggleTopic = (topicId: string) => {
    setExpandedTopics(prev => ({ ...prev, [topicId]: !prev[topicId] }));
  };

  const fetchStructuredTasks = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/api/structured-tasks/course/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setStructuredTasks(await res.json());
      }
    } catch (err) {
      console.error('Error fetching course tasks', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMaterials = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/api/materials`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setMaterials(await res.json());
      }
    } catch (err) {
      console.error('Error fetching materials', err);
    }
  };

  // Abrir Modal de Creación
  const openCreateTask = (categoryPreset?: string) => {
    setEditingTask(null);
    setTaskTitle('');
    setTaskDescription('');
    setTaskCategory(categoryPreset || 'GRAMMAR_VOCABULARY');
    setTaskDueDate('');
    setTaskTerm(1);
    setTaskIsSequential(false);
    setTaskIsTemplate(false);
    setTaskFormError('');
    setTaskSteps([
      { id: crypto.randomUUID(), title: 'Paso 1: Instrucciones / Actividad', materialId: null, requiresSubmission: false }
    ]);
    setIsTaskModalOpen(true);
  };

  // Abrir Modal de Edición
  const openEditTask = (task: TaskItem) => {
    const orig = structuredTasks.find(t => t.id === task.id);
    if (!orig) return;
    setEditingTask(orig);
    setTaskTitle(orig.title || '');
    setTaskDescription(orig.description || '');
    setTaskCategory(orig.category || 'GRAMMAR_VOCABULARY');
    setTaskDueDate(orig.dueDate ? new Date(orig.dueDate).toISOString().slice(0, 16) : '');
    setTaskTerm(orig.term || 1);
    setTaskIsSequential(Boolean(orig.isSequential));
    setTaskIsTemplate(Boolean(orig.isTemplate));
    setTaskFormError('');
    setTaskSteps(
      (orig.steps || []).map((s: any) => {
        const mat = materials.find(m => m.id === s.materialId) || s.material;
        const isPassive = mat && (mat.type === 'VIDEO' || mat.type === 'AUDIO' || mat.type === 'IMAGE');
        return {
          id: s.id,
          title: s.title,
          materialId: s.materialId || null,
          requiresSubmission: !isPassive && Boolean(s.requiresSubmission)
        };
      })
    );
    setIsTaskModalOpen(true);
  };

  const addStep = () => {
    const nextOrder = taskSteps.length + 1;
    setTaskSteps(prev => [
      ...prev,
      { id: crypto.randomUUID(), title: `Paso ${nextOrder}`, materialId: null, requiresSubmission: false }
    ]);
  };

  const removeStep = (index: number) => {
    setTaskSteps(prev => prev.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, patch: Partial<StepDraft>) => {
    setTaskSteps(prev => prev.map((step, i) => i === index ? { ...step, ...patch } : step));
  };

  const saveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      setTaskFormError('El título de la tarea es obligatorio.');
      return;
    }
    const validSteps = taskSteps.filter(s => s.title.trim());
    if (validSteps.length === 0) {
      setTaskFormError('Debes añadir al menos un paso a la tarea.');
      return;
    }

    try {
      setIsSavingTask(true);
      setTaskFormError('');
      const token = localStorage.getItem('token');
      const payload = {
        title: taskTitle.trim(),
        description: taskDescription.trim() || null,
        dueDate: taskDueDate ? new Date(taskDueDate).toISOString() : null,
        term: taskTerm,
        category: taskCategory,
        isTemplate: taskIsTemplate,
        courseId,
        assignmentType: 'CLASS',
        isSequential: taskIsSequential,
        steps: validSteps.map((s, idx) => {
          const mat = materials.find(m => m.id === s.materialId);
          const isPassive = mat && (mat.type === 'VIDEO' || mat.type === 'AUDIO' || mat.type === 'IMAGE');
          return {
            title: s.title.trim(),
            materialId: s.materialId || null,
            order: idx + 1,
            requiresSubmission: !isPassive && (mat?.type === 'FORM' || Boolean(s.requiresSubmission))
          };
        })
      };

      const res = await fetch(`${apiUrl}/api/structured-tasks${editingTask ? `/${editingTask.id}` : ''}`, {
        method: editingTask ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'No se pudo guardar la tarea.');
      }

      await fetchStructuredTasks();
      setIsTaskModalOpen(false);
    } catch (err: any) {
      setTaskFormError(err.message || 'Error al guardar la tarea.');
    } finally {
      setIsSavingTask(false);
    }
  };

  const handleDeleteTask = async (task: TaskItem) => {
    if (!window.confirm(`¿Eliminar la tarea "${task.title}" de esta clase?`)) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/api/structured-tasks/${task.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchStructuredTasks();
      }
    } catch (err) {
      console.error('Error al eliminar tarea', err);
    }
  };

  const handleDuplicateTask = async (task: TaskItem) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/api/structured-tasks/${task.id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          courseId,
          assignmentType: 'CLASS',
          isTemplate: false
        })
      });
      if (res.ok) {
        await fetchStructuredTasks();
        window.alert('¡Tarea duplicada con éxito en esta clase!');
      } else {
        window.alert('No se pudo duplicar la tarea.');
      }
    } catch (err) {
      console.error(err);
      window.alert('Error de conexión.');
    }
  };

  const handleSaveAsTemplate = async (task: TaskItem) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/api/structured-tasks/${task.id}/save-as-template`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        window.alert('¡Tarea guardada con éxito en el Catálogo Central de Plantillas!');
      } else {
        window.alert('No se pudo guardar como plantilla.');
      }
    } catch (err) {
      console.error(err);
      window.alert('Error de conexión.');
    }
  };

  const openTemplateModal = async () => {
    setIsTemplateModalOpen(true);
    try {
      setTemplateLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/api/structured-tasks/templates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setTemplateCatalog(await res.json());
      }
    } catch (err) {
      console.error('Error loading template catalog', err);
    } finally {
      setTemplateLoading(false);
    }
  };

  const handleAssignTemplateToCourse = async (templateId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/api/structured-tasks/${templateId}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          courseId,
          assignmentType: 'CLASS',
          isTemplate: false
        })
      });
      if (res.ok) {
        setIsTemplateModalOpen(false);
        await fetchStructuredTasks();
        window.alert('¡Plantilla asignada con éxito a esta clase!');
      } else {
        window.alert('No se pudo asignar la plantilla.');
      }
    } catch (err) {
      console.error(err);
      window.alert('Error de conexión.');
    }
  };

  const getMaterial = (id?: string | null) => materials.find(m => m.id === id);

  const getMaterialIcon = (type?: string, size = 16) => {
    switch (type) {
      case 'FORM': return <ClipboardCheck size={size} style={{ color: '#059669' }} />;
      case 'VIDEO': return <Video size={size} style={{ color: '#ef4444' }} />;
      case 'AUDIO': return <Headphones size={size} style={{ color: '#f59e0b' }} />;
      case 'IMAGE': return <ImageIcon size={size} style={{ color: '#8b5cf6' }} />;
      default: return <FileText size={size} style={{ color: '#0284c7' }} />;
    }
  };

  const getMaterialTypeLabel = (type?: string) => {
    switch (type) {
      case 'FORM': return 'Examen / Formulario';
      case 'VIDEO': return 'Vídeo';
      case 'AUDIO': return 'Audio / Listening';
      case 'IMAGE': return 'Imagen / Infografía';
      default: return 'Documento';
    }
  };

  const filteredPickerMaterials = materials.filter(m => {
    const matchesSearch = !materialSearch || m.title.toLowerCase().includes(materialSearch.toLowerCase()) || (m.description && m.description.toLowerCase().includes(materialSearch.toLowerCase()));
    const matchesType = materialTypeFilter === 'ALL' || m.type === materialTypeFilter;
    return matchesSearch && matchesType;
  });

  // Agrupación directa de Tareas por Disciplina / Categoría
  const groupedTasks = SKILL_CATEGORIES.map(cat => ({
    ...cat,
    tasks: structuredTasks.filter(t => (t.category || 'GRAMMAR_VOCABULARY') === cat.id)
  }));

  return (
    <div>
      {/* Barra Superior de Acciones de Clase */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => openCreateTask()}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={18} /> Nueva Tarea
          </button>
          <button
            type="button"
            onClick={openTemplateModal}
            className="btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: '#fff',
              border: '1px solid var(--primary-border)',
              color: 'var(--primary-text)',
              fontWeight: 600,
              padding: '0.6rem 1.1rem',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            <BookmarkPlus size={18} /> + Asignar desde Plantilla
          </button>
        </div>

        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          {structuredTasks.length} {structuredTasks.length === 1 ? 'tarea en total' : 'tareas en total'}
        </span>
      </div>

      {loading ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
          Cargando tareas de la clase...
        </div>
      ) : structuredTasks.length === 0 ? (
        <div style={{ padding: '3rem 2rem', border: '1px dashed var(--primary-border)', borderRadius: '12px', background: 'var(--primary-subtle)', textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2rem' }}>
          <ListChecks size={42} style={{ color: 'var(--primary)', opacity: 0.5, marginBottom: '0.75rem' }} />
          <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-main)', fontSize: '1.2rem' }}>Aún no hay tareas en esta clase</h3>
          <p style={{ margin: '0 0 1.25rem', fontSize: '0.9rem' }}>Crea tu primera tarea o asígnala al instante desde el catálogo de plantillas didácticas.</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button onClick={() => openCreateTask()} className="btn-primary">
              <Plus size={16} /> Crear Tarea
            </button>
            <button onClick={openTemplateModal} className="btn-secondary">
              <BookmarkPlus size={16} /> Ver Plantillas
            </button>
          </div>
        </div>
      ) : null}

      {/* Disciplinas / Categorías con Acordeones Desplegables */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {groupedTasks.map(group => {
          const isExpanded = !!expandedTopics[group.id];
          return (
            <div key={group.id} className="glass-panel" style={{ padding: '1.25rem 1.5rem', borderRadius: '12px' }}>
              <div
                onClick={() => toggleTopic(group.id)}
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleTopic(group.id); } }}
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
                  <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {group.label}
                  </h3>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '12px', background: group.tasks.length > 0 ? 'var(--primary-light)' : 'var(--surface-alt)', color: group.tasks.length > 0 ? 'var(--primary-text)' : 'var(--text-muted)' }}>
                    {group.tasks.length} {group.tasks.length === 1 ? 'tarea' : 'tareas'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); openCreateTask(group.id); }}
                    className="btn-secondary"
                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                    title={`Añadir tarea a ${group.label}`}
                  >
                    <Plus size={14} /> Añadir
                  </button>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
                    aria-label={isExpanded ? 'Contraer disciplina' : 'Expandir disciplina'}
                  >
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {group.tasks.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', margin: '0.5rem 0', paddingLeft: '0.5rem', fontSize: '0.9rem' }}>
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
                        assignedStudentName: task.assignedStudentName,
                        assignedStudentNames: task.assignedStudentNames,
                        courseId: task.courseId,
                        stats: task.stats,
                        steps: (task.steps || []).map((s: any) => ({
                          id: s.id,
                          order: s.order,
                          title: s.title,
                          materialId: s.materialId,
                          material: s.material,
                          isCompleted: s.isCompleted,
                          submission: s.submission
                        }))
                      };

                      return (
                        <TaskCard
                          key={task.id}
                          task={taskItem}
                          mode="TEACHER"
                          onEditTask={openEditTask}
                          onDuplicateTask={handleDuplicateTask}
                          onSaveAsTemplate={handleSaveAsTemplate}
                          onDeleteTask={handleDeleteTask}
                          onOpenStep={(step) => {
                            if (step.material?.type === 'FORM' && step.material.formData) {
                              setReviewingExam({
                                title: step.material.title,
                                questions: step.material.formData.questions || [],
                                answers: {},
                                score: null,
                                total: step.material.formData.questions?.length || 0
                              });
                            } else if (step.material?.url) {
                              window.open(step.material.url, '_blank', 'noopener,noreferrer');
                            }
                          }}
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

      {/* Modal: Crear / Editar Tarea */}
      {isTaskModalOpen && (
        <div className="modal-backdrop" style={modalBackdropStyle} onClick={() => setIsTaskModalOpen(false)}>
          <form
            onSubmit={saveTask}
            className="glass-panel modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(100%, 580px)',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              padding: '1.5rem',
              overflow: 'hidden'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.75rem' }}>
              <div>
                <h2 style={{ margin: '0 0 0.25rem', color: 'var(--text-main)', fontSize: '1.25rem' }}>
                  {editingTask ? 'Editar Tarea' : 'Nueva Tarea para esta Clase'}
                </h2>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Configura la disciplina, fecha y los pasos (1 o varios) de la tarea.
                </p>
              </div>
              <button type="button" onClick={() => setIsTaskModalOpen(false)} aria-label="Cerrar" className="modal-close" style={{ position: 'static' }}>
                <X size={19} />
              </button>
            </div>

            {taskFormError && (
              <div style={{ marginBottom: '0.75rem', padding: '0.65rem 0.85rem', border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b', borderRadius: '8px', fontSize: '0.85rem' }}>
                {taskFormError}
              </div>
            )}

            {/* Cuerpo con Scroll */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 600 }}>Título de la Tarea</label>
                <input
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Ej. B2 Essay: Artificial Intelligence"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 600 }}>Descripción / Instrucciones (Opcional)</label>
                <textarea
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Pautas o instrucciones para el alumno..."
                  rows={2}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 600 }}>Disciplina / Skill</label>
                  <select
                    value={taskCategory}
                    onChange={(e) => setTaskCategory(e.target.value)}
                    style={inputStyle}
                  >
                    {SKILL_CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 600 }}>Trimestre</label>
                  <select
                    value={taskTerm}
                    onChange={(e) => setTaskTerm(Number(e.target.value))}
                    style={inputStyle}
                  >
                    <option value={1}>1º Trimestre (Sep - Dic)</option>
                    <option value={2}>2º Trimestre (Ene - Mar)</option>
                    <option value={3}>3º Trimestre (Abr - Jun)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 600 }}>Fecha Límite</label>
                  <input
                    type="datetime-local"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem', background: 'var(--primary-subtle)', borderRadius: '8px', border: '1px solid var(--primary-border)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', cursor: 'pointer', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={taskIsSequential}
                    onChange={(e) => setTaskIsSequential(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                  />
                  <span>Flujo secuencial paso a paso (bloquear paso siguiente hasta completar el anterior)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', cursor: 'pointer', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={taskIsTemplate}
                    onChange={(e) => setTaskIsTemplate(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                  />
                  <span>⭐ Guardar también como Plantilla Reutilizable en el Catálogo</span>
                </label>
              </div>

              {/* Lista de Pasos */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ color: 'var(--text-main)', fontSize: '0.88rem', fontWeight: 600 }}>Pasos de la Tarea ({taskSteps.length})</label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Una tarea puede ser de 1 paso o multi-paso</span>
                </div>

                {taskSteps.map((step, index) => {
                  const linkedMaterial = getMaterial(step.materialId);
                  return (
                    <div key={step.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface-alt)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '32px minmax(0, 1fr) minmax(160px, 0.8fr) 32px', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary-text)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem' }}>
                          {index + 1}
                        </span>

                        <input
                          required
                          value={step.title}
                          onChange={(e) => updateStep(index, { title: e.target.value })}
                          placeholder="Instrucción del paso..."
                          style={{ ...inputStyle, marginTop: 0 }}
                        />

                        {linkedMaterial ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.6rem', border: '1px solid var(--primary-border)', borderRadius: '6px', background: 'var(--primary-light)', color: 'var(--primary-text)', fontSize: '0.78rem' }}>
                            {getMaterialIcon(linkedMaterial.type)}
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{linkedMaterial.title}</span>
                            <button type="button" onClick={() => updateStep(index, { materialId: null })} style={{ border: 'none', background: 'transparent', color: '#b91c1c', cursor: 'pointer', padding: 0 }} title="Quitar material"><X size={14} /></button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => { setMaterialPickerStepIndex(index); setMaterialSearch(''); }}
                            className="btn-secondary"
                            style={{ padding: '0.45rem 0.6rem', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                          >
                            📎 Asociar Material
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => removeStep(index)}
                          disabled={taskSteps.length <= 1}
                          style={{ border: 'none', background: 'transparent', color: taskSteps.length <= 1 ? '#cbd5e1' : '#b91c1c', cursor: taskSteps.length <= 1 ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center' }}
                          title="Eliminar paso"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {(() => {
                        const isPassive = linkedMaterial && (linkedMaterial.type === 'VIDEO' || linkedMaterial.type === 'AUDIO' || linkedMaterial.type === 'IMAGE');
                        const isForm = linkedMaterial?.type === 'FORM';

                        if (isPassive) {
                          return (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '36px' }}>
                              <span>📖 Recurso didáctico (Formativo / No evaluable)</span>
                            </div>
                          );
                        }

                        return (
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: isForm ? 'default' : 'pointer', fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '36px' }}>
                            <input
                              type="checkbox"
                              checked={isForm || Boolean(step.requiresSubmission)}
                              disabled={isForm}
                              onChange={(e) => updateStep(index, { requiresSubmission: e.target.checked })}
                              style={{ width: '14px', height: '14px', accentColor: 'var(--primary)' }}
                            />
                            <span>{isForm ? '📝 Examen autocorregible con nota' : '📝 Paso evaluable (requiere entrega y nota numérica)'}</span>
                          </label>
                        );
                      })()}
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={addStep}
                  className="btn-secondary"
                  style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.8rem', fontSize: '0.82rem' }}
                >
                  <Plus size={15} /> Añadir otro paso
                </button>
              </div>
            </div>

            {/* Footer Fijo */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', paddingTop: '1rem', marginTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
              <button type="button" onClick={() => setIsTaskModalOpen(false)} className="btn-secondary" disabled={isSavingTask}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" disabled={isSavingTask}>
                {isSavingTask ? 'Guardando...' : 'Guardar Tarea'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Selector de Material para un Paso */}
      {materialPickerStepIndex !== null && createPortal(
        <div className="modal-backdrop" style={modalBackdropStyle} onClick={() => setMaterialPickerStepIndex(null)}>
          <div className="glass-panel modal-card modal-card--wide" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '760px', maxHeight: '88vh', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>Seleccionar Material de la Academia</h3>
                <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Elige el material o cuestionario para este paso de la tarea.</p>
              </div>
              <button type="button" onClick={() => setMaterialPickerStepIndex(null)} className="modal-close"><X size={19} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  value={materialSearch}
                  onChange={(e) => setMaterialSearch(e.target.value)}
                  placeholder="Buscar por título o descripción..."
                  style={{ ...inputStyle, paddingLeft: '2.25rem', marginTop: 0 }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {([['ALL', 'Todos'], ['DOCUMENT', 'Documentos'], ['VIDEO', 'Vídeos'], ['AUDIO', 'Audios'], ['FORM', 'Exámenes']] as const).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setMaterialTypeFilter(val)}
                    className={materialTypeFilter === val ? 'btn-primary' : 'btn-secondary'}
                    style={{ padding: '0.35rem 0.7rem', fontSize: '0.78rem' }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem', maxHeight: '55vh', overflowY: 'auto', padding: '0.2rem' }}>
              {filteredPickerMaterials.map(m => (
                <article key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.85rem', border: '1px solid var(--border)', borderRadius: '10px', background: 'var(--surface)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary-text)', fontSize: '0.72rem', fontWeight: 700 }}>
                    {getMaterialIcon(m.type)} <span>{getMaterialTypeLabel(m.type)}</span>
                    <span style={{ marginLeft: 'auto', padding: '0.15rem 0.4rem', borderRadius: '999px', background: 'var(--primary-light)', border: '1px solid var(--primary-border)' }}>{m.level || 'GENERAL'}</span>
                  </div>
                  <strong style={{ color: 'var(--text-main)', fontSize: '0.92rem' }}>{m.title}</strong>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.75rem', minHeight: '2.2rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {m.description || 'Sin descripción disponible.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const isPassive = m.type === 'VIDEO' || m.type === 'AUDIO' || m.type === 'IMAGE';
                      updateStep(materialPickerStepIndex, {
                        materialId: m.id,
                        requiresSubmission: m.type === 'FORM' ? true : (isPassive ? false : undefined)
                      });
                      setMaterialPickerStepIndex(null);
                    }}
                    className="btn-primary"
                    style={{ width: '100%', padding: '0.45rem', fontSize: '0.8rem', marginTop: 'auto' }}
                  >
                    ✓ Seleccionar
                  </button>
                </article>
              ))}
              {filteredPickerMaterials.length === 0 && (
                <p style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No se encontraron materiales con los filtros aplicados.
                </p>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Catálogo de Plantillas */}
      {isTemplateModalOpen && createPortal(
        <div className="modal-backdrop" style={modalBackdropStyle} onClick={() => setIsTemplateModalOpen(false)}>
          <div className="glass-panel modal-card modal-card--wide" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '780px', maxHeight: '88vh', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <BookmarkPlus style={{ color: 'var(--primary)' }} /> Catálogo de Plantillas Didácticas
                </h2>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Selecciona una plantilla para clonarla y asignarla directamente a esta clase con 1 clic.
                </p>
              </div>
              <button type="button" onClick={() => setIsTemplateModalOpen(false)} className="modal-close"><X size={20} /></button>
            </div>

            <div style={{ maxHeight: '60vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.25rem' }}>
              {templateLoading ? (
                <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Cargando catálogo...</p>
              ) : templateCatalog.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  <p>No hay plantillas guardadas en el catálogo central todavía.</p>
                  <small>Puedes marcar "Guardar como plantilla" al crear o editar una tarea.</small>
                </div>
              ) : (
                templateCatalog.map((tpl) => (
                  <div key={tpl.id} style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '1rem', background: 'var(--surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '240px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '8px', background: 'var(--primary-light)', color: 'var(--primary-text)' }}>
                          {tpl.category || 'General'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {tpl.steps?.length || 0} pasos
                        </span>
                      </div>
                      <h4 style={{ margin: '0 0 0.25rem', fontSize: '1.05rem', color: 'var(--text-main)' }}>{tpl.title}</h4>
                      {tpl.description && (
                        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>{tpl.description}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAssignTemplateToCourse(tpl.id)}
                      className="btn-primary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                    >
                      ✓ Asignar a esta clase
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de Previsualización de Examen */}
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
    </div>
  );
};

const inputStyle: React.CSSProperties = { width: '100%', marginTop: '0.35rem', padding: '0.65rem 0.75rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface-alt)', color: 'var(--text-main)', outline: 'none' };
const modalBackdropStyle: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 100, display: 'grid', placeItems: 'center', padding: '1rem', background: 'rgba(0, 0, 0, 0.45)', backdropFilter: 'blur(4px)' };

export default ClassworkTab;
