import React, { useState, useEffect } from 'react';
import { User, X, CheckCircle, AlertCircle, Eye, EyeOff, ShieldCheck, UserCircle, Save } from 'lucide-react';

interface SettingsModalProps {
  onClose: () => void;
}

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'SECURITY'>('PROFILE');
  
  // Security
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  // Profile
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dni, setDni] = useState('');
  const [phone, setPhone] = useState('');
  const [modality, setModality] = useState('');
  const [fee, setFee] = useState('');
  const [tutorName, setTutorName] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const userEmail = localStorage.getItem('userEmail') || 'Usuario';
  const userRole = localStorage.getItem('userRole') || 'STUDENT';

  const roleLabel = userRole === 'TEACHER' ? 'Profesor / Administrador' : userRole === 'PARENT' ? 'Padre / Tutor' : 'Estudiante';

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setFirstName(data.profile?.firstName || '');
        setLastName(data.profile?.lastName || '');
        setDni(data.profile?.dni || '');
        setPhone(data.profile?.phone || '');
        setModality(data.modality || 'PRESENCIAL');
        setFee(data.monthlyFee ? `${data.monthlyFee} € / mes` : 'No asignada');
        setTutorName(data.parent ? `${data.parent.profile?.firstName || ''} ${data.parent.profile?.lastName || ''}`.trim() : 'Ninguno');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSecuritySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Por favor, completa todos los campos.');
      return;
    }

    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('La nueva contraseña y su confirmación no coinciden.');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/api/auth/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al cambiar la contraseña.');
        return;
      }

      setSuccess('¡Contraseña cambiada con éxito! Utiliza tu nueva contraseña en los próximos inicios de sesión.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error(err);
      setError('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!firstName || !lastName) {
      setError('Nombre y apellidos son obligatorios.');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/api/auth/me/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ firstName, lastName, dni, phone })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al actualizar el perfil.');
        return;
      }

      setSuccess('Perfil actualizado con éxito.');
    } catch (err) {
      console.error(err);
      setError('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '1rem'
    }}>
      <div className="glass-panel modal-card" style={{
        width: '100%',
        maxWidth: '520px',
        maxHeight: '92vh',
        overflowY: 'auto',
        padding: '2rem',
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.65rem', borderRadius: '10px' }}>
              <UserCircle size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)' }}>Ajustes de Cuenta</h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Perfil y seguridad</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="modal-close"
            aria-label="Cerrar modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Resumen de Cuenta */}
        <div style={{
          padding: '0.85rem 1rem',
          background: 'var(--surface-alt)',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
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
            fontSize: '0.9rem'
          }}>
            <User size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {userEmail}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 600 }}>
              {roleLabel}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem' }}>
          <button
            type="button"
            onClick={() => { setActiveTab('PROFILE'); setError(''); setSuccess(''); }}
            style={{
              background: 'none',
              border: 'none',
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              color: activeTab === 'PROFILE' ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'PROFILE' ? '2px solid var(--primary)' : '2px solid transparent',
              fontWeight: activeTab === 'PROFILE' ? 600 : 400
            }}
          >
            Datos Personales
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('SECURITY'); setError(''); setSuccess(''); }}
            style={{
              background: 'none',
              border: 'none',
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              color: activeTab === 'SECURITY' ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'SECURITY' ? '2px solid var(--primary)' : '2px solid transparent',
              fontWeight: activeTab === 'SECURITY' ? 600 : 400
            }}
          >
            Seguridad
          </button>
        </div>

        {/* Alertas */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            background: '#fdf0f0',
            color: '#9e2a2b',
            border: '1px solid #f7caca',
            borderRadius: '8px',
            fontSize: '0.86rem',
            marginBottom: '1.25rem'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            background: '#eaf4ef',
            color: '#24583e',
            border: '1px solid #bfe0d0',
            borderRadius: '8px',
            fontSize: '0.86rem',
            marginBottom: '1.25rem'
          }}>
            <CheckCircle size={18} style={{ flexShrink: 0 }} />
            <span>{success}</span>
          </div>
        )}

        {activeTab === 'PROFILE' && (
          <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px' }}>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Nombre
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                />
              </div>
              <div style={{ flex: '1 1 200px' }}>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Apellidos
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px' }}>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  DNI / NIE
                </label>
                <input
                  type="text"
                  value={dni}
                  onChange={e => setDni(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                />
              </div>
              <div style={{ flex: '1 1 200px' }}>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Teléfono
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                />
              </div>
            </div>

            {/* Read-only fields */}
            <div style={{ marginTop: '0.5rem', padding: '1rem', background: 'var(--surface-alt)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-main)', fontSize: '0.9rem' }}>Datos Administrativos (Solo lectura)</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Modalidad</span>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{modality}</strong>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Tarifa</span>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{fee}</strong>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Tutor</span>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{tutorName}</strong>
                </div>
              </div>
              <p style={{ margin: '0.75rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Si necesitas cambiar tu modalidad o tarifa, contacta con secretaría o tu profesor.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
              <button type="button" onClick={onClose} style={{ padding: '0.65rem 1.15rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-main)', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer' }}>
                Cerrar
              </button>
              <button type="submit" disabled={loading} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.65rem 1.35rem', fontSize: '0.88rem', opacity: loading ? 0.7 : 1 }}>
                <Save size={18} /> {loading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'SECURITY' && (
          <form onSubmit={handleSecuritySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Contraseña Actual
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 2.5rem 0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                >
                  {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Nueva Contraseña Personal
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 2.5rem 0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Confirmar Nueva Contraseña
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
              <button type="button" onClick={onClose} style={{ padding: '0.65rem 1.15rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-main)', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer' }}>
                Cerrar
              </button>
              <button type="submit" disabled={loading} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.65rem 1.35rem', fontSize: '0.88rem', opacity: loading ? 0.7 : 1 }}>
                <ShieldCheck size={18} /> {loading ? 'Guardando...' : 'Cambiar Contraseña'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default SettingsModal;
