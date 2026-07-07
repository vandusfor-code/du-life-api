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
  // El shell mide h-dvh (dynamic viewport height) en vez de fixed inset-0.
  // "fixed" depende de que el navegador calcule bien la altura real del
  // viewport visible, y en el navegador embebido de WhatsApp esa cuenta
  // salía mal (quedaba un hueco vacío debajo del nav, como si el shell
  // fuera más chico que la pantalla real). dvh SÍ refleja el viewport
  // visible de verdad en navegadores modernos, sin depender de cómo ese
  // navegador resuelve "fixed". Adentro hay un único scroll (el div de
  // contenido); BottomNav no usa position:fixed en sí mismo — es
  // simplemente el último hijo del flex-col, pegado abajo porque el shell
  // ya mide exactamente el alto real de la pantalla.
  if (!mounted || !isDesktop) {
    return (
      <div className="h-dvh flex flex-col max-w-app mx-auto overflow-x-hidden" style={{ background: 'var(--bg-primary)' }}>
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
