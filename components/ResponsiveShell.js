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
  // Vuelto a la estructura original (BottomNav en position:fixed) por
  // pedido explícito del usuario: los intentos de "arreglar" el fixed en
  // el navegador embebido de WhatsApp rompieron otras cosas (header
  // pegado arriba, el nav moviéndose con el scroll). Se prioriza que se
  // vea bien visualmente, aunque en ese navegador en particular pueda
  // verse contenido asomando por debajo del nav en algún momento.
  // overflow-x-hidden sí se mantiene (arregla el arrastre horizontal).
  if (!mounted || !isDesktop) {
    return (
      <div className="min-h-screen flex flex-col max-w-app mx-auto overflow-x-hidden" style={{ background: 'var(--bg-primary)' }}>
        <EnableNotifications />
        <div className="flex-1 overflow-y-auto overflow-x-hidden pb-[calc(64px+env(safe-area-inset-bottom))]">
          {children}
        </div>
        <BottomNav />
      </div>
    );
  }

  return <DesktopShell>{children}</DesktopShell>;
}
