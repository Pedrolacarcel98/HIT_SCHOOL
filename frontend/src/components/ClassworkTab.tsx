import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, CheckCircle2, ClipboardCheck, Clock3, FileText, Headphones, Pencil, Plus, Search, Trash2, Video, X } from 'lucide-react';
import ExamReviewModal from './ExamReviewModal';

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
  formData?: { questions?: any[] } | null;
}

interface ExamReviewData {
  title: string;
  questions: any[];
  answers: Record<string, any>;
  score: number | null;
  total?: number | null;
}

const parseSavedExam = (content?: string | null) => {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content);
    return parsed.answers || typeof parsed.score === 'number' ? parsed : null;
  } catch {
    return null;
  }
};

const ClassworkTab: React.FC<{ courseId: string }> = ({ courseId }) => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('GRAMMAR_VOCABULARY');
  const [newDueDate, setNewDueDate] = useState('');
  const [newMaterialId, setNewMaterialId] = useState('');
  const [newRecipient, setNewRecipient] = useState(courseId);
  const [editingAssignment, setEditingAssignment] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('GRAMMAR_VOCABULARY');
  const [editRecipient, setEditRecipient] = useState(courseId);
  const [editMaterialId, setEditMaterialId] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [materialPickerMode, setMaterialPickerMode] = useState<'create' | 'edit' | null>(null);
  const [materialSearch, setMaterialSearch] = useState('');
  const [materialTypeFilter, setMaterialTypeFilter] = useState<'ALL' | MaterialItem['type']>('ALL');
  const [reviewingExam, setReviewingExam] = useState<ExamReviewData | null>(null);

  useEffect(() => {
    fetchAssignments();
    fetchMaterials();
    fetchStudents();
  }, [courseId]);

  const fetchStudents = async () => {
    const token = localStorage.getItem('token');
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const res = await fetch(`${apiUrl}/api/students`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setStudents(await res.json());
  };

  const openEdit = (assignment: any) => {
    setEditingAssignment(assignment);
    setEditTitle(assignment.title);
    setEditCategory(assignment.category);
    setEditRecipient(assignment.studentId || assignment.courseId || courseId);
    setEditMaterialId(assignment.materialId || '');
  };

  const saveEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingAssignment || !editTitle.trim()) return;
    const recipient = editRecipient === courseId ? { courseId, studentId: null } : { courseId: null, studentId: editRecipient };
    const res = await fetch(`${apiUrl}/api/assignments/${editingAssignment.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify({ title: editTitle.trim(), category: editCategory, ...recipient, materialId: editMaterialId || null, description: editingAssignment.description || '', dueDate: editingAssignment.dueDate || null })
    });
    if (res.ok) { setEditingAssignment(null); fetchAssignments(); }
  };

  const deleteAssignment = async (assignment: any) => {
    if (!window.confirm(`¿Eliminar “${assignment.title}”?`)) return;
    const res = await fetch(`${apiUrl}/api/assignments/${assignment.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    if (res.ok) fetchAssignments();
  };

  const fetchAssignments = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/courses/${courseId}/assignments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setAssignments(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMaterials = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/materials`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setMaterials(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setFormError('El titulo es obligatorio.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError('');
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const isIndividual = newRecipient !== courseId;
      const res = await fetch(`${apiUrl}${isIndividual ? '/api/assignments' : `/api/courses/${courseId}/assignments`}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newTitle.trim(), 
          description: newDesc, 
          category: newCategory,
          dueDate: newDueDate || null,
          materialId: newMaterialId || null,
          ...(isIndividual ? { studentId: newRecipient } : { courseId })
        }),
      });

      if (res.ok) {
        setIsCreating(false);
        setNewTitle('');
        setNewDesc('');
        setNewDueDate('');
        setNewMaterialId('');
        setNewRecipient(courseId);
        fetchAssignments();
      } else {
        const data = await res.json().catch(() => ({}));
        setFormError(data.error || 'No se pudo crear la tarea. Revisa los datos e intentalo de nuevo.');
      }
    } catch (err) {
      console.error(err);
      setFormError('Error de conexion con el servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Agrupar tareas por categoría
  const grouped = SKILL_CATEGORIES.map(cat => ({
    ...cat,
    items: assignments.filter(a => a.category === cat.id)
  }));

  const selectedCreateMaterial = materials.find((material) => material.id === newMaterialId);
  const selectedEditMaterial = materials.find((material) => material.id === editMaterialId);
  const filteredPickerMaterials = materials.filter((material) => {
    const query = materialSearch.trim().toLowerCase();
    const matchesSearch = !query || `${material.title} ${material.description || ''}`.toLowerCase().includes(query);
    return matchesSearch && (materialTypeFilter === 'ALL' || material.type === materialTypeFilter);
  });
  const materialIcon = (type: MaterialItem['type']) => type === 'FORM' ? <ClipboardCheck size={16} /> : type === 'VIDEO' ? <Video size={16} /> : type === 'AUDIO' ? <Headphones size={16} /> : <FileText size={16} />;
  const materialLabel = (type: MaterialItem['type']) => type === 'FORM' ? 'EXAMEN INTERACTIVO' : type === 'VIDEO' ? 'VÍDEO' : type === 'AUDIO' ? 'AUDIO' : 'DOCUMENTO';
  const openMaterialPicker = (mode: 'create' | 'edit') => {
    setMaterialPickerMode(mode);
    setMaterialSearch('');
    setMaterialTypeFilter('ALL');
  };
  const chooseMaterial = (materialId: string) => {
    if (materialPickerMode === 'create') setNewMaterialId(materialId);
    if (materialPickerMode === 'edit') setEditMaterialId(materialId);
    setMaterialPickerMode(null);
  };

  return (
    <div className="animate-fade-in">
      {!isCreating ? (
        <button onClick={() => setIsCreating(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
          <Plus size={18} /> Crear tarea o material
        </button>
      ) : (
        <form onSubmit={handleCreate} className="glass-panel animate-fade-in" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
          <h3 style={{ marginTop: 0, color: 'var(--primary)', marginBottom: '1rem' }}>Nueva Tarea</h3>
          {formError && (
            <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b', borderRadius: '8px' }}>
              {formError}
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '2 1 220px', minWidth: 0 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>Título</label>
              <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }} />
            </div>
            <div style={{ flex: '1 1 180px', minWidth: 0 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>Categoría (Skill)</label>
              <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}>
                {SKILL_CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: '1 1 220px', minWidth: 0 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>Destinatario</label>
              <select value={newRecipient} onChange={(e) => setNewRecipient(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}>
                <option value={courseId}>Toda la clase</option>
                {students.map(student => <option key={student.id} value={student.id}>{student.profile?.firstName} {student.profile?.lastName} ({student.email})</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 220px', minWidth: 0 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>Material Vinculado (Opcional)</label>
              {selectedCreateMaterial ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 0.75rem', border: '1px solid var(--primary-border)', borderRadius: '8px', background: 'var(--primary-light)', color: 'var(--primary-text)' }}>
                  {materialIcon(selectedCreateMaterial.type)}
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.82rem', fontWeight: 700 }}>{selectedCreateMaterial.title}</span>
                  <button type="button" onClick={() => openMaterialPicker('create')} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>✏️</button>
                  <button type="button" onClick={() => setNewMaterialId('')} style={{ border: 'none', background: 'transparent', color: '#b91c1c', cursor: 'pointer' }}>🗑️</button>
                </div>
              ) : (
                <button type="button" onClick={() => openMaterialPicker('create')} style={{ width: '100%', padding: '0.72rem', border: '2px dashed #cbd5e1', borderRadius: '8px', background: 'transparent', color: '#475569', cursor: 'pointer', textAlign: 'left' }}>
                  📎 Seleccionar Material de Clase
                </button>
              )}
            </div>
            <div style={{ flex: '1 1 180px', minWidth: 0 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>Fecha de Vencimiento (Opcional)</label>
              <input type="datetime-local" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }} />
            </div>
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>Descripción / Instrucciones (Opcional)</label>
            <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', resize: 'vertical', minHeight: '80px', background: 'var(--surface-alt)', color: 'var(--text-main)' }} />
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
              {isSubmitting ? 'Asignando...' : 'Asignar Tarea'}
            </button>
            <button type="button" onClick={() => setIsCreating(false)} disabled={isSubmitting} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1 }}>Cancelar</button>
          </div>
        </form>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {grouped.map(group => (
          <div key={group.id}>
            <h2 style={{ color: 'var(--primary)', borderBottom: '2px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem', fontSize: '1.5rem' }}>
              {group.label}
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '1.25rem' }}>
              {group.items.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', margin: 0, paddingLeft: '1rem' }}>Sin contenido</p>
              ) : (
                group.items.map(item => {
                  const material = item.material as MaterialItem | null | undefined;
                  const isExam = material?.type === 'FORM';
                  const submissions = item.submissions || [];
                  const gradedCount = submissions.filter((submission: any) => submission.grade !== null && submission.grade !== undefined).length;
                  return (
                    <article key={item.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', minHeight: '270px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', color: '#2b6cb0', fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase' }}>
                          <span style={{ padding: '0.45rem', borderRadius: '8px', background: '#eef6fc', display: 'flex' }}>{materialIcon(material?.type || 'DOCUMENT')}</span>
                          {materialLabel(material?.type || 'DOCUMENT')}
                        </div>
                        <span style={{ padding: '0.2rem 0.55rem', borderRadius: '12px', background: 'var(--primary-light)', color: 'var(--primary-text)', border: '1px solid var(--primary-border)', fontSize: '0.72rem', fontWeight: 700 }}>{material?.level || 'GENERAL'}</span>
                      </div>
                      <h3 style={{ fontSize: '1.1rem', lineHeight: 1.35, margin: '0 0 0.55rem' }}>{item.title}</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', lineHeight: 1.45, margin: '0 0 1.25rem', flex: 1 }}>{item.description || material?.description || 'Sin descripción disponible.'}</p>
                      <div style={{ display: 'grid', gap: '0.45rem', borderTop: '1px solid var(--border)', paddingTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {item.dueDate && <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Calendar size={14} /> Entrega: {new Date(item.dueDate).toLocaleDateString('es-ES')}</span>}
                        <span>{submissions.length} entregas · {gradedCount} evaluadas</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1.25rem' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: submissions.length > 0 ? '#24583e' : '#8d5b12', background: submissions.length > 0 ? 'var(--primary-light)' : '#fef7e8', padding: '0.3rem 0.65rem', borderRadius: '14px', border: submissions.length > 0 ? '1px solid var(--primary-border)' : '1px solid #fae0b0', fontSize: '0.82rem', fontWeight: 700 }}>
                          {submissions.length > 0 ? <><CheckCircle2 size={16} /> Entregas recibidas</> : <><Clock3 size={16} /> Pendiente</>}
                        </span>
                        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                          {isExam && submissions[0] && (() => {
                            const attempt = parseSavedExam(submissions[0].content);
                            return attempt ? <button type="button" onClick={() => setReviewingExam({ title: item.title, questions: material?.formData?.questions || [], answers: attempt.answers || {}, score: submissions[0].grade ?? attempt.score ?? null, total: attempt.total })} className="btn-secondary" style={{ padding: '0.5rem 0.7rem', fontSize: '0.8rem' }}>Revisar</button> : null;
                          })()}
                          <button title="Editar contenido" aria-label="Editar contenido" onClick={() => openEdit(item)} style={actionButtonStyle}><Pencil size={17} /></button>
                          <button title="Eliminar contenido" aria-label="Eliminar contenido" onClick={() => deleteAssignment(item)} style={{ ...actionButtonStyle, color: '#9e2a2b' }}><Trash2 size={17} /></button>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>
      {materialPickerMode && createPortal(
        <div className="modal-backdrop" style={{ zIndex: 110 }} onClick={() => setMaterialPickerMode(null)}>
          <div className="glass-panel modal-card modal-card--wide" onClick={(event) => event.stopPropagation()} style={{ maxWidth: '760px', maxHeight: '88vh', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button type="button" onClick={() => setMaterialPickerMode(null)} aria-label="Cerrar biblioteca" className="modal-close"><X size={19} /></button>
            <div style={{ paddingRight: '2rem' }}>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Elige el material que acompañará la tarea.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input value={materialSearch} onChange={(event) => setMaterialSearch(event.target.value)} placeholder="Buscar por título o descripción..." style={{ ...inputStyle, paddingLeft: '2.25rem' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {([['ALL', 'Todos'], ['DOCUMENT', 'Documentos'], ['VIDEO', 'Vídeos'], ['AUDIO', 'Audios'], ['FORM', 'Exámenes']] as const).map(([value, label]) => (
                  <button key={value} type="button" onClick={() => setMaterialTypeFilter(value)} className={materialTypeFilter === value ? 'btn-primary' : 'btn-secondary'} style={{ padding: '0.4rem 0.7rem', fontSize: '0.78rem' }}>{label}</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', maxHeight: '60vh', overflowY: 'auto', padding: '0.15rem' }}>
              {filteredPickerMaterials.map((material) => (
                <article key={material.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', padding: '1rem', border: '1px solid var(--border)', borderRadius: '10px', background: 'var(--surface)', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--primary-text)', fontSize: '0.72rem', fontWeight: 700 }}>
                    {materialIcon(material.type)} <span>{materialLabel(material.type)}</span>
                    <span style={{ marginLeft: 'auto', padding: '0.15rem 0.4rem', borderRadius: '999px', background: 'var(--primary-light)', border: '1px solid var(--primary-border)' }}>{material.level || 'GENERAL'}</span>
                  </div>
                  <strong style={{ color: '#0f172a' }}>{material.title}</strong>
                  <p style={{ margin: 0, minHeight: '2.4rem', color: '#64748b', fontSize: '0.75rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{material.description || 'Sin descripción disponible.'}</p>
                  <button type="button" onClick={() => chooseMaterial(material.id)} className="btn-primary" style={{ width: '100%', padding: '0.55rem', fontSize: '0.82rem', marginTop: 'auto' }}>✓ Seleccionar</button>
                </article>
              ))}
              {filteredPickerMaterials.length === 0 && <p style={{ gridColumn: '1 / -1', padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No se encontraron materiales.</p>}
            </div>
          </div>
        </div>, document.body
      )}
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
      {editingAssignment && createPortal(<div className="modal-backdrop" style={modalBackdropStyle} onClick={() => setEditingAssignment(null)}>
        <form className="glass-panel modal-card" onSubmit={saveEdit} onClick={(event) => event.stopPropagation()} style={{ width: 'min(100%, 500px)', padding: '1.5rem' }}>
          <button type="button" onClick={() => setEditingAssignment(null)} aria-label="Cerrar" className="modal-close"><X size={19} /></button>
          <h2 style={{ margin: '0 0 1rem' }}>Editar contenido</h2>
          <label style={labelStyle}>Título<input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} required style={inputStyle} /></label>
          <label style={labelStyle}>Categoría<select value={editCategory} onChange={(event) => setEditCategory(event.target.value)} style={inputStyle}>{SKILL_CATEGORIES.map(category => <option key={category.id} value={category.id}>{category.label}</option>)}</select></label>
          <label style={labelStyle}>Destinatario<select value={editRecipient} onChange={(event) => setEditRecipient(event.target.value)} style={inputStyle}><option value={courseId}>Toda la clase</option>{students.map(student => <option key={student.id} value={student.id}>{student.profile?.firstName} {student.profile?.lastName} ({student.email})</option>)}</select></label>
          <div style={{ marginBottom: '0.9rem' }}>
            <label style={labelStyle}>Material Vinculado (Opcional)</label>
            {selectedEditMaterial ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 0.75rem', border: '1px solid var(--primary-border)', borderRadius: '8px', background: 'var(--primary-light)', color: 'var(--primary-text)' }}>
                {materialIcon(selectedEditMaterial.type)}
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.82rem', fontWeight: 700 }}>{selectedEditMaterial.title}</span>
                <button type="button" onClick={() => openMaterialPicker('edit')} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>✏️</button>
                <button type="button" onClick={() => setEditMaterialId('')} style={{ border: 'none', background: 'transparent', color: '#b91c1c', cursor: 'pointer' }}>🗑️</button>
              </div>
            ) : (
              <button type="button" onClick={() => openMaterialPicker('edit')} style={{ width: '100%', padding: '0.72rem', border: '2px dashed #cbd5e1', borderRadius: '8px', background: 'transparent', color: '#475569', cursor: 'pointer', textAlign: 'left' }}>
                📎 Seleccionar Material de Clase
              </button>
            )}
          </div>
          <button className="btn-primary" type="submit">Guardar cambios</button>
        </form>
      </div>, document.body)}
    </div>
  );
};

const actionButtonStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.45rem', border: 'none', borderRadius: '6px', background: 'transparent', color: 'var(--primary-text)', cursor: 'pointer' };
const inputStyle: React.CSSProperties = { width: '100%', marginTop: '0.35rem', padding: '0.7rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface-alt)', color: 'var(--text-main)' };
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '0.9rem', fontSize: '0.88rem', fontWeight: 600 };
const modalBackdropStyle: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 100, display: 'grid', placeItems: 'center', padding: '1rem', background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)' };

export default ClassworkTab;
