import React, { useEffect, useState } from 'react';
import { AlertTriangle, BookOpen, Check, Edit2, Eye, Phone, Search, Trash2, UserPlus, UserRoundCog, X } from 'lucide-react';
import CustomSelect from '../components/CustomSelect';
import ModalityBadge from '../components/ModalityBadge';

interface Teacher {
  id: string;
  email: string;
  status: 'ACTIVE' | 'INACTIVE';
  profile?: { firstName: string; lastName: string; dni?: string | null; phone?: string | null; birthDate?: string | null } | null;
}

type TeacherForm = { firstName: string; lastName: string; email: string; dni: string; phone: string; birthDate: string };
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const blankForm: TeacherForm = { firstName: '', lastName: '', email: '', dni: '', phone: '', birthDate: '' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '0.65rem 0.85rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' };
const modalBackdrop: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80, padding: '1rem' };
const secondaryButton: React.CSSProperties = { padding: '0.6rem 1.2rem', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600 };

const TeachersManagement: React.FC = () => {
  const userRole = localStorage.getItem('userRole');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<TeacherForm>(blankForm);
  const [viewingTeacher, setViewingTeacher] = useState<Teacher | null>(null);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [deletingTeacher, setDeletingTeacher] = useState<Teacher | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modal Gestión de Clases Asignadas (Admin)
  const [managingCoursesTeacher, setManagingCoursesTeacher] = useState<Teacher | null>(null);
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [assignedCourseIds, setAssignedCourseIds] = useState<string[]>([]);
  const [titularCourseIds, setTitularCourseIds] = useState<string[]>([]);
  const [savingCourses, setSavingCourses] = useState(false);

  useEffect(() => { fetchTeachers(); }, []);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[style*="position: fixed"]') || target.closest('.glass-panel')) return;
      setViewingTeacher(null);
      setDeletingTeacher(null);
      closeForm();
    };
    document.addEventListener('click', closeOnOutsideClick);
    return () => document.removeEventListener('click', closeOnOutsideClick);
  }, []);

  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4500);
  };
  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/api/teachers`, { headers: authHeaders() });
      if (!response.ok) throw new Error('No se pudo cargar la lista');
      setTeachers(await response.json());
    } catch { showToast('Error al cargar la lista de profesores', 'error'); } finally { setLoading(false); }
  };
  const updateForm = (field: keyof TeacherForm, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const resetForm = () => setForm(blankForm);

  const saveTeacher = async (event: React.FormEvent) => {
    event.preventDefault();
    const editing = Boolean(editingTeacher);
    try {
      const response = await fetch(`${apiUrl}/api/teachers${editing ? `/${editingTeacher?.id}` : ''}`, {
        method: editing ? 'PUT' : 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, dni: form.dni || null, phone: form.phone || null, birthDate: form.birthDate || null })
      });
      const data = await response.json();
      if (!response.ok) return showToast(data.error || 'No se pudo guardar el profesor', 'error');
      showToast(editing ? 'Ficha del profesor actualizada.' : `Profesor creado. Contraseña temporal: ${data.generatedPassword}`);
      closeForm();
      fetchTeachers();
    } catch { showToast('Error de conexión', 'error'); }
  };

  const openEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setForm({ firstName: teacher.profile?.firstName || '', lastName: teacher.profile?.lastName || '', email: teacher.email, dni: teacher.profile?.dni || '', phone: teacher.profile?.phone || '', birthDate: teacher.profile?.birthDate?.slice(0, 10) || '' });
  };
  const closeForm = () => { setShowCreateModal(false); setEditingTeacher(null); resetForm(); };

  const toggleStatus = async (teacher: Teacher) => {
    try {
      const response = await fetch(`${apiUrl}/api/teachers/${teacher.id}/status`, { method: 'PATCH', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ status: teacher.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }) });
      const data = await response.json();
      if (!response.ok) return showToast(data.error || 'Error al cambiar estado', 'error');
      showToast(data.message);
      fetchTeachers();
    } catch { showToast('Error de conexión al cambiar estado', 'error'); }
  };

  const handleDelete = async () => {
    if (!deletingTeacher) return;
    try {
      const response = await fetch(`${apiUrl}/api/teachers/${deletingTeacher.id}`, { method: 'DELETE', headers: authHeaders() });
      const data = await response.json();
      if (!response.ok) return showToast(data.error || 'Error al eliminar profesor', 'error');
      showToast('Profesor eliminado del sistema.');
      setDeletingTeacher(null);
      fetchTeachers();
    } catch { showToast('Error de conexión al eliminar', 'error'); }
  };

  const openManageCourses = async (teacher: Teacher) => {
    setManagingCoursesTeacher(teacher);
    try {
      const [coursesRes, assignedRes] = await Promise.all([
        fetch(`${apiUrl}/api/courses`, { headers: authHeaders() }),
        fetch(`${apiUrl}/api/teachers/${teacher.id}/assigned-courses`, { headers: authHeaders() })
      ]);
      if (coursesRes.ok && assignedRes.ok) {
        const coursesData = await coursesRes.json();
        const assignedData = await assignedRes.json();
        setAllCourses(coursesData);
        setAssignedCourseIds(assignedData.assignedCourseIds || []);
        setTitularCourseIds((assignedData.titularCourses || []).map((c: any) => c.id));
      }
    } catch {
      showToast('Error al cargar clases del profesor', 'error');
    }
  };

  const handleSaveAssignedCourses = async () => {
    if (!managingCoursesTeacher) return;
    try {
      setSavingCourses(true);
      const res = await fetch(`${apiUrl}/api/teachers/${managingCoursesTeacher.id}/assigned-courses`, {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseIds: assignedCourseIds })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar clases');
      showToast('Clases asignadas actualizadas con éxito');
      setManagingCoursesTeacher(null);
      fetchTeachers();
    } catch (err: any) {
      showToast(err.message || 'Error de conexión', 'error');
    } finally {
      setSavingCourses(false);
    }
  };

  const filteredTeachers = teachers.filter((teacher) => {
    const name = `${teacher.profile?.firstName || ''} ${teacher.profile?.lastName || ''}`.toLowerCase();
    const query = searchTerm.toLowerCase();
    const matchesSearch = !query || name.includes(query) || teacher.email.toLowerCase().includes(query) || (teacher.profile?.dni || '').toLowerCase().includes(query) || (teacher.profile?.phone || '').toLowerCase().includes(query);
    return matchesSearch && (statusFilter === 'ALL' || teacher.status === statusFilter);
  });

  return <div className="page-container teachers-management">
    {notification && <div style={{ position: 'fixed', bottom: 24, right: 24, padding: '1rem 1.5rem', borderRadius: 8, background: notification.type === 'success' ? 'var(--primary)' : '#991b1b', color: '#fff', boxShadow: 'var(--shadow-lg)', display: 'flex', alignItems: 'center', gap: '0.75rem', zIndex: 100 }}>{notification.type === 'success' ? <Check size={18} /> : <AlertTriangle size={18} />}{notification.text}</div>}

    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
      <div>
        <h1 style={{ margin: 0, fontSize: '1.6rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <UserRoundCog style={{ color: 'var(--primary)' }} size={24} /> Profesores
        </h1>
      </div>
      {userRole === 'ADMIN' && (
        <button onClick={() => { resetForm(); setShowCreateModal(true); }} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem' }}><UserPlus size={18} /> Nuevo Profesor</button>
      )}
    </div>

    <div className="filters-panel">
      <div className="filters-panel__search">
        <Search size={17} />
        <input type="text" placeholder="Buscar por nombre, DNI, teléfono o correo..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} aria-label="Buscar profesores" />
      </div>
      <div className="filters-panel__selects">
        <CustomSelect
          value={statusFilter}
          onChange={setStatusFilter}
          ariaLabel="Filtrar por estado"
          options={[
            { value: 'ALL', label: 'Todos los estados' },
            { value: 'ACTIVE', label: 'Alta' },
            { value: 'INACTIVE', label: 'Baja' }
          ]}
        />
      </div>
    </div>

    <div className="glass-panel teachers-table-panel" style={{ padding: 0, overflow: 'hidden' }}><div className="table-responsive"><table style={{ width: '100%', minWidth: 820, borderCollapse: 'collapse', textAlign: 'left' }}><thead><tr style={{ background: 'var(--surface-alt)', borderBottom: '1px solid var(--border)' }}>{['PROFESOR Y CONTACTO', 'DNI / NIE', 'ESTADO', 'ACCIONES'].map((heading) => <th key={heading} style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.84rem', textAlign: heading === 'ACCIONES' ? 'right' : 'left' }}>{heading}</th>)}</tr></thead><tbody>
      {loading ? <tr><td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando profesores...</td></tr> : filteredTeachers.length === 0 ? <tr><td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>{searchTerm ? 'No se encontraron profesores con ese criterio.' : 'No hay profesores registrados en el sistema.'}</td></tr> : filteredTeachers.map((teacher) => {
        const initials = `${teacher.profile?.firstName?.[0] || ''}${teacher.profile?.lastName?.[0] || ''}`.toUpperCase() || 'PR';
        const isActive = teacher.status === 'ACTIVE';
        return <tr key={teacher.id} style={{ borderBottom: '1px solid var(--border)' }}><td style={{ padding: '1rem 1.25rem' }}><div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem' }}>{initials}</div><div><div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem' }}>{teacher.profile?.firstName} {teacher.profile?.lastName}</div><div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{teacher.email}</div>{teacher.profile?.phone && <div style={{ color: 'var(--primary)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Phone size={12} /> {teacher.profile.phone}</div>}</div></div></td><td style={{ padding: '1rem 1.25rem', color: 'var(--text-main)', fontSize: '0.88rem' }}>{teacher.profile?.dni || <span style={{ color: 'var(--text-light)', fontStyle: 'italic' }}>No asignado</span>}</td><td style={{ padding: '1rem 1.25rem' }}><div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}><span style={{ padding: '0.35rem 0.65rem', background: isActive ? '#dcfce7' : '#fee2e2', color: isActive ? '#166534' : '#991b1b', borderRadius: 16, fontSize: '0.75rem', fontWeight: 600 }}>{isActive ? 'Alta' : 'Baja'}</span>{userRole === 'ADMIN' && (<button type="button" onClick={() => toggleStatus(teacher)} style={{ padding: '0.3rem 0.55rem', borderRadius: 6, border: `1px solid ${isActive ? '#fca5a5' : '#86efac'}`, background: isActive ? '#fff1f2' : '#f0fdf4', color: isActive ? '#b91c1c' : '#15803d', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>{isActive ? 'Dar de baja' : 'Dar de alta'}</button>)}</div></td><td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}><div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.45rem' }}><button type="button" onClick={() => setViewingTeacher(teacher)} title="Ver ficha" style={iconButtonStyle}><Eye size={16} /></button>{userRole === 'ADMIN' && (<><button type="button" onClick={() => openManageCourses(teacher)} title="Gestionar Clases Asignadas" style={{ ...iconButtonStyle, color: 'var(--primary)' }}><BookOpen size={16} /></button><button type="button" onClick={() => openEdit(teacher)} title="Editar ficha" style={iconButtonStyle}><Edit2 size={16} /></button><button type="button" onClick={() => setDeletingTeacher(teacher)} title="Eliminar profesor" style={iconButtonStyle}><Trash2 size={16} /></button></>)}</div></td></tr>;
      })}
    </tbody></table></div></div>

    {/* Misma información en tarjetas: la tabla no cabe bajo 768px */}
    <div className="teachers-card-list">
      {loading ? (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>Cargando profesores...</p>
      ) : filteredTeachers.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>
          {searchTerm ? 'No se encontraron profesores con ese criterio.' : 'No hay profesores registrados en el sistema.'}
        </p>
      ) : filteredTeachers.map((teacher) => {
        const initials = `${teacher.profile?.firstName?.[0] || ''}${teacher.profile?.lastName?.[0] || ''}`.toUpperCase() || 'PR';
        const isActive = teacher.status === 'ACTIVE';
        return (
          <div key={teacher.id} className="glass-panel teachers-card">
            <div className="teachers-card__header">
              <div style={{ width: 38, height: 38, flexShrink: 0, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem' }}>{initials}</div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="teachers-card__name">{teacher.profile?.firstName} {teacher.profile?.lastName}</div>
                <div className="teachers-card__email">{teacher.email}</div>
                {teacher.profile?.phone && <div style={{ color: 'var(--primary)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Phone size={12} /> {teacher.profile.phone}</div>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem', flexShrink: 0 }}>
                <span style={{ padding: '0.3rem 0.6rem', background: isActive ? '#dcfce7' : '#fee2e2', color: isActive ? '#166534' : '#991b1b', borderRadius: 16, fontSize: '0.72rem', fontWeight: 600 }}>{isActive ? 'Alta' : 'Baja'}</span>
                {userRole === 'ADMIN' && (
                  <button type="button" onClick={() => toggleStatus(teacher)} style={{ padding: '0.25rem 0.75rem', borderRadius: 999, border: `1px solid ${isActive ? '#fecaca' : '#bbf7d0'}`, background: isActive ? '#fef2f2' : '#f0fdf4', color: isActive ? '#dc2626' : '#16a34a', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 500, whiteSpace: 'nowrap' }}>
                    {isActive ? 'Dar de baja' : 'Dar de alta'}
                  </button>
                )}
              </div>
            </div>

            <div className="teachers-card__body">
              <span style={{ color: 'var(--text-muted)' }}>DNI / NIE:</span>
              <span>{teacher.profile?.dni || <span style={{ color: 'var(--text-light)', fontStyle: 'italic' }}>No asignado</span>}</span>
            </div>

            <div className="teachers-card__actions">
              <button type="button" onClick={() => setViewingTeacher(teacher)} title="Ver ficha" aria-label="Ver ficha"><Eye size={16} /></button>
              {userRole === 'ADMIN' && (
                <>
                  <button type="button" onClick={() => openEdit(teacher)} title="Editar ficha" aria-label="Editar ficha"><Edit2 size={16} /></button>
                  <button type="button" onClick={() => setDeletingTeacher(teacher)} title="Eliminar profesor" aria-label="Eliminar profesor"><Trash2 size={16} /></button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>

    {viewingTeacher && <div style={modalBackdrop}><div className="glass-panel" style={{ width: '100%', maxWidth: 620, maxHeight: '92vh', overflowY: 'auto', padding: '2rem' }}><ModalHeader title="Ficha del Profesor" onClose={() => setViewingTeacher(null)} /><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>{[['Nombre completo', `${viewingTeacher.profile?.firstName || ''} ${viewingTeacher.profile?.lastName || ''}`], ['Correo electrónico', viewingTeacher.email], ['DNI / NIE', viewingTeacher.profile?.dni || 'No registrado'], ['Teléfono / WhatsApp', viewingTeacher.profile?.phone || 'No registrado'], ['Fecha de nacimiento', viewingTeacher.profile?.birthDate ? new Date(viewingTeacher.profile.birthDate).toLocaleDateString('es-ES') : 'No registrada'], ['Estado', viewingTeacher.status === 'ACTIVE' ? 'Alta' : 'Baja']].map(([label, value]) => <div key={label} style={{ padding: '0.85rem 1rem', background: 'var(--surface-alt)', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{label}</span><strong style={{ color: 'var(--text-main)' }}>{value}</strong></div>)}</div></div></div>}
    {(showCreateModal || editingTeacher) && <div style={modalBackdrop}><div className="glass-panel" style={{ width: '100%', maxWidth: 620, maxHeight: '92vh', overflowY: 'auto', padding: '2rem' }}><ModalHeader title={editingTeacher ? 'Editar Profesor' : 'Nuevo Profesor'} onClose={closeForm} /><form onSubmit={saveTeacher} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>{([['firstName', 'Nombre *', 'text'], ['lastName', 'Apellidos *', 'text'], ['email', 'Correo Electrónico *', 'email'], ['dni', 'DNI / NIE', 'text'], ['phone', 'Teléfono / WhatsApp', 'text'], ['birthDate', 'Fecha de Nacimiento', 'date']] as const).map(([field, label, type]) => <label key={field} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>{label}<input type={type} required={field === 'firstName' || field === 'lastName' || field === 'email'} value={form[field]} onChange={(event) => updateForm(field, event.target.value)} style={inputStyle} /></label>)}<div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}><button type="button" onClick={closeForm} style={secondaryButton}>Cancelar</button><button type="submit" className="btn-primary">{editingTeacher ? 'Guardar cambios' : 'Crear Profesor'}</button></div></form></div></div>}
    {deletingTeacher && <div style={modalBackdrop}><div className="glass-panel" style={{ width: '100%', maxWidth: 480, padding: '2rem' }}><ModalHeader title="Eliminar profesor" onClose={() => setDeletingTeacher(null)} /><p style={{ color: 'var(--text-main)', lineHeight: 1.5 }}>¿Seguro que quieres eliminar a <strong>{deletingTeacher.profile?.firstName} {deletingTeacher.profile?.lastName}</strong>? Esta acción no se puede deshacer.</p><div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}><button onClick={() => setDeletingTeacher(null)} style={secondaryButton}>Cancelar</button><button onClick={handleDelete} style={{ ...secondaryButton, color: '#b91c1c', borderColor: '#fecaca' }}>Eliminar</button></div></div></div>}

    {managingCoursesTeacher && (
      <div style={modalBackdrop}>
        <div className="glass-panel" style={{ width: '100%', maxWidth: 620, maxHeight: '92vh', overflowY: 'auto', padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.3rem' }}>
              <BookOpen style={{ color: 'var(--primary)' }} /> Clases Asignadas
            </h3>
            <button type="button" onClick={() => setManagingCoursesTeacher(null)} className="modal-close" aria-label="Cerrar modal">
              <X size={20} />
            </button>
          </div>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
            Configura el acceso a las clases para <strong>{managingCoursesTeacher.profile?.firstName} {managingCoursesTeacher.profile?.lastName}</strong> ({managingCoursesTeacher.email}).
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem', maxHeight: '420px', overflowY: 'auto' }}>
            {allCourses.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No hay clases creadas en la academia.</p>
            ) : (
              allCourses.map((c) => {
                const isTitular = titularCourseIds.includes(c.id);
                const isAssigned = assignedCourseIds.includes(c.id);
                const isOnline = c.modality === 'ONLINE' || c.modality === 'HIBRIDO';

                return (
                  <label
                    key={c.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.85rem 1rem',
                      borderRadius: '8px',
                      border: isAssigned || isTitular ? '1px solid var(--primary)' : '1px solid var(--border)',
                      background: isAssigned || isTitular ? 'var(--primary-light)' : 'var(--surface-alt)',
                      cursor: isTitular || !isOnline ? 'default' : 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <input
                        type="checkbox"
                        disabled={isTitular || !isOnline}
                        checked={isTitular || !isOnline || isAssigned}
                        onChange={(e) => {
                          if (isTitular || !isOnline) return;
                          if (e.target.checked) {
                            setAssignedCourseIds(prev => [...prev, c.id]);
                          } else {
                            setAssignedCourseIds(prev => prev.filter(id => id !== c.id));
                          }
                        }}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                          {c.title}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {!isOnline
                            ? 'Clase presencial (abierta a todo el claustro)'
                            : isTitular
                            ? 'Profesor titular de la clase'
                            : isAssigned
                            ? 'Acceso concedido a esta clase online'
                            : 'Sin acceso concedido'}
                        </div>
                      </div>
                    </div>
                    <ModalityBadge modality={c.modality || 'PRESENCIAL'} />
                  </label>
                );
              })
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" onClick={() => setManagingCoursesTeacher(null)} style={secondaryButton}>
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveAssignedCourses}
              disabled={savingCourses}
              className="btn-primary"
            >
              {savingCourses ? 'Guardando...' : 'Guardar Asignaciones'}
            </button>
          </div>
        </div>
      </div>
    )}
  </div>;
};

const iconButtonStyle: React.CSSProperties = { background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, padding: '0.4rem', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' };
const ModalHeader = ({ title, onClose }: { title: string; onClose: () => void }) => <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}><h3 style={{ margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.3rem' }}><UserRoundCog style={{ color: 'var(--primary)' }} /> {title}</h3><button type="button" onClick={onClose} className="modal-close" aria-label="Cerrar modal"><X size={20} /></button></div>;

export default TeachersManagement;
