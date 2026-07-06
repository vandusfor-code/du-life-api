'use client';

import Link from 'next/link';
import { IconArrowLeft, IconBellRinging } from '@tabler/icons-react';

export default function RecordatoriosPage() {
  return (
    <div className="px-5 pt-4 pb-32 lg:max-w-4xl lg:mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link
          href="/dashboard/espacios"
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          <IconArrowLeft size={18} color="var(--text-primary)" />
        </Link>
        <div>
          <div className="text-[13px] text-muted">Próximamente</div>
          <div className="text-[19px] font-bold tracking-tight text-ink">Recordatorios</div>
        </div>
      </div>

      <div
        className="rounded-card p-8 mt-6 text-center"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
      >
        <div className="flex justify-center mb-3">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(248,113,113,0.15)' }}
          >
            <IconBellRinging size={26} color="#F87171" />
          </div>
        </div>
        <div className="text-[14px] font-bold text-ink mb-2">Esta pantalla aún no existe</div>
        <div className="text-[13px] text-muted leading-relaxed">
          Estamos trabajando en un espacio dedicado para tus recordatorios. Muy pronto podrás verlos aquí.
        </div>
      </div>

    </div>
  );
}
