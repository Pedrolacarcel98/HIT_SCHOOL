import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CheckCircle2, Clock, Copy, Laptop, LayoutGrid, List, MoreVertical, Pencil, Plus, Search, Trash2, Users, X } from 'lucide-react';
import CustomSelect from '../components/CustomSelect';
import ModalityBadge from '../components/ModalityBadge';

interface Course {
  id: string;
  title: string;
  modality?: 'PRESENCIAL' | 'ONLINE' | 'HIBRIDO';
  studentsCount?: number;
  tasksCount?: number;
  pendingStudentsCount?: number;
}

const TeacherCourses: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseModality, setNewCourseModality] = useState<'PRESENCIAL' | 'ONLINE' | 'HIBRIDO'>('PRESENCIAL');
  const [isCreating, setIsCreating] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseModality, setCourseModality] = useState<'PRESENCIAL' | 'ONLINE' | 'HIBRIDO'>('PRESENCIAL');
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);
  const [duplicatingCourse, setDuplicatingCourse] = useState<Course | null>(null);
  const [duplicateTitle, setDuplicateTitle] = useState('');
  const [duplicateModality, setDuplicateModality] = useState<'PRESENCIAL' | 'ONLINE' | 'HIBRIDO'>('PRESENCIAL');
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [courseError, setCourseError] = useState('');
  const [modalityFilter, setModalityFilter] = useState<'ALL' | 'PRESENCIAL' | 'ONLINE'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    return (localStorage.getItem('hit_courses_view_mode') as 'grid' | 'table') || 'grid';
  });
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole');

  const handleToggleViewMode = (mode: 'grid' | 'table') => {
    setViewMode(mode);
    localStorage.setItem('hit_courses_view_mode', mode);
  };

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
    if (!newCourseTitle.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/courses`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: newCourseTitle.trim(), modality: newCourseModality })
      });
      
      if (res.ok) {
        setNewCourseTitle('');
        setNewCourseModality('PRESENCIAL');
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
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: courseTitle.trim(), modality: courseModality })
    });
    if (res.ok) {
      setEditingCourse(null);
      fetchCourses();
    } else {
      setCourseError('No se pudo actualizar la clase.');
    }
  };

  const handleDeleteCourse = async () => {
    if (!deletingCourse) return;
    const token = localStorage.getItem('token');
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const res = await fetch(`${apiUrl}/api/courses/${deletingCourse.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      setDeletingCourse(null);
      fetchCourses();
    } else {
      setCourseError('No se pudo eliminar la clase.');
    }
  };

  const handleDuplicateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!duplicatingCourse || !duplicateTitle.trim()) return;

    try {
      setIsDuplicating(true);
      setCourseError('');
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/courses/${duplicatingCourse.id}/duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: duplicateTitle.trim(),
          modality: duplicateModality
        })
      });

      if (res.ok) {
        setDuplicatingCourse(null);
        await fetchCourses();
      } else {
        const data = await res.json().catch(() => ({}));
        setCourseError(data.error || 'No se pudo duplicar la clase.');
      }
    } catch (err) {
      console.error('Error duplicating course', err);
      setCourseError('Error de conexión al duplicar la clase.');
    } finally {
      setIsDuplicating(false);
    }
  };

  const filteredCourses = courses.filter(c => {
    const modality = c.modality || 'PRESENCIAL';
    const matchesSearch = c.title.toLowerCase().includes(searchTerm.trim().toLowerCase());
    if (!matchesSearch) return false;
    if (modalityFilter === 'PRESENCIAL') return modality === 'PRESENCIAL';
    if (modalityFilter === 'ONLINE') return modality === 'ONLINE' || modality === 'HIBRIDO';
    return true;
  });

  return (
    <div className="page-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', color: 'var(--text-main)' }}>Mis Clases</h1>
        </div>
      </header>

      <div className="filters-panel">
        <div className="filters-panel__search">
          <Search size={17} />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar clase por nombre..."
            aria-label="Buscar clase por nombre"
          />
          {searchTerm && (
            <button
              type="button"
              className="course-search-clear"
              onClick={() => setSearchTerm('')}
              aria-label="Limpiar búsqueda"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="filters-panel__selects">
          <CustomSelect
            value={modalityFilter}
            onChange={setModalityFilter}
            ariaLabel="Filtrar por modalidad"
            options={[
              { value: 'ALL', label: 'Todas las clases' },
              { value: 'PRESENCIAL', label: 'Presencial (Academia)' },
              { value: 'ONLINE', label: 'Online / Particulares' }
            ]}
          />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Conmutador de vista: Cuadrícula vs Tabla */}
          <div style={{ display: 'inline-flex', background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: '8px', padding: '3px', gap: '3px' }}>
            <button
              type="button"
              onClick={() => handleToggleViewMode('grid')}
              title="Vista en cuadrícula (tarjetas)"
              aria-label="Vista en cuadrícula"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '5px 8px',
                borderRadius: '6px',
                border: 'none',
                background: viewMode === 'grid' ? 'var(--surface)' : 'transparent',
                color: viewMode === 'grid' ? 'var(--primary)' : 'var(--text-muted)',
                boxShadow: viewMode === 'grid' ? 'var(--shadow-sm)' : 'none',
                cursor: 'pointer'
              }}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              type="button"
              onClick={() => handleToggleViewMode('table')}
              title="Vista en tabla (resumen)"
              aria-label="Vista en tabla"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '5px 8px',
                borderRadius: '6px',
                border: 'none',
                background: viewMode === 'table' ? 'var(--surface)' : 'transparent',
                color: viewMode === 'table' ? 'var(--primary)' : 'var(--text-muted)',
                boxShadow: viewMode === 'table' ? 'var(--shadow-sm)' : 'none',
                cursor: 'pointer'
              }}
            >
              <List size={16} />
            </button>
          </div>

          {!isCreating && userRole === 'ADMIN' && (
            <button onClick={() => setIsCreating(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem' }}>
              <Plus size={18} /> Crear nueva clase
            </button>
          )}
        </div>
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
            <select value={newCourseModality} onChange={(e) => setNewCourseModality(e.target.value as 'PRESENCIAL' | 'ONLINE' | 'HIBRIDO')} style={{ flex: '0 1 150px', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}>
              <option value="PRESENCIAL">Presencial</option>
              <option value="ONLINE">Online</option>
              <option value="HIBRIDO">Híbrido</option>
            </select>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button type="submit" className="btn-primary">Guardar</button>
              <button type="button" onClick={() => setIsCreating(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.5rem 0.75rem' }}>Cancelar</button>
            </div>
          </form>
        )}
      </div>

      {filteredCourses.length > 0 ? (
        viewMode === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '1.25rem' }}>
            {filteredCourses.map(course => {
              const modality = course.modality || 'PRESENCIAL';
              const isOnline = modality === 'ONLINE' || modality === 'HIBRIDO';
              const hasStudents = typeof course.studentsCount === 'number' && course.studentsCount > 0;
              const hasPending = typeof course.pendingStudentsCount === 'number' && course.pendingStudentsCount > 0;

              return (
                <div 
                  key={course.id} 
                  className="glass-panel" 
                  style={{ cursor: 'pointer', transition: 'all 0.2s ease', padding: '1.5rem', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}
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
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h3 style={{ margin: 0, color: 'var(--text)', fontSize: '1.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{course.title}</h3>
                      <ModalityBadge modality={modality} className="course-card-modality" />
                    </div>
                    <div style={{ marginLeft: 'auto', position: 'relative' }} onClick={(event) => event.stopPropagation()}>
                      <button title="Acciones de la clase" aria-label="Acciones de la clase" onClick={() => setOpenMenuId(openMenuId === course.id ? null : course.id)} style={iconButtonStyle}><MoreVertical size={20} /></button>
                      {openMenuId === course.id && <div style={{ position: 'absolute', right: 0, top: '2rem', zIndex: 10, width: '185px', padding: '0.35rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: 'var(--shadow-lg)' }}>
                        <button onClick={() => { setEditingCourse(course); setCourseTitle(course.title); setCourseModality(course.modality || 'PRESENCIAL'); setOpenMenuId(null); }} style={menuButtonStyle}><Pencil size={15} /> Editar título</button>
                        {userRole === 'ADMIN' && (
                          <>
                            <button onClick={() => { setDuplicatingCourse(course); setDuplicateTitle(`${course.title} (Copia)`); setDuplicateModality(course.modality || 'PRESENCIAL'); setOpenMenuId(null); }} style={menuButtonStyle}><Copy size={15} /> Duplicar clase</button>
                            <button onClick={() => { setDeletingCourse(course); setOpenMenuId(null); }} style={{ ...menuButtonStyle, color: '#9e2a2b' }}><Trash2 size={15} /> Eliminar clase</button>
                          </>
                        )}
                      </div>}
                    </div>
                  </div>

                  {/* Resumen Alumnos y Tareas */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem', flexWrap: 'wrap', marginTop: 'auto' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '12px',
                      background: hasStudents ? '#f0fdf4' : 'var(--surface-alt)',
                      color: hasStudents ? '#166534' : 'var(--text-muted)',
                      border: `1px solid ${hasStudents ? '#bbf7d0' : 'var(--border)'}`,
                      fontSize: '0.76rem',
                      fontWeight: 600
                    }}>
                      <Users size={12} /> {hasStudents ? `${course.studentsCount} ${course.studentsCount === 1 ? 'alumno' : 'alumnos'}` : 'Sin alumnos'}
                    </span>

                    {hasStudents && (
                      hasPending ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '12px',
                          background: '#fef3c7',
                          color: '#92400e',
                          border: '1px solid #fde68a',
                          fontSize: '0.76rem',
                          fontWeight: 600
                        }}>
                          <Clock size={12} /> {course.pendingStudentsCount} con pendientes
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '12px',
                          background: '#e0f2fe',
                          color: '#0369a1',
                          border: '1px solid #bae6fd',
                          fontSize: '0.76rem',
                          fontWeight: 600
                        }}>
                          <CheckCircle2 size={12} /> Al día
                        </span>
                      )
                    )}
                  </div>

                  <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', margin: 0 }}>Gestionar temario y aula →</p>
                </div>
              );
            })}
          </div>
        ) : (
          /* Vista en Tabla Resumen */
          <div className="glass-panel" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)', borderRadius: '12px' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-alt)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>Clase</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>Modalidad</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>Alumnos</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>Estado Tareas</th>
                    <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600, textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCourses.map((course) => {
                    const modality = course.modality || 'PRESENCIAL';
                    const isOnline = modality === 'ONLINE' || modality === 'HIBRIDO';
                    const hasStudents = typeof course.studentsCount === 'number' && course.studentsCount > 0;
                    const hasPending = typeof course.pendingStudentsCount === 'number' && course.pendingStudentsCount > 0;

                    return (
                      <tr
                        key={course.id}
                        onClick={() => navigate(`/teacher/course/${course.id}`)}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          cursor: 'pointer',
                          transition: 'background-color 0.15s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-alt)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        {/* Clase */}
                        <td style={{ padding: '0.9rem 1.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                              background: isOnline ? '#eef2ff' : 'var(--primary-light)',
                              padding: '0.5rem',
                              borderRadius: '8px',
                              color: isOnline ? '#4338ca' : 'var(--primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              {isOnline ? <Laptop size={18} /> : <BookOpen size={18} />}
                            </div>
                            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{course.title}</span>
                          </div>
                        </td>

                        {/* Modalidad */}
                        <td style={{ padding: '0.9rem 1rem' }}>
                          <ModalityBadge modality={modality} />
                        </td>

                        {/* Alumnos */}
                        <td style={{ padding: '0.9rem 1rem' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.22rem 0.6rem',
                            borderRadius: '12px',
                            background: hasStudents ? '#f0fdf4' : 'var(--surface-alt)',
                            color: hasStudents ? '#166534' : 'var(--text-muted)',
                            border: `1px solid ${hasStudents ? '#bbf7d0' : 'var(--border)'}`,
                            fontSize: '0.78rem',
                            fontWeight: 600
                          }}>
                            <Users size={13} /> {hasStudents ? `${course.studentsCount} ${course.studentsCount === 1 ? 'alumno' : 'alumnos'}` : 'Sin alumnos'}
                          </span>
                        </td>

                        {/* Estado Tareas */}
                        <td style={{ padding: '0.9rem 1rem' }}>
                          {hasStudents ? (
                            hasPending ? (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.22rem 0.6rem',
                                borderRadius: '12px',
                                background: '#fef3c7',
                                color: '#92400e',
                                border: '1px solid #fde68a',
                                fontSize: '0.78rem',
                                fontWeight: 600
                              }}>
                                <Clock size={13} /> {course.pendingStudentsCount} con pendientes
                              </span>
                            ) : (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.22rem 0.6rem',
                                borderRadius: '12px',
                                background: '#e0f2fe',
                                color: '#0369a1',
                                border: '1px solid #bae6fd',
                                fontSize: '0.78rem',
                                fontWeight: 600
                              }}>
                                <CheckCircle2 size={13} /> Al día
                              </span>
                            )
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>—</span>
                          )}
                        </td>

                        {/* Acciones */}
                        <td style={{ padding: '0.9rem 1.25rem', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button
                              type="button"
                              onClick={() => navigate(`/teacher/course/${course.id}`)}
                              className="btn-secondary"
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', borderRadius: '6px' }}
                            >
                              Entrar →
                            </button>
                            <div style={{ position: 'relative' }}>
                              <button
                                title="Acciones de la clase"
                                aria-label="Acciones de la clase"
                                onClick={() => setOpenMenuId(openMenuId === `tbl_${course.id}` ? null : `tbl_${course.id}`)}
                                style={iconButtonStyle}
                              >
                                <MoreVertical size={18} />
                              </button>
                              {openMenuId === `tbl_${course.id}` && (
                                <div style={{ position: 'absolute', right: 0, top: '2rem', zIndex: 10, width: '185px', padding: '0.35rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: 'var(--shadow-lg)' }}>
                                  <button onClick={() => { setEditingCourse(course); setCourseTitle(course.title); setCourseModality(course.modality || 'PRESENCIAL'); setOpenMenuId(null); }} style={menuButtonStyle}><Pencil size={15} /> Editar título</button>
                                  {userRole === 'ADMIN' && (
                                    <>
                                      <button onClick={() => { setDuplicatingCourse(course); setDuplicateTitle(`${course.title} (Copia)`); setDuplicateModality(course.modality || 'PRESENCIAL'); setOpenMenuId(null); }} style={menuButtonStyle}><Copy size={15} /> Duplicar clase</button>
                                      <button onClick={() => { setDeletingCourse(course); setOpenMenuId(null); }} style={{ ...menuButtonStyle, color: '#9e2a2b' }}><Trash2 size={15} /> Eliminar clase</button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        !isCreating && (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
            <BookOpen size={40} style={{ color: 'var(--primary)', opacity: 0.5, marginBottom: '1rem' }} />
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>
              {searchTerm.trim()
                ? `No se encontraron clases que coincidan con "${searchTerm}".`
                : (modalityFilter === 'ALL' ? 'Aún no tienes ninguna clase creada. ¡Crea la primera para empezar!' : `No hay clases en la categoría ${modalityFilter === 'PRESENCIAL' ? 'Presencial' : 'Online'}.`)}
            </p>
          </div>
        )
      )}

      {duplicatingCourse && (
        <div style={modalBackdropStyle} onClick={() => !isDuplicating && setDuplicatingCourse(null)}>
          <div className="glass-panel animate-fade-in" onClick={(event) => event.stopPropagation()} style={{ width: 'min(100%, 480px)', padding: '1.5rem' }}>
            <button onClick={() => !isDuplicating && setDuplicatingCourse(null)} aria-label="Cerrar" style={{ ...iconButtonStyle, float: 'right' }}><X size={19} /></button>
            <form onSubmit={handleDuplicateCourse}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                <div style={{ background: 'var(--primary-light)', padding: '0.5rem', borderRadius: '8px', color: 'var(--primary)', display: 'flex', alignItems: 'center' }}>
                  <Copy size={20} />
                </div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)' }}>Duplicar Clase</h2>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', lineHeight: '1.45', margin: '0 0 1rem' }}>
                Se clonará la clase con todas sus <strong>tareas estructuradas y pasos</strong>. Las fechas de entrega y publicación quedarán en blanco para que puedas fijarlas al ritmo del nuevo alumno. <strong>No se transferirá ningún alumno ni nota previa.</strong>
              </p>

              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Nombre de la nueva clase:
              </label>
              <input
                value={duplicateTitle}
                onChange={(event) => setDuplicateTitle(event.target.value)}
                placeholder="Ej. B2 First Cambridge (Alumno 2)"
                autoFocus
                required
                disabled={isDuplicating}
                style={inputStyle}
              />

              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '0.85rem', marginBottom: '0.35rem' }}>
                Modalidad:
              </label>
              <select
                value={duplicateModality}
                onChange={(e) => setDuplicateModality(e.target.value as 'PRESENCIAL' | 'ONLINE' | 'HIBRIDO')}
                disabled={isDuplicating}
                style={inputStyle}
              >
                <option value="PRESENCIAL">Presencial (Academia)</option>
                <option value="ONLINE">Online / Particulares</option>
                <option value="HIBRIDO">Híbrido</option>
              </select>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setDuplicatingCourse(null)} disabled={isDuplicating}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={isDuplicating || !duplicateTitle.trim()}>
                  {isDuplicating ? 'Duplicando clase...' : 'Duplicar clase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

export default TeacherCourses;
