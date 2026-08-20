import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';

const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || localStorage.getItem('userRole') !== 'STUDENT') {
      navigate('/');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    navigate('/');
  };

  return (
    <div className="app-container">
      <header style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img src="/logo.webp" alt="Logo" style={{ width: '40px' }} />
          <h2>Portal del Alumno</h2>
        </div>
        <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <LogOut size={18} /> Salir
        </button>
      </header>

      <div className="glass-panel" style={{ width: '100%', maxWidth: '800px', textAlign: 'center', padding: '4rem 2rem' }}>
        <h1 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>¡Bienvenido a HitSchool!</h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>
          Tu perfil ha sido creado correctamente. Pronto podrás ver tus cursos, tareas y gráficos de progreso aquí.
        </p>
      </div>
    </div>
  );
};

export default StudentDashboard;
