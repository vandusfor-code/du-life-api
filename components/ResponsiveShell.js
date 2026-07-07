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
  // El shell entero es el elemento fijo (fixed inset-0), UNA sola vez, y
  // adentro hay un único scroll (el div de contenido). BottomNav ya NO usa
  // position:fixed en sí mismo — es simplemente el último hijo del
  // flex-col, así que queda pegado abajo porque el shell ya está pegado a
  // los bordes del viewport. Esto evita depender de que "position: fixed"
  // en un elemento suelto funcione bien: en el navegador embebido de
  // WhatsApp (y otros in-app browsers) eso se rompe y la barra terminaba
  // desplazándose con el contenido en vez de quedarse pegada abajo.
  if (!mounted || !isDesktop) {
    return (
      <div className="fixed inset-0 flex flex-col max-w-app mx-auto overflow-x-hidden" style={{ background: 'var(--bg-primary)' }}>
        <EnableNotifications />
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          {children}
        </div>
        <BottomNav />
      </div>
    );
  }

  return <DesktopShell>{children}</DesktopShell>;
}
