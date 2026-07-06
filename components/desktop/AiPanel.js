'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { IconSquareCheck, IconCalendarEvent } from '@tabler/icons-react';

const ZONA_COLOMBIA = 'America/Bogota';

function formatVencimiento(fechaStr) {
  const hoyStr = new Date().toLocaleDateString('en-CA', { timeZone: ZONA_COLOMBIA });
  if (fechaStr === hoyStr) return 'Vence hoy';
  const manana = new Date();
  manana.setDate(manana.getDate() + 1);
  if (fechaStr === manana.toLocaleDateString('en-CA', { timeZone: ZONA_COLOMBIA })) return 'Vence mañana';
  return new Date(`${fechaStr}T00:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

// Panel derecho "Du IA" del mockup de escritorio. Importante: hoy no existe
// ningún endpoint de insights de IA en el backend — este panel NO simula un
// asistente ni inventa sugerencias. Todo lo que muestra es una lectura
// directa de datos ya calculados por /api/dashboard/{resumen,balance,tareas,
// calendario}, con un texto de template (no generado por IA). Si más
// adelante se agrega un asistente real, este es el lugar donde conectarlo.
export default function AiPanel() {
  const [resumen, setResumen] = useState(null);
  const [variacionGastos, setVariacionGastos] = useState(null);
  const [tareas, setTareas] = useState([]);
  const [eventos, setEventos] = useState([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/dashboard/resumen').then((r) => r.json()),
      fetch('/api/dashboard/balance').then((r) => r.json()),
      fetch('/api/dashboard/tareas').then((r) => r.json()),
      fetch('/api/dashboard/calendario').then((r) => r.json()),
    ])
      .then(([resumenData, balData, tareasData, calData]) => {
        setResumen(resumenData?.resumen || null);
        setVariacionGastos(balData?.variacionGastos ?? null);
        setTareas((tareasData?.tareas || []).slice(0, 4));
        setEventos((calData?.eventos || []).slice(0, 4));
      })
      .catch(() => {});
  }, []);

  const insight = variacionGastos === null
    ? null
    : variacionGastos >= 0
      ? `Llevas ${variacionGastos}% más en gastos que el mes anterior.`
      : `Llevas ${Math.abs(variacionGastos)}% menos en gastos que el mes anterior.`;

  return (
    <aside
      className="flex flex-col gap-6 flex-shrink-0 h-screen sticky top-0 overflow-y-auto px-5 py-6"
      style={{ width: '280px', borderLeft: '1px solid var(--border-color)' }}
    >
      <div>
        <div className="text-[12px] font-black uppercase mb-2" style={{ color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>
          Insight
        </div>
        <div
          className="rounded-2xl p-4 text-[13px] leading-snug"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
        >
          {insight || 'Aún no hay suficientes datos este mes para comparar.'}
        </div>
      </div>

      <div>
        <div className="text-[12px] font-black uppercase mb-2" style={{ color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>
          Pendientes
        </div>
        <div className="flex flex-col gap-2">
          {tareas.length === 0 && eventos.length === 0 && (
            <div className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>Sin tareas ni eventos próximos.</div>
          )}
          {tareas.map((t) => (
            <Link
              key={`t-${t.id}`}
              href="/dashboard/tareas"
              className="flex items-center gap-2 rounded-xl p-2.5 text-[12px]"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
            >
              <IconSquareCheck size={14} color="var(--text-secondary)" />
              <span className="flex-1 truncate font-medium" style={{ color: 'var(--text-primary)' }}>{t.titulo}</span>
              {t.fecha_vencimiento && (
                <span className="flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{formatVencimiento(t.fecha_vencimiento)}</span>
              )}
            </Link>
          ))}
          {eventos.map((e) => (
            <Link
              key={`e-${e.id}`}
              href="/dashboard/espacios/calendario"
              className="flex items-center gap-2 rounded-xl p-2.5 text-[12px]"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
            >
              <IconCalendarEvent size={14} color="var(--text-secondary)" />
              <span className="flex-1 truncate font-medium" style={{ color: 'var(--text-primary)' }}>{e.titulo}</span>
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
