'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  IconLayoutDashboard, IconSitemap, IconUsers, IconMessageCircle,
  IconSparkles, IconBrain, IconDatabase, IconServer2, IconFileText,
  IconClock, IconChartBar, IconApps, IconMap, IconHistory, IconSettings,
  IconArrowLeft, IconShieldLock,
} from '@tabler/icons-react';
import { useIsDesktop } from '../../hooks/useIsDesktop';

const MODULOS = [
  { href: '/dashboard/control-center', label: 'Dashboard', icon: IconLayoutDashboard },
  { href: '/dashboard/control-center/arquitectura', label: 'Arquitectura Viva', icon: IconSitemap },
  { href: '/dashboard/control-center/usuarios', label: 'Usuarios', icon: IconUsers },
  { href: '/dashboard/control-center/conversaciones', label: 'Conversaciones', icon: IconMessageCircle },
  { href: '/dashboard/control-center/ia', label: 'IA', icon: IconSparkles },
  { href: '/dashboard/control-center/memoria', label: 'Memoria', icon: IconBrain },
  { href: '/dashboard/control-center/base-de-datos', label: 'Base de datos', icon: IconDatabase },
  { href: '/dashboard/control-center/apis', label: 'APIs', icon: IconServer2 },
  { href: '/dashboard/control-center/logs', label: 'Logs', icon: IconFileText },
  { href: '/dashboard/control-center/cron-jobs', label: 'Cron Jobs', icon: IconClock },
  { href: '/dashboard/control-center/analytics', label: 'Analytics', icon: IconChartBar },
  { href: '/dashboard/control-center/modulos', label: 'Módulos', icon: IconApps },
  { href: '/dashboard/control-center/roadmap', label: 'Roadmap', icon: IconMap },
  { href: '/dashboard/control-center/changelog', label: 'Changelog', icon: IconHistory },
  { href: '/dashboard/control-center/configuracion', label: 'Configuración', icon: IconSettings },
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

export default function AdminShell({ children, rol }) {
  const pathname = usePathname();
  const { isDesktop, mounted } = useIsDesktop();

  if (!mounted) return null;

  if (!isDesktop) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <IconShieldLock size={32} color="var(--text-secondary)" />
        <div className="text-[15px] font-bold mt-4" style={{ color: 'var(--text-primary)' }}>
          Control Center disponible solo en escritorio
        </div>
        <div className="text-[13px] mt-1" style={{ color: 'var(--text-secondary)' }}>
          Abrí esta sección desde una pantalla más ancha (≥1024px).
        </div>
        <Link
          href="/dashboard"
          className="mt-5 px-4 py-2 rounded-full text-[13px] font-bold"
          style={{ background: 'var(--accent)', color: 'var(--accent-text)' }}
        >
          Volver al dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside
        className="flex flex-col justify-between flex-shrink-0 h-screen sticky top-0 px-3 py-6"
        style={{ width: '250px', borderRight: '1px solid var(--border-color)', background: 'var(--sidebar-bg)' }}
      >
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2 px-3">
            <IconShieldLock size={18} color="var(--accent)" />
            <span className="text-[15px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Control Center
            </span>
          </div>

          <nav className="flex flex-col gap-1">
            {MODULOS.map((item) => (
              <ItemNav key={item.href} {...item} activo={pathname === item.href} />
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-2">
          <div className="px-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Rol: <span style={{ color: 'var(--accent)' }}>{rol}</span>
          </div>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-medium"
            style={{ color: 'var(--text-secondary)' }}
          >
            <IconArrowLeft size={16} color="var(--text-secondary)" />
            Volver a Du Life
          </Link>
        </div>
      </aside>

      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
