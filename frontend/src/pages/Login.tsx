import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, ArrowRight, GraduationCap, Briefcase, ArrowLeft } from 'lucide-react';

const Login: React.FC = () => {
  const [roleMode, setRoleMode] = useState<'NONE' | 'STUDENT' | 'TEACHER'>('NONE');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al iniciar sesión');
        return;
      }
      
      // Chequeo de seguridad: si elige profesor pero su rol es de alumno, no debería dejarle.
      // Aquí el backend devuelve el rol real. Si coincide, genial.
      if (
        (roleMode === 'TEACHER' && data.user.role !== 'TEACHER' && data.user.role !== 'ADMIN') ||
        (roleMode === 'STUDENT' && data.user.role !== 'STUDENT')
      ) {
         setError('Tu cuenta no se corresponde con este tipo de perfil.');
         return;
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('userRole', data.user.role);

      if (data.user.role === 'TEACHER' || data.user.role === 'ADMIN') {
        navigate('/teacher');
      } else {
        navigate('/student');
      }
    } catch (err) {
      setError('No se pudo conectar con el servidor');
    }
  };

  return (
    <div className="app-container">
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
             <button onClick={() => setRoleMode('TEACHER')} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.65rem', padding: '1rem', fontSize: '1rem' }}>
               <Briefcase size={24} style={{ color: 'var(--primary)' }}/> Soy Profesor
             </button>
          </div>
        ) : (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button type="button" onClick={() => setRoleMode('NONE')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              <ArrowLeft size={16} /> Volver
            </button>
            <h3 style={{ marginBottom: '0.5rem', color: 'var(--primary-text)', textAlign: 'center', fontWeight: '700' }}>
              Acceso {roleMode === 'TEACHER' ? 'Profesor' : 'Alumno'}
            </h3>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem', color: 'var(--text-main)' }}>Correo Electrónico</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2.5rem', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none', background: 'var(--surface-alt)', color: 'var(--text-main)' }}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ marginTop: '1rem', width: '100%' }}>
              Entrar <ArrowRight size={18} style={{ marginLeft: '0.5rem' }} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
