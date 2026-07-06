'use client';

import { IconClockHour4 } from '@tabler/icons-react';

// Placeholder compartido por los módulos del Control Center que todavía no
// tienen lógica (Fase 2+). Mismo diseño que se usa en toda la app para
// "esta pantalla aún no existe" (ver app/dashboard/recordatorios/page.js).
export default function ModuloProximamente({ nombre }) {
  return (
    <div className="p-8">
      <div
        className="rounded-2xl p-10 text-center max-w-md mx-auto mt-16"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
      >
        <div className="flex justify-center mb-3">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(196,233,56,0.15)' }}
          >
            <IconClockHour4 size={26} color="var(--accent)" />
          </div>
        </div>
        <div className="text-[15px] font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          {nombre} — próximamente
        </div>
        <div className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Este módulo del Control Center todavía no está implementado. Llega
          en una fase futura.
        </div>
      </div>
    </div>
  );
}
