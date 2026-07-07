'use client';

import { usePathname } from 'next/navigation';
import { useIsDesktop } from '../hooks/useIsDesktop';
import BottomNav from './BottomNav';
import EnableNotifications from './EnableNotifications';
import DesktopShell from './desktop/DesktopShell';

// Decide qué "chrome" mostrar (BottomNav móvil vs Sidebar+TopBar de
// escritorio) según el ancho de pantalla. Vive como hijo cliente de
// app/dashboard/layout.js, que sigue siendo Server Component y mantiene el
// guard de auth intacto — acá solo se decide la UI, no la autenticación.
export default function ResponsiveShell({ children }) {
  const pathname = usePathname();
  const { isDesktop, mounted } = useIsDesktop();

  // Control Center tiene su propio shell completo (ver
  // app/dashboard/control-center/layout.js + AdminShell) — al ser un
  // layout anidado DENTRO de app/dashboard, este componente padre lo
  // envolvería con el Sidebar/TopBar normales si no se lo salta acá.
  if (pathname.startsWith('/dashboard/control-center')) {
    return children;
  }

  // Antes de montar (o en móvil) se renderiza exactamente lo mismo que había
  // en layout.js antes de este cambio — cero regresión visual en móvil.
  //
  // Importante: el scroll es de la PÁGINA completa (sin div interno con
  // overflow-y-auto). Un contenedor interno con su propio scroll, combinado
  // con BottomNav en position:fixed, rompe el fixed dentro del navegador
  // embebido de WhatsApp (y otros in-app browsers) — la barra terminaba
  // desplazándose con el contenido en vez de quedarse pegada abajo. Con un
  // solo contexto de scroll (el documento) el fixed se comporta bien.
  if (!mounted || !isDesktop) {
    return (
      <div className="min-h-screen flex flex-col max-w-app mx-auto" style={{ background: 'var(--bg-primary)' }}>
        <EnableNotifications />
        <div className="pb-[calc(64px+env(safe-area-inset-bottom))]">
          {children}
        </div>
        <BottomNav />
      </div>
    );
  }

  return <DesktopShell>{children}</DesktopShell>;
}
