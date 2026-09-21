import React, { useEffect, useState } from 'react';
import { AlertTriangle, Check, Edit2, Eye, Phone, Search, ShieldCheck, Trash2, UserPlus, X } from 'lucide-react';
import CustomSelect from '../components/CustomSelect';

interface AdminUser {
  id: string;
  email: string;
  status: 'ACTIVE' | 'INACTIVE';
  profile?: { firstName: string; lastName: string; dni?: string | null; phone?: string | null; birthDate?: string | null } | null;
}

type AdminForm = { firstName: string; lastName: string; email: string; dni: string; phone: string; birthDate: string };

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const blankForm: AdminForm = { firstName: '', lastName: '', email: '', dni: '', phone: '', birthDate: '' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '0.65rem 0.85rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' };
const modalBackdrop: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80, padding: '1rem' };
const secondaryButton: React.CSSProperties = { padding: '0.6rem 1.2rem', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600 };
const iconButtonStyle: React.CSSProperties = { background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, padding: '0.4rem', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' };

const AdminsManagement: React.FC = () => {
  const userRole = localStorage.getItem('userRole');
  const currentUserId = localStorage.getItem('userId');
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<AdminForm>(blankForm);
  const [viewingAdmin, setViewingAdmin] = useState<AdminUser | null>(null);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [deletingAdmin, setDeletingAdmin] = useState<AdminUser | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => { fetchAdmins(); }, []);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[style*="position: fixed"]') || target.closest('.glass-panel')) return;
      setViewingAdmin(null);
      setDeletingAdmin(null);
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
  const updateForm = (field: keyof AdminForm, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const resetForm = () => setForm(blankForm);
  const closeForm = () => { setShowCreateModal(false); setEditingAdmin(null); resetForm(); };

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/api/admins`, { headers: authHeaders() });
      if (!response.ok) throw new Error('No se pudo cargar la lista');
      setAdmins(await response.json());
    } catch {
      showToast('Error al cargar la lista de administradores', 'error');
    } finally {
      setLoading(false);
    }
  };

  const saveAdmin = async (event: React.FormEvent) => {
    event.preventDefault();
    const editing = Boolean(editingAdmin);
    try {
      const response = await fetch(`${apiUrl}/api/admins${editing ? `/${editingAdmin?.id}` : ''}`, {
        method: editing ? 'PUT' : 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, dni: form.dni || null, phone: form.phone || null, birthDate: form.birthDate || null })
      });
      const data = await response.json();
      if (!response.ok) return showToast(data.error || 'No se pudo guardar el administrador', 'error');
      showToast(editing ? 'Ficha del administrador actualizada.' : `Administrador creado. Contraseña temporal: ${data.generatedPassword}`);
      closeForm();
      fetchAdmins();
    } catch {
      showToast('Error de conexión', 'error');
    }
  };

  const openEdit = (admin: AdminUser) => {
    setEditingAdmin(admin);
    setForm({ firstName: admin.profile?.firstName || '', lastName: admin.profile?.lastName || '', email: admin.email, dni: admin.profile?.dni || '', phone: admin.profile?.phone || '', birthDate: admin.profile?.birthDate?.slice(0, 10) || '' });
  };

  const toggleStatus = async (admin: AdminUser) => {
    try {
      const response = await fetch(`${apiUrl}/api/admins/${admin.id}/status`, {
        method: 'PATCH',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: admin.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })
      });
      const data = await response.json();
      if (!response.ok) return showToast(data.error || 'Error al cambiar estado', 'error');
      showToast(data.message);
      fetchAdmins();
    } catch {
      showToast('Error de conexión al cambiar estado', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deletingAdmin) return;
    try {
      const response = await fetch(`${apiUrl}/api/admins/${deletingAdmin.id}`, { method: 'DELETE', headers: authHeaders() });
      const data = await response.json();
      if (!response.ok) return showToast(data.error || 'Error al eliminar administrador', 'error');
      showToast('Administrador eliminado del sistema.');
      setDeletingAdmin(null);
      fetchAdmins();
    } catch {
      showToast('Error de conexión al eliminar', 'error');
    }
  };

  const filteredAdmins = admins.filter((admin) => {
    const name = `${admin.profile?.firstName || ''} ${admin.profile?.lastName || ''}`.toLowerCase();
    const query = searchTerm.toLowerCase();
    const matchesSearch = !query || name.includes(query) || admin.email.toLowerCase().includes(query) || (admin.profile?.dni || '').toLowerCase().includes(query) || (admin.profile?.phone || '').toLowerCase().includes(query);
    return matchesSearch && (statusFilter === 'ALL' || admin.status === statusFilter);
  });

  if (userRole !== 'ADMIN') {
    return <div className="page-container"><div style={{ padding: '1.25rem', background: '#fdf0f0', border: '1px solid #f7caca', color: '#9e2a2b', borderRadius: 12 }}>No tienes permisos para gestionar administradores.</div></div>;
  }

  return <div className="page-container admins-management">
    {notification && <div style={{ position: 'fixed', bottom: 24, right: 24, padding: '1rem 1.5rem', borderRadius: 8, background: notification.type === 'success' ? 'var(--primary)' : '#991b1b', color: '#fff', boxShadow: 'var(--shadow-lg)', display: 'flex', alignItems: 'center', gap: '0.75rem', zIndex: 100 }}>{notification.type === 'success' ? <Check size={18} /> : <AlertTriangle size={18} />}{notification.text}</div>}

    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
      <div>
        <h1 style={{ margin: 0, fontSize: '1.6rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <ShieldCheck style={{ color: 'var(--primary)' }} size={24} /> Administradores
        </h1>
      </div>
      <button onClick={() => { resetForm(); setShowCreateModal(true); }} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem' }}><UserPlus size={18} /> Nuevo Administrador</button>
    </div>

    <div className="filters-panel">
      <div className="filters-panel__search">
        <Search size={17} />
        <input
          type="text"
          placeholder="Buscar por nombre, DNI, teléfono o correo..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          aria-label="Buscar administradores"
        />
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

    <div className="glass-panel admins-table-panel" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="table-responsive">
        <table style={{ width: '100%', minWidth: 820, borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--surface-alt)', borderBottom: '1px solid var(--border)' }}>
              {['ADMINISTRADOR Y CONTACTO', 'DNI / NIE', 'ESTADO', 'ACCIONES'].map((heading) => (
                <th
                  key={heading}
                  style={{
                    padding: '1rem 1.25rem',
                    color: 'var(--text-muted)',
                    fontWeight: 600,
                    fontSize: '0.84rem',
                    textAlign: heading === 'ACCIONES' ? 'right' : 'left'
                  }}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Cargando administradores...
                </td>
              </tr>
            ) : filteredAdmins.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  {searchTerm ? 'No se encontraron administradores con ese criterio.' : 'No hay administradores registrados en el sistema.'}
                </td>
              </tr>
            ) : (
              filteredAdmins.map((admin) => {
                const initials = `${admin.profile?.firstName?.[0] || ''}${admin.profile?.lastName?.[0] || ''}`.toUpperCase() || 'AD';
                const isActive = admin.status === 'ACTIVE';
                const isSelf = admin.id === currentUserId;
                return (
                  <tr key={admin.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: '50%',
                            background: 'var(--primary)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '0.85rem'
                          }}
                        >
                          {initials}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                            {admin.profile?.firstName} {admin.profile?.lastName}
                            {isSelf && <span style={{ marginLeft: 8, fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 700 }}>(Tú)</span>}
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{admin.email}</div>
                          {admin.profile?.phone && (
                            <div style={{ color: 'var(--primary)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Phone size={12} /> {admin.profile.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', color: 'var(--text-main)', fontSize: '0.88rem' }}>
                      {admin.profile?.dni || <span style={{ color: 'var(--text-light)', fontStyle: 'italic' }}>No asignado</span>}
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            padding: '0.35rem 0.65rem',
                            background: isActive ? '#dcfce7' : '#fee2e2',
                            color: isActive ? '#166534' : '#991b1b',
                            borderRadius: 16,
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}
                        >
                          {isActive ? 'Alta' : 'Baja'}
                        </span>
                        <button
                          type="button"
                          disabled={isSelf && isActive}
                          onClick={() => toggleStatus(admin)}
                          style={{
                            padding: '0.3rem 0.55rem',
                            borderRadius: 6,
                            border: `1px solid ${isActive ? '#fca5a5' : '#86efac'}`,
                            background: isActive ? '#fff1f2' : '#f0fdf4',
                            color: isActive ? '#b91c1c' : '#15803d',
                            cursor: isSelf && isActive ? 'not-allowed' : 'pointer',
                            opacity: isSelf && isActive ? 0.55 : 1,
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}
                        >
                          {isActive ? 'Dar de baja' : 'Dar de alta'}
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.45rem' }}>
                        <button type="button" onClick={() => setViewingAdmin(admin)} title="Ver ficha de administrador" style={iconButtonStyle}>
                          <Eye size={16} />
                        </button>
                        <button type="button" onClick={() => openEdit(admin)} title="Editar ficha de administrador" style={iconButtonStyle}>
                          <Edit2 size={16} />
                        </button>
                        <button
                          type="button"
                          disabled={isSelf}
                          onClick={() => setDeletingAdmin(admin)}
                          title="Eliminar administrador"
                          style={{ ...iconButtonStyle, cursor: isSelf ? 'not-allowed' : 'pointer', opacity: isSelf ? 0.55 : 1 }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>

    {/* Misma información en tarjetas: la tabla no cabe bajo 768px */}
    <div className="admins-card-list">
      {loading ? (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>Cargando administradores...</p>
      ) : filteredAdmins.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>
          {searchTerm ? 'No se encontraron administradores con ese criterio.' : 'No hay administradores registrados en el sistema.'}
        </p>
      ) : (
        filteredAdmins.map((admin) => {
          const initials = `${admin.profile?.firstName?.[0] || ''}${admin.profile?.lastName?.[0] || ''}`.toUpperCase() || 'AD';
          const isActive = admin.status === 'ACTIVE';
          const isSelf = admin.id === currentUserId;
          return (
            <div key={admin.id} className="glass-panel admins-card">
              <div className="admins-card__header">
                <div
                  style={{
                    width: 38,
                    height: 38,
                    flexShrink: 0,
                    borderRadius: '50%',
                    background: 'var(--primary)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '0.85rem'
                  }}
                >
                  {initials}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="admins-card__name">
                    {admin.profile?.firstName} {admin.profile?.lastName}
                    {isSelf && <span style={{ marginLeft: 8, fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 700 }}>(Tú)</span>}
                  </div>
                  <div className="admins-card__email">{admin.email}</div>
                  {admin.profile?.phone && (
                    <div style={{ color: 'var(--primary)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Phone size={12} /> {admin.profile.phone}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem', flexShrink: 0 }}>
                  <span
                    style={{
                      padding: '0.3rem 0.6rem',
                      background: isActive ? '#dcfce7' : '#fee2e2',
                      color: isActive ? '#166534' : '#991b1b',
                      borderRadius: 16,
                      fontSize: '0.72rem',
                      fontWeight: 600
                    }}
                  >
                    {isActive ? 'Alta' : 'Baja'}
                  </span>
                  <button
                    type="button"
                    disabled={isSelf && isActive}
                    onClick={() => toggleStatus(admin)}
                    style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: 999,
                      border: `1px solid ${isActive ? '#fecaca' : '#bbf7d0'}`,
                      background: isActive ? '#fef2f2' : '#f0fdf4',
                      color: isActive ? '#dc2626' : '#16a34a',
                      cursor: isSelf && isActive ? 'not-allowed' : 'pointer',
                      opacity: isSelf && isActive ? 0.55 : 1,
                      fontSize: '0.72rem',
                      fontWeight: 500,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {isActive ? 'Dar de baja' : 'Dar de alta'}
                  </button>
                </div>
              </div>

              <div className="admins-card__body">
                <span style={{ color: 'var(--text-muted)' }}>DNI / NIE:</span>
                <span>{admin.profile?.dni || <span style={{ color: 'var(--text-light)', fontStyle: 'italic' }}>No asignado</span>}</span>
              </div>

              <div className="admins-card__actions">
                <button type="button" onClick={() => setViewingAdmin(admin)} title="Ver ficha de administrador" aria-label="Ver ficha">
                  <Eye size={16} />
                </button>
                <button type="button" onClick={() => openEdit(admin)} title="Editar ficha de administrador" aria-label="Editar ficha">
                  <Edit2 size={16} />
                </button>
                <button
                  type="button"
                  disabled={isSelf}
                  onClick={() => setDeletingAdmin(admin)}
                  title="Eliminar administrador"
                  aria-label="Eliminar administrador"
                  style={{ cursor: isSelf ? 'not-allowed' : 'pointer', opacity: isSelf ? 0.55 : 1 }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>

    {viewingAdmin && <div style={modalBackdrop}><div className="glass-panel" style={{ width: '100%', maxWidth: 620, maxHeight: '92vh', overflowY: 'auto', padding: '2rem' }}><ModalHeader title="Ficha del Administrador" onClose={() => setViewingAdmin(null)} /><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>{[['Nombre completo', `${viewingAdmin.profile?.firstName || ''} ${viewingAdmin.profile?.lastName || ''}`], ['Correo electrónico', viewingAdmin.email], ['DNI / NIE', viewingAdmin.profile?.dni || 'No registrado'], ['Teléfono / WhatsApp', viewingAdmin.profile?.phone || 'No registrado'], ['Fecha de nacimiento', viewingAdmin.profile?.birthDate ? new Date(viewingAdmin.profile.birthDate).toLocaleDateString('es-ES') : 'No registrada'], ['Estado', viewingAdmin.status === 'ACTIVE' ? 'Alta' : 'Baja']].map(([label, value]) => <div key={label} style={{ padding: '0.85rem 1rem', background: 'var(--surface-alt)', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{label}</span><strong style={{ color: 'var(--text-main)' }}>{value}</strong></div>)}</div></div></div>}
    {(showCreateModal || editingAdmin) && <div style={modalBackdrop}><div className="glass-panel" style={{ width: '100%', maxWidth: 620, maxHeight: '92vh', overflowY: 'auto', padding: '2rem' }}><ModalHeader title={editingAdmin ? 'Editar Administrador' : 'Nuevo Administrador'} onClose={closeForm} /><form onSubmit={saveAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>{([['firstName', 'Nombre *', 'text'], ['lastName', 'Apellidos *', 'text'], ['email', 'Correo Electrónico *', 'email'], ['dni', 'DNI / NIE', 'text'], ['phone', 'Teléfono / WhatsApp', 'text'], ['birthDate', 'Fecha de Nacimiento', 'date']] as const).map(([field, label, type]) => <label key={field} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>{label}<input type={type} required={field === 'firstName' || field === 'lastName' || field === 'email'} value={form[field]} onChange={(event) => updateForm(field, event.target.value)} style={inputStyle} /></label>)}<div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}><button type="button" onClick={closeForm} style={secondaryButton}>Cancelar</button><button type="submit" className="btn-primary">{editingAdmin ? 'Guardar cambios' : 'Crear Administrador'}</button></div></form></div></div>}
    {deletingAdmin && <div style={modalBackdrop}><div className="glass-panel" style={{ width: '100%', maxWidth: 480, padding: '2rem' }}><ModalHeader title="Eliminar administrador" onClose={() => setDeletingAdmin(null)} /><p style={{ color: 'var(--text-main)', lineHeight: 1.5 }}>¿Seguro que quieres eliminar a <strong>{deletingAdmin.profile?.firstName} {deletingAdmin.profile?.lastName}</strong>? Esta acción no se puede deshacer.</p><div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}><button onClick={() => setDeletingAdmin(null)} style={secondaryButton}>Cancelar</button><button onClick={handleDelete} style={{ ...secondaryButton, color: '#b91c1c', borderColor: '#fecaca' }}>Eliminar</button></div></div></div>}
  </div>;
};

const ModalHeader = ({ title, onClose }: { title: string; onClose: () => void }) => <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}><h3 style={{ margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.3rem' }}><ShieldCheck style={{ color: 'var(--primary)' }} /> {title}</h3><button type="button" onClick={onClose} className="modal-close" aria-label="Cerrar modal"><X size={20} /></button></div>;

export default AdminsManagement;
