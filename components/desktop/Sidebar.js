'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  IconHome, IconWallet, IconChartLine, IconLayoutGrid, IconSettings,
  IconClock, IconBulb, IconNote, IconSquareCheck, IconUsers, IconSparkles,
  IconChevronRight, IconShieldLock, IconBriefcase,
} from '@tabler/icons-react';
import { MODULOS_FIJABLES } from '../BottomNav';
import Avatar from '../Avatar';
import ProfileMenu from './ProfileMenu';

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
      className="flex items-center gap-3 pl-2.5 pr-3 py-2 rounded-xl text-[14px] font-medium transition-colors"
      style={{
        color: activo ? 'var(--nav-active-fg)' : 'var(--text-secondary)',
        background: activo ? 'var(--nav-active-bg)' : 'transparent',
        borderLeft: `2px solid ${activo ? 'var(--nav-active-border)' : 'transparent'}`,
      }}
    >
      <Icon size={18} color={activo ? 'var(--nav-active-fg)' : 'var(--text-secondary)'} />
      {label}
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [usuario, setUsuario] = useState(null);
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => {
    fetch('/api/dashboard/resumen')
      .then((r) => r.json())
      .then((d) => setUsuario(d?.usuario || null))
      .catch(() => {});
  }, []);

  const nombre = usuario?.como_llamar || usuario?.nombre || '';
  const rol = usuario?.metadata?.rol;
  const esAdmin = rol === 'owner' || rol === 'admin';
  const modoNegocio = !!usuario?.modo_negocio;

  return (
    <aside
      className="flex flex-col justify-between flex-shrink-0 h-screen sticky top-0 px-3 py-6"
      style={{ width: '240px', borderRight: '1px solid var(--border-color)', background: 'var(--sidebar-bg)' }}
    >
      <div className="flex flex-col gap-6">
        <div className="flex items-center px-3">
          <span className="text-lg font-bold tracking-tight" style={{ color: 'var(--accent)' }}>Du</span>
          <span className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>&nbsp;Life</span>
          <IconSparkles size={14} color="var(--accent)" style={{ marginLeft: '2px', marginTop: '-10px' }} />
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
          {modoNegocio && (
            <ItemNav
              href="/dashboard/negocio"
              label="Negocio"
              icon={IconBriefcase}
              activo={pathname.startsWith('/dashboard/negocio')}
            />
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        {esAdmin && (
          <ItemNav
            href="/dashboard/control-center"
            label="Control Center"
            icon={IconShieldLock}
            activo={pathname.startsWith('/dashboard/control-center')}
          />
        )}
        <ItemNav href="/dashboard/settings" label="Ajustes" icon={IconSettings} activo={pathname === '/dashboard/settings'} />

        <div className="relative mt-2">
          <button
            type="button"
            onClick={() => setMenuAbierto((v) => !v)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
          >
            <Avatar name={nombre} size="md" fotoUrl={usuario?.foto_url || null} />
            <div className="flex-1 min-w-0 text-left">
              <div className="text-[13px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>{nombre || '...'}</div>
              <div className="text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>
                Plan {usuario?.plan || 'Free'} {usuario?.plan && usuario.plan !== 'free' ? '👑' : ''}
              </div>
            </div>
            <IconChevronRight size={14} color="var(--text-secondary)" />
          </button>
          <ProfileMenu
            open={menuAbierto}
            onClose={() => setMenuAbierto(false)}
            nombre={nombre}
            telefono={usuario?.telefono}
            plan={usuario?.plan}
            fotoUrl={usuario?.foto_url || null}
            tratamiento={usuario?.tratamiento}
            modoNegocio={usuario?.modo_negocio}
            nombreNegocio={usuario?.nombre_negocio}
            onNombreActualizado={(nuevo) => setUsuario((u) => ({ ...u, como_llamar: nuevo }))}
            onTratamientoActualizado={(nuevo) => setUsuario((u) => ({ ...u, tratamiento: nuevo }))}
            onModoNegocioActivado={(v) => setUsuario((u) => ({ ...u, modo_negocio: v }))}
            onNombreNegocioActualizado={(v) => setUsuario((u) => ({ ...u, nombre_negocio: v }))}
          />
        </div>
      </div>
    </aside>
  );
}
