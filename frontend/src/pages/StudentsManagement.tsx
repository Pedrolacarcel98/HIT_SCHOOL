import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  Search,
  Edit2,
  Trash2,
  Check,
  X,
  AlertTriangle,
  Users,
  GraduationCap,
  Laptop,
  Phone,
  Eye,
  UserCheck
} from 'lucide-react';

interface ParentData {
  id: string;
  email: string;
  createdAt?: string;
  profile?: {
    firstName: string;
    lastName: string;
    dni?: string | null;
    phone?: string | null;
    address?: string | null;
  };
  children?: {
    id: string;
    email: string;
    profile?: {
      firstName: string;
      lastName: string;
    };
  }[];
}

interface Student {
  id: string;
  email: string;
  createdAt?: string;
  monthlyFee?: number | null;
  courseDurationMonths?: number | null;
  courseStartDate?: string | null;
  parentId?: string | null;
  profile?: {
    firstName: string;
    lastName: string;
    dni?: string | null;
    phone?: string | null;
    birthDate?: string | null;
    address?: string | null;
  };
  parent?: {
    id: string;
    email: string;
    profile?: {
      firstName: string;
      lastName: string;
      phone?: string | null;
      dni?: string | null;
    };
  } | null;
  enrollments?: {
    courseId: string;
    course: {
      title: string;
    };
  }[];
}

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const StudentsManagement: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [parents, setParents] = useState<ParentData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalityFilter, setModalityFilter] = useState<'ALL' | 'PRESENCIAL' | 'ONLINE'>('ALL');
  const [familyFilter, setFamilyFilter] = useState<'ALL' | 'WITH_PARENT' | 'INDEPENDENT'>('ALL');
  const [loading, setLoading] = useState(true);

  // Modal Ver Ficha
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);

  // Modal Crear
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDni, setNewDni] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newBirthDate, setNewBirthDate] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newMonthlyFee, setNewMonthlyFee] = useState('35');
  const [newCourseDurationMonths, setNewCourseDurationMonths] = useState('9');

  // Gestión de Tutor en Crear
  const [hasParent, setHasParent] = useState(false);
  const [parentOption, setParentOption] = useState<'EXISTING' | 'NEW'>('EXISTING');
  const [selectedParentId, setSelectedParentId] = useState('');
  const [newParentFirstName, setNewParentFirstName] = useState('');
  const [newParentLastName, setNewParentLastName] = useState('');
  const [newParentEmail, setNewParentEmail] = useState('');
  const [newParentPhone, setNewParentPhone] = useState('');
  const [newParentDni, setNewParentDni] = useState('');

  // Modal Editar
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDni, setEditDni] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editParentId, setEditParentId] = useState('');
  const [editMonthlyFee, setEditMonthlyFee] = useState('35');
  const [editCourseDurationMonths, setEditCourseDurationMonths] = useState('9');

  // Modal Eliminar
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);

  // Alertas
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchStudents();
    fetchParents();
  }, []);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4500);
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/api/students`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStudents(data);
      }
    } catch (err) {
      console.error(err);
      showToast('Error al cargar la lista de alumnos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchParents = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/api/students/parents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setParents(data);
      }
    } catch (err) {
      console.error('Error al cargar tutores:', err);
    }
  };

  const calculateAge = (birthDateString?: string | null) => {
    if (!birthDateString) return null;
    const birthDate = new Date(birthDateString);
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');

      let parentPayload = null;
      let finalParentId = null;

      if (hasParent) {
        if (parentOption === 'EXISTING') {
          finalParentId = selectedParentId || null;
        } else {
          parentPayload = {
            firstName: newParentFirstName.trim(),
            lastName: newParentLastName.trim(),
            email: newParentEmail.trim().toLowerCase(),
            phone: newParentPhone.trim() || null,
            dni: newParentDni.trim() || null
          };
        }
      }

      const res = await fetch(`${apiUrl}/api/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          firstName: newFirstName.trim(),
          lastName: newLastName.trim(),
          email: newEmail.trim().toLowerCase(),
          dni: newDni.trim() || null,
          phone: newPhone.trim() || null,
          birthDate: newBirthDate ? newBirthDate : null,
          address: newAddress.trim() || null,
          monthlyFee: Number(newMonthlyFee),
          courseDurationMonths: Number(newCourseDurationMonths),
          parentId: finalParentId,
          parentData: parentPayload
        })
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Error al crear alumno', 'error');
        return;
      }

      showToast(`Alumno creado con éxito (credenciales generadas: ${data.generatedPassword}).`);
      setShowCreateModal(false);
      resetCreateForm();
      fetchStudents();
      fetchParents();
    } catch (err) {
      showToast('Error de conexión', 'error');
    }
  };

  const resetCreateForm = () => {
    setNewFirstName('');
    setNewLastName('');
    setNewEmail('');
    setNewDni('');
    setNewPhone('');
    setNewBirthDate('');
    setNewAddress('');
    setNewMonthlyFee('35');
    setNewCourseDurationMonths('9');
    setHasParent(false);
    setSelectedParentId('');
    setNewParentFirstName('');
    setNewParentLastName('');
    setNewParentEmail('');
    setNewParentPhone('');
    setNewParentDni('');
  };

  const handleStartEdit = (student: Student) => {
    setEditingStudent(student);
    setEditFirstName(student.profile?.firstName || '');
    setEditLastName(student.profile?.lastName || '');
    setEditEmail(student.email);
    setEditDni(student.profile?.dni || '');
    setEditPhone(student.profile?.phone || '');
    setEditBirthDate(student.profile?.birthDate ? student.profile.birthDate.split('T')[0] : '');
    setEditAddress(student.profile?.address || '');
    setEditParentId(student.parentId || '');
    setEditMonthlyFee(String(student.monthlyFee || 35));
    setEditCourseDurationMonths(String(student.courseDurationMonths || 9));
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/api/students/${editingStudent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          firstName: editFirstName.trim(),
          lastName: editLastName.trim(),
          email: editEmail.trim().toLowerCase(),
          dni: editDni.trim() || null,
          phone: editPhone.trim() || null,
          birthDate: editBirthDate ? editBirthDate : null,
          address: editAddress.trim() || null,
          parentId: editParentId || null,
          monthlyFee: Number(editMonthlyFee),
          courseDurationMonths: Number(editCourseDurationMonths)
        })
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Error al actualizar alumno', 'error');
        return;
      }

      showToast('Alumno y ficha extendida actualizados correctamente.');
      setEditingStudent(null);
      fetchStudents();
      fetchParents();
    } catch (err) {
      showToast('Error de conexión al actualizar', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deletingStudent) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/api/students/${deletingStudent.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || 'Error al eliminar alumno', 'error');
        return;
      }

      showToast('Alumno eliminado del sistema.');
      setDeletingStudent(null);
      fetchStudents();
    } catch (err) {
      showToast('Error de conexión al eliminar', 'error');
    }
  };

  const filteredStudents = students.filter(s => {
    const fullName = `${s.profile?.firstName || ''} ${s.profile?.lastName || ''}`.toLowerCase();
    const email = s.email.toLowerCase();
    const dni = (s.profile?.dni || '').toLowerCase();
    const phone = (s.profile?.phone || '').toLowerCase();
    const parentName = s.parent?.profile ? `${s.parent.profile.firstName} ${s.parent.profile.lastName}`.toLowerCase() : '';
    const query = searchTerm.toLowerCase();

    const matchesSearch =
      !query ||
      fullName.includes(query) ||
      email.includes(query) ||
      dni.includes(query) ||
      phone.includes(query) ||
      parentName.includes(query);

    const isOnline = s.monthlyFee === 65 || email.includes('online') || fullName.includes('online');
    const modality = isOnline ? 'ONLINE' : 'PRESENCIAL';

    if (modalityFilter === 'PRESENCIAL' && modality !== 'PRESENCIAL') return false;
    if (modalityFilter === 'ONLINE' && modality !== 'ONLINE') return false;

    if (familyFilter === 'WITH_PARENT' && !s.parentId) return false;
    if (familyFilter === 'INDEPENDENT' && s.parentId) return false;

    return matchesSearch;
  });

  return (
    <div className="page-container">
      {/* Toast Notification */}
      {notification && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          padding: '1rem 1.5rem',
          borderRadius: '8px',
          background: notification.type === 'success' ? 'var(--primary)' : '#991b1b',
          color: '#ffffff',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          zIndex: 100,
          animation: 'fadeIn 0.3s ease'
        }}>
          {notification.type === 'success' ? <Check size={18} /> : <AlertTriangle size={18} />}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Users style={{ color: 'var(--primary)' }} /> Gestión de Alumnos y Fichas
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Administra los expedientes, datos de contacto, cuentas familiares y matrículas de la academia
          </p>
        </div>

        <button
          onClick={() => { resetCreateForm(); setShowCreateModal(true); }}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem' }}
        >
          <UserPlus size={18} /> Nuevo Alumno
        </button>
      </div>

      {/* Selector de Modalidad & Filtros & Buscador */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {([
            ['ALL', 'Todos los alumnos', null],
            ['PRESENCIAL', 'Presencial', <GraduationCap size={15} />],
            ['ONLINE', 'Online / Particular', <Laptop size={15} />]
          ] as const).map(([val, label, icon]) => (
            <button
              key={val}
              type="button"
              onClick={() => setModalityFilter(val)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '16px',
                border: modalityFilter === val ? '1px solid var(--primary)' : '1px solid var(--border)',
                background: modalityFilter === val ? 'var(--primary-light)' : 'var(--surface)',
                color: modalityFilter === val ? 'var(--primary-text)' : 'var(--text-muted)',
                fontWeight: modalityFilter === val ? 700 : 500,
                fontSize: '0.84rem',
                cursor: 'pointer'
              }}
            >
              {icon}
              {label}
            </button>
          ))}

          <div style={{ width: '1px', background: 'var(--border)', margin: '0 0.25rem' }} />

          {([
            ['ALL', 'Todas las cuentas'],
            ['WITH_PARENT', 'Con Padre/Tutor 👨‍👧'],
            ['INDEPENDENT', 'Independientes']
          ] as const).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setFamilyFilter(val)}
              style={{
                padding: '0.45rem 0.8rem',
                borderRadius: '16px',
                border: familyFilter === val ? '1px solid var(--text-main)' : '1px solid var(--border)',
                background: familyFilter === val ? 'var(--surface-alt)' : 'transparent',
                color: familyFilter === val ? 'var(--text-main)' : 'var(--text-muted)',
                fontWeight: familyFilter === val ? 600 : 400,
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 0, maxWidth: '380px' }}>
          <Search size={17} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Buscar por nombre, DNI, teléfono, tutor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem 1rem 0.6rem 2.4rem',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--surface-alt)',
              color: 'var(--text-main)',
              outline: 'none',
              fontSize: '0.88rem'
            }}
          />
        </div>
      </div>

      {/* Students Table */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table style={{ width: '100%', minWidth: '820px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--surface-alt)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.84rem' }}>ALUMNO Y CONTACTO</th>
                <th style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.84rem' }}>DNI / NIE</th>
                <th style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.84rem' }}>CUENTA / TUTOR</th>
                <th style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.84rem' }}>TARIFA</th>
                <th style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.84rem' }}>DURACIÓN</th>
                <th style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.84rem', textAlign: 'right' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Cargando alumnos y fichas...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {searchTerm ? 'No se encontraron alumnos con ese criterio.' : 'No hay alumnos registrados en el sistema.'}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => {
                  const initials = `${s.profile?.firstName?.[0] || ''}${s.profile?.lastName?.[0] || ''}`.toUpperCase() || 'AL';
                  const age = calculateAge(s.profile?.birthDate);

                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s ease' }}>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            background: 'var(--primary)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '0.85rem',
                            flexShrink: 0
                          }}>
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.95rem' }}>
                              {s.profile?.firstName} {s.profile?.lastName}
                              {age !== null && (
                                <span style={{ marginLeft: '0.45rem', fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                                  ({age} años)
                                </span>
                              )}
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{s.email}</div>
                            {s.profile?.phone && (
                              <div style={{ color: 'var(--primary)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '2px' }}>
                                <Phone size={12} /> {s.profile.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '1rem 1.25rem', color: 'var(--text-main)', fontSize: '0.88rem' }}>
                        {s.profile?.dni ? (
                          <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{s.profile.dni}</span>
                        ) : (
                          <span style={{ color: 'var(--text-light)', fontStyle: 'italic', fontSize: '0.82rem' }}>No asignado</span>
                        )}
                      </td>

                      <td style={{ padding: '1rem 1.25rem' }}>
                        {s.parent ? (
                          <div style={{ padding: '0.35rem 0.65rem', background: 'var(--primary-light)', border: '1px solid var(--primary-border)', borderRadius: '8px', display: 'inline-block' }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary-text)' }}>
                              👨‍👧 {s.parent.profile?.firstName} {s.parent.profile?.lastName}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {s.parent.email}
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            Independiente
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '1rem 1.25rem', color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: '600' }}>
                        {s.monthlyFee ? `${s.monthlyFee} € / mes` : '35 € / mes'}
                      </td>

                      <td style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                        {s.courseDurationMonths ? `${s.courseDurationMonths} meses` : '9 meses'}
                      </td>

                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.45rem' }}>
                          <button
                            onClick={() => setViewingStudent(s)}
                            title="Ver ficha completa"
                            style={{
                              background: 'transparent',
                              border: '1px solid var(--border)',
                              borderRadius: '6px',
                              padding: '0.4rem',
                              cursor: 'pointer',
                              color: 'var(--text-muted)',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--primary)'; e.currentTarget.style.borderColor = 'var(--primary)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                          >
                            <Eye size={16} />
                          </button>

                          <button
                            onClick={() => handleStartEdit(s)}
                            title="Editar ficha de alumno"
                            style={{
                              background: 'transparent',
                              border: '1px solid var(--border)',
                              borderRadius: '6px',
                              padding: '0.4rem',
                              cursor: 'pointer',
                              color: 'var(--text-muted)',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--primary)'; e.currentTarget.style.borderColor = 'var(--primary)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                          >
                            <Edit2 size={16} />
                          </button>

                          <button
                            onClick={() => setDeletingStudent(s)}
                            title="Eliminar alumno"
                            style={{
                              background: 'transparent',
                              border: '1px solid var(--border)',
                              borderRadius: '6px',
                              padding: '0.4rem',
                              cursor: 'pointer',
                              color: 'var(--text-muted)',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#ef4444'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
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

      {/* Modal: Ver Ficha Completa del Alumno */}
      {viewingStudent && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 80,
          padding: '1rem'
        }}>
          <div className="glass-panel modal-card" style={{ width: '100%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem' }}>
                  {`${viewingStudent.profile?.firstName?.[0] || ''}${viewingStudent.profile?.lastName?.[0] || ''}`}
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text-main)' }}>
                    {viewingStudent.profile?.firstName} {viewingStudent.profile?.lastName}
                  </h2>
                  <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>{viewingStudent.email}</span>
                </div>
              </div>
              <button onClick={() => setViewingStudent(null)} className="modal-close" aria-label="Cerrar modal">
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '1.25rem' }}>
              <div style={{ padding: '0.85rem 1rem', background: 'var(--surface-alt)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>DNI / NIE</span>
                <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{viewingStudent.profile?.dni || 'No registrado'}</strong>
              </div>

              <div style={{ padding: '0.85rem 1rem', background: 'var(--surface-alt)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Teléfono / WhatsApp</span>
                <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{viewingStudent.profile?.phone || 'No registrado'}</strong>
              </div>

              <div style={{ padding: '0.85rem 1rem', background: 'var(--surface-alt)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Fecha de Nacimiento / Edad</span>
                <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
                  {viewingStudent.profile?.birthDate
                    ? `${new Date(viewingStudent.profile.birthDate).toLocaleDateString('es-ES')} (${calculateAge(viewingStudent.profile.birthDate)} años)`
                    : 'No registrada'}
                </strong>
              </div>

              <div style={{ padding: '0.85rem 1rem', background: 'var(--surface-alt)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Cuota y Duración</span>
                <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
                  {viewingStudent.monthlyFee || 35} €/mes · {viewingStudent.courseDurationMonths || 9} meses
                </strong>
              </div>
            </div>

            <div style={{ marginTop: '1rem', padding: '0.85rem 1rem', background: 'var(--surface-alt)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Dirección Completa</span>
              <p style={{ margin: '0.25rem 0 0', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                {viewingStudent.profile?.address || 'Sin dirección registrada'}
              </p>
            </div>

            {/* Ficha del Tutor Asociado */}
            <div style={{ marginTop: '1.25rem', padding: '1rem', background: viewingStudent.parent ? 'var(--primary-subtle)' : 'var(--surface-alt)', borderRadius: '10px', border: viewingStudent.parent ? '1px solid var(--primary-border)' : '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <UserCheck size={18} style={{ color: 'var(--primary)' }} />
                <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>
                  {viewingStudent.parent ? 'Padre / Tutor Responsable' : 'Cuenta de Alumno Independiente'}
                </strong>
              </div>
              {viewingStudent.parent ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginTop: '0.4rem' }}>
                  <div><strong>Nombre:</strong> {viewingStudent.parent.profile?.firstName} {viewingStudent.parent.profile?.lastName}</div>
                  <div><strong>Email del tutor:</strong> {viewingStudent.parent.email}</div>
                  {viewingStudent.parent.profile?.phone && <div><strong>Teléfono:</strong> {viewingStudent.parent.profile.phone}</div>}
                  {viewingStudent.parent.profile?.dni && <div><strong>DNI Tutor:</strong> {viewingStudent.parent.profile.dni}</div>}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Este alumno no tiene un padre/tutor asociado. Gestiona sus pagos y accesos directamente.
                </p>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setViewingStudent(null)}
                style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600 }}
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => { const s = viewingStudent; setViewingStudent(null); handleStartEdit(s); }}
                className="btn-primary"
                style={{ padding: '0.6rem 1.25rem' }}
              >
                Editar Ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Crear Alumno con Ficha Extendida & Tutor */}
      {showCreateModal && (
        <div className="modal-backdrop" style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 80,
          padding: '1rem'
        }}>
          <div className="glass-panel modal-card" style={{ width: '100%', maxWidth: '620px', maxHeight: '92vh', overflowY: 'auto', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.3rem' }}>
                <UserPlus style={{ color: 'var(--primary)' }} /> Alta de Nuevo Alumno
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="modal-close" aria-label="Cerrar modal">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 200px' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Nombre *</label>
                  <input
                    type="text"
                    required
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    placeholder="Ej. Laura"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                  />
                </div>
                <div style={{ flex: '1 1 200px' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Apellidos *</label>
                  <input
                    type="text"
                    required
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    placeholder="Ej. Gómez Pérez"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 200px' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Correo Electrónico (Acceso del Alumno) *</label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="alumno@ejemplo.com"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                  />
                </div>
                <div style={{ flex: '1 1 140px' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>DNI / NIE</label>
                  <input
                    type="text"
                    value={newDni}
                    onChange={(e) => setNewDni(e.target.value)}
                    placeholder="12345678Z"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 180px' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Teléfono / WhatsApp</label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="600123456"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                  />
                </div>
                <div style={{ flex: '1 1 180px' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Fecha de Nacimiento</label>
                  <input
                    type="date"
                    value={newBirthDate}
                    onChange={(e) => setNewBirthDate(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Dirección Completa</label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="Calle, número, piso, ciudad"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Tarifa mensual</label>
                  <select
                    required
                    value={newMonthlyFee}
                    onChange={(e) => setNewMonthlyFee(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                  >
                    <option value="35">35 € / mes</option>
                    <option value="65">65 € / mes</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Duración del curso (meses)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newCourseDurationMonths}
                    onChange={(e) => setNewCourseDurationMonths(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>

              {/* Sección Familiar / Tutor */}
              <div style={{ padding: '1rem', background: 'var(--surface-alt)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                  <input
                    type="checkbox"
                    checked={hasParent}
                    onChange={(e) => setHasParent(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                  />
                  <span>👨‍👧 Asignar Padre / Tutor (Para menores o cuentas familiares)</span>
                </label>

                {hasParent && (
                  <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', paddingTop: '0.85rem', borderTop: '1px dashed var(--border)' }}>
                    <div style={{ display: 'flex', gap: '1.25rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <input
                          type="radio"
                          name="parentOption"
                          value="EXISTING"
                          checked={parentOption === 'EXISTING'}
                          onChange={() => setParentOption('EXISTING')}
                          style={{ accentColor: 'var(--primary)' }}
                        />
                        Vincular a Padre/Tutor existente
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <input
                          type="radio"
                          name="parentOption"
                          value="NEW"
                          checked={parentOption === 'NEW'}
                          onChange={() => setParentOption('NEW')}
                          style={{ accentColor: 'var(--primary)' }}
                        />
                        Crear nuevo Padre/Tutor
                      </label>
                    </div>

                    {parentOption === 'EXISTING' ? (
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>Selecciona el tutor de la lista</label>
                        <select
                          value={selectedParentId}
                          onChange={(e) => setSelectedParentId(e.target.value)}
                          required={hasParent && parentOption === 'EXISTING'}
                          style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)' }}
                        >
                          <option value="">-- Seleccionar Padre/Tutor --</option>
                          {parents.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.profile?.firstName} {p.profile?.lastName} ({p.email}) - {p.children?.length || 0} hijos
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                          <input
                            type="text"
                            placeholder="Nombre del Padre/Tutor *"
                            required={hasParent && parentOption === 'NEW'}
                            value={newParentFirstName}
                            onChange={(e) => setNewParentFirstName(e.target.value)}
                            style={{ flex: 1, padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                          />
                          <input
                            type="text"
                            placeholder="Apellidos del Padre/Tutor *"
                            required={hasParent && parentOption === 'NEW'}
                            value={newParentLastName}
                            onChange={(e) => setNewParentLastName(e.target.value)}
                            style={{ flex: 1, padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                          <input
                            type="email"
                            placeholder="Correo del Tutor (Para acceso a pagos y notas) *"
                            required={hasParent && parentOption === 'NEW'}
                            value={newParentEmail}
                            onChange={(e) => setNewParentEmail(e.target.value)}
                            style={{ flex: 1, padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                          />
                          <input
                            type="tel"
                            placeholder="Teléfono del Tutor"
                            value={newParentPhone}
                            onChange={(e) => setNewParentPhone(e.target.value)}
                            style={{ width: '160px', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="DNI / NIE del Tutor (para facturas)"
                          value={newParentDni}
                          onChange={(e) => setNewParentDni(e.target.value)}
                          style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-main)', padding: '0.7rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" style={{ padding: '0.7rem 1.5rem' }}>
                  Crear y Enviar Credenciales
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Alumno */}
      {editingStudent && (
        <div className="modal-backdrop" style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 80,
          padding: '1rem'
        }}>
          <div className="glass-panel modal-card" style={{ width: '100%', maxWidth: '580px', maxHeight: '92vh', overflowY: 'auto', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit2 style={{ color: 'var(--primary)' }} /> Editar Ficha del Alumno
              </h3>
              <button onClick={() => setEditingStudent(null)} className="modal-close" aria-label="Cerrar modal">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 200px' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Nombre *</label>
                  <input
                    type="text"
                    required
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                  />
                </div>
                <div style={{ flex: '1 1 200px' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Apellidos *</label>
                  <input
                    type="text"
                    required
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 200px' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Correo Electrónico *</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                  />
                </div>
                <div style={{ flex: '1 1 140px' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>DNI / NIE</label>
                  <input
                    type="text"
                    value={editDni}
                    onChange={(e) => setEditDni(e.target.value)}
                    placeholder="12345678Z"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 180px' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Teléfono / WhatsApp</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="600123456"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                  />
                </div>
                <div style={{ flex: '1 1 180px' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Fecha de Nacimiento</label>
                  <input
                    type="date"
                    value={editBirthDate}
                    onChange={(e) => setEditBirthDate(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Dirección Completa</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="Calle, número, piso, ciudad"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Padre / Tutor Responsable</label>
                <select
                  value={editParentId}
                  onChange={(e) => setEditParentId(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                >
                  <option value="">-- Sin tutor asignado (Alumno Independiente) --</option>
                  {parents.map(p => (
                    <option key={p.id} value={p.id}>
                      👨‍👧 {p.profile?.firstName} {p.profile?.lastName} ({p.email})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Tarifa mensual</label>
                  <select
                    required
                    value={editMonthlyFee}
                    onChange={(e) => setEditMonthlyFee(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                  >
                    <option value="35">35 € / mes</option>
                    <option value="65">65 € / mes</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Duración del curso (meses)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editCourseDurationMonths}
                    onChange={(e) => setEditCourseDurationMonths(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-main)', padding: '0.7rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" style={{ padding: '0.7rem 1.5rem' }}>
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Eliminación */}
      {deletingStudent && (
        <div className="modal-backdrop" style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 80,
          padding: '1rem'
        }}>
          <div className="glass-panel modal-card" style={{ width: '100%', maxWidth: '420px', padding: '2rem', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <Trash2 size={24} />
            </div>
            <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-main)' }}>¿Eliminar alumno?</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0 0 1.5rem' }}>
              Estás a punto de eliminar a <strong>{deletingStudent.profile?.firstName} {deletingStudent.profile?.lastName}</strong> ({deletingStudent.email}). Esta acción no se puede deshacer.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
              <button
                type="button"
                onClick={() => setDeletingStudent(null)}
                style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-main)', padding: '0.6rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                style={{ background: '#ef4444', border: 'none', color: '#fff', padding: '0.6rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentsManagement;
