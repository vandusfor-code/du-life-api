'use client';

import Link from 'next/link';
import {
  IconWallet, IconCalendarEvent, IconSquareCheck, IconBulb, IconNote,
  IconArrowUpRight, IconChevronRight, IconChartLine, IconTrendingUp,
  IconBellRinging, IconCalendar, IconDots,
} from '@tabler/icons-react';
import { useInicioData } from './useInicioData';
import { useTheme } from '../../components/ThemeProvider';
import { GraficoAreaLinea, GraficoBarras, formatCOP } from './InicioMobile';
import LogoComercio from '../../components/LogoComercio';

const ZONA_COLOMBIA = 'America/Bogota';
const MORADO = '#A855F7';

function capitalizar(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatHora12(horaStr) {
  if (!horaStr) return '';
  const [hStr, m] = horaStr.split(':');
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
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

function Tarjeta({ children, className = '', style = {} }) {
  return (
    <div
      className={`rounded-2xl p-5 border shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow duration-200 ${className}`}
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', ...style }}
    >
      {children}
    </div>
  );
}

function Chip({ icon: Icon, children }) {
  return (
    <div
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold border shadow-[var(--shadow-sm)]"
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
    >
      {Icon && <Icon size={13} color="var(--text-secondary)" />}
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
          Ver todo <IconChevronRight size={14} color="var(--text-secondary)" />
        </Link>
      )}
    </div>
  );
}

// Contenido central de "Inicio" en escritorio. La navegación (Sidebar), la
// barra superior (TopBar) y el panel derecho (AiPanel) los pone DesktopShell
// — este componente arma la columna central: saludo + chips de estado,
// balance con resplandor, tarjetas de módulos y timeline.
export default function InicioDesktop() {
  const { theme } = useTheme();
  const { data, ideas, notas, tareas, calendario, usuario, resumen, balanceData, loading } = useInicioData();

  // Acento reactivo al tema: esmeralda premium en escritorio-claro, el
  // mismo lima de siempre en oscuro. Valores hex literales (no var())
  // porque GraficoAreaLinea/GraficoBarras arman un id de gradiente SVG a
  // partir del string de color.
  const ACCENT = theme === 'light' ? '#027A48' : '#C4E938';
  const ACCENT_RGB = theme === 'light' ? '2, 122, 72' : '196, 233, 56';

  if (loading) {
    return (
      <div className="p-8 flex flex-col gap-6">
        <div className="h-8 w-64 rounded animate-pulse" style={{ background: 'var(--bg-card)' }} />
        <div className="rounded-3xl h-[200px] animate-pulse" style={{ background: 'var(--bg-card)' }} />
        <div className="grid grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
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
  const eventosHoy = calendario.filter((e) => e.fecha === hoyStrCO);
  const proximoEvento = [...eventosHoy].sort((a, b) => (a.hora_inicio || '').localeCompare(b.hora_inicio || ''))[0]
    || calendario.find((e) => e.fecha > hoyStrCO);

  const ultimoContenido = [...ideas, ...notas].sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en))[0];
  const proximaTarea = tareas[0];

  // Balance "estable" si la variación mensual es pequeña en cualquier
  // dirección — no inventa una categoría que el backend no calcule, solo
  // clasifica el mismo variacionBalance ya real en tres rangos.
  const estadoBalance = varBalance === null
    ? null
    : Math.abs(varBalance) < 5 ? 'estable' : varBalance > 0 ? 'en alza' : 'a la baja';

  const resumenTexto = [
    eventosHoy.length > 0 ? `Tienes ${eventosHoy.length} evento${eventosHoy.length === 1 ? '' : 's'} hoy` : null,
    varGastos !== null ? `gastaste un ${Math.abs(varGastos)}% ${varGastos <= 0 ? 'menos' : 'más'} que el mes anterior` : null,
  ].filter(Boolean).join(' y ');

  const actividadReciente = [
    ...gastos.map((g) => ({
      id: `gasto-${g.id}`,
      tipo: 'gasto',
      titulo: g.descripcion || 'Gasto',
      subtitulo: g.categoria || g.lugar || '',
      lugarTexto: g.lugar || g.descripcion || '',
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
    <div className="p-8 flex flex-col gap-6 w-full">
      <div>
        <h1 className="text-[28px] font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
          {saludo}, {nombre}
        </h1>
        {resumenTexto && (
          <p className="text-[13px] mt-1.5" style={{ color: 'var(--text-secondary)' }}>
            Todo está bajo control. {capitalizar(resumenTexto)}.
          </p>
        )}
      </div>

      {/* Chips de estado — todos derivados de datos reales ya calculados */}
      <div className="flex flex-wrap gap-2">
        {estadoBalance && <Chip icon={IconTrendingUp}>Balance {estadoBalance}</Chip>}
        <Chip icon={IconSquareCheck}>{resumenSeguro.tareas_pendientes} tareas pendientes</Chip>
        {resumenSeguro.recordatorios_hoy > 0 && (
          <Chip icon={IconBellRinging}>{resumenSeguro.recordatorios_hoy} recordatorios</Chip>
        )}
        <Chip icon={IconCalendar}>{fechaHoy}</Chip>
      </div>

      {/* Balance general — con resplandor sutil del acento del tema */}
      <Tarjeta
        style={{
          background: `radial-gradient(120% 140% at 85% 0%, rgba(${ACCENT_RGB}, 0.16) 0%, rgba(${ACCENT_RGB}, 0.04) 45%, var(--bg-card) 75%)`,
        }}
      >
        <div className="grid grid-cols-[minmax(0,220px)_1fr] gap-6 items-center">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>Balance general</span>
            </div>
            <div className="font-black tracking-tight leading-tight mt-1 text-[32px] md:text-[36px] antialiased" style={{ color: ACCENT }}>
              {formatCOP(balanceGeneral)}
            </div>
            {varBalance !== null && (
              <span
                className="inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-[12px] font-semibold mt-3"
                style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}
              >
                <IconArrowUpRight size={12} style={{ transform: varBalance <= 0 ? 'scaleY(-1)' : 'none' }} />
                {varBalance >= 0 ? '+' : ''}{varBalance}% v. mes anterior
              </span>
            )}
          </div>
          <GraficoAreaLinea valores={serieBalance} color={ACCENT} alto={140} conEje />
        </div>
      </Tarjeta>

      {/* Gastos + Agenda + Ideas/Notas + Tareas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Tarjeta>
          <div className="flex items-center justify-between">
            <div className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>Gastos del mes</div>
            <IconWallet size={16} color="var(--text-secondary)" />
          </div>
          <div className="text-[20px] font-black tracking-tight mt-1" style={{ color: 'var(--text-primary)' }}>
            {formatCOP(gastosMesReal)}
          </div>
          {varGastos !== null && (
            <span
              className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold mt-1.5"
              style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}
            >
              <IconArrowUpRight size={11} color={ACCENT} style={{ transform: varGastos <= 0 ? 'scaleY(-1)' : 'none' }} />
              {Math.abs(varGastos)}%
            </span>
          )}
          <div className="mt-3"><GraficoBarras valores={serieGastos} color={ACCENT} alto={40} /></div>
        </Tarjeta>

        <Tarjeta>
          <div className="flex items-center justify-between">
            <div className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>Agenda</div>
            <IconCalendarEvent size={16} color="var(--text-secondary)" />
          </div>
          <div className="text-[20px] font-black tracking-tight mt-1" style={{ color: 'var(--text-primary)' }}>
            {eventosProximos}
          </div>
          <div className="text-[11px] font-semibold mt-0.5" style={{ color: MORADO }}>eventos próximos</div>
          {proximoEvento && (
            <div
              className="flex items-center gap-2 mt-3 pl-2 py-1.5 text-[11px]"
              style={{ borderLeft: `2px solid ${MORADO}` }}
            >
              <div>
                {proximoEvento.hora_inicio && (
                  <div className="font-bold" style={{ color: 'var(--text-primary)' }}>{formatHora12(proximoEvento.hora_inicio)}</div>
                )}
                <div className="truncate" style={{ color: 'var(--text-secondary)' }}>{proximoEvento.titulo}</div>
              </div>
            </div>
          )}
        </Tarjeta>

        <Link href="/dashboard/ideas">
          <Tarjeta className="hover:opacity-90 transition-opacity">
            <div className="flex items-center justify-between">
              <div className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>Ideas y notas</div>
              <IconBulb size={16} color="var(--text-secondary)" />
            </div>
            <div className="text-[20px] font-black tracking-tight mt-1" style={{ color: 'var(--text-primary)' }}>
              {ideas.length + notas.length}
            </div>
            {ultimoContenido && (
              <div
                className="flex items-start gap-2 mt-3 p-2 rounded-xl text-[11px]"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
              >
                <span className="truncate" style={{ color: 'var(--text-primary)' }}>{ultimoContenido.titulo}</span>
              </div>
            )}
          </Tarjeta>
        </Link>

        <Link href="/dashboard/tareas">
          <Tarjeta className="hover:opacity-90 transition-opacity">
            <div className="flex items-center justify-between">
              <div className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>Tareas pendientes</div>
              <IconSquareCheck size={16} color="var(--text-secondary)" />
            </div>
            <div className="text-[20px] font-black tracking-tight mt-1" style={{ color: 'var(--text-primary)' }}>
              {resumenSeguro.tareas_pendientes}
            </div>
            {proximaTarea && (
              <div className="text-[11px] mt-1.5 truncate" style={{ color: 'var(--text-secondary)' }}>
                {proximaTarea.fecha_vencimiento ? formatVencimiento(proximaTarea.fecha_vencimiento, ZONA_COLOMBIA) : proximaTarea.titulo}
              </div>
            )}
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
          <Tarjeta className="!p-2">
            {actividadReciente.map((item, i) => {
              const Icon = TIPO_ICONO[item.tipo] || IconNote;
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-3 py-3"
                >
                  {item.tipo === 'gasto' ? (
                    <LogoComercio
                      texto={item.lugarTexto}
                      tamano={36}
                      radio="11px"
                      iconoFallback={<Icon size={16} strokeWidth={1.6} color="var(--text-primary)" />}
                    />
                  ) : (
                    <div
                      className="w-9 h-9 rounded-[11px] flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
                    >
                      <Icon size={16} strokeWidth={1.6} color="var(--text-primary)" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>{item.titulo}</div>
                    {item.subtitulo && (
                      <div className="text-[12px] truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>{item.subtitulo}</div>
                    )}
                  </div>
                  <div className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                    {timeAgo(item.fechaHora)}
                  </div>
                  <IconDots size={16} color="var(--text-muted)" className="flex-shrink-0" />
                </div>
              );
            })}
          </Tarjeta>
        )}
      </section>
    </div>
  );
}
