import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Award, BookOpen, CircleDollarSign, GraduationCap, LogOut, MessageCircle, Menu, X, Users, Settings } from 'lucide-react';
import { useParent } from '../context/ParentContext';
import SettingsModal from './SettingsModal';

const StudentLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { parentName, childrenList, selectedStudentId, setSelectedStudentId, refreshParentData } = useParent();

  const userRole = localStorage.getItem('userRole');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('userRole');

    if (!token || (role !== 'STUDENT' && role !== 'PARENT')) {
      navigate('/');
    } else if (role === 'PARENT') {
      refreshParentData();
    }
  }, [navigate, refreshParentData]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('selectedStudentId');
    navigate('/');
  };

  const navItems = [
    { label: 'Mis Clases', path: '/student', icon: <BookOpen size={20} /> },
    { label: 'Mis Pagos', path: '/student/payments', icon: <CircleDollarSign size={20} /> },
    { label: 'Calificaciones', path: '/student/grades', icon: <Award size={20} /> },
    { label: 'Chat con Profesor', path: '/student/chat', icon: <MessageCircle size={20} /> }
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
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-main)' }}>HitSchool</h3>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: '700', textTransform: 'uppercase', background: 'var(--primary-light)', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
            {userRole === 'PARENT' ? 'Tutor' : 'Alumno'}
          </span>
        </div>
      </header>

      {/* Overlay para cerrar sidebar en móvil */}
      <div
        className={`sidebar-overlay ${isMobileMenuOpen ? 'active' : ''}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
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
          <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <img src="/logo.webp" alt="HitSchool" style={{ width: '36px', height: '36px', borderRadius: '8px' }} />
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-main)' }}>HitSchool</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {userRole === 'PARENT' ? 'Panel Tutor' : 'Panel Alumno'}
                </span>
              </div>
            </div>
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

          <nav style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, overflowY: 'auto' }}>
            {navItems.map((item) => {
              const isActive = location.pathname === item.path ||
                (item.path === '/student' && (location.pathname === '/student/dashboard' || location.pathname.startsWith('/student/course')));

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
                    color: isActive ? '#ffffff' : 'var(--text-main)',
                    cursor: 'pointer',
                    fontWeight: isActive ? '600' : '500',
                    fontSize: '0.95rem',
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                    minHeight: '44px'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'var(--surface-alt)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {item.icon}
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'var(--primary)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                {userRole === 'PARENT' ? <Users size={18} /> : <GraduationCap size={18} />}
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {userRole === 'PARENT' ? parentName : 'Alumno'}
                </p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {userRole === 'PARENT' ? 'Panel de Tutor' : 'Panel de Alumno'}
                </p>
              </div>
            </div>

            {userRole === 'PARENT' && childrenList.length > 0 && (
              <div style={{ padding: '0 0.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  Alumno / Hijo activo:
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.5rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface-alt)',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {childrenList.map((child) => {
                    const childName = child.profile?.firstName || child.profile?.lastName
                      ? `${child.profile?.firstName || ''} ${child.profile?.lastName || ''}`.trim()
                      : child.email;
                    return (
                      <option key={child.id} value={child.id}>
                        🎓 {childName}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {userRole === 'PARENT' && (
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
            )}

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

export default StudentLayout;
