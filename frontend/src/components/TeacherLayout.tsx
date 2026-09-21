import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Award, BookOpen, Users, LogOut, GraduationCap, FolderArchive, CircleDollarSign, MessageCircle, Menu, X, Settings, Home, UserRoundCog, ShieldCheck, HelpCircle } from 'lucide-react';
import SettingsModal from './SettingsModal';
import { useLearningNotifications } from '../hooks/useLearningNotifications';

const TeacherLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const { hasNewGrades, markGradesSeen } = useLearningNotifications();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('userRole');

    if (!token) {
      navigate('/');
      return;
    }

    if (role !== 'TEACHER' && role !== 'ADMIN') {
      navigate(role === 'PARENT' ? '/student/payments' : role === 'STUDENT' ? '/student' : '/');
      return;
    }

  }, [navigate, location.pathname]);

  // Cerrar menú móvil al cambiar de ruta
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname === '/teacher/grades') markGradesSeen();
  }, [location.pathname, markGradesSeen]);

  useEffect(() => {
    const fetchUnreadChatCount = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const res = await fetch(`${apiUrl}/api/chat/unread-count`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUnreadChatCount(Number(data.unreadCount) || 0);
        }
      } catch {
        setUnreadChatCount(0);
      }
    };

    fetchUnreadChatCount();
    const interval = setInterval(fetchUnreadChatCount, 3500);
    return () => clearInterval(interval);
  }, [location.pathname]);

  useEffect(() => {
    const handleToggle = () => setIsMobileMenuOpen((prev) => !prev);
    window.addEventListener('hit-toggle-mobile-menu', handleToggle);
    return () => window.removeEventListener('hit-toggle-mobile-menu', handleToggle);
  }, []);

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

  const getMainBackground = () => {
    if (location.pathname === '/teacher') return '#fef3c7';
    if (location.pathname === '/teacher/courses' || location.pathname.startsWith('/teacher/course/')) return '#e0f2fe';
    if (location.pathname === '/teacher/tasks') return '#ecfdf5';
    if (location.pathname === '/teacher/grades') return '#f3e8ff';
    if (location.pathname === '/teacher/materials') return '#d1fae5';
    if (location.pathname === '/teacher/students') return '#ffe4e6';
    if (location.pathname === '/teacher/teachers') return '#e0e7ff';
    if (location.pathname === '/teacher/admins') return '#eef2ff';
    if (location.pathname === '/teacher/parents') return '#e0f7f1';
    if (location.pathname === '/teacher/enrollments') return '#ffedd5';
    if (location.pathname === '/teacher/payments') return '#fce7f3';
    if (location.pathname === '/teacher/chat') return '#ccfbf1';
    return '#f1f5f9';
  };

  const navItems = [
    { label: 'Inicio', path: '/teacher', icon: <Home size={20} />, iconColor: '#d99a00' },
    { label: 'Mis Clases', path: '/teacher/courses', icon: <BookOpen size={20} />, iconColor: '#1682b3' },
    { label: 'Calificaciones', path: '/teacher/grades', icon: <Award size={20} />, iconColor: '#7950b8' },
    { label: 'Material de Clase', path: '/teacher/materials', icon: <FolderArchive size={20} />, iconColor: '#12966b' },
    { label: 'Gestión de Alumnos', path: '/teacher/students', icon: <Users size={20} />, iconColor: '#d14f72' },
    { label: 'Gestión Profesores', path: '/teacher/teachers', icon: <UserRoundCog size={20} />, iconColor: '#5369ad' },
    ...(userRole === 'ADMIN' ? [{ label: 'Gestión Admin', path: '/teacher/admins', icon: <ShieldCheck size={20} />, iconColor: '#4f46e5' }] : []),
    { label: 'Gestión Tutores', path: '/teacher/parents', icon: <Users size={20} />, iconColor: '#0f9f7a' },
    ...(userRole === 'ADMIN' ? [{ label: 'Control de Pagos', path: '/teacher/payments', icon: <CircleDollarSign size={20} />, iconColor: '#d14f72' }] : []),
    { label: 'Chat Alumnos', path: '/teacher/chat', icon: <MessageCircle size={20} />, iconColor: '#12966b' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#ffffff', flexDirection: 'column' }}>
      {/* Barra Superior Móvil */}
      <header
        style={{
          display: 'none',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1.25rem',
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
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
          <span style={{ fontSize: '0.72rem', color: userRole === 'ADMIN' ? '#d97706' : 'var(--primary)', fontWeight: '700', textTransform: 'uppercase', background: userRole === 'ADMIN' ? '#fef3c7' : 'var(--primary-light)', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
            {userRole === 'ADMIN' ? 'Admin' : 'Profesor'}
          </span>
          {location.pathname === '/teacher' && (
            <a
              href="/Guia_Practica_de_Hitschool.pdf"
              download="Guia Practica de Hitschool.pdf"
              title="Descargar Guía Práctica de HitSchool"
              aria-label="Descargar Guía Práctica de HitSchool"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                color: 'var(--primary)',
                textDecoration: 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                cursor: 'pointer'
              }}
            >
              <HelpCircle size={17} strokeWidth={2.3} />
            </a>
          )}
        </div>
      </header>

      {/* Overlay para cerrar sidebar en móvil */}
      <div
        className={`sidebar-overlay ${isMobileMenuOpen ? 'active' : ''}`}
        style={{ zIndex: isMobileMenuOpen ? 55 : undefined }}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
        {/* Barra Lateral / Drawer */}
        <aside
          className={`sidebar-nav-container ${isMobileMenuOpen ? 'drawer-open' : ''}`}
          style={{
            width: '260px',
            background: '#ffffff',
            borderRight: '1px solid #e2e8f0',
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
          <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <img src="/logo.webp" alt="HitSchool" style={{ width: '36px', height: '36px', borderRadius: '8px' }} />
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text)' }}>HitSchool</h3>
                <span style={{ fontSize: '0.75rem', color: userRole === 'ADMIN' ? '#d97706' : 'var(--primary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {userRole === 'ADMIN' ? 'Panel de Administrador' : 'Panel Profesor'}
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
                (item.path === '/teacher/courses' && location.pathname.startsWith('/teacher/course/'));

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
                    if (!isActive) e.currentTarget.style.background = '#f8fafc';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <span style={{ display: 'inline-flex', color: isActive ? '#ffffff' : item.iconColor, position: 'relative' }}>
                    {React.cloneElement(item.icon, { strokeWidth: 2.5 })}
                    {item.path === '/teacher/chat' && unreadChatCount > 0 && (
                      <span style={{ position: 'absolute', top: -3, right: -3, width: 9, height: 9, borderRadius: '50%', background: '#ef4444', border: `2px solid ${isActive ? 'var(--primary)' : '#ffffff'}` }} />
                    )}
                    {item.path === '/teacher/grades' && hasNewGrades && (
                      <span style={{ position: 'absolute', top: -3, right: -3, width: 9, height: 9, borderRadius: '50%', background: '#ef4444', border: `2px solid ${isActive ? 'var(--primary)' : '#ffffff'}` }} />
                    )}
                  </span>
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Sección de Usuario & Salir */}
          <div style={{ padding: '1rem', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: userRole === 'ADMIN' ? '#d97706' : 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <GraduationCap size={18} />
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {userRole === 'ADMIN' ? 'Admin' : 'Profesor'}
                </p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {localStorage.getItem('userEmail') || 'usuario@hitschool.com'}
                </p>
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
        <main className="teacher-themed-content" style={{ flex: 1, minWidth: 0, minHeight: '100vh', overflowY: 'auto', background: getMainBackground(), transition: 'background-color 0.2s ease' }}>
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
            z-index: 60 !important;
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
