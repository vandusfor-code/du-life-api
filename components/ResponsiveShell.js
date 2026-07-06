'use client';

import { useIsDesktop } from '../hooks/useIsDesktop';
import BottomNav from './BottomNav';
import EnableNotifications from './EnableNotifications';
import DesktopShell from './desktop/DesktopShell';

// Decide qué "chrome" mostrar (BottomNav móvil vs Sidebar+TopBar de
// escritorio) según el ancho de pantalla. Vive como hijo cliente de
// app/dashboard/layout.js, que sigue siendo Server Component y mantiene el
// guard de auth intacto — acá solo se decide la UI, no la autenticación.
export default function ResponsiveShell({ children }) {
  const { isDesktop, mounted } = useIsDesktop();

  // Antes de montar (o en móvil) se renderiza exactamente lo mismo que había
  // en layout.js antes de este cambio — cero regresión visual en móvil.
  if (!mounted || !isDesktop) {
    return (
      <div className="min-h-screen flex flex-col max-w-app mx-auto" style={{ background: 'var(--bg-primary)' }}>
        <EnableNotifications />
        <div className="flex-1 overflow-y-auto pb-[calc(64px+env(safe-area-inset-bottom))]">
          {children}
        </div>
        <BottomNav />
      </div>
    );
  }

  return <DesktopShell>{children}</DesktopShell>;
}
