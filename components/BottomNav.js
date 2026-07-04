'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { IconHome, IconWallet, IconSquareCheck, IconMenu2 } from '@tabler/icons-react';

const ITEMS = [
  { href: '/dashboard', label: 'Inicio', icon: IconHome },
  { href: '/dashboard/gastos', label: 'Gastos', icon: IconWallet },
  { href: '/dashboard/tareas', label: 'Tareas', icon: IconSquareCheck },
  { href: '/dashboard/settings', label: 'Más', icon: IconMenu2 },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-3.5 left-5 right-5 max-w-app mx-auto rounded-[26px] py-3 px-4 flex justify-between items-center shadow-nav"
      style={{
        background: '#1A1A1A',
        border: '1px solid #2A2A2A',
      }}
    >
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            prefetch
            className="flex flex-col items-center gap-1"
          >
            <Icon size={22} color={active ? '#C4E938' : '#71717A'} />
            <span className={`text-[11px] ${active ? 'font-bold' : ''}`}
                  style={{ color: active ? '#C4E938' : '#71717A' }}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
