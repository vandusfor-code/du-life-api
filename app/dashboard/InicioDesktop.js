'use client';

import Link from 'next/link';
import {
  IconWallet, IconCalendarEvent, IconSquareCheck, IconBulb, IconNote,
  IconArrowUpRight, IconChevronRight, IconChartLine,
} from '@tabler/icons-react';
import { useInicioData } from './useInicioData';
import { GraficoAreaLinea, GraficoBarras, BadgeVariacion, formatCOP } from './InicioMobile';

const ZONA_COLOMBIA = 'America/Bogota';
const LIMA = '#C4E938';
const MORADO = '#A855F7';

function capitalizar(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatVencimiento(fechaStr, zonaHorario) {
  if (!fechaStr) return '';
  const hoyStr = new Date().toLocaleDateString('en-CA', { timeZone: zonaHorario });
  if (fechaStr === hoyStr) return 'Vence hoy';
  const manana = new Date();
  manana.setDate(manana.getDate() + 1);
  const mananaStr = manana.toLocaleDateString('en-CA', { timeZone: zonaHorario });
  if (fechaStr === mananaStr) return 'Vence mañana';
  const diffDias = Math.round(
    (new Date(`${fechaStr}T00:00:00`) - new Date(`${hoyStr}T00:00:00`)) / 86400000
  );
  if (diffDias < 0) return `Venció hace ${Math.abs(diffDias)}d`;
  return `Vence ${new Date(`${fechaStr}T00:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}`;
}

function timeAgo(fechaISO) {
  if (!fechaISO) return '';
  const diffMs = Date.now() - new Date(fechaISO).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `${mins} min`;
  const horas = Math.floor(mins / 60);
  if (horas < 24) return `${horas}h`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return 'ayer';
  if (dias < 7) return `${dias}d`;
  return new Date(fechaISO).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

const TIPO_ICONO = {
  gasto: IconWallet,
  idea: IconBulb,
  nota: IconNote,
  tarea: IconSquareCheck,
};

function Tarjeta({ children, className = '' }) {
  return (
    <div
      className={`rounded-3xl p-5 ${className}`}
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
    >
      {children}
    </div>
  );
}

function EncabezadoSeccion({ titulo, href }) {
  return (
    <div className="flex justify-between items-center mb-3">
      <span className="text-[12px] font-black uppercase" style={{ color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>
        {titulo}
      </span>
      {href && (
        <Link href={href} className="flex items-center gap-0.5 text-[12px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
          Ver más <IconChevronRight size={14} color="var(--text-secondary)" />
        </Link>
      )}
    </div>
  );
}

// Contenido central de "Inicio" en escritorio. La navegación (Sidebar), la
// barra superior (TopBar) y el panel derecho (AiPanel) los pone DesktopShell
// — este componente solo arma la columna central del mockup: Balance, Agenda,
// Finanzas y Timeline, con más información visible a la vez que en móvil.
export default function InicioDesktop() {
  const { data, ideas, notas, tareas, calendario, usuario, resumen, balanceData, loading } = useInicioData();

  if (loading) {
    return (
      <div className="p-8 flex flex-col gap-6">
        <div className="h-8 w-64 rounded animate-pulse" style={{ background: 'var(--bg-card)' }} />
        <div className="rounded-3xl h-[200px] animate-pulse" style={{ background: 'var(--bg-card)' }} />
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-3xl h-[150px] animate-pulse" style={{ background: 'var(--bg-card)' }} />
          ))}
        </div>
      </div>
    );
  }

  const gastos = data?.gastos || [];
  const resumenSeguro = resumen || {
    total_gastos: 0, total_ingresos: 0, balance: 0,
    tareas_pendientes: 0, recordatorios_hoy: 0, metas_activas: 0,
  };

  const horaColombia = parseInt(
    new Date().toLocaleString('en-US', { timeZone: ZONA_COLOMBIA, hour: 'numeric', hour12: false }),
    10
  );
  const saludo = horaColombia < 12 ? 'Buenos días' : horaColombia < 19 ? 'Buenas tardes' : 'Buenas noches';
  const fechaHoy = capitalizar(
    new Date().toLocaleDateString('es-CO', { timeZone: ZONA_COLOMBIA, weekday: 'long', day: 'numeric', month: 'long' })
  );
  const hoyStrCO = new Date().toLocaleDateString('en-CA', { timeZone: ZONA_COLOMBIA });

  const nombre = usuario?.como_llamar || usuario?.nombre || '';

  const balanceGeneral = balanceData?.balance ?? resumenSeguro.balance ?? 0;
  const serieBalance = (balanceData?.serieMensual || []).map((s) => Number(s.total) || 0);
  const varBalance = balanceData?.variacionBalance ?? null;
  const gastosMesReal = balanceData?.gastosMes ?? 0;
  const varGastos = balanceData?.variacionGastos ?? null;

  const serieGastos = Array.from({ length: 14 }).map((_, idx) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - idx));
    const clave = d.toLocaleDateString('en-CA', { timeZone: ZONA_COLOMBIA });
    return gastos.filter((g) => g.fecha === clave).reduce((s, g) => s + Number(g.monto), 0);
  });

  const barrasCalendario = Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date();
    d.setDate(d.getDate() + idx);
    const clave = d.toLocaleDateString('en-CA', { timeZone: ZONA_COLOMBIA });
    return calendario.filter((e) => e.fecha === clave).length;
  });
  const eventosProximos = calendario.filter((e) => e.fecha >= hoyStrCO).length;

  const actividadReciente = [
    ...gastos.map((g) => ({
      id: `gasto-${g.id}`,
      tipo: 'gasto',
      titulo: g.descripcion || 'Gasto',
      subtitulo: g.categoria || g.lugar || '',
      fechaHora: new Date(`${g.fecha}T${g.hora || '00:00:00'}`),
    })),
    ...ideas.map((i) => ({
      id: `idea-${i.id}`,
      tipo: 'idea',
      titulo: i.titulo || 'Idea',
      subtitulo: i.descripcion || '',
      fechaHora: new Date(i.creado_en),
    })),
    ...notas.map((n) => ({
      id: `nota-${n.id}`,
      tipo: 'nota',
      titulo: n.titulo || 'Nota',
      subtitulo: n.contenido || '',
      fechaHora: new Date(n.creado_en),
    })),
    ...tareas.map((t) => ({
      id: `tarea-${t.id}`,
      tipo: 'tarea',
      titulo: t.titulo,
      subtitulo: t.fecha_vencimiento ? formatVencimiento(t.fecha_vencimiento, ZONA_COLOMBIA) : '',
      fechaHora: new Date(t.creado_en),
    })),
  ]
    .sort((a, b) => b.fechaHora - a.fechaHora)
    .slice(0, 8);

  return (
    <div className="p-8 flex flex-col gap-7 max-w-5xl">
      <div>
        <h1 className="text-[26px] font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
          {saludo}, {nombre}
        </h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--text-secondary)' }}>{fechaHoy}</p>
      </div>

      {/* Balance general */}
      <Tarjeta>
        <div className="grid grid-cols-[minmax(0,220px)_1fr] gap-6 items-center">
          <div>
            <div className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>Balance general</div>
            <div className="font-black tracking-tight leading-tight mt-1 text-[32px]" style={{ color: LIMA }}>
              {formatCOP(balanceGeneral)}
            </div>
            <div className="mt-3"><BadgeVariacion pct={varBalance} /></div>
          </div>
          <GraficoAreaLinea valores={serieBalance} color={LIMA} alto={140} conEje />
        </div>
      </Tarjeta>

      {/* Agenda + Finanzas */}
      <div className="grid grid-cols-2 gap-4">
        <Tarjeta>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>Gastos del mes</div>
              <div className="text-[24px] font-black tracking-tight mt-1" style={{ color: 'var(--text-primary)' }}>
                {formatCOP(gastosMesReal)}
              </div>
              {varGastos !== null && (
                <div className="mt-1.5">
                  <span
                    className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ background: 'rgba(196,233,56,0.16)', color: LIMA }}
                  >
                    <IconArrowUpRight size={11} color={LIMA} style={{ transform: varGastos <= 0 ? 'scaleY(-1)' : 'none' }} />
                    {Math.abs(varGastos)}%
                  </span>
                </div>
              )}
            </div>
            <IconWallet size={20} color="var(--text-secondary)" />
          </div>
          <div className="mt-3"><GraficoAreaLinea valores={serieGastos} color={MORADO} alto={56} /></div>
        </Tarjeta>

        <Tarjeta>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>Agenda</div>
              <div className="text-[24px] font-black tracking-tight mt-1" style={{ color: 'var(--text-primary)' }}>
                {eventosProximos}
              </div>
              <div className="text-[11px] font-semibold mt-0.5" style={{ color: MORADO }}>eventos próximos</div>
            </div>
            <IconCalendarEvent size={20} color="var(--text-secondary)" />
          </div>
          <div className="mt-3"><GraficoBarras valores={barrasCalendario} color={MORADO} alto={56} /></div>
        </Tarjeta>
      </div>

      {/* Tareas + Ideas/Notas */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/dashboard/tareas">
          <Tarjeta className="flex items-center justify-between hover:opacity-90 transition-opacity">
            <div>
              <div className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>Tareas pendientes</div>
              <div className="text-[24px] font-black tracking-tight mt-1" style={{ color: 'var(--text-primary)' }}>
                {resumenSeguro.tareas_pendientes}
              </div>
            </div>
            <IconSquareCheck size={20} color="var(--text-secondary)" />
          </Tarjeta>
        </Link>

        <Link href="/dashboard/ideas">
          <Tarjeta className="flex items-center justify-between hover:opacity-90 transition-opacity">
            <div>
              <div className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>Ideas y notas</div>
              <div className="text-[24px] font-black tracking-tight mt-1" style={{ color: 'var(--text-primary)' }}>
                {ideas.length + notas.length}
              </div>
            </div>
            <IconBulb size={20} color="var(--text-secondary)" />
          </Tarjeta>
        </Link>
      </div>

      {/* Timeline */}
      <section>
        <EncabezadoSeccion titulo="Timeline" href="/dashboard/timeline" />
        {actividadReciente.length === 0 ? (
          <Tarjeta className="flex flex-col items-center text-center gap-1 py-10">
            <IconChartLine size={26} strokeWidth={1.5} color="var(--text-secondary)" />
            <div className="text-[13px] font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>Todo tranquilo por aquí</div>
            <div className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>Cuéntale algo a Du Life por WhatsApp y aparecerá acá.</div>
          </Tarjeta>
        ) : (
          <Tarjeta className="grid grid-cols-2 gap-x-8">
            {actividadReciente.map((item, i) => {
              const Icon = TIPO_ICONO[item.tipo] || IconNote;
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-3 py-3"
                  style={{ borderTop: i > 1 ? '1px solid var(--border-color)' : 'none' }}
                >
                  <div
                    className="w-9 h-9 rounded-[11px] flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
                  >
                    <Icon size={16} strokeWidth={1.6} color="var(--text-primary)" />
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="text-[14px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>{item.titulo}</div>
                    {item.subtitulo && (
                      <div className="text-[12px] truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>{item.subtitulo}</div>
                    )}
                  </div>
                  <div className="text-[11px] flex-shrink-0 pt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {timeAgo(item.fechaHora)}
                  </div>
                </div>
              );
            })}
          </Tarjeta>
        )}
      </section>
    </div>
  );
}
