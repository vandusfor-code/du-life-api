'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  IconHome, IconWallet, IconChartLine, IconLayoutGrid, IconSettings,
  IconClock, IconBulb, IconNote, IconSquareCheck, IconUsers,
} from '@tabler/icons-react';
import { MODULOS_FIJABLES } from '../BottomNav';

// Grupo principal: los módulos del mockup (Inicio, Árbol, Timeline, Personas,
// Ideas, Agenda). "Agenda" en el mockup es el módulo real de Calendario.
const GRUPO_PRINCIPAL = [
  { href: '/dashboard', label: 'Inicio', icon: IconHome },
  { href: MODULOS_FIJABLES.arbol.href, label: MODULOS_FIJABLES.arbol.label, icon: MODULOS_FIJABLES.arbol.icon },
  { href: MODULOS_FIJABLES.timeline.href, label: MODULOS_FIJABLES.timeline.label, icon: MODULOS_FIJABLES.timeline.icon },
  { href: MODULOS_FIJABLES.personas.href, label: MODULOS_FIJABLES.personas.label, icon: MODULOS_FIJABLES.personas.icon },
  { href: MODULOS_FIJABLES.ideas.href, label: MODULOS_FIJABLES.ideas.label, icon: MODULOS_FIJABLES.ideas.icon },
  { href: MODULOS_FIJABLES.calendario.href, label: 'Agenda', icon: MODULOS_FIJABLES.calendario.icon },
];

// Segundo grupo: el resto de rutas reales del dashboard, sin espacio en el
// mockup pero igual necesitan quedar accesibles en algún lugar del sidebar.
const GRUPO_MODULOS = [
  { href: '/dashboard/gastos', label: 'Gastos', icon: IconWallet },
  { href: '/dashboard/balance', label: 'Balance', icon: IconChartLine },
  { href: MODULOS_FIJABLES.notas.href, label: MODULOS_FIJABLES.notas.label, icon: IconNote },
  { href: MODULOS_FIJABLES.tareas.href, label: MODULOS_FIJABLES.tareas.label, icon: IconSquareCheck },
  { href: '/dashboard/espacios', label: 'Espacios', icon: IconLayoutGrid },
];

function ItemNav({ href, label, icon: Icon, activo }) {
  return (
    <Link
      href={href}
      prefetch
      className="flex items-center gap-3 px-3 py-2 rounded-xl text-[14px] font-medium transition-colors"
      style={{
        color: activo ? 'var(--nav-active-fg)' : 'var(--text-secondary)',
        background: activo ? 'var(--nav-active-bg)' : 'transparent',
      }}
    >
      <Icon size={18} color={activo ? 'var(--nav-active-fg)' : 'var(--text-secondary)'} />
      {label}
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [nombre, setNombre] = useState('');

  useEffect(() => {
    fetch('/api/dashboard/resumen')
      .then((r) => r.json())
      .then((d) => setNombre(d?.usuario?.como_llamar || d?.usuario?.nombre || ''))
      .catch(() => {});
  }, []);

  return (
    <aside
      className="flex flex-col justify-between flex-shrink-0 h-screen sticky top-0 px-3 py-6"
      style={{ width: '240px', borderRight: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}
    >
      <div className="flex flex-col gap-6">
        <div className="px-3">
          <div className="flex items-center">
            <span className="text-lg font-bold tracking-tight" style={{ color: 'var(--accent)' }}>Du</span>
            <span className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>&nbsp;Life</span>
          </div>
          {nombre && (
            <div className="text-[13px] mt-1" style={{ color: 'var(--text-secondary)' }}>
              Hola, {nombre} 👋
            </div>
          )}
        </div>

        <nav className="flex flex-col gap-1">
          {GRUPO_PRINCIPAL.map((item) => (
            <ItemNav key={item.href} {...item} activo={pathname === item.href} />
          ))}
        </nav>

        <div className="flex flex-col gap-1">
          <div className="px-3 text-[11px] font-bold uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
            Módulos
          </div>
          {GRUPO_MODULOS.map((item) => (
            <ItemNav key={item.href} {...item} activo={pathname === item.href} />
          ))}
        </div>
      </div>

      <ItemNav href="/dashboard/settings" label="Ajustes" icon={IconSettings} activo={pathname === '/dashboard/settings'} />
    </aside>
  );
}
