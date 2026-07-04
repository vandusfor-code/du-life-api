'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { IconHome, IconWallet, IconChartLine, IconTree, IconLayoutGrid } from '@tabler/icons-react';

const ITEMS = [
  { href: '/dashboard', label: 'Inicio', icon: IconHome },
  { href: '/dashboard/gastos', label: 'Gastos', icon: IconWallet },
  { href: '/dashboard/balance', label: 'Balance', icon: IconChartLine },
  { href: '/dashboard/arbol', label: 'Árbol', icon: IconTree },
  { href: '/dashboard/espacios', label: 'Espacios', icon: IconLayoutGrid },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 flex justify-center"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div
        className="w-full max-w-app flex justify-between items-center px-2 py-2.5"
        style={{
          background: 'rgba(10,10,10,0.85)',
          borderTop: '1px solid #2A2A2A',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              prefetch
              className="flex-1 flex flex-col items-center gap-1 py-1"
              style={{ transition: 'all 0.15s ease' }}
            >
              <Icon size={22} color={active ? '#C4E938' : '#555555'} />
              <span
                className={`text-[11px] ${active ? 'font-bold' : ''}`}
                style={{ color: active ? '#C4E938' : '#555555' }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
