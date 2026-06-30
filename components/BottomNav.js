'use client';

import { usePathname, useRouter } from 'next/navigation';
import { IconHome, IconWallet, IconSquareCheck, IconMenu2 } from '@tabler/icons-react';

const ITEMS = [
  { href: '/dashboard', label: 'Inicio', icon: IconHome },
  { href: '/dashboard/gastos', label: 'Gastos', icon: IconWallet },
  { href: '/dashboard/tareas', label: 'Tareas', icon: IconSquareCheck },
  { href: '/dashboard/settings', label: 'Más', icon: IconMenu2 },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="fixed bottom-3.5 left-5 right-5 max-w-app mx-auto bg-white rounded-[26px] py-3 px-4 flex justify-between items-center shadow-nav">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <button
            key={href}
            onClick={() => router.push(href)}
            className="flex flex-col items-center gap-1"
          >
            <Icon size={22} color={active ? '#1A1D29' : '#9CA2B8'} />
            <span className={`text-[11px] ${active ? 'text-ink font-bold' : 'text-soft'}`}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}