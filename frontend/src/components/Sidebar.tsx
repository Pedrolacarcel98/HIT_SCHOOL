import React from 'react';
import PWAInstallButton from './PWAInstallButton';

export interface SidebarProps {
  children?: React.ReactNode;
  showInstallButton?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Componente Sidebar modular para la plataforma HitSchool.
 * Incluye el botón oficial de instalación PWA ("Descargar App") en la sección inferior.
 */
export const Sidebar: React.FC<SidebarProps> = ({
  children,
  showInstallButton = false,
  className = '',
  style = {},
}) => {
  return (
    <aside className={`sidebar-nav-container ${className}`} style={style}>
      {children}
      {showInstallButton && (
        <div style={{ marginTop: 'auto', padding: '0.75rem 1rem' }}>
          <PWAInstallButton />
        </div>
      )}
    </aside>
  );
};

export { PWAInstallButton };
export default Sidebar;
