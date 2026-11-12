import React from 'react';
import DashboardTeacher from './DashboardTeacher';
import DashboardStudent from './DashboardStudent';
import PWAInstallButton from '../components/PWAInstallButton';

/**
 * Vista principal de Inicio (Dashboard) de HitSchool.
 * Renderiza el panel contextual según el rol del usuario (Profesor/Admin o Alumno/Padre)
 * e incorpora el botón flotante de instalación PWA en la esquina inferior derecha.
 */
export const Inicio: React.FC = () => {
  const userRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;

  return (
    <div className="relative min-h-screen">
      {userRole === 'TEACHER' || userRole === 'ADMIN' ? (
        <DashboardTeacher />
      ) : (
        <DashboardStudent />
      )}

      {/* Botón flotante PWA en la esquina inferior derecha */}
      <PWAInstallButton />
    </div>
  );
};

export default Inicio;
