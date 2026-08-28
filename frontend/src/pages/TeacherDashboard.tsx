import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, GraduationCap, Laptop, MoreVertical, Pencil, Plus, Trash2, X } from 'lucide-react';

interface Course {
  id: string;
  title: string;
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
  const navigate = useNavigate();

  useEffect(() => {
    fetchCourses();
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
