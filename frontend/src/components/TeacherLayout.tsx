import React, { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, Users, LogOut, GraduationCap, FolderArchive, CircleDollarSign } from 'lucide-react';

const TeacherLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('userRole');

    if (!token) {
      navigate('/');
      return;
    }

    if (role !== 'TEACHER' && role !== 'ADMIN') {
      navigate(role === 'STUDENT' ? '/student' : '/');
    }
  }, [navigate]);

  const userRole = localStorage.getItem('userRole');

  if (userRole !== 'TEACHER' && userRole !== 'ADMIN') {
    return null;
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    navigate('/');
  };

  const navItems = [
    { label: 'Mis Clases', path: '/teacher', icon: <BookOpen size={20} /> },
    { label: 'Material de Clase', path: '/teacher/materials', icon: <FolderArchive size={20} /> },
    { label: 'Gestión de Alumnos', path: '/teacher/students', icon: <Users size={20} /> },
    { label: 'Control de Pagos', path: '/teacher/payments', icon: <CircleDollarSign size={20} /> },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)' }}>
      {/* Barra Lateral Persistente */}
      <aside style={{
        width: '260px',
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        zIndex: 20
      }}>
        {/* Logo / Header */}
        <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border)' }}>
          <img src="/logo.webp" alt="HitSchool" style={{ width: '36px', height: '36px', borderRadius: '8px' }} />
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text)' }}>HitSchool</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Panel Profesor
            </span>
          </div>
        </div>

        {/* Enlaces de Navegación */}
        <nav style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path === '/teacher' && location.pathname.startsWith('/teacher/course'));

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: isActive ? 'var(--primary)' : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--text)',
                  cursor: 'pointer',
                  fontWeight: isActive ? '600' : '500',
                  fontSize: '0.95rem',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent';
                }}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Sección de Usuario & Salir */}
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GraduationCap size={18} />
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Profesor</p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>profesor@hitschool.com</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.6rem',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ef4444';
              e.currentTarget.style.borderColor = '#ef4444';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
          >
            <LogOut size={16} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Contenido de la Página */}
      <main style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
};

export default TeacherLayout;
