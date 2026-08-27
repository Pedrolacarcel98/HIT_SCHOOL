import React, { useState, useEffect } from 'react';
import { Calendar, FileText, Pencil, Plus, Trash2, X } from 'lucide-react';

const SKILL_CATEGORIES = [
  { id: 'GRAMMAR_VOCABULARY', label: 'Grammar and Vocabulary' },
  { id: 'READING', label: 'Reading' },
  { id: 'SPEAKING', label: 'Speaking' },
  { id: 'WRITING', label: 'Writing' },
  { id: 'LISTENING', label: 'Listening' },
  { id: 'MOCK_EXAM', label: 'Mock Exams' }
];
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const ClassworkTab: React.FC<{ courseId: string }> = ({ courseId }) => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
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
  const [students, setStudents] = useState<any[]>([]);

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
  };

  const saveEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingAssignment || !editTitle.trim()) return;
    const recipient = editRecipient === courseId ? { courseId, studentId: null } : { courseId: null, studentId: editRecipient };
    const res = await fetch(`${apiUrl}/api/assignments/${editingAssignment.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify({ title: editTitle.trim(), category: editCategory, ...recipient, materialId: editingAssignment.materialId || null, description: editingAssignment.description || '', dueDate: editingAssignment.dueDate || null })
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
              <select value={newMaterialId} onChange={(e) => setNewMaterialId(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}>
                <option value="">Ninguno</option>
                {materials.map(m => (
                  <option key={m.id} value={m.id}>{m.title} ({m.type})</option>
                ))}
              </select>
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
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {group.items.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', margin: 0, paddingLeft: '1rem' }}>Sin contenido</p>
              ) : (
                group.items.map(item => (
                  <div key={item.id} className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', transition: 'background-color 0.2s' }}>
                    <div style={{ background: 'var(--surface)', padding: '0.75rem', borderRadius: '50%', color: 'var(--primary)' }}>
                      <FileText size={20} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: '500', color: 'var(--text)' }}>{item.title}</p>
                      {item.dueDate && (
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                          <Calendar size={14} /> Fecha de entrega: {new Date(item.dueDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button title="Editar contenido" aria-label="Editar contenido" onClick={() => openEdit(item)} style={actionButtonStyle}><Pencil size={17} /></button>
                      <button title="Eliminar contenido" aria-label="Eliminar contenido" onClick={() => deleteAssignment(item)} style={{ ...actionButtonStyle, color: '#9e2a2b' }}><Trash2 size={17} /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
      {editingAssignment && <div style={modalBackdropStyle} onClick={() => setEditingAssignment(null)}>
        <form className="glass-panel animate-fade-in" onSubmit={saveEdit} onClick={(event) => event.stopPropagation()} style={{ width: 'min(100%, 500px)', padding: '1.5rem' }}>
          <button type="button" onClick={() => setEditingAssignment(null)} aria-label="Cerrar" style={{ ...actionButtonStyle, float: 'right' }}><X size={19} /></button>
          <h2 style={{ margin: '0 0 1rem' }}>Editar contenido</h2>
          <label style={labelStyle}>Título<input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} required style={inputStyle} /></label>
          <label style={labelStyle}>Categoría<select value={editCategory} onChange={(event) => setEditCategory(event.target.value)} style={inputStyle}>{SKILL_CATEGORIES.map(category => <option key={category.id} value={category.id}>{category.label}</option>)}</select></label>
          <label style={labelStyle}>Destinatario<select value={editRecipient} onChange={(event) => setEditRecipient(event.target.value)} style={inputStyle}><option value={courseId}>Toda la clase</option>{students.map(student => <option key={student.id} value={student.id}>{student.profile?.firstName} {student.profile?.lastName} ({student.email})</option>)}</select></label>
          <button className="btn-primary" type="submit">Guardar cambios</button>
        </form>
      </div>}
    </div>
  );
};

const actionButtonStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.45rem', border: 'none', borderRadius: '6px', background: 'transparent', color: 'var(--primary-text)', cursor: 'pointer' };
const inputStyle: React.CSSProperties = { width: '100%', marginTop: '0.35rem', padding: '0.7rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface-alt)', color: 'var(--text-main)' };
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '0.9rem', fontSize: '0.88rem', fontWeight: 600 };
const modalBackdropStyle: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 100, display: 'grid', placeItems: 'center', padding: '1rem', background: 'rgba(34, 49, 43, 0.35)' };

export default ClassworkTab;
