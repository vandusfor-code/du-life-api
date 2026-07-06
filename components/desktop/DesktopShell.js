'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import AiPanel from './AiPanel';

// Shell de escritorio: sidebar fija + topbar + contenido central + panel
// derecho opcional. El panel derecho ("Du IA" del mockup) solo tiene sentido
// en la pantalla de Inicio — en el resto de páginas el contenido ya usa el
// ancho completo del panel central.
export default function DesktopShell({ children }) {
  const pathname = usePathname();
  const mostrarPanel = pathname === '/dashboard';

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
      {mostrarPanel && <AiPanel />}
    </div>
  );
}
