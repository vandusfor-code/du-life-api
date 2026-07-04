'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { IconHome, IconClock, IconSparkles, IconSearch, IconLayoutGrid } from '@tabler/icons-react';

const ITEMS_IZQUIERDA = [
  { href: '/dashboard', label: 'Inicio', icon: IconHome },
  { href: '/dashboard/timeline', label: 'Timeline', icon: IconClock },
];

// "Buscar" y "Espacios" aún no tienen pantalla propia: placeholders visuales por ahora.
const ITEMS_DERECHA = [
  { label: 'Buscar', icon: IconSearch },
  { label: 'Espacios', icon: IconLayoutGrid },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-3.5 left-5 right-5 max-w-app mx-auto rounded-[26px] py-3 px-3 flex justify-between items-center shadow-nav"
      style={{ background: '#0A0A0A', border: '1px solid #2A2A2A' }}
    >
      {ITEMS_IZQUIERDA.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link key={href} href={href} prefetch className="flex-1 flex flex-col items-center gap-1">
            <Icon size={22} color={active ? '#C4E938' : '#71717A'} />
            <span
              className={`text-[11px] ${active ? 'font-bold' : ''}`}
              style={{ color: active ? '#C4E938' : '#71717A' }}
            >
              {label}
            </span>
          </Link>
        );
      })}

      {/* FAB central: menú de creación rápida aún no implementado */}
      <button
        type="button"
        aria-label="Crear"
        className="flex-shrink-0 flex items-center justify-center rounded-[16px]"
        style={{ width: '46px', height: '46px', background: '#C4E938' }}
      >
        <IconSparkles size={22} color="#0A0A0A" />
      </button>

      {ITEMS_DERECHA.map(({ label, icon: Icon }) => (
        <button
          key={label}
          type="button"
          aria-label={label}
          className="flex-1 flex flex-col items-center gap-1"
        >
          <Icon size={22} color="#71717A" />
          <span className="text-[11px]" style={{ color: '#71717A' }}>
            {label}
          </span>
        </button>
      ))}
    </nav>
  );
}
