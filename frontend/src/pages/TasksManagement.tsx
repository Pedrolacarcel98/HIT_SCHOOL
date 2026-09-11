import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  BookmarkCheck,
  BookOpen,
  ClipboardCheck,
  Copy,
  FileText,
  Headphones,
  Image,
  Layers,
  ListTodo,
  Pencil,
  Plus,
  Search,
  Trash2,
  Video,
  X,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import TaskCard, { type TaskItem } from '../components/TaskCard';
import MaterialViewerModal from '../components/MaterialViewerModal';
import { toLocalDatetimeInput, toIsoDateString, getCurrentLocalDatetimeInput } from '../utils/dateUtils';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface Material {
  id: string;
  title: string;
  description?: string;
  type: 'DOCUMENT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FORM';
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'GENERAL';
  category: 'GRAMMAR_VOCABULARY' | 'READING' | 'SPEAKING' | 'WRITING' | 'LISTENING' | 'MOCK_EXAM';
  url?: string;
  formData?: any;
  createdAt: string;
}

interface Course {
  id: string;
  title: string;
}

interface StepFormItem {
  id?: string;
  order: number;
  title: string;
  materialId?: string | null;
  requiresSubmission?: boolean;
}

const SKILL_CATEGORIES = [
  { id: 'GRAMMAR_VOCABULARY', label: 'Grammar & Vocabulary' },
  { id: 'READING', label: 'Reading' },
  { id: 'WRITING', label: 'Writing' },
  { id: 'LISTENING', label: 'Listening' },
  { id: 'SPEAKING', label: 'Speaking' },
  { id: 'MOCK_EXAM', label: 'Mock Exams' }
];

const TasksManagement: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Pestaña activa: 'TEMPLATES' (Plantillas) o 'ASSIGNED' (Tareas en Clases)
  const tabParam = searchParams.get('tab');
  const savedTab = sessionStorage.getItem('hit_tasks_management_tab');
  const initialTab: 'TEMPLATES' | 'ASSIGNED' = (tabParam === 'ASSIGNED' || tabParam === 'TEMPLATES')
    ? tabParam
    : (savedTab === 'ASSIGNED' || savedTab === 'TEMPLATES' ? (savedTab as 'TEMPLATES' | 'ASSIGNED') : 'TEMPLATES');

  const [activeTab, setActiveTabState] = useState<'TEMPLATES' | 'ASSIGNED'>(initialTab);

  const setActiveTab = (tab: 'TEMPLATES' | 'ASSIGNED') => {
    setActiveTabState(tab);
    sessionStorage.setItem('hit_tasks_management_tab', tab);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (tab === 'TEMPLATES') {
        next.delete('tab');
      } else {
        next.set('tab', tab);
      }
      return next;
    }, { replace: true });
  };

  useEffect(() => {
    if (tabParam && (tabParam === 'ASSIGNED' || tabParam === 'TEMPLATES') && tabParam !== activeTab) {
      setActiveTabState(tabParam);
      sessionStorage.setItem('hit_tasks_management_tab', tabParam);
    }
  }, [tabParam]);
  const [loading, setLoading] = useState(true);

  // Datos
  const [templates, setTemplates] = useState<TaskItem[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<TaskItem[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [courseFilter, setCourseFilter] = useState('ALL');

  // Modal Crear / Editar Tarea o Plantilla
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskCategory, setTaskCategory] = useState('GRAMMAR_VOCABULARY');
  const [taskTerm, setTaskTerm] = useState(1);
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskPublishAt, setTaskPublishAt] = useState('');
  const [taskIsSequential, setTaskIsSequential] = useState(false);
  const [taskIsTemplate, setTaskIsTemplate] = useState(true);
  const [taskCourseId, setTaskCourseId] = useState('');
  const [taskSteps, setTaskSteps] = useState<StepFormItem[]>([]);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Modal para seleccionar material para un paso
  const [pickerStepIndex, setPickerStepIndex] = useState<number | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerTypeFilter, setPickerTypeFilter] = useState<string>('ALL');

  // Modal rápido para asignar plantilla a clase
  const [assigningTemplate, setAssigningTemplate] = useState<TaskItem | null>(null);
  const [assignCourseId, setAssignCourseId] = useState('');
  const [assignDueDate, setAssignDueDate] = useState('');
  const [assignPublishAt, setAssignPublishAt] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignError, setAssignError] = useState('');

  // Visor de material
  const [viewingMaterial, setViewingMaterial] = useState<Material | null>(null);

  // Carga inicial de datos
  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [templatesRes, tasksRes, materialsRes, coursesRes] = await Promise.all([
        fetch(`${apiUrl}/api/structured-tasks/templates`, { headers }),
        fetch(`${apiUrl}/api/structured-tasks/teacher`, { headers }),
        fetch(`${apiUrl}/api/materials`, { headers }),
        fetch(`${apiUrl}/api/courses`, { headers })
      ]);

      if (templatesRes.ok) {
        const data = await templatesRes.json();
        setTemplates(data);
      }

      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setAssignedTasks(data.filter((t: any) => !t.isTemplate));
      }

      if (materialsRes.ok) {
        setMaterials(await materialsRes.json());
      }

      if (coursesRes.ok) {
        const coursesData = await coursesRes.json();
        setCourses(coursesData);
        if (coursesData.length > 0 && !assignCourseId) {
          setAssignCourseId(coursesData[0].id);
        }
      }
    } catch (err) {
      console.error('Error al cargar datos de tareas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getMaterial = (id?: string | null) => materials.find((m) => m.id === id);

  // Abrir modal de creación limpio
  const handleOpenCreateModal = (isTemplate = true) => {
    setEditingTaskId(null);
    setTaskTitle('');
    setTaskDescription('');
    setTaskCategory('GRAMMAR_VOCABULARY');
    setTaskTerm(1);
    setTaskDueDate('');
    setTaskPublishAt('');
    setTaskIsSequential(false);
    setTaskIsTemplate(isTemplate);
    setTaskCourseId(courses[0]?.id || '');
    setTaskSteps([
      { order: 1, title: '1. ' }
    ]);
    setFormError('');
    setIsFormModalOpen(true);
  };

  // Abrir modal de edición
  const handleOpenEditModal = (task: TaskItem) => {
    setEditingTaskId(task.id);
    setTaskTitle(task.title);
    setTaskDescription(task.description || '');
    setTaskCategory(task.category || 'GRAMMAR_VOCABULARY');
    setTaskIsSequential(Boolean(task.isSequential));
    setTaskIsTemplate(Boolean(task.isTemplate));
    setTaskCourseId(task.courseId || courses[0]?.id || '');
    setTaskDueDate(toLocalDatetimeInput(task.dueDate));
    setTaskPublishAt(toLocalDatetimeInput(task.publishAt));
    setTaskSteps(
      (task.steps || []).map((s: any, idx: number) => ({
        id: s.id,
        order: idx + 1,
        title: s.title,
        materialId: s.materialId || s.material?.id || null,
        requiresSubmission: Boolean(s.requiresSubmission)
      }))
    );
    setFormError('');
    setIsFormModalOpen(true);
  };

  // Pasos: Añadir, quitar, reordenar
  const handleAddStep = () => {
    const nextOrder = taskSteps.length + 1;
    setTaskSteps([
      ...taskSteps,
      { order: nextOrder, title: `${nextOrder}. ` }
    ]);
  };

  const handleRemoveStep = (index: number) => {
    if (taskSteps.length <= 1) return;
    const newSteps = taskSteps.filter((_, i) => i !== index).map((s, idx) => ({ ...s, order: idx + 1 }));
    setTaskSteps(newSteps);
  };

  const handleMoveStep = (index: number, direction: 'UP' | 'DOWN') => {
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= taskSteps.length) return;
    const newSteps = [...taskSteps];
    const temp = newSteps[index];
    newSteps[index] = newSteps[targetIndex];
    newSteps[targetIndex] = temp;
    setTaskSteps(newSteps.map((s, idx) => ({ ...s, order: idx + 1 })));
  };

  const handleUpdateStep = (index: number, patch: Partial<StepFormItem>) => {
    const newSteps = [...taskSteps];
    newSteps[index] = { ...newSteps[index], ...patch };
    setTaskSteps(newSteps);
  };

  // Guardar tarea / plantilla (Crear o Actualizar)
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      setFormError('Por favor, indica un título para la tarea o plantilla.');
      return;
    }

    if (taskSteps.length === 0 || taskSteps.some((s) => !s.title.trim())) {
      setFormError('Todos los pasos deben tener un título o instrucción definida.');
      return;
    }

    if (!taskIsTemplate && !taskCourseId) {
      setFormError('Selecciona la clase destinataria para asignar la tarea.');
      return;
    }

    try {
      setIsSaving(true);
      setFormError('');
      const token = localStorage.getItem('token');

      const payload = {
        title: taskTitle.trim(),
        description: taskDescription.trim() || undefined,
        dueDate: !taskIsTemplate ? toIsoDateString(taskDueDate) : undefined,
        publishAt: !taskIsTemplate ? toIsoDateString(taskPublishAt) : undefined,
        term: taskTerm,
        category: taskCategory,
        isTemplate: taskIsTemplate,
        courseId: taskIsTemplate ? undefined : taskCourseId,
        assignmentType: 'CLASS',
        isSequential: taskIsSequential,
        steps: taskSteps.map((s, idx) => ({
          id: s.id,
          order: idx + 1,
          title: s.title.trim(),
          materialId: s.materialId || null,
          requiresSubmission: Boolean(s.requiresSubmission)
        }))
      };

      const url = editingTaskId ? `${apiUrl}/api/structured-tasks/${editingTaskId}` : `${apiUrl}/api/structured-tasks`;
      const method = editingTaskId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al guardar la tarea estructurada.');
      }

      await fetchData();
      setIsFormModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Error al guardar la tarea estructurada.');
    } finally {
      setIsSaving(false);
    }
  };

  // Duplicar tarea o plantilla
  const handleDuplicate = async (task: TaskItem) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/api/structured-tasks/${task.id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: `[Copia] ${task.title}`,
          isTemplate: task.isTemplate
        })
      });

      if (!res.ok) throw new Error('Error al duplicar.');
      await fetchData();
    } catch (err) {
      window.alert('No se pudo duplicar la tarea o plantilla.');
    }
  };

  // Guardar tarea existente como plantilla
  const handleSaveAsTemplate = async (task: TaskItem) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/api/structured-tasks/${task.id}/save-as-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: `[Plantilla] ${task.title}` })
      });

      if (res.ok) {
        window.alert('¡Plantilla guardada con éxito en el catálogo!');
        await fetchData();
      } else {
        const data = await res.json().catch(() => ({}));
        window.alert(data.error || 'No se pudo guardar como plantilla.');
      }
    } catch (err) {
      window.alert('Error de conexión al guardar plantilla.');
    }
  };

  // Eliminar tarea o plantilla
  const handleDelete = async (task: TaskItem) => {
    if (!window.confirm(`¿Estás seguro de eliminar "${task.title}"? Esta acción no se puede deshacer.`)) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/api/structured-tasks/${task.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        await fetchData();
      } else {
        window.alert('No se pudo eliminar la tarea.');
      }
    } catch (err) {
      window.alert('Error al eliminar.');
    }
  };

  // Asignar plantilla rápida a una clase
  const handleOpenAssignModal = (template: TaskItem) => {
    setAssigningTemplate(template);
    setAssignCourseId(courses[0]?.id || '');
    setAssignDueDate('');
    setAssignPublishAt('');
    setAssignError('');
  };

  const handleConfirmAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningTemplate || !assignCourseId) return;

    if (assignDueDate && assignPublishAt && new Date(assignPublishAt) >= new Date(assignDueDate)) {
      setAssignError('La fecha de publicación debe ser anterior a la fecha límite de entrega.');
      return;
    }

    try {
      setIsAssigning(true);
      setAssignError('');
      const token = localStorage.getItem('token');
      const selectedCourse = courses.find((c) => c.id === assignCourseId);

      const res = await fetch(`${apiUrl}/api/structured-tasks/${assigningTemplate.id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: assigningTemplate.title.replace(/^\[Plantilla\]\s*/i, ''),
          courseId: assignCourseId,
          assignmentType: 'CLASS',
          isTemplate: false,
          dueDate: toIsoDateString(assignDueDate),
          publishAt: toIsoDateString(assignPublishAt)
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al asignar la plantilla a la clase.');
      }

      window.alert(`¡Plantilla asignada con éxito a la clase "${selectedCourse?.title || 'seleccionada'}"!`);
      setAssigningTemplate(null);
      await fetchData();
      setActiveTab('ASSIGNED');
    } catch (err: any) {
      setAssignError(err.message || 'Error al asignar la plantilla.');
    } finally {
      setIsAssigning(false);
    }
  };

  // Filtrado de plantillas y tareas
  const filteredTemplates = templates.filter((t) => {
    const q = searchTerm.trim().toLowerCase();
    const matchQ = !q || t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q);
    const matchCat = categoryFilter === 'ALL' || t.category === categoryFilter;
    return matchQ && matchCat;
  });

  const filteredAssignedTasks = assignedTasks.filter((t) => {
    const q = searchTerm.trim().toLowerCase();
    const matchQ = !q || t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q);
    const matchCat = categoryFilter === 'ALL' || t.category === categoryFilter;
    const matchCourse = courseFilter === 'ALL' || t.courseId === courseFilter;
    return matchQ && matchCat && matchCourse;
  });

  // Materiales para el picker
  const filteredPickerMaterials = materials.filter((m) => {
    const q = pickerSearch.trim().toLowerCase();
    const matchQ = !q || m.title.toLowerCase().includes(q) || (m.description || '').toLowerCase().includes(q);
    const matchType = pickerTypeFilter === 'ALL' || m.type === pickerTypeFilter;
    return matchQ && matchType;
  });

  const getMaterialIcon = (type?: string, size = 16) => {
    switch (type) {
      case 'FORM': return <ClipboardCheck size={size} style={{ color: '#059669' }} />;
      case 'VIDEO': return <Video size={size} style={{ color: '#ef4444' }} />;
      case 'AUDIO': return <Headphones size={size} style={{ color: '#f59e0b' }} />;
      case 'IMAGE': return <Image size={size} style={{ color: '#8b5cf6' }} />;
      default: return <FileText size={size} style={{ color: '#0284c7' }} />;
    }
  };

  const getMaterialTypeLabel = (type?: string) => {
    switch (type) {
      case 'VIDEO': return 'Vídeo';
      case 'AUDIO': return 'Audio';
      case 'FORM': return 'Examen';
      case 'IMAGE': return 'Imagen';
      default: return 'Documento';
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    marginTop: '0.35rem',
    padding: '0.65rem 0.75rem',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    background: 'var(--surface-alt)',
    color: 'var(--text-main)',
    outline: 'none',
    boxSizing: 'border-box'
  };

  const modalBackdropStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 100,
    display: 'grid',
    placeItems: 'center',
    padding: '1rem',
    background: 'rgba(0, 0, 0, 0.45)',
    backdropFilter: 'blur(4px)'
  };

  return (
    <div className="animate-fade-in" style={{ padding: '2rem 1.5rem', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Cabecera Principal */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
            <span style={{ display: 'inline-flex', padding: '0.35rem', borderRadius: '10px', background: 'var(--primary-light)', color: 'var(--primary)' }}>
              <ListTodo size={22} />
            </span>
            <h1 style={{ margin: 0, fontSize: '1.65rem', color: 'var(--text-main)' }}>Gestión de Tareas y Plantillas</h1>
          </div>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.92rem' }}>
            Diseña plantillas pedagógicas reutilizables y administra el trabajo asignado a tus clases.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => handleOpenCreateModal(true)}
            className="btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.15rem',
              borderRadius: '10px',
              fontSize: '0.9rem',
              fontWeight: 600
            }}
          >
            <Plus size={18} /> Nueva Plantilla
          </button>

          <button
            type="button"
            onClick={() => handleOpenCreateModal(false)}
            className="btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.15rem',
              borderRadius: '10px',
              fontSize: '0.9rem',
              fontWeight: 600,
              background: '#fff',
              border: '1px solid var(--border)'
            }}
          >
            <BookOpen size={17} style={{ color: 'var(--primary)' }} /> Asignar Tarea a Clase
          </button>
        </div>
      </div>

      {/* Pestañas Principales: Plantillas vs Tareas Asignadas */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid var(--border)', marginBottom: '1.5rem' }}>
        <button
          type="button"
          onClick={() => { setActiveTab('TEMPLATES'); setSearchTerm(''); }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'TEMPLATES' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'TEMPLATES' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: 'pointer',
            marginBottom: '-2px',
            transition: 'all 0.2s ease'
          }}
        >
          <BookmarkCheck size={18} />
          <span>Plantillas de Tareas</span>
          <span style={{ padding: '0.15rem 0.5rem', borderRadius: '12px', background: activeTab === 'TEMPLATES' ? 'var(--primary-light)' : 'var(--surface-alt)', color: activeTab === 'TEMPLATES' ? 'var(--primary)' : 'var(--text-muted)', fontSize: '0.75rem' }}>
            {templates.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('ASSIGNED'); setSearchTerm(''); }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'ASSIGNED' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'ASSIGNED' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: 'pointer',
            marginBottom: '-2px',
            transition: 'all 0.2s ease'
          }}
        >
          <Layers size={18} />
          <span>Tareas Asignadas a Clases</span>
          <span style={{ padding: '0.15rem 0.5rem', borderRadius: '12px', background: activeTab === 'ASSIGNED' ? 'var(--primary-light)' : 'var(--surface-alt)', color: activeTab === 'ASSIGNED' ? 'var(--primary)' : 'var(--text-muted)', fontSize: '0.75rem' }}>
            {assignedTasks.length}
          </span>
        </button>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="glass-panel" style={{ padding: '0.85rem 1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ position: 'relative', flex: '1 1 260px' }}>
          <Search size={17} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder={activeTab === 'TEMPLATES' ? 'Buscar plantilla por nombre o pautas...' : 'Buscar tarea asignada...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.4rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)', fontSize: '0.88rem', outline: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Skill CEFR:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', fontSize: '0.82rem', color: 'var(--text-main)' }}
            >
              <option value="ALL">Todas las Skills</option>
              {SKILL_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          {activeTab === 'ASSIGNED' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Clase:</span>
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', fontSize: '0.82rem', color: 'var(--text-main)' }}
              >
                <option value="ALL">Todas las Clases</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Contenido Principal */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          Cargando catálogo de tareas y plantillas...
        </div>
      ) : activeTab === 'TEMPLATES' ? (
        /* VISTA 1: PLANTILLAS REUTILIZABLES */
        filteredTemplates.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <BookmarkCheck size={52} style={{ color: 'var(--primary)', opacity: 0.4, margin: '0 auto 1rem' }} />
            <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-main)', fontSize: '1.2rem' }}>No hay plantillas creadas</h3>
            <p style={{ margin: '0 0 1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Crea tu primera plantilla multi-paso para asignarla a cualquier clase con un solo clic.
            </p>
            <button
              type="button"
              onClick={() => handleOpenCreateModal(true)}
              className="btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem', borderRadius: '8px' }}
            >
              <Plus size={18} /> Crear Primera Plantilla
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {filteredTemplates.map((template) => (
              <article
                key={template.id}
                className="glass-panel"
                style={{
                  padding: '1.25rem 1.5rem',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  borderLeft: '5px solid var(--primary)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: '6px', background: 'var(--primary-light)', color: 'var(--primary)' }}>
                        {template.category || 'General'}
                      </span>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: '6px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                        ⭐ Plantilla Catálogo
                      </span>
                      {template.isSequential && (
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: '6px', background: '#fef3c7', color: '#92400e' }}>
                          Paso a paso (secuencial)
                        </span>
                      )}
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {template.steps.length} {template.steps.length === 1 ? 'paso' : 'pasos'}
                      </span>
                    </div>

                    <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-main)' }}>{template.title}</h3>
                    {template.description && (
                      <p style={{ margin: '0.35rem 0 0', color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.4 }}>
                        {template.description}
                      </p>
                    )}
                  </div>

                  {/* Botones de Acción de Plantilla */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => handleOpenAssignModal(template)}
                      className="btn-primary"
                      style={{
                        padding: '0.45rem 0.9rem',
                        fontSize: '0.82rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        borderRadius: '8px',
                        fontWeight: 600
                      }}
                    >
                      <BookOpen size={15} /> Asignar a Clase
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(template)}
                      style={{
                        padding: '0.45rem 0.85rem',
                        fontSize: '0.82rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--text-main)',
                        cursor: 'pointer',
                        fontWeight: 600
                      }}
                    >
                      <Pencil size={14} /> Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDuplicate(template)}
                      style={{
                        padding: '0.45rem 0.85rem',
                        fontSize: '0.82rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--text-main)',
                        cursor: 'pointer',
                        fontWeight: 600
                      }}
                      title="Duplicar plantilla"
                    >
                      <Copy size={14} /> Duplicar
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(template)}
                      style={{
                        padding: '0.45rem',
                        borderRadius: '8px',
                        border: '1px solid #fecaca',
                        background: '#fff5f5',
                        color: '#dc2626',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center'
                      }}
                      title="Eliminar plantilla"
                      aria-label="Eliminar plantilla"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Desglose de Pasos de la Plantilla */}
                <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px dashed var(--border)', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
                    Pasos estructurados configurados:
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.6rem' }}>
                    {template.steps.map((step, idx) => (
                      <div
                        key={step.id || idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.45rem 0.75rem',
                          borderRadius: '8px',
                          background: 'var(--surface-alt)',
                          border: '1px solid var(--border)',
                          fontSize: '0.82rem'
                        }}
                      >
                        <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary-text)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
                          {idx + 1}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <strong style={{ display: 'block', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {step.title}
                          </strong>
                          {step.material && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              {getMaterialIcon(step.material.type, 13)} {step.material.title}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )
      ) : (
        /* VISTA 2: TAREAS ASIGNADAS A CLASES */
        filteredAssignedTasks.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <Layers size={52} style={{ color: 'var(--primary)', opacity: 0.4, margin: '0 auto 1rem' }} />
            <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-main)', fontSize: '1.2rem' }}>No hay tareas asignadas a clases</h3>
            <p style={{ margin: '0 0 1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Asigna una de tus plantillas a una clase o crea una tarea directa desde aquí.
            </p>
            <button
              type="button"
              onClick={() => handleOpenCreateModal(false)}
              className="btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem', borderRadius: '8px' }}
            >
              <Plus size={18} /> Asignar Tarea a Clase
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {filteredAssignedTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                mode="TEACHER"
                defaultExpanded={false}
                onEditTask={handleOpenEditModal}
                onDuplicateTask={handleDuplicate}
                onSaveAsTemplate={handleSaveAsTemplate}
                onDeleteTask={handleDelete}
                onOpenStep={(step) => {
                  if (step.material) {
                    setViewingMaterial(step.material as Material);
                  }
                }}
                onViewSubmissions={(t) => {
                  if (t.courseId) {
                    navigate(`/teacher/course/${t.courseId}?tab=grades`);
                  }
                }}
              />
            ))}
          </div>
        )
      )}

      {/* MODAL 1: Crear / Editar Tarea o Plantilla */}
      {isFormModalOpen && createPortal(
        <div className="modal-backdrop" style={modalBackdropStyle} onClick={() => setIsFormModalOpen(false)}>
          <form
            onSubmit={handleSaveTask}
            className="glass-panel modal-card modal-card--wide"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(100%, 900px)',
              maxWidth: '900px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              padding: '1.5rem',
              overflow: 'hidden'
            }}
          >
            {/* Cabecera del Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.75rem' }}>
              <div>
                <h2 style={{ margin: '0 0 0.25rem', color: 'var(--text-main)', fontSize: '1.25rem' }}>
                  {editingTaskId
                    ? (taskIsTemplate ? 'Editar Plantilla de Tarea' : 'Editar Tarea de Clase')
                    : (taskIsTemplate ? 'Nueva Plantilla Reutilizable' : 'Nueva Tarea para Clase')}
                </h2>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  {taskIsTemplate
                    ? 'Define una estructura pedagógica con 1 o varios pasos para guardarla en tu catálogo central.'
                    : 'Configura la disciplina, fecha y los pasos (1 o varios) de la tarea.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="modal-close"
                aria-label="Cerrar"
                style={{ position: 'static' }}
              >
                <X size={19} />
              </button>
            </div>

            {formError && (
              <div style={{ marginBottom: '0.75rem', padding: '0.65rem 0.85rem', border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b', borderRadius: '8px', fontSize: '0.85rem' }}>
                {formError}
              </div>
            )}

            {/* Cuerpo con Scroll */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 600 }}>
                  Título {taskIsTemplate ? 'de la Plantilla' : 'de la Tarea'}
                </label>
                <input
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder={taskIsTemplate ? 'Ej. [Plantilla] Módulo B1: Grammar, Listening & Writing' : 'Ej. B2 Essay: Artificial Intelligence'}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 600 }}>
                  Descripción / Instrucciones (Opcional)
                </label>
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

                {!taskIsTemplate && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 600 }}>Clase Destinataria</label>
                    <select
                      value={taskCourseId}
                      onChange={(e) => setTaskCourseId(e.target.value)}
                      style={inputStyle}
                      required
                    >
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>
                )}

                {!taskIsTemplate && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 600 }}>Fecha Límite</label>
                    <input
                      type="datetime-local"
                      value={taskDueDate}
                      onChange={(e) => setTaskDueDate(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                )}

                {!taskIsTemplate && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 600 }}>Publicar el</label>
                    <input type="datetime-local" value={taskPublishAt} onChange={(e) => setTaskPublishAt(e.target.value)} min={getCurrentLocalDatetimeInput()} style={inputStyle} />
                    <small style={{ display: 'block', marginTop: '0.25rem', color: 'var(--text-muted)', fontSize: '0.72rem' }}>Vacío: publicación inmediata.</small>
                  </div>
                )}
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
                  <span>⭐ Guardar como Plantilla Reutilizable en el Catálogo</span>
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
                    <div key={step.id || index} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface-alt)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) minmax(160px, 0.8fr) 32px', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary-text)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem' }}>
                            {index + 1}
                          </span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                            <button
                              type="button"
                              onClick={() => handleMoveStep(index, 'UP')}
                              disabled={index === 0}
                              style={{ border: 'none', background: 'transparent', cursor: index === 0 ? 'default' : 'pointer', color: index === 0 ? '#cbd5e1' : 'var(--text-muted)', padding: 0, lineHeight: 1 }}
                              title="Subir paso"
                            >
                              <ArrowUp size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveStep(index, 'DOWN')}
                              disabled={index === taskSteps.length - 1}
                              style={{ border: 'none', background: 'transparent', cursor: index === taskSteps.length - 1 ? 'default' : 'pointer', color: index === taskSteps.length - 1 ? '#cbd5e1' : 'var(--text-muted)', padding: 0, lineHeight: 1 }}
                              title="Bajar paso"
                            >
                              <ArrowDown size={12} />
                            </button>
                          </div>
                        </div>

                        <input
                          required
                          value={step.title}
                          onChange={(e) => handleUpdateStep(index, { title: e.target.value })}
                          placeholder="Instrucción del paso..."
                          style={{ ...inputStyle, marginTop: 0 }}
                        />

                        {linkedMaterial ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.6rem', border: '1px solid var(--primary-border)', borderRadius: '6px', background: 'var(--primary-light)', color: 'var(--primary-text)', fontSize: '0.78rem' }}>
                            {getMaterialIcon(linkedMaterial.type)}
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{linkedMaterial.title}</span>
                            <button type="button" onClick={() => handleUpdateStep(index, { materialId: null })} style={{ border: 'none', background: 'transparent', color: '#b91c1c', cursor: 'pointer', padding: 0 }} title="Quitar material"><X size={14} /></button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => { setPickerStepIndex(index); setPickerSearch(''); setPickerTypeFilter('ALL'); }}
                            className="btn-secondary"
                            style={{ padding: '0.45rem 0.6rem', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                          >
                            📎 Asociar Material
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleRemoveStep(index)}
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
                              onChange={(e) => handleUpdateStep(index, { requiresSubmission: e.target.checked })}
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
                  onClick={handleAddStep}
                  className="btn-secondary"
                  style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.8rem', fontSize: '0.82rem' }}
                >
                  <Plus size={15} /> Añadir otro paso
                </button>
              </div>
            </div>

            {/* Footer Fijo */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', paddingTop: '1rem', marginTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
              <button type="button" onClick={() => setIsFormModalOpen(false)} className="btn-secondary" disabled={isSaving}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" disabled={isSaving}>
                {isSaving ? 'Guardando...' : (editingTaskId ? 'Guardar Cambios' : (taskIsTemplate ? 'Guardar Plantilla' : 'Guardar Tarea'))}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* MODAL 2: Selector de Material para un Paso */}
      {pickerStepIndex !== null && createPortal(
        <div className="modal-backdrop" style={{ ...modalBackdropStyle, zIndex: 110 }} onClick={() => setPickerStepIndex(null)}>
          <div className="glass-panel modal-card modal-card--wide" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '760px', maxHeight: '88vh', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>Seleccionar Material de la Academia</h3>
                <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Elige el material o cuestionario para este paso de la tarea.</p>
              </div>
              <button type="button" onClick={() => setPickerStepIndex(null)} aria-label="Cerrar biblioteca" title="Cerrar" style={{ width: '34px', height: '34px', flexShrink: 0, border: 'none', background: 'transparent', color: 'var(--text-muted)', display: 'inline-grid', placeItems: 'center', cursor: 'pointer' }}><X size={19} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  placeholder="Buscar por título o descripción..."
                  style={{ ...inputStyle, paddingLeft: '2.25rem', marginTop: 0 }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {([['ALL', 'Todos'], ['DOCUMENT', 'Documentos'], ['VIDEO', 'Vídeos'], ['AUDIO', 'Audios'], ['FORM', 'Exámenes']] as const).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setPickerTypeFilter(val)}
                    className={pickerTypeFilter === val ? 'btn-primary' : 'btn-secondary'}
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
                      if (pickerStepIndex !== null) {
                        const isPassive = m.type === 'VIDEO' || m.type === 'AUDIO' || m.type === 'IMAGE';
                        handleUpdateStep(pickerStepIndex, {
                          materialId: m.id,
                          title: taskSteps[pickerStepIndex]?.title.trim() === `${pickerStepIndex + 1}.` || !taskSteps[pickerStepIndex]?.title.trim()
                            ? `${pickerStepIndex + 1}. ${m.title}`
                            : taskSteps[pickerStepIndex].title,
                          requiresSubmission: m.type === 'FORM' ? true : (isPassive ? false : undefined)
                        });
                        setPickerStepIndex(null);
                      }
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

      {/* MODAL 3: Asignar Plantilla a Clase Rápido */}
      {assigningTemplate && createPortal(
        <div className="modal-backdrop" style={modalBackdropStyle} onClick={() => setAssigningTemplate(null)}>
          <form
            onSubmit={handleConfirmAssign}
            className="glass-panel modal-card modal-card--wide"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(100%, 540px)',
              maxWidth: '540px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              padding: '1.5rem',
              overflow: 'hidden'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ margin: '0 0 0.2rem', fontSize: '1.2rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <BookOpen size={18} style={{ color: 'var(--primary)' }} /> Asignar Plantilla a una Clase
                </h3>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Plantilla origen: <strong>{assigningTemplate.title}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAssigningTemplate(null)}
                className="modal-close"
                style={{ position: 'static' }}
              >
                <X size={18} />
              </button>
            </div>

            {assignError && (
              <div style={{ marginBottom: '0.75rem', padding: '0.55rem 0.8rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '6px', fontSize: '0.82rem' }}>
                {assignError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Selecciona la Clase Destinataria *
                </label>
                <select
                  value={assignCourseId}
                  onChange={(e) => setAssignCourseId(e.target.value)}
                  style={inputStyle}
                  required
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    Fecha Límite de Entrega (Opcional)
                  </label>
                  <input
                    type="datetime-local"
                    value={assignDueDate}
                    onChange={(e) => setAssignDueDate(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    Fecha de Publicación (Opcional)
                  </label>
                  <input
                    type="datetime-local"
                    value={assignPublishAt}
                    onChange={(e) => setAssignPublishAt(e.target.value)}
                    min={getCurrentLocalDatetimeInput()}
                    style={inputStyle}
                  />
                  <span style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Vacío: inmediata. Si es futura, quedará programada.
                  </span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button
                type="button"
                onClick={() => setAssigningTemplate(null)}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isAssigning}
                className="btn-primary"
              >
                {isAssigning ? 'Asignando...' : (assignPublishAt ? 'Programar Tarea' : 'Publicar Tarea en Clase')}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* Visor modal de material al pulsar en un paso */}
      {viewingMaterial && (
        <MaterialViewerModal
          material={viewingMaterial}
          onClose={() => setViewingMaterial(null)}
        />
      )}
    </div>
  );
};

export default TasksManagement;
