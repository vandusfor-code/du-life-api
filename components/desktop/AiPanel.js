'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { IconTrendingUp, IconChevronRight } from '@tabler/icons-react';

const ZONA_COLOMBIA = 'America/Bogota';
const LIMA_TEXTO = '#C4E938';

// Color por tipo de actividad — el mismo criterio que ya usan los íconos
// del Timeline, solo que acá se representa como punto de color (más
// compacto para una lista densa en el panel lateral).
const COLOR_TIPO = {
  gasto: '#C4E938',
  tarea: '#A855F7',
  nota: '#FBBF24',
  idea: '#60A5FA',
};

function timeAgo(fechaISO) {
  if (!fechaISO) return '';
  const diffMs = Date.now() - new Date(fechaISO).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `Hace ${mins} min`;
  const horas = Math.floor(mins / 60);
  if (horas < 24) return `Hace ${horas} hora${horas === 1 ? '' : 's'}`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return 'Ayer';
  return `Hace ${dias}d`;
}

function formatVencimiento(fechaStr) {
  const hoyStr = new Date().toLocaleDateString('en-CA', { timeZone: ZONA_COLOMBIA });
  if (fechaStr === hoyStr) return 'Hoy';
  const manana = new Date();
  manana.setDate(manana.getDate() + 1);
  if (fechaStr === manana.toLocaleDateString('en-CA', { timeZone: ZONA_COLOMBIA })) return 'Mañana';
  return new Date(`${fechaStr}T00:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

// Panel derecho "Du IA" del mockup de escritorio. Importante: hoy no existe
// ningún endpoint de insights de IA en el backend — este panel NO simula un
// asistente ni inventa sugerencias. Todo lo que muestra es una lectura
// directa de datos ya calculados por /api/dashboard/{resumen,balance,tareas,
// notas,ideas,gastos,calendario}, con un texto de template (no generado por
// IA). Si más adelante se agrega un asistente real, este es el lugar donde
// conectarlo.
export default function AiPanel() {
  const [variacionGastos, setVariacionGastos] = useState(null);
  const [actividad, setActividad] = useState([]);
  const [tareas, setTareas] = useState([]);
  const [eventos, setEventos] = useState([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/dashboard/balance').then((r) => r.json()),
      fetch('/api/dashboard/tareas').then((r) => r.json()),
      fetch('/api/dashboard/calendario').then((r) => r.json()),
      fetch('/api/dashboard/gastos').then((r) => r.json()),
      fetch('/api/dashboard/ideas').then((r) => r.json()),
      fetch('/api/dashboard/notas').then((r) => r.json()),
    ])
      .then(([balData, tareasData, calData, gastosData, ideasData, notasData]) => {
        setVariacionGastos(balData?.variacionGastos ?? null);

        const hoyStr = new Date().toLocaleDateString('en-CA', { timeZone: ZONA_COLOMBIA });
        setTareas((tareasData?.tareas || []).slice(0, 4));
        setEventos((calData?.eventos || []).filter((e) => e.fecha >= hoyStr).slice(0, 4));

        const lista = [
          ...(gastosData?.gastos || []).map((g) => ({ id: `g-${g.id}`, tipo: 'gasto', titulo: g.descripcion || 'Gasto', fecha: new Date(`${g.fecha}T${g.hora || '00:00:00'}`) })),
          ...(tareasData?.tareas || []).map((t) => ({ id: `t-${t.id}`, tipo: 'tarea', titulo: t.titulo, fecha: new Date(t.creado_en) })),
          ...(notasData?.notas || []).map((n) => ({ id: `n-${n.id}`, tipo: 'nota', titulo: n.titulo || 'Nota', fecha: new Date(n.creado_en) })),
          ...(ideasData?.ideas || []).map((i) => ({ id: `i-${i.id}`, tipo: 'idea', titulo: i.titulo || 'Idea', fecha: new Date(i.creado_en) })),
        ].sort((a, b) => b.fecha - a.fecha).slice(0, 4);
        setActividad(lista);
      })
      .catch(() => {});
  }, []);

  const insight = variacionGastos === null
    ? null
    : variacionGastos >= 0
      ? `Este mes gastaste ${variacionGastos}% más que el mes anterior.`
      : `Este mes gastaste ${Math.abs(variacionGastos)}% menos que el mes anterior.`;

  return (
    <aside
      className="flex flex-col gap-6 flex-shrink-0 h-screen sticky top-0 overflow-y-auto px-5 py-6"
      style={{ width: '300px', borderLeft: '1px solid var(--border-color)' }}
    >
      <div>
        <div className="flex items-center gap-1.5 mb-3">
          <IconTrendingUp size={16} color="var(--accent)" />
          <span className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>Insight del mes</span>
        </div>
        <div
          className="rounded-2xl p-4 text-[13px] leading-snug"
          style={{
            background: 'radial-gradient(120% 140% at 100% 0%, rgba(196,233,56,0.14) 0%, var(--bg-card) 60%)',
            border: '1px solid var(--border-color)', color: 'var(--text-primary)', boxShadow: 'var(--card-shadow)',
          }}
        >
          {insight ? (
            <>
              {insight.split(/(\d+% (?:más|menos))/).map((parte, i) =>
                /\d+%/.test(parte)
                  ? <span key={i} className="font-black text-[16px]" style={{ color: LIMA_TEXTO }}>{parte}</span>
                  : <span key={i}>{parte}</span>
              )}
            </>
          ) : 'Aún no hay suficientes datos este mes para comparar.'}
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-[12px] font-black uppercase" style={{ color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>
            Actividad reciente
          </span>
        </div>
        <div className="flex flex-col gap-2.5 mb-2">
          {actividad.length === 0 && (
            <div className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>Sin actividad reciente todavía.</div>
          )}
          {actividad.map((a) => (
            <div key={a.id} className="flex items-center gap-2.5 text-[12px]">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLOR_TIPO[a.tipo] }} />
              <span className="flex-1 truncate font-medium" style={{ color: 'var(--text-primary)' }}>{a.titulo}</span>
              <span className="flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{timeAgo(a.fecha)}</span>
            </div>
          ))}
        </div>
        <Link
          href="/dashboard/timeline"
          className="flex items-center justify-center gap-1 w-full py-2 rounded-xl text-[12px] font-semibold"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
        >
          Ver toda la actividad <IconChevronRight size={13} />
        </Link>
      </div>

      <div>
        <div className="text-[12px] font-black uppercase mb-2" style={{ color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>
          Pendientes
        </div>
        <div className="flex flex-col gap-2 mb-2">
          {tareas.length === 0 && eventos.length === 0 && (
            <div className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>Sin tareas ni eventos próximos.</div>
          )}
          {tareas.map((t) => (
            <div
              key={`t-${t.id}`}
              className="flex items-center gap-2 rounded-xl p-2.5 text-[12px]"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow)' }}
            >
              <span className="w-1.5 h-6 rounded-full flex-shrink-0" style={{ background: '#A855F7' }} />
              <span className="flex-1 truncate font-medium" style={{ color: 'var(--text-primary)' }}>{t.titulo}</span>
              {t.fecha_vencimiento && (
                <span className="flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{formatVencimiento(t.fecha_vencimiento)}</span>
              )}
            </div>
          ))}
          {eventos.map((e) => (
            <div
              key={`e-${e.id}`}
              className="flex items-center gap-2 rounded-xl p-2.5 text-[12px]"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow)' }}
            >
              <span className="w-1.5 h-6 rounded-full flex-shrink-0" style={{ background: '#C4E938' }} />
              <span className="flex-1 truncate font-medium" style={{ color: 'var(--text-primary)' }}>{e.titulo}</span>
              <span className="flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{formatVencimiento(e.fecha)}</span>
            </div>
          ))}
        </div>
        <Link
          href="/dashboard/tareas"
          className="flex items-center justify-center gap-1 w-full py-2 rounded-xl text-[12px] font-semibold"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
        >
          Ver todas las pendientes <IconChevronRight size={13} />
        </Link>
      </div>
    </aside>
  );
}
