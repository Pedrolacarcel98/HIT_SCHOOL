import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CheckSquare, GraduationCap, Laptop, ListChecks, MoreVertical, Pencil, Plus, Trash2, X } from 'lucide-react';
import FormPlayer from '../components/FormPlayer';

interface Course {
  id: string;
  title: string;
}

interface StructuredTask {
  id: string;
  title: string;
  courseId: string;
  assignmentType: 'CLASS' | 'INDIVIDUAL';
  assignedStudentId: string | null;
  assignedStudentName: string | null;
  isSequential: boolean;
  steps: StructuredTaskStep[];
}

interface StructuredTaskStep {
  id: string;
  order: number;
  title: string;
  materialId: string | null;
}

interface Material {
  id: string;
  title: string;
  type: 'DOCUMENT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FORM';
  url?: string | null;
  description?: string | null;
  formData?: { questions?: any[] } | null;
}

interface EnrolledStudent {
  id: string;
  email: string;
  profile?: { firstName: string; lastName: string } | null;
}

const TeacherDashboard: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseTitle, setCourseTitle] = useState('');
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [courseError, setCourseError] = useState('');
  const [structuredTasks, setStructuredTasks] = useState<StructuredTask[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
  const [editingStructuredTask, setEditingStructuredTask] = useState<StructuredTask | null>(null);
  const [isStructuredTaskModalOpen, setIsStructuredTaskModalOpen] = useState(false);
  const [structuredTaskTitle, setStructuredTaskTitle] = useState('');
  const [structuredTaskSteps, setStructuredTaskSteps] = useState<StructuredTaskStep[]>([]);
  const [structuredTaskCourseId, setStructuredTaskCourseId] = useState('');
  const [structuredTaskAssignmentType, setStructuredTaskAssignmentType] = useState<'CLASS' | 'INDIVIDUAL'>('CLASS');
  const [structuredTaskIsSequential, setStructuredTaskIsSequential] = useState(false);
  const [assignedStudentId, setAssignedStudentId] = useState('');
  const [previewingForm, setPreviewingForm] = useState<Material | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCourses();
    fetchMaterials();
    fetchStructuredTasks();
  }, []);

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/courses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCourses(data);
      }
    } catch (err) {
      console.error('Error fetching courses', err);
    }
  };

  const fetchMaterials = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/materials`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setMaterials(await res.json());
    } catch (err) {
      console.error('Error fetching materials', err);
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

  const fetchEnrolledStudents = async (courseId: string) => {
    if (!courseId) {
      setEnrolledStudents([]);
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/courses/${courseId}/students`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setEnrolledStudents(await res.json());
    } catch (err) {
      console.error('Error fetching enrolled students', err);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseTitle) return;

    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/courses`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: newCourseTitle })
      });
      
      if (res.ok) {
        setNewCourseTitle('');
        setIsCreating(false);
        fetchCourses();
      }
    } catch (err) {
      console.error('Error creating course', err);
    }
  };

  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse || !courseTitle.trim()) return;
    const token = localStorage.getItem('token');
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const res = await fetch(`${apiUrl}/api/courses/${editingCourse.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: courseTitle.trim() })
    });
    if (res.ok) { setEditingCourse(null); fetchCourses(); }
    else setCourseError('No se pudo actualizar la clase.');
  };

  const handleDeleteCourse = async () => {
    if (!deletingCourse) return;
    const token = localStorage.getItem('token');
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const res = await fetch(`${apiUrl}/api/courses/${deletingCourse.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) { setDeletingCourse(null); fetchCourses(); }
    else setCourseError('No se pudo eliminar la clase.');
  };

  const [modalityFilter, setModalityFilter] = useState<'ALL' | 'PRESENCIAL' | 'ONLINE'>('ALL');

  const filteredCourses = courses.filter(c => {
    const isOnline = c.title.toLowerCase().includes('online') || c.title.toLowerCase().includes('particular') || c.title.toLowerCase().includes('individual');
    const modality = isOnline ? 'ONLINE' : 'PRESENCIAL';
    if (modalityFilter === 'PRESENCIAL') return modality === 'PRESENCIAL';
    if (modalityFilter === 'ONLINE') return modality === 'ONLINE';
    return true;
  });

  const openStructuredTaskModal = (task?: StructuredTask) => {
    setEditingStructuredTask(task || null);
    setStructuredTaskTitle(task?.title || '');
    setStructuredTaskSteps(task?.steps.map((step, index) => ({ ...step, order: index + 1 })) || [{ id: `step-${Date.now()}`, order: 1, title: '', materialId: null }]);
    const courseId = task?.courseId || courses[0]?.id || '';
    setStructuredTaskCourseId(courseId);
    setStructuredTaskAssignmentType(task?.assignmentType || 'CLASS');
    setStructuredTaskIsSequential(task?.isSequential || false);
    setAssignedStudentId(task?.assignedStudentId || '');
    fetchEnrolledStudents(courseId);
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
    if (!title || !structuredTaskCourseId || steps.length === 0 || (structuredTaskAssignmentType === 'INDIVIDUAL' && !assignedStudentId)) return;

    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/structured-tasks${editingStructuredTask ? `/${editingStructuredTask.id}` : ''}`, {
        method: editingStructuredTask ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, courseId: structuredTaskCourseId, assignmentType: structuredTaskAssignmentType, isSequential: structuredTaskIsSequential, assignedStudentId: structuredTaskAssignmentType === 'INDIVIDUAL' ? assignedStudentId : null, steps })
      });
      if (!res.ok) throw new Error('No se pudo guardar la tarea estructurada.');
      await fetchStructuredTasks();
      setIsStructuredTaskModalOpen(false);
    } catch (err) {
      setCourseError(err instanceof Error ? err.message : 'No se pudo guardar la tarea estructurada.');
    }
  };

  const getMaterial = (materialId: string | null) => materials.find((material) => material.id === materialId);

  const handleOpenMaterial = (material: Material) => {
    if (material.type === 'FORM') {
      setPreviewingForm(material);
      return;
    }
    if (material.url) window.open(material.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="page-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--text-main)' }}>Mis Clases</h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)' }}>Crea y gestiona tus aulas virtuales presenciales y online</p>
        </div>
      </header>

      {/* Selector de Modalidad Presencial vs Online */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {([
            ['ALL', 'Todas las clases', null],
            ['PRESENCIAL', 'Presencial (Academia)', <GraduationCap size={15} />],
            ['ONLINE', 'Online / Particulares', <Laptop size={15} />]
          ] as const).map(([val, label, icon]) => (
            <button
              key={val}
              type="button"
              onClick={() => setModalityFilter(val)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.5rem 0.95rem',
                borderRadius: '16px',
                border: modalityFilter === val ? '1px solid var(--primary)' : '1px solid var(--border)',
                background: modalityFilter === val ? 'var(--primary-light)' : 'var(--surface)',
                color: modalityFilter === val ? 'var(--primary-text)' : 'var(--text-muted)',
                fontWeight: modalityFilter === val ? 700 : 500,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        {!isCreating && (
          <button onClick={() => setIsCreating(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem' }}>
            <Plus size={18} /> Crear nueva clase
          </button>
        )}
      </div>

      <div style={{ marginBottom: '2rem' }}>
        {isCreating && (
          <form onSubmit={handleCreateCourse} className="glass-panel animate-fade-in" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', maxWidth: '650px', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={newCourseTitle}
              onChange={(e) => setNewCourseTitle(e.target.value)}
              placeholder="Nombre de la clase (ej. B2 First Cambridge Presencial)"
              style={{ flex: '1 1 240px', minWidth: 0, padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)', outline: 'none' }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button type="submit" className="btn-primary">Guardar</button>
              <button type="button" onClick={() => setIsCreating(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.5rem 0.75rem' }}>Cancelar</button>
            </div>
          </form>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '1.25rem' }}>
        {filteredCourses.map(course => {
          const isOnline = course.title.toLowerCase().includes('online') || course.title.toLowerCase().includes('particular') || course.title.toLowerCase().includes('individual');

          return (
            <div 
              key={course.id} 
              className="glass-panel" 
              style={{ cursor: 'pointer', transition: 'all 0.2s ease', padding: '1.5rem', border: '1px solid var(--border)' }}
              onClick={() => navigate(`/teacher/course/${course.id}`)}
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
                <div style={{
                  background: isOnline ? '#eef2ff' : 'var(--primary-light)',
                  padding: '0.75rem',
                  borderRadius: '12px',
                  color: isOnline ? '#4338ca' : 'var(--primary)'
                }}>
                  {isOnline ? <Laptop size={24} /> : <BookOpen size={24} />}
                </div>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--text)', fontSize: '1.15rem' }}>{course.title}</h3>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    marginTop: '2px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '1px 7px',
                    borderRadius: '10px',
                    background: isOnline ? '#eef2ff' : '#f0fdf4',
                    color: isOnline ? '#4338ca' : '#15803d',
                    border: `1px solid ${isOnline ? '#c7d2fe' : '#bbf7d0'}`
                  }}>
                    {isOnline ? 'Online' : 'Presencial'}
                  </span>
                </div>
                <div style={{ marginLeft: 'auto', position: 'relative' }} onClick={(event) => event.stopPropagation()}>
                  <button title="Acciones de la clase" aria-label="Acciones de la clase" onClick={() => setOpenMenuId(openMenuId === course.id ? null : course.id)} style={iconButtonStyle}><MoreVertical size={20} /></button>
                  {openMenuId === course.id && <div style={{ position: 'absolute', right: 0, top: '2rem', zIndex: 10, width: '170px', padding: '0.35rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: 'var(--shadow-lg)' }}>
                    <button onClick={() => { setEditingCourse(course); setCourseTitle(course.title); setOpenMenuId(null); }} style={menuButtonStyle}><Pencil size={15} /> Editar título</button>
                    <button onClick={() => { setDeletingCourse(course); setOpenMenuId(null); }} style={{ ...menuButtonStyle, color: '#9e2a2b' }}><Trash2 size={15} /> Eliminar clase</button>
                  </div>}
                </div>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>Haz clic para gestionar el aula y el temario →</p>
            </div>
          );
        })}
        {filteredCourses.length === 0 && !isCreating && (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem', gridColumn: '1 / -1' }}>
            <BookOpen size={40} style={{ color: 'var(--primary)', opacity: 0.5, marginBottom: '1rem' }} />
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>
              {modalityFilter === 'ALL' ? 'Aún no tienes ninguna clase creada. ¡Crea la primera para empezar!' : `No hay clases en la categoría ${modalityFilter === 'PRESENCIAL' ? 'Presencial' : 'Online'}.`}
            </p>
          </div>
        )}
      </div>

      <section style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.55rem', color: 'var(--text-main)', fontSize: '1.35rem' }}>
              <ListChecks size={22} style={{ color: 'var(--primary)' }} /> Tareas Estructuradas
            </h2>
            <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>Organiza actividades guiadas con pasos numerados.</p>
          </div>
          <button type="button" onClick={() => openStructuredTaskModal()} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.6rem 1rem' }}>
            <Plus size={17} /> Añadir Tarea Estructurada
          </button>
        </header>

        {structuredTasks.length === 0 ? (
          <div style={{ padding: '2rem', border: '1px dashed var(--primary-border)', borderRadius: '8px', background: 'var(--primary-subtle)', color: 'var(--text-muted)', textAlign: 'center' }}>
            Aún no hay tareas estructuradas.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
            {structuredTasks.map((task) => (
              <article key={task.id} style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--primary-border)', borderRadius: '8px', boxShadow: 'var(--shadow-sm)', padding: '1.25rem' }}>
                <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', minWidth: 0 }}>
                    <CheckSquare size={21} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.05rem' }}>{task.title}</h3>
                      <div style={{ display: 'flex', gap: '0.45rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                        <span style={{ display: 'inline-flex', padding: '0.18rem 0.5rem', borderRadius: '12px', background: 'var(--primary-light)', color: 'var(--primary-text)', fontSize: '0.72rem', fontWeight: 700 }}>Pasos Numerados</span>
                        {task.isSequential && <span style={{ display: 'inline-flex', padding: '0.18rem 0.5rem', borderRadius: '12px', background: '#fef3c7', color: '#92400e', fontSize: '0.72rem', fontWeight: 700 }}>Paso a paso</span>}
                        <span style={{ display: 'inline-flex', padding: '0.18rem 0.5rem', borderRadius: '12px', background: task.assignmentType === 'INDIVIDUAL' ? '#eef2ff' : '#ecfdf5', color: task.assignmentType === 'INDIVIDUAL' ? '#3730a3' : '#047857', fontSize: '0.72rem', fontWeight: 700 }}>
                          {task.assignmentType === 'INDIVIDUAL' ? `Asignado a: ${task.assignedStudentName || 'Alumno'}` : 'Toda la clase'}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{task.steps.length} {task.steps.length === 1 ? 'paso' : 'pasos'}</span>
                      </div>
                    </div>
                  </div>
                  <button type="button" onClick={() => openStructuredTaskModal(task)} className="btn-secondary" style={{ padding: '0.4rem 0.7rem', fontSize: '0.8rem' }}>
                    <Pencil size={14} /> Gestionar Pasos
                  </button>
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

      {previewingForm && <div className="modal-backdrop" style={modalBackdropStyle} onClick={() => setPreviewingForm(null)}>
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
      </div>}

      {isStructuredTaskModalOpen && <div className="modal-backdrop" style={modalBackdropStyle} onClick={() => setIsStructuredTaskModalOpen(false)}>
        <form onSubmit={saveStructuredTask} className="glass-panel modal-card" onClick={(event) => event.stopPropagation()} style={{ width: 'min(100%, 520px)', padding: '1.5rem' }}>
          <button type="button" onClick={() => setIsStructuredTaskModalOpen(false)} aria-label="Cerrar" className="modal-close"><X size={19} /></button>
          <h2 style={{ margin: '0 0 0.35rem', color: 'var(--text-main)', fontSize: '1.2rem' }}>{editingStructuredTask ? 'Editar Tarea Estructurada' : 'Añadir Tarea Estructurada'}</h2>
          <p style={{ margin: '0 0 1.25rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>Configura la instrucción y el material opcional de cada paso.</p>
          <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 600 }}>Título</label>
          <input required value={structuredTaskTitle} onChange={(event) => setStructuredTaskTitle(event.target.value)} placeholder="Ej. Ensayo B2 Writing" style={inputStyle} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 600 }}>Clase destinataria</label>
              <select required value={structuredTaskCourseId} onChange={(event) => { setStructuredTaskCourseId(event.target.value); setAssignedStudentId(''); fetchEnrolledStudents(event.target.value); }} style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)' }}>
                <option value="">Selecciona una clase</option>
                {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 600 }}>Asignar a</label>
              <select value={structuredTaskAssignmentType} onChange={(event) => { setStructuredTaskAssignmentType(event.target.value as 'CLASS' | 'INDIVIDUAL'); setAssignedStudentId(''); }} style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)' }}>
                <option value="CLASS">Toda la clase</option>
                <option value="INDIVIDUAL">Alumno individual</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '0.3rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 600 }}>
                <input type="checkbox" checked={structuredTaskIsSequential} onChange={(e) => setStructuredTaskIsSequential(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }} />
                Paso a paso (secuencial)
              </label>
            </div>
          </div>
          {structuredTaskAssignmentType === 'INDIVIDUAL' && (
            <div style={{ marginTop: '0.75rem' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 600 }}>Alumno</label>
              <select required value={assignedStudentId} onChange={(event) => setAssignedStudentId(event.target.value)} disabled={!structuredTaskCourseId} style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)' }}>
                <option value="">Selecciona un alumno matriculado</option>
                {enrolledStudents.map((student) => <option key={student.id} value={student.id}>{student.profile ? `${student.profile.firstName} ${student.profile.lastName}`.trim() : student.email}</option>)}
              </select>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '1rem' }}>
            <label style={{ color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 600 }}>Pasos</label>
            {structuredTaskSteps.map((step, index) => (
              <div key={step.id} style={{ display: 'grid', gridTemplateColumns: '32px minmax(0, 1fr) minmax(150px, 0.8fr) 32px', alignItems: 'center', gap: '0.5rem', padding: '0.6rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface-alt)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary-text)', fontSize: '0.8rem', fontWeight: 700 }}>{index + 1}</span>
                <input required value={step.title} onChange={(event) => updateStructuredTaskStep(index, { title: event.target.value })} placeholder="Título o instrucción del paso" style={{ ...inputStyle, padding: '0.55rem' }} />
                <select value={step.materialId || ''} onChange={(event) => updateStructuredTaskStep(index, { materialId: event.target.value || null })} style={{ minWidth: 0, padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)' }}>
                  <option value="">Vincular Material de Clase</option>
                  {materials.map((material) => <option key={material.id} value={material.id}>[{material.type}] {material.title}</option>)}
                </select>
                <button type="button" onClick={() => removeStructuredTaskStep(index)} disabled={structuredTaskSteps.length === 1} title="Eliminar paso" aria-label={`Eliminar paso ${index + 1}`} style={{ ...iconButtonStyle, color: '#b91c1c', opacity: structuredTaskSteps.length === 1 ? 0.4 : 1 }}><Trash2 size={17} /></button>
              </div>
            ))}
            <button type="button" onClick={addStructuredTaskStep} className="btn-secondary" style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.7rem', fontSize: '0.82rem' }}><Plus size={15} /> Añadir otro paso</button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '1.25rem' }}>
            <button type="button" onClick={() => setIsStructuredTaskModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Guardar Tarea</button>
          </div>
        </form>
      </div>}
      {(editingCourse || deletingCourse) && <div style={modalBackdropStyle} onClick={() => { setEditingCourse(null); setDeletingCourse(null); }}>
        <div className="glass-panel animate-fade-in" onClick={(event) => event.stopPropagation()} style={{ width: 'min(100%, 440px)', padding: '1.5rem' }}>
          <button onClick={() => { setEditingCourse(null); setDeletingCourse(null); }} aria-label="Cerrar" style={{ ...iconButtonStyle, float: 'right' }}><X size={19} /></button>
          {editingCourse ? <form onSubmit={handleUpdateCourse}>
            <h2 style={{ margin: '0 0 1rem' }}>Editar título</h2>
            <input value={courseTitle} onChange={(event) => setCourseTitle(event.target.value)} autoFocus required style={inputStyle} />
            <button className="btn-primary" type="submit" style={{ marginTop: '1rem' }}>Guardar cambios</button>
          </form> : <>
            <h2 style={{ margin: '0 0 0.75rem' }}>Eliminar clase</h2>
            <p style={{ color: 'var(--text-muted)' }}>Se eliminará “{deletingCourse?.title}” y su contenido. Esta acción no se puede deshacer.</p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}><button className="btn-secondary" onClick={() => setDeletingCourse(null)}>Cancelar</button><button className="btn-primary" onClick={handleDeleteCourse} style={{ background: '#9e2a2b' }}>Eliminar</button></div>
          </>}
        </div>
      </div>}
      {courseError && <div style={{ marginTop: '1rem', color: '#9e2a2b' }}>{courseError}</div>}
    </div>
  );
};

const iconButtonStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.35rem' };
const menuButtonStyle: React.CSSProperties = { width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.55rem', border: 'none', borderRadius: '6px', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer', textAlign: 'left' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)', outline: 'none' };
const modalBackdropStyle: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 100, display: 'grid', placeItems: 'center', padding: '1rem', background: 'rgba(34, 49, 43, 0.35)' };

export default TeacherDashboard;
