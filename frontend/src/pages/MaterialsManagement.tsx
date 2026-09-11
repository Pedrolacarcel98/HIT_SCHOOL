import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  FolderArchive,
  Plus,
  Search,
  FileText,
  Image,
  Video,
  Headphones,
  HelpCircle,
  Play,
  Edit2,
  Copy,
  Trash2,
  X,
  ListChecks,
  CheckSquare,
  ClipboardCheck,
  Pencil
} from 'lucide-react';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
import AudioPlayer from '../components/AudioPlayer';
import VideoPlayer from '../components/VideoPlayer';
import { toLocalDatetimeInput, toIsoDateString, getCurrentLocalDatetimeInput } from '../utils/dateUtils';
import DocumentViewer from '../components/DocumentViewer';
import FormPlayer from '../components/FormPlayer';
import FormBuilderModal from '../components/FormBuilderModal';
import MaterialViewerModal from '../components/MaterialViewerModal';

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

interface StructuredTask {
  id: string;
  title: string;
  courseId: string | null;
  assignmentType: 'CLASS' | 'INDIVIDUAL';
  assignedStudentId: string | null;
  assignedStudentName: string | null;
  assignedStudentIds?: string[];
  assignedStudentNames?: string[];
  isSequential: boolean;
  isTemplate?: boolean;
  dueDate?: string | null;
  publishAt?: string | null;
  stats?: {
    totalTargetStudents: number;
    completedStudentsCount: number;
    completionRate: number;
  };
  steps: StructuredTaskStep[];
}

interface StructuredTaskStep {
  id: string;
  order: number;
  title: string;
  materialId: string | null;
}

interface EnrolledStudent {
  id: string;
  email: string;
  profile?: { firstName: string; lastName: string } | null;
}

const MaterialsManagement: React.FC = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const [courses, setCourses] = useState<Course[]>([]);
  const [structuredTasks, setStructuredTasks] = useState<StructuredTask[]>([]);
  const [editingStructuredTask, setEditingStructuredTask] = useState<StructuredTask | null>(null);
  const [isStructuredTaskModalOpen, setIsStructuredTaskModalOpen] = useState(false);
  const [structuredTaskTitle, setStructuredTaskTitle] = useState('');
  const [structuredTaskSteps, setStructuredTaskSteps] = useState<StructuredTaskStep[]>([]);
  const [structuredTaskCourseId, setStructuredTaskCourseId] = useState('');
  const [structuredTaskAssignmentType, setStructuredTaskAssignmentType] = useState<'CLASS' | 'INDIVIDUAL'>('CLASS');
  const [structuredTaskIsSequential, setStructuredTaskIsSequential] = useState(false);
  const [structuredTaskPublishAt, setStructuredTaskPublishAt] = useState('');
  const [assignedStudentIds, setAssignedStudentIds] = useState<string[]>([]);
  const [allStudents, setAllStudents] = useState<EnrolledStudent[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [isStudentPickerOpen, setIsStudentPickerOpen] = useState(false);
  const [previewingForm, setPreviewingForm] = useState<Material | null>(null);
  const [materialPickerStepIndex, setMaterialPickerStepIndex] = useState<number | null>(null);
  const [materialSearch, setMaterialSearch] = useState('');
  const [materialCategoryFilter, setMaterialCategoryFilter] = useState<'ALL' | Material['type']>('ALL');

  // Modales
  const [showAddResourceModal, setShowAddResourceModal] = useState(false);
  const [showFormBuilder, setShowFormBuilder] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [editingStandardMaterial, setEditingStandardMaterial] = useState<Material | null>(null);
  const [viewingMaterialState, setViewingMaterial] = useState<Material | null>(null);
  const viewingMaterial = viewingMaterialState as Material;
  const [deletingMaterial, setDeletingMaterial] = useState<Material | null>(null);

  // Formulario nuevo recurso estándar
  const [resTitle, setResTitle] = useState('');
  const [resDesc, setResDesc] = useState('');
  const [resType, setResType] = useState<'DOCUMENT' | 'IMAGE' | 'VIDEO' | 'AUDIO'>('DOCUMENT');
  const [resLevel, setResLevel] = useState('B2');
  const [resCategory, setResCategory] = useState('GRAMMAR_VOCABULARY');
  const [resUrl, setResUrl] = useState('');

  useEffect(() => {
    fetchMaterials();
    fetchStructuredTasks();
    fetchCourses();
    fetchAllStudents();
  }, [typeFilter, levelFilter, categoryFilter]);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      const params = new URLSearchParams();
      if (typeFilter !== 'ALL' && typeFilter !== 'STRUCTURED') params.append('type', typeFilter);
      if (levelFilter !== 'ALL') params.append('level', levelFilter);
      if (categoryFilter !== 'ALL') params.append('category', categoryFilter);

      const res = await fetch(`${apiUrl}/api/materials?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMaterials(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/courses`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setCourses(await res.json());
    } catch (err) {
      console.error('Error fetching courses', err);
    }
  };

  const fetchStructuredTasks = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/structured-tasks/teacher`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setStructuredTasks(await res.json());
    } catch (err) {
      console.error('Error fetching structured tasks', err);
    }
  };

  const fetchAllStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/students`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setAllStudents(await res.json());
    } catch (err) {
      console.error('Error fetching students', err);
    }
  };

  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedUrl = (() => {
      const driveFileId = resUrl.match(/drive\.google\.com\/file\/d\/([^/?]+)/)?.[1]
        || resUrl.match(/[?&]id=([^&/?]+)/)?.[1]
        || resUrl.match(/lh3\.googleusercontent\.com\/d\/([^=/?]+)/)?.[1];
      return driveFileId && resType === 'IMAGE'
        ? `https://lh3.googleusercontent.com/d/${driveFileId}=w1600`
        : driveFileId
          ? `https://drive.google.com/uc?export=view&id=${driveFileId}`
          : resUrl.trim();
    })();

    if (resType === 'IMAGE' && /drive\.google\.com\/drive\/.*\/folders\//.test(resUrl)) {
      window.alert('El enlace corresponde a una carpeta de Google Drive. Abre la imagen, copia su enlace individual y compártela para que cualquiera con el enlace pueda verla.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      const res = await fetch(`${apiUrl}/api/materials${editingStandardMaterial ? `/${editingStandardMaterial.id}` : ''}`, {
        method: editingStandardMaterial ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: resTitle,
          description: resDesc,
          type: resType,
          level: resLevel,
          category: resCategory,
          url: normalizedUrl
        })
      });

      if (res.ok) {
        setShowAddResourceModal(false);
        setEditingStandardMaterial(null);
        setResTitle('');
        setResDesc('');
        setResUrl('');
        fetchMaterials();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openStandardMaterialEditor = (material: Material) => {
    setEditingStandardMaterial(material);
    setResTitle(material.title);
    setResDesc(material.description || '');
    setResType(material.type as 'DOCUMENT' | 'IMAGE' | 'VIDEO' | 'AUDIO');
    setResLevel(material.level);
    setResCategory(material.category);
    setResUrl(material.url || '');
    setShowAddResourceModal(true);
  };

  const duplicateMaterial = async (material: Material) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/api/materials/${material.id}/duplicate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('No se pudo duplicar el recurso.');
      await fetchMaterials();
    } catch (duplicateError) {
      window.alert(duplicateError instanceof Error ? duplicateError.message : 'No se pudo duplicar el recurso.');
    }
  };

  const getMaterial = (materialId: string | null) => materials.find((material) => material.id === materialId);

  const formatAssignedStudents = (task: StructuredTask) => {
    const names = task.assignedStudentNames?.length ? task.assignedStudentNames : (task.assignedStudentName ? [task.assignedStudentName] : []);
    if (names.length === 0) return 'Alumno';
    return names.length > 2 ? `${names.slice(0, 2).join(', ')}...` : names.join(', ');
  };

  const getMaterialIcon = (type: Material['type']) => {
    if (type === 'FORM') return <ClipboardCheck size={16} />;
    if (type === 'VIDEO') return <Video size={16} />;
    if (type === 'AUDIO') return <Headphones size={16} />;
    return <FileText size={16} />;
  };

  const getMaterialTypeLabel = (type: Material['type']) => {
    if (type === 'FORM') return 'EXAMEN INTERACTIVO';
    if (type === 'VIDEO') return 'VÍDEO';
    if (type === 'AUDIO') return 'AUDIO';
    return 'DOCUMENTO';
  };

  const openStructuredTaskModal = (task?: StructuredTask) => {
    setEditingStructuredTask(task || null);
    setStructuredTaskTitle(task?.title || '');
    setStructuredTaskSteps(task?.steps.map((step, index) => ({ ...step, order: index + 1 })) || [{ id: `step-${Date.now()}`, order: 1, title: '', materialId: null }]);
    const assignmentType = task?.assignmentType || 'CLASS';
    const courseId = task?.courseId || (assignmentType === 'CLASS' ? courses[0]?.id || '' : '');
    setStructuredTaskCourseId(courseId);
    setStructuredTaskAssignmentType(assignmentType);
    setStructuredTaskIsSequential(task?.isSequential || false);
    setStructuredTaskPublishAt(toLocalDatetimeInput(task?.publishAt));
    setAssignedStudentIds(task?.assignedStudentIds?.length ? task.assignedStudentIds : (task?.assignedStudentId ? [task.assignedStudentId] : []));
    setStudentSearch('');
    setIsStudentPickerOpen(false);
    setIsStructuredTaskModalOpen(true);
  };

  const useTemplateForIndividualTask = (template: StructuredTask) => {
    setEditingStructuredTask(null);
    setStructuredTaskTitle(template.title.replace(/^\[Plantilla\]\s*/i, ''));
    setStructuredTaskSteps(template.steps.map((step, index) => ({ ...step, order: index + 1 })));
    setStructuredTaskCourseId('');
    setStructuredTaskAssignmentType('INDIVIDUAL');
    setStructuredTaskIsSequential(template.isSequential || false);
    setStructuredTaskPublishAt('');
    setAssignedStudentIds([]);
    setStudentSearch('');
    setIsStudentPickerOpen(false);
    setIsStructuredTaskModalOpen(true);
  };

  const updateStructuredTaskStep = (index: number, updates: Partial<StructuredTaskStep>) => {
    setStructuredTaskSteps((steps) => steps.map((step, stepIndex) => stepIndex === index ? { ...step, ...updates } : step));
  };

  const addStructuredTaskStep = () => {
    setStructuredTaskSteps((steps) => [...steps, { id: `step-${Date.now()}`, order: steps.length + 1, title: '', materialId: null }]);
  };

  const removeStructuredTaskStep = (index: number) => {
    setStructuredTaskSteps((steps) => steps.filter((_, stepIndex) => stepIndex !== index).map((step, stepIndex) => ({ ...step, order: stepIndex + 1 })));
  };

  const saveStructuredTask = async (event: React.FormEvent) => {
    event.preventDefault();
    const title = structuredTaskTitle.trim();
    const steps = structuredTaskSteps
      .map((step, index) => ({ ...step, title: step.title.trim(), order: index + 1 }))
      .filter((step) => step.title);
    if (!title || steps.length === 0) return;
    if (structuredTaskAssignmentType === 'CLASS' && !structuredTaskCourseId) return;
    if (structuredTaskAssignmentType === 'INDIVIDUAL' && assignedStudentIds.length === 0) return;

    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/structured-tasks${editingStructuredTask ? `/${editingStructuredTask.id}` : ''}`, {
        method: editingStructuredTask ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, courseId: structuredTaskAssignmentType === 'CLASS' ? structuredTaskCourseId : null, assignmentType: structuredTaskAssignmentType, isSequential: structuredTaskIsSequential, publishAt: toIsoDateString(structuredTaskPublishAt) || null, assignedStudentIds: structuredTaskAssignmentType === 'INDIVIDUAL' ? assignedStudentIds : [], steps })
      });
      if (!res.ok) throw new Error('No se pudo guardar la tarea estructurada.');
      await fetchStructuredTasks();
      setIsStructuredTaskModalOpen(false);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'No se pudo guardar la tarea estructurada.');
    }
  };

  const filteredPickerMaterials = materials.filter((material) => {
    const query = materialSearch.trim().toLowerCase();
    const matchesSearch = !query || `${material.title} ${material.description || ''}`.toLowerCase().includes(query);
    const matchesCategory = materialCategoryFilter === 'ALL' || material.type === materialCategoryFilter;
    return matchesSearch && matchesCategory;
  });
  const individualStructuredTasks: StructuredTask[] = [];
  const structuredTaskTemplates = structuredTasks.filter((task) => task.isTemplate);

  const duplicateStructuredTask = async (task: StructuredTask) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/api/structured-tasks/${task.id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: `[Copia] ${task.title}`,
          assignmentType: 'INDIVIDUAL',
          assignedStudentIds: task.assignedStudentIds?.length ? task.assignedStudentIds : (task.assignedStudentId ? [task.assignedStudentId] : []),
          isTemplate: false
        })
      });
      if (!res.ok) throw new Error('No se pudo duplicar la tarea.');
      await fetchStructuredTasks();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'No se pudo duplicar la tarea.');
    }
  };

  const saveStructuredTaskAsTemplate = async (task: StructuredTask) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/api/structured-tasks/${task.id}/save-as-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: `[Plantilla] ${task.title}` })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'No se pudo guardar como plantilla.');
      }
      await fetchStructuredTasks();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'No se pudo guardar como plantilla.');
    }
  };

  const deleteStructuredTask = async (task: StructuredTask) => {
    if (!window.confirm(`¿Eliminar “${task.title}”?`)) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/api/structured-tasks/${task.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('No se pudo borrar la tarea.');
      await fetchStructuredTasks();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'No se pudo borrar la tarea.');
    }
  };

  const openMaterialPicker = (stepIndex: number) => {
    setMaterialPickerStepIndex(stepIndex);
    setMaterialSearch('');
    setMaterialCategoryFilter('ALL');
  };

  const handleOpenMaterial = (material: Material) => {
    if (material.type === 'FORM') {
      setPreviewingForm(material);
      return;
    }
    if (material.url) window.open(material.url, '_blank', 'noopener,noreferrer');
  };

  const handleDelete = async () => {
    if (!deletingMaterial) return;
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      const res = await fetch(`${apiUrl}/api/materials/${deletingMaterial.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        setDeletingMaterial(null);
        fetchMaterials();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredMaterials = materials.filter(m => {
    const q = searchTerm.toLowerCase();
    return m.title.toLowerCase().includes(q) || (m.description && m.description.toLowerCase().includes(q));
  });

  const getTypeIcon = (type: string, size = 20) => {
    switch (type) {
      case 'DOCUMENT': return <FileText size={size} style={{ color: '#38bdf8' }} />;
      case 'IMAGE': return <Image size={size} style={{ color: '#f472b6' }} />;
      case 'VIDEO': return <Video size={size} style={{ color: '#f87171' }} />;
      case 'AUDIO': return <Headphones size={size} style={{ color: '#fbbf24' }} />;
      case 'FORM': return <HelpCircle size={size} style={{ color: '#34d399' }} />;
      default: return <FileText size={size} />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'DOCUMENT': return 'Documento';
      case 'IMAGE': return 'Imagen';
      case 'VIDEO': return 'Vídeo';
      case 'AUDIO': return 'Audio (Listening)';
      case 'FORM': return 'Examen Interactivo';
      default: return type;
    }
  };

  const getImageDisplayUrl = (url?: string) => {
    if (!url) return '';
    const driveFileId = url.match(/drive\.google\.com\/file\/d\/([^/?]+)/)?.[1]
      || url.match(/[?&]id=([^&/?]+)/)?.[1]
      || url.match(/lh3\.googleusercontent\.com\/d\/([^=/?]+)/)?.[1];
    return driveFileId ? `https://lh3.googleusercontent.com/d/${driveFileId}=w1600` : url;
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FolderArchive style={{ color: 'var(--primary)' }} /> Material de Clase
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)' }}>
            Biblioteca didáctica centralizada: recursos multimedia y exámenes interactivos con audios
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => { setEditingStandardMaterial(null); setResTitle(''); setResDesc(''); setResType('DOCUMENT'); setResLevel('B2'); setResCategory('GRAMMAR_VOCABULARY'); setResUrl(''); setShowAddResourceModal(true); }}
            className="btn-primary"
            style={{
              background: '#059669',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
              padding: '0.7rem 1rem',
              borderRadius: '12px',
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease'
            }}
          >
            + Añadir Multimedia / Doc
          </button>

          <button
            onClick={() => { setEditingMaterial(null); setShowFormBuilder(true); }}
            className="btn-primary"
            style={{
              background: '#059669',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
              padding: '0.7rem 1rem',
              borderRadius: '12px',
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease'
            }}
          >
            + Crear Examen / Formulario
          </button>

        </div>
      </div>

      {/* Tabs por Tipo de Material */}
      <div className="scrollable-tabs" style={{ marginBottom: '1.5rem' }}>
        {[
          { id: 'ALL', label: 'Todos los Recursos', icon: <FolderArchive size={16} /> },
          { id: 'DOCUMENT', label: 'Documentos', icon: <FileText size={16} /> },
          { id: 'IMAGE', label: 'Fotos', icon: <Image size={16} /> },
          { id: 'VIDEO', label: 'Vídeos', icon: <Video size={16} /> },
          { id: 'AUDIO', label: 'Audios', icon: <Headphones size={16} /> },
          { id: 'FORM', label: 'Exámenes y Formularios', icon: <HelpCircle size={16} /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setTypeFilter(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1.2rem',
              borderRadius: '20px',
              border: typeFilter === tab.id ? '1px solid var(--primary)' : '1px solid var(--border)',
              background: typeFilter === tab.id ? 'var(--primary-light)' : 'var(--surface)',
              color: typeFilter === tab.id ? 'var(--primary-text)' : 'var(--text-muted)',
              fontWeight: typeFilter === tab.id ? '600' : '500',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontSize: '0.85rem'
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Filtros de Nivel, Skill y Buscador */}
      <div className="glass-panel" style={{ padding: '1rem 1.5rem', marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Buscar por título o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.65rem 1rem 0.65rem 2.5rem',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--background)',
              color: 'var(--text)',
              outline: 'none',
              fontSize: '0.9rem'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Nivel:</span>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              style={{ padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)', fontSize: '0.85rem' }}
            >
              <option value="ALL">Todos los Niveles</option>
              <option value="A1">A1</option>
              <option value="A2">A2</option>
              <option value="B1">B1</option>
              <option value="B2">B2</option>
              <option value="C1">C1</option>
              <option value="C2">C2</option>
              <option value="GENERAL">General</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Skill:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)', fontSize: '0.85rem' }}
            >
              <option value="ALL">Todas las Skills</option>
              <option value="GRAMMAR_VOCABULARY">Grammar & Vocabulary</option>
              <option value="READING">Reading</option>
              <option value="LISTENING">Listening</option>
              <option value="WRITING">Writing</option>
              <option value="SPEAKING">Speaking</option>
              <option value="MOCK_EXAM">Mock Exams</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid de Materiales */}
      {(
        loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            Cargando biblioteca de materiales...
          </div>
        ) : filteredMaterials.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <FolderArchive size={48} style={{ color: 'var(--primary)', opacity: 0.4, marginBottom: '1rem' }} />
            <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text)' }}>No se encontraron recursos</h3>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>
              {searchTerm ? 'Prueba a cambiar tus términos de búsqueda o filtros.' : 'Comienza añadiendo un nuevo documento, vídeo, audio o examen interactivo.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '1.25rem' }}>
            {filteredMaterials.map(m => (
              <div
                key={m.id}
                className="glass-panel"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '1.5rem',
                  border: '1px solid var(--border)',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'var(--surface)', display: 'flex' }}>
                      {getTypeIcon(m.type, 18)}
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      {getTypeLabel(m.type)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '12px', background: 'var(--primary-light)', color: 'var(--primary-text)', border: '1px solid var(--primary-border)' }}>
                      {m.level}
                    </span>
                  </div>
                </div>

                <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem', color: 'var(--text)', fontWeight: '600' }}>
                  {m.title}
                </h3>
                <p style={{ margin: '0 0 1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', flex: 1, lineHeight: '1.4' }}>
                  {m.description || 'Sin descripción adicional.'}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: 'auto' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                    <button
                      onClick={() => setViewingMaterial(m)}
                      className="btn-primary"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                    >
                      <Play size={15} /> {m.type === 'FORM' ? 'Abrir Examen' : 'Ver / Reproducir'}
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', justifyContent: 'center', flexShrink: 0 }}>
                    <button
                      onClick={() => duplicateMaterial(m)}
                      title="Duplicar recurso"
                      aria-label="Duplicar recurso"
                      style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.4rem', color: 'var(--text-muted)', cursor: 'pointer' }}
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      onClick={() => setDeletingMaterial(m)}
                      title="Eliminar recurso"
                      style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.4rem', color: 'var(--text-muted)', cursor: 'pointer' }}
                    >
                      <Trash2 size={16} />
                    </button>
                    <button
                      onClick={() => m.type === 'FORM' ? (setEditingMaterial(m), setShowFormBuilder(true)) : openStandardMaterialEditor(m)}
                      title={m.type === 'FORM' ? 'Editar formulario' : 'Editar recurso'}
                      aria-label={m.type === 'FORM' ? 'Editar formulario' : 'Editar recurso'}
                      style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.4rem', color: 'var(--text-muted)', cursor: 'pointer' }}
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {structuredTaskTemplates.length > 0 && (
        <section style={{ marginTop: typeFilter === 'ALL' ? '2.5rem' : '0', paddingTop: typeFilter === 'ALL' ? '2rem' : '0', borderTop: typeFilter === 'ALL' ? '1px solid var(--border)' : 'none' }}>
          <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.55rem', color: 'var(--text-main)', fontSize: '1.35rem' }}>
                <ListChecks size={22} style={{ color: 'var(--primary)' }} /> Plantillas guardadas
              </h2>
              <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>Selecciona una plantilla para reutilizarla en una tarea.</p>
            </div>
          </header>

          {individualStructuredTasks.length > 0 ? (
            <div />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
              {structuredTaskTemplates.length > 0 && (
                <details className="glass-panel" style={{ padding: '1rem 1.15rem', border: '1px solid var(--primary-border)' }}>
                  <summary style={{ cursor: 'pointer', color: 'var(--text-main)', fontWeight: 700 }}>
                    Plantillas guardadas ({structuredTaskTemplates.length})
                  </summary>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.9rem' }}>
                    {structuredTaskTemplates.map((template) => (
                      <div key={template.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.75rem 0.9rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface)' }}>
                        <div>
                          <strong style={{ color: 'var(--text-main)', fontSize: '0.92rem' }}>{template.title}</strong>
                          <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.78rem' }}>{template.steps.length} {template.steps.length === 1 ? 'paso' : 'pasos'}</span>
                        </div>
                        <button type="button" onClick={() => useTemplateForIndividualTask(template)} className="btn-secondary" style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}>
                          <Copy size={14} /> Usar plantilla
                        </button>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {individualStructuredTasks.map((task) => (
                <article key={task.id} style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--primary-border)', borderRadius: '8px', boxShadow: 'var(--shadow-sm)', padding: '1.25rem' }}>
                  <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', minWidth: 0 }}>
                      <CheckSquare size={21} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.05rem' }}>{task.title}</h3>
                        <div style={{ display: 'flex', gap: '0.45rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                          <span style={{ display: 'inline-flex', padding: '0.18rem 0.5rem', borderRadius: '12px', background: 'var(--primary-light)', color: 'var(--primary-text)', fontSize: '0.72rem', fontWeight: 700 }}>Pasos Numerados</span>
                          {task.stats && <span style={{ display: 'inline-flex', padding: '0.18rem 0.5rem', borderRadius: '12px', background: task.stats.completionRate >= 100 ? '#ecfdf5' : '#fef3c7', color: task.stats.completionRate >= 100 ? '#047857' : '#92400e', fontSize: '0.72rem', fontWeight: 700 }}>{task.stats.completionRate >= 100 ? 'Completada' : 'Entregas'}: {task.stats.completedStudentsCount} de {task.stats.totalTargetStudents} ({task.stats.completionRate}%)</span>}
                          {task.isSequential && <span style={{ display: 'inline-flex', padding: '0.18rem 0.5rem', borderRadius: '12px', background: '#fef3c7', color: '#92400e', fontSize: '0.72rem', fontWeight: 700 }}>Paso a paso</span>}
                          {task.publishAt && new Date(task.publishAt) > new Date() && <span style={{ display: 'inline-flex', padding: '0.18rem 0.5rem', borderRadius: '12px', background: '#eef2ff', color: '#3730a3', fontSize: '0.72rem', fontWeight: 700 }}>Programada: {new Date(task.publishAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</span>}
                          {task.dueDate && <span style={{ display: 'inline-flex', padding: '0.18rem 0.5rem', borderRadius: '12px', background: '#fef3c7', color: '#92400e', fontSize: '0.72rem', fontWeight: 700 }}>Fecha límite: {new Date(task.dueDate).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</span>}
                          <span title={task.assignedStudentNames?.join(', ')} style={{ display: 'inline-flex', padding: '0.18rem 0.5rem', borderRadius: '12px', background: task.assignmentType === 'INDIVIDUAL' ? '#eef2ff' : '#ecfdf5', color: task.assignmentType === 'INDIVIDUAL' ? '#3730a3' : '#047857', fontSize: '0.72rem', fontWeight: 700 }}>
                            {task.assignmentType === 'INDIVIDUAL' ? `Asignado a: ${formatAssignedStudents(task)}` : 'Toda la clase'}
                          </span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{task.steps.length} {task.steps.length === 1 ? 'paso' : 'pasos'}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <button type="button" onClick={() => duplicateStructuredTask(task)} className="btn-secondary" style={{ padding: '0.4rem 0.7rem', fontSize: '0.8rem' }}>
                        <Copy size={14} /> Duplicar
                      </button>
                      <button type="button" onClick={() => saveStructuredTaskAsTemplate(task)} className="btn-secondary" style={{ padding: '0.4rem 0.7rem', fontSize: '0.8rem' }}>
                        <CheckSquare size={14} /> Guardar Plantilla
                      </button>
                      <button type="button" onClick={() => openStructuredTaskModal(task)} className="btn-secondary" style={{ padding: '0.4rem 0.7rem', fontSize: '0.8rem' }}>
                        <Pencil size={14} /> Modificar
                      </button>
                      <button type="button" onClick={() => deleteStructuredTask(task)} className="btn-secondary" style={{ padding: '0.4rem 0.7rem', fontSize: '0.8rem', color: '#b91c1c' }}>
                        <Trash2 size={14} /> Borrar
                      </button>
                    </div>
                  </header>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {task.steps.map((step) => {
                      const material = getMaterial(step.materialId);
                      return (
                        <div key={step.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '0.75rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: 'var(--shadow-sm)', flexWrap: 'wrap', transition: 'border-color 0.2s ease' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: '1 1 240px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: '28px', height: '28px', borderRadius: '50%', background: '#d1fae5', color: '#065f46', fontWeight: 700, fontSize: '0.82rem' }}>{step.order}</span>
                            <span style={{ color: 'var(--text-main)', fontSize: '0.92rem' }}>{step.title}</span>
                          </div>
                          {material && (
                            <button
                              type="button"
                              onClick={() => handleOpenMaterial(material)}
                              title={material.type === 'FORM' ? `Previsualizar ${material.title}` : `Abrir ${material.title}`}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0, padding: '0.25rem 0.55rem', border: '1px solid var(--primary-border)', borderRadius: '10px', background: 'var(--primary-light)', color: 'var(--primary-text)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'transform 0.15s ease' }}
                              onMouseEnter={(event) => { event.currentTarget.style.transform = 'scale(1.05)'; }}
                              onMouseLeave={(event) => { event.currentTarget.style.transform = 'scale(1)'; }}
                            >
                              [ {material.type} ] {material.title}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {previewingForm && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'grid', placeItems: 'center', padding: '1rem', background: 'rgba(34, 49, 43, 0.35)' }} onClick={() => setPreviewingForm(null)}>
          <div className="glass-panel modal-card modal-card--wide" onClick={(event) => event.stopPropagation()} style={{ width: 'min(100%, 900px)', maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem' }}>
            <button type="button" onClick={() => setPreviewingForm(null)} aria-label="Cerrar previsualización" className="modal-close"><X size={19} /></button>
            <FormPlayer
              title={previewingForm.title}
              description={previewingForm.description || undefined}
              questions={previewingForm.formData?.questions || []}
              readOnly
              allowRetry={false}
              initialAnswers={Object.fromEntries((previewingForm.formData?.questions || []).map((question: { id: string; correctAnswer: string | number }) => [question.id, question.correctAnswer]))}
            />
          </div>
        </div>
      )}

      {isStructuredTaskModalOpen && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'grid', placeItems: 'center', padding: '1rem', background: 'rgba(34, 49, 43, 0.35)' }} onClick={() => setIsStructuredTaskModalOpen(false)}>
          <form onSubmit={saveStructuredTask} className="glass-panel modal-card" onClick={(event) => event.stopPropagation()} style={{ width: 'min(100%, 520px)', padding: '1.5rem' }}>
            <button type="button" onClick={() => setIsStructuredTaskModalOpen(false)} aria-label="Cerrar" className="modal-close"><X size={19} /></button>
            <h2 style={{ margin: '0 0 0.35rem', color: 'var(--text-main)', fontSize: '1.2rem' }}>{editingStructuredTask ? 'Editar Tarea Estructurada' : 'Añadir Tarea Estructurada'}</h2>
            <p style={{ margin: '0 0 1.25rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>Configura la instrucción y el material opcional de cada paso.</p>
            <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 600 }}>Título</label>
            <input required value={structuredTaskTitle} onChange={(event) => setStructuredTaskTitle(event.target.value)} placeholder="Ej. Ensayo B2 Writing" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)', outline: 'none' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 600 }}>Asignar a</label>
                <select value={structuredTaskAssignmentType} onChange={(event) => { setStructuredTaskAssignmentType(event.target.value as 'CLASS' | 'INDIVIDUAL'); setAssignedStudentIds([]); setStudentSearch(''); }} style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)' }}>
                  <option value="CLASS">Toda una Clase</option>
                  <option value="INDIVIDUAL">Alumno(s) Individuales</option>
                </select>
              </div>
              {structuredTaskAssignmentType === 'CLASS' && (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 600 }}>Clase destinataria</label>
                  <select required value={structuredTaskCourseId} onChange={(event) => { setStructuredTaskCourseId(event.target.value); setAssignedStudentIds([]); }} style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)' }}>
                    <option value="">Selecciona una clase</option>
                    {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
                  </select>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '0.3rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 600 }}>
                  <input type="checkbox" checked={structuredTaskIsSequential} onChange={(e) => setStructuredTaskIsSequential(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }} />
                  Paso a paso (secuencial)
                </label>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 600 }}>Publicar el (opcional)</label>
                <input type="datetime-local" value={structuredTaskPublishAt} onChange={(event) => setStructuredTaskPublishAt(event.target.value)} min={getCurrentLocalDatetimeInput()} style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)' }} />
                <small style={{ display: 'block', marginTop: '0.25rem', color: 'var(--text-muted)', fontSize: '0.72rem' }}>Vacío: visible inmediatamente.</small>
              </div>
            </div>
            {structuredTaskAssignmentType === 'INDIVIDUAL' && (() => {
              const query = studentSearch.trim().toLowerCase();
              const studentLabel = (student: EnrolledStudent) => student.profile ? `${student.profile.firstName} ${student.profile.lastName}`.trim() : student.email;
              const selectedStudents = allStudents.filter((student) => assignedStudentIds.includes(student.id));
              const suggestions = allStudents.filter((student) => {
                if (assignedStudentIds.includes(student.id)) return false;
                if (!query) return true;
                return `${studentLabel(student)} ${student.email}`.toLowerCase().includes(query);
              });

              return (
                <div style={{ marginTop: '0.75rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 600 }}>Alumno(s)</label>
                  {selectedStudents.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.45rem' }}>
                      {selectedStudents.map((student) => (
                        <span key={student.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.25rem 0.625rem', borderRadius: '8px', background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', fontSize: '0.75rem', fontWeight: 500 }}>
                          {studentLabel(student)}
                          <button
                            type="button"
                            onClick={() => setAssignedStudentIds((ids) => ids.filter((id) => id !== student.id))}
                            aria-label={`Quitar ${studentLabel(student)}`}
                            style={{ border: 'none', background: 'transparent', color: '#047857', cursor: 'pointer', padding: 0, lineHeight: 1, display: 'inline-flex' }}
                          >
                            <X size={13} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <div style={{ position: 'relative' }}>
                    <input type="text" value={studentSearch} onFocus={() => setIsStudentPickerOpen(true)} onBlur={() => window.setTimeout(() => setIsStudentPickerOpen(false), 120)} onChange={(event) => { setStudentSearch(event.target.value); setIsStudentPickerOpen(true); }} placeholder="🔍 Buscar alumno por nombre o correo..." style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)', outline: 'none', marginBottom: 0 }} />
                    {isStudentPickerOpen && (
                      <div style={{ position: 'absolute', zIndex: 30, top: 'calc(100% + 0.25rem)', left: 0, width: '100%', maxHeight: '12rem', overflowY: 'auto', background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: 'var(--shadow-md, 0 10px 25px rgba(15, 23, 42, 0.12))' }}>
                        {suggestions.length === 0 ? (
                          <div style={{ padding: '0.6rem 0.75rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>No hay alumnos que coincidan.</div>
                        ) : suggestions.map((student) => (
                          <button key={student.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setAssignedStudentIds((ids) => [...ids, student.id]); setStudentSearch(''); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.55rem 0.75rem', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-main)', fontSize: '0.85rem' }}>
                            {studentLabel(student)}
                            <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem' }}>{student.email}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <small style={{ display: 'block', marginTop: '0.35rem', color: 'var(--text-muted)' }}>{assignedStudentIds.length} alumno(s) seleccionado(s)</small>
                </div>
              );
            })()}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '1rem' }}>
              <label style={{ color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 600 }}>Pasos</label>
              {structuredTaskSteps.map((step, index) => (
                <div key={step.id} style={{ display: 'grid', gridTemplateColumns: '32px minmax(0, 1fr) minmax(150px, 0.8fr) 32px', alignItems: 'center', gap: '0.5rem', padding: '0.6rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface-alt)' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary-text)', fontSize: '0.8rem', fontWeight: 700 }}>{index + 1}</span>
                  <input required value={step.title} onChange={(event) => updateStructuredTaskStep(index, { title: event.target.value })} placeholder="Título o instrucción del paso" style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)', outline: 'none' }} />
                  {getMaterial(step.materialId) ? (
                    <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.55rem', border: '1px solid var(--primary-border)', borderRadius: '8px', background: 'var(--primary-light)', color: 'var(--primary-text)' }}>
                      <span style={{ display: 'inline-flex', flexShrink: 0 }}>{getMaterialIcon(getMaterial(step.materialId)!.type)}</span>
                      <span style={{ minWidth: 0, overflow: 'hidden' }}>
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.78rem', fontWeight: 700 }}>{getMaterial(step.materialId)!.title}</span>
                        <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 600 }}>{getMaterialTypeLabel(getMaterial(step.materialId)!.type)}</span>
                      </span>
                      <button type="button" onClick={() => openMaterialPicker(index)} title="Cambiar material" aria-label="Cambiar material" style={{ marginLeft: 'auto', border: 'none', background: 'transparent', color: 'var(--primary-text)', cursor: 'pointer', padding: '0.2rem' }}>✏️</button>
                      <button type="button" onClick={() => updateStructuredTaskStep(index, { materialId: null })} title="Eliminar material" aria-label="Eliminar material" style={{ border: 'none', background: 'transparent', color: '#b91c1c', cursor: 'pointer', padding: '0.2rem' }}>🗑️</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => openMaterialPicker(index)} style={{ minWidth: 0, padding: '0.7rem 0.55rem', border: '2px dashed #cbd5e1', borderRadius: '8px', background: 'transparent', color: '#475569', cursor: 'pointer', fontSize: '0.76rem', fontWeight: 600 }}>
                      📎 Seleccionar Material de Clase
                    </button>
                  )}
                  <button type="button" onClick={() => removeStructuredTaskStep(index)} disabled={structuredTaskSteps.length === 1} title="Eliminar paso" aria-label={`Eliminar paso ${index + 1}`} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', color: '#b91c1c', cursor: 'pointer', padding: '0.35rem', opacity: structuredTaskSteps.length === 1 ? 0.4 : 1 }}><Trash2 size={17} /></button>
                </div>
              ))}
              <button type="button" onClick={addStructuredTaskStep} className="btn-secondary" style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.7rem', fontSize: '0.82rem' }}><Plus size={15} /> Añadir otro paso</button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '1.25rem' }}>
              <button type="button" onClick={() => setIsStructuredTaskModalOpen(false)} className="btn-secondary">Cancelar</button>
              <button type="submit" className="btn-primary">Guardar Tarea</button>
            </div>
          </form>
        </div>
      )}

      {materialPickerStepIndex !== null && createPortal(
        <div className="modal-backdrop" style={{ zIndex: 110, position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', padding: '1rem', background: 'rgba(34, 49, 43, 0.35)' }} onClick={() => setMaterialPickerStepIndex(null)}>
          <div className="glass-panel modal-card modal-card--wide" onClick={(event) => event.stopPropagation()} style={{ maxWidth: '760px', maxHeight: '88vh', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button type="button" onClick={() => setMaterialPickerStepIndex(null)} aria-label="Cerrar biblioteca" title="Cerrar" style={{ position: 'absolute', top: '1rem', right: '1rem', width: '34px', height: '34px', border: 'none', background: 'transparent', color: 'var(--text-muted)', display: 'inline-grid', placeItems: 'center', cursor: 'pointer' }}><X size={19} /></button>
            <div style={{ paddingRight: '2rem' }}>
              <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Elige el material que acompañará este paso.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input value={materialSearch} onChange={(event) => setMaterialSearch(event.target.value)} placeholder="Buscar por título o descripción..." aria-label="Buscar materiales" style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.25rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {([['ALL', 'Todos'], ['DOCUMENT', 'Documentos'], ['VIDEO', 'Vídeos'], ['AUDIO', 'Audios'], ['FORM', 'Exámenes']] as const).map(([value, label]) => (
                  <button key={value} type="button" onClick={() => setMaterialCategoryFilter(value)} className={materialCategoryFilter === value ? 'btn-primary' : 'btn-secondary'} style={{ padding: '0.4rem 0.7rem', fontSize: '0.78rem' }}>{label}</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', maxHeight: '60vh', overflowY: 'auto', padding: '0.15rem' }}>
              {filteredPickerMaterials.map((material) => (
                <article key={material.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', padding: '1rem', border: '1px solid var(--border)', borderRadius: '10px', background: 'var(--surface)', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--primary-text)', fontSize: '0.72rem', fontWeight: 700 }}>
                    {getMaterialIcon(material.type)} <span>{getMaterialTypeLabel(material.type)}</span>
                    <span style={{ marginLeft: 'auto', padding: '0.15rem 0.4rem', borderRadius: '999px', background: 'var(--primary-light)', border: '1px solid var(--primary-border)' }}>{material.level || 'GENERAL'}</span>
                  </div>
                  <strong style={{ color: '#0f172a', fontWeight: 700 }}>{material.title}</strong>
                  <p style={{ margin: 0, minHeight: '2.4rem', color: '#64748b', fontSize: '0.75rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{material.description || 'Sin descripción disponible.'}</p>
                  <button type="button" onClick={() => { updateStructuredTaskStep(materialPickerStepIndex, { materialId: material.id }); setMaterialPickerStepIndex(null); }} className="btn-primary" style={{ width: '100%', padding: '0.55rem', fontSize: '0.82rem', marginTop: 'auto' }}>✓ Seleccionar</button>
                </article>
              ))}
              {filteredPickerMaterials.length === 0 && <p style={{ gridColumn: '1 / -1', padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No se encontraron materiales.</p>}
            </div>
          </div>
        </div>, document.body
      )}

      {/* Modal: Visor / Reproductor Multimedia */}
      {viewingMaterial ? (false && (
        <div className="modal-backdrop" style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 70,
          padding: '1.5rem'
        }}>
          <div className="glass-panel modal-card modal-card--wide" style={{
            width: '100%',
            maxWidth: viewingMaterial.type === 'FORM' ? '900px' : '850px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            overflow: 'hidden'
          }}>
            {/* Player Header */}
            <div style={{
              padding: '1rem 1.5rem',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(255,255,255,0.02)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {getTypeIcon(viewingMaterial.type, 20)}
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text)' }}>{viewingMaterial.title}</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '600' }}>
                    {viewingMaterial.level} • {viewingMaterial.category}
                  </span>
                </div>
              </div>
              <button onClick={() => setViewingMaterial(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            {/* Player Content Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
              {viewingMaterial.type === 'AUDIO' && viewingMaterial.url && (
                <div style={{ padding: '2rem 0' }}>
                  <AudioPlayer src={viewingMaterial.url!} title={viewingMaterial.title} />
                  {viewingMaterial.description && (
                    <p style={{ marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                      {viewingMaterial.description}
                    </p>
                  )}
                </div>
              )}

              {viewingMaterial.type === 'VIDEO' && viewingMaterial.url && (
                <div>
                  <VideoPlayer url={viewingMaterial.url!} title={viewingMaterial.title} />
                  {viewingMaterial.description && (
                    <p style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                      {viewingMaterial.description}
                    </p>
                  )}
                </div>
              )}

              {viewingMaterial.type === 'DOCUMENT' && viewingMaterial.url && (
                <DocumentViewer url={viewingMaterial.url!} title={viewingMaterial.title} />
              )}

              {viewingMaterial.type === 'IMAGE' && viewingMaterial.url && (
                <div style={{ textAlign: 'center' }}>
                  <img
                    src={getImageDisplayUrl(viewingMaterial.url)}
                    alt={viewingMaterial.title}
                    referrerPolicy="no-referrer"
                    style={{ maxWidth: '100%', maxHeight: '550px', borderRadius: '8px', objectFit: 'contain' }}
                  />
                  {viewingMaterial.description && (
                    <p style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      {viewingMaterial.description}
                    </p>
                  )}
                </div>
              )}

              {viewingMaterial.type === 'FORM' && viewingMaterial.formData && (
                <FormPlayer
                  title={viewingMaterial.title}
                  description={viewingMaterial.description}
                  questions={viewingMaterial.formData.questions || []}
                  readOnly
                  initialAnswers={Object.fromEntries((viewingMaterial.formData.questions || []).map((question: { id: string; correctAnswer: string | number }) => [question.id, question.correctAnswer]))}
                />
              )}
            </div>
          </div>
        </div>
      )) : null}

      <MaterialViewerModal material={viewingMaterialState} onClose={() => setViewingMaterial(null)} />

      {/* Modal: Añadir Recurso Multimedia / Documento */}
      {showAddResourceModal && (
        <div className="modal-backdrop" style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 60,
          padding: '1rem'
        }}>
          <div className="glass-panel modal-card" style={{ width: '100%', maxWidth: '540px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus style={{ color: 'var(--primary)' }} /> Añadir Recurso Multimedia
              </h3>
              <button onClick={() => { setShowAddResourceModal(false); setEditingStandardMaterial(null); }} className="modal-close" aria-label="Cerrar modal">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateResource} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Título del Recurso</label>
                <input
                  type="text"
                  required
                  value={resTitle}
                  onChange={(e) => setResTitle(e.target.value)}
                  placeholder="Ej. B2 Listening Practice - The Climate Change"
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Tipo de Recurso</label>
                  <select
                    value={resType}
                    onChange={(e: any) => setResType(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)' }}
                  >
                    <option value="DOCUMENT">📄 Documento (PDF / Guía)</option>
                    <option value="AUDIO">🎧 Pista de Audio (Listening)</option>
                    <option value="VIDEO">🎥 Vídeo (YouTube / Vimeo / MP4)</option>
                    <option value="IMAGE">🖼️ Imagen / Infografía</option>
                  </select>
                </div>

                <div style={{ width: '120px' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Nivel</label>
                  <select
                    value={resLevel}
                    onChange={(e) => setResLevel(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)' }}
                  >
                    <option value="A1">A1</option>
                    <option value="A2">A2</option>
                    <option value="B1">B1</option>
                    <option value="B2">B2</option>
                    <option value="C1">C1</option>
                    <option value="C2">C2</option>
                    <option value="GENERAL">General</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Skill (Pilar Core)</label>
                <select
                  value={resCategory}
                  onChange={(e) => setResCategory(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)' }}
                >
                  <option value="LISTENING">Listening</option>
                  <option value="READING">Reading</option>
                  <option value="GRAMMAR_VOCABULARY">Grammar and Vocabulary</option>
                  <option value="WRITING">Writing</option>
                  <option value="SPEAKING">Speaking</option>
                  <option value="MOCK_EXAM">Mock Exams</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Enlace / URL del archivo o vídeo
                </label>
                <input
                  type="url"
                  required
                  value={resUrl}
                  onChange={(e) => setResUrl(e.target.value)}
                  placeholder="https://ejemplo.com/archivo.pdf o https://youtu.be/..."
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                  Para imágenes de Google Drive, usa el enlace individual del archivo, no el enlace de una carpeta. El archivo debe estar compartido para cualquiera con el enlace.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Descripción (Opcional)</label>
                <textarea
                  value={resDesc}
                  onChange={(e) => setResDesc(e.target.value)}
                  placeholder="Instrucciones o contexto del material..."
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)', minHeight: '60px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => { setShowAddResourceModal(false); setEditingStandardMaterial(null); }}
                  style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text)', padding: '0.75rem 1.25rem', borderRadius: '8px', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" style={{ padding: '0.75rem 1.5rem' }}>
                  {editingStandardMaterial ? 'Guardar Cambios' : 'Guardar Recurso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Form Builder */}
      {showFormBuilder && (
        <FormBuilderModal
          initialData={editingMaterial}
          onClose={() => { setShowFormBuilder(false); setEditingMaterial(null); }}
          onSaveSuccess={() => { fetchMaterials(); }}
        />
      )}

      {/* Modal: Confirmar Borrado */}
      {deletingMaterial && (
        <div className="modal-backdrop" style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 80,
          padding: '1rem'
        }}>
          <div className="glass-panel modal-card" style={{ width: '100%', maxWidth: '400px', padding: '2rem', textAlign: 'center' }}>
            <Trash2 size={36} style={{ color: '#ef4444', margin: '0 auto 1rem' }} />
            <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text)' }}>¿Eliminar recurso?</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0 0 1.5rem' }}>
              Se eliminará <strong>{deletingMaterial.title}</strong> de la biblioteca.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
              <button
                onClick={() => setDeletingMaterial(null)}
                style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text)', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                style={{ background: '#ef4444', border: 'none', color: '#ffffff', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialsManagement;
