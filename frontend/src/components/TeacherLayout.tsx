import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Award, BookOpen, Users, LogOut, GraduationCap, FolderArchive, CircleDollarSign, MessageCircle, Menu, X, Settings } from 'lucide-react';
import SettingsModal from './SettingsModal';

const TeacherLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('userRole');

    if (!token) {
      navigate('/');
      return;
    }

    if (role !== 'TEACHER' && role !== 'ADMIN') {
      navigate(role === 'PARENT' ? '/student/payments' : role === 'STUDENT' ? '/student' : '/');
    }
  }, [navigate]);

  // Cerrar menú móvil al cambiar de ruta
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const userRole = localStorage.getItem('userRole');

  if (userRole !== 'TEACHER' && userRole !== 'ADMIN') {
    return null;
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    navigate('/');
  };

  const navItems = [
    { label: 'Mis Clases', path: '/teacher', icon: <BookOpen size={20} /> },
    { label: 'Calificaciones', path: '/teacher/grades', icon: <Award size={20} /> },
    { label: 'Material de Clase', path: '/teacher/materials', icon: <FolderArchive size={20} /> },
    { label: 'Gestión de Alumnos', path: '/teacher/students', icon: <Users size={20} /> },
    { label: 'Control de Pagos', path: '/teacher/payments', icon: <CircleDollarSign size={20} /> },
    { label: 'Chat Alumnos', path: '/teacher/chat', icon: <MessageCircle size={20} /> },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)', flexDirection: 'column' }}>
      {/* Barra Superior Móvil */}
      <header
        style={{
          display: 'none',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1.25rem',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          position: 'sticky',
          top: 0,
          zIndex: 30,
        }}
        className="mobile-header-bar"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-main)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '4px'
            }}
            aria-label="Abrir menú"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <img src="/logo.webp" alt="HitSchool" style={{ width: '28px', height: '28px', borderRadius: '6px' }} />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 'bold', color: 'var(--text)' }}>HitSchool</h3>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: '700', textTransform: 'uppercase', background: 'var(--primary-light)', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
            Profesor
          </span>
        </div>
      </header>

      {/* Overlay para cerrar sidebar en móvil */}
      <div
        className={`sidebar-overlay ${isMobileMenuOpen ? 'active' : ''}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
        {/* Barra Lateral / Drawer */}
        <aside
          className={`sidebar-nav-container ${isMobileMenuOpen ? 'drawer-open' : ''}`}
          style={{
            width: '260px',
            background: 'var(--surface)',
            borderRight: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            position: 'sticky',
            top: 0,
            height: '100vh',
            zIndex: 45,
            transition: 'transform 0.3s ease',
          }}
        >
          {/* Logo / Header (Desktop) */}
          <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <img src="/logo.webp" alt="HitSchool" style={{ width: '36px', height: '36px', borderRadius: '8px' }} />
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text)' }}>HitSchool</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Panel Profesor
                </span>
              </div>
            </div>
            {/* Botón cerrar visible solo en móvil */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="mobile-drawer-close"
              style={{
                display: 'none',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px'
              }}
              aria-label="Cerrar menú"
            >
              <X size={20} />
            </button>
          </div>

          {/* Enlaces de Navegación */}
          <nav style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, overflowY: 'auto' }}>
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || 
                (item.path === '/teacher' && location.pathname.startsWith('/teacher/course'));

              return (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setIsMobileMenuOpen(false);
                  }}
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
                    minHeight: '44px'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'var(--surface-alt)';
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
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <GraduationCap size={18} />
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Profesor</p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>profesor@hitschool.com</p>
              </div>
            </div>
            <button
              onClick={() => setIsSettingsOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.6rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text-main)',
                cursor: 'pointer',
                fontSize: '0.9rem',
                transition: 'all 0.2s ease',
                minHeight: '40px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.color = 'var(--primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.color = 'var(--text-main)';
              }}
            >
              <Settings size={16} /> Ajustes de Cuenta
            </button>

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
                transition: 'all 0.2s ease',
                minHeight: '40px'
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

      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}

      <style>{`
        @media (max-width: 900px) {
          .mobile-header-bar {
            display: flex !important;
          }
          .sidebar-nav-container {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            bottom: 0 !important;
            height: 100% !important;
            transform: translateX(-100%);
            box-shadow: 4px 0 24px rgba(0,0,0,0.15);
          }
          .sidebar-nav-container.drawer-open {
            transform: translateX(0) !important;
          }
          .mobile-drawer-close {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
};

export default TeacherLayout;
