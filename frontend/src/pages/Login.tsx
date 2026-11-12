import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, ArrowRight, GraduationCap, Briefcase, Users, ArrowLeft, Eye, EyeOff } from 'lucide-react';

interface AccountChoice {
  id: string;
  role: string;
  name: string;
}

const Login: React.FC = () => {
  const [roleMode, setRoleMode] = useState<'NONE' | 'STUDENT' | 'TEACHER' | 'PARENT'>('NONE');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotFirstName, setForgotFirstName] = useState('');
  const [forgotLastName, setForgotLastName] = useState('');
  const [accountChoices, setAccountChoices] = useState<AccountChoice[]>([]);
  const navigate = useNavigate();

  const authenticate = async (accountId?: string) => {
    setError('');

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: roleMode, accountId }),
      });

      const data = await res.json();

      if (res.status === 409 && Array.isArray(data.accounts)) {
        setAccountChoices(data.accounts);
        return;
      }

      if (!res.ok) {
        setError(data.error || 'Error al iniciar sesión');
        return;
      }

      setAccountChoices([]);
      
      // Chequeo de seguridad: si elige un rol pero su cuenta es de otro tipo, no debería dejarle.
      // Aquí el backend devuelve el rol real. Si coincide, genial.
      if (
        (roleMode === 'TEACHER' && data.user.role !== 'TEACHER' && data.user.role !== 'ADMIN') ||
        (roleMode === 'STUDENT' && data.user.role !== 'STUDENT') ||
        (roleMode === 'PARENT' && data.user.role !== 'PARENT')
      ) {
         setError('Tu cuenta no se corresponde con este tipo de perfil.');
         return;
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('userRole', data.user.role);
      localStorage.setItem('userEmail', data.user.email);
      if (data.user.parentId) {
        localStorage.setItem('hasParent', 'true');
      } else {
        localStorage.removeItem('hasParent');
      }
      localStorage.removeItem('selectedStudentId');

      if (data.user.role === 'TEACHER' || data.user.role === 'ADMIN') {
        navigate('/teacher');
      } else {
        navigate('/student');
      }
    } catch (err) {
      setError('No se pudo conectar con el servidor');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await authenticate();
  };

  const handleAccountChoice = async (accountId: string) => {
    await authenticate(accountId);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setForgotMessage('');

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          role: roleMode,
          firstName: roleMode === 'STUDENT' ? forgotFirstName : undefined,
          lastName: roleMode === 'STUDENT' ? forgotLastName : undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'No se pudo solicitar la recuperación');
        return;
      }

      setForgotMessage(data.message);
    } catch (err) {
      setError('No se pudo conectar con el servidor');
    }
  };

  const returnToLogin = () => {
    setForgotMode(false);
    setForgotMessage('');
    setError('');
  };

  return (
    <div className="app-container login-page">
      <div className="glass-panel animate-fade-in" style={{ maxWidth: '400px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src="/logo.webp" alt="HitSchool Logo" style={{ width: '80px', height: '80px', marginBottom: '1rem' }} />
          <h2>Acceso a HitSchool</h2>
        </div>

        {error && (
          <div style={{ backgroundColor: '#fdf0f0', color: '#9e2a2b', border: '1px solid #f7caca', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        {roleMode === 'NONE' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
             <button onClick={() => setRoleMode('STUDENT')} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.65rem', padding: '1rem', fontSize: '1rem' }}>
               <GraduationCap size={24} style={{ color: 'var(--primary)' }}/> Soy Alumno
             </button>
             <button onClick={() => setRoleMode('PARENT')} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.65rem', padding: '1rem', fontSize: '1rem' }}>
               <Users size={24} style={{ color: 'var(--primary)' }}/> Soy Tutor / Padre
             </button>
             <button onClick={() => setRoleMode('TEACHER')} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.65rem', padding: '1rem', fontSize: '1rem' }}>
               <Briefcase size={24} style={{ color: 'var(--primary)' }}/> Soy Profesor
             </button>
          </div>
        ) : (
          <form onSubmit={forgotMode ? handleForgotPassword : handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button type="button" onClick={() => { setRoleMode('NONE'); returnToLogin(); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              <ArrowLeft size={16} /> Volver
            </button>
            <h3 style={{ marginBottom: '0.5rem', color: 'var(--primary-text)', textAlign: 'center', fontWeight: '700' }}>
              Acceso {roleMode === 'TEACHER' ? 'Profesor' : roleMode === 'PARENT' ? 'Tutor / Padre' : 'Alumno'}
            </h3>
            {accountChoices.length > 0 && !forgotMode && (
              <div role="group" aria-label="Seleccionar cuenta" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <p style={{ margin: 0, color: 'var(--text-muted)', textAlign: 'center' }}>Selecciona tu cuenta</p>
                {accountChoices.map((account) => (
                  <button key={account.id} type="button" className="btn-secondary" onClick={() => handleAccountChoice(account.id)}>
                    {account.name || (account.role === 'ADMIN' ? 'Administración' : account.role === 'TEACHER' ? 'Profesor' : 'Alumno')}
                  </button>
                ))}
              </div>
            )}
            {forgotMode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
                  {roleMode === 'STUDENT'
                    ? 'Indica el correo y el nombre del alumno para localizar su cuenta.'
                    : 'Te enviaremos una nueva contraseña al correo asociado a tu cuenta.'}
                </p>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                  Correo electrónico
                  <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }} />
                </label>
                {roleMode === 'STUDENT' && (
                  <>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                      Nombre del alumno
                      <input type="text" value={forgotFirstName} onChange={(event) => setForgotFirstName(event.target.value)} required autoComplete="given-name" style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                      Apellidos del alumno
                      <input type="text" value={forgotLastName} onChange={(event) => setForgotLastName(event.target.value)} required autoComplete="family-name" style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-main)' }} />
                    </label>
                  </>
                )}
                {forgotMessage && <div style={{ color: 'var(--primary-text)', textAlign: 'center', fontSize: '0.9rem' }}>{forgotMessage}</div>}
                <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem', width: '100%' }}>
                  Enviar nueva contraseña <ArrowRight size={18} style={{ marginLeft: '0.5rem' }} />
                </button>
                <button type="button" onClick={returnToLogin} style={{ background: 'none', border: 'none', color: 'var(--primary-text)', cursor: 'pointer', fontSize: '0.9rem' }}>
                  Volver al acceso
                </button>
              </div>
            ) : <>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem', color: 'var(--text-main)' }}>Correo Electrónico</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setAccountChoices([]); }}
                  style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2.5rem', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                  placeholder="ejemplo@hitschool.com"
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem', color: 'var(--text-main)' }}>Contraseña</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setAccountChoices([]); }}
                  style={{ width: '100%', padding: '0.5rem 2.5rem 0.5rem 2.5rem', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(current => !current)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ marginTop: '1rem', width: '100%' }}>
              Entrar <ArrowRight size={18} style={{ marginLeft: '0.5rem' }} />
            </button>
            <button type="button" onClick={() => { setForgotMode(true); setError(''); }} style={{ background: 'none', border: 'none', color: 'var(--primary-text)', cursor: 'pointer', fontSize: '0.9rem' }}>
              He olvidado mi contraseña
            </button>
            </>}
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
