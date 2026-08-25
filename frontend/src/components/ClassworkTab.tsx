import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, FileText, Calendar } from 'lucide-react';

const SKILL_CATEGORIES = [
  { id: 'GRAMMAR_VOCABULARY', label: 'Grammar and Vocabulary' },
  { id: 'READING', label: 'Reading' },
  { id: 'SPEAKING', label: 'Speaking' },
  { id: 'WRITING', label: 'Writing' },
  { id: 'LISTENING', label: 'Listening' },
  { id: 'MOCK_EXAM', label: 'Mock Exams' }
];

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

  useEffect(() => {
    fetchAssignments();
    fetchMaterials();
  }, [courseId]);

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
      const res = await fetch(`${apiUrl}/api/courses/${courseId}/assignments`, {
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
          materialId: newMaterialId || null
        }),
      });

      if (res.ok) {
        setIsCreating(false);
        setNewTitle('');
        setNewDesc('');
        setNewDueDate('');
        setNewMaterialId('');
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
                  <div key={item.id} className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', transition: 'background-color 0.2s' }}>
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
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClassworkTab;
