'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  IconBell, IconSparkles, IconSquareCheck, IconWallet,
  IconNote, IconBulb, IconSun, IconMoon, IconCloud, IconArrowUpRight,
  IconChevronRight, IconCalendarEvent,
} from '@tabler/icons-react';
import Avatar from '../../components/Avatar';
import ProfileSheet from '../../components/ProfileSheet';
import { useInicioData } from './useInicioData';

const ZONA_COLOMBIA = 'America/Bogota';

const LIMA = '#C4E938';
const MORADO = '#A855F7';

// Banners fotográficos del carousel: una foto real por módulo (con overlay
// negro-a-transparente) en vez de ilustraciones planas. Si la foto no carga
// (sin red, CDN caído), el banner cae a un fondo sólido en vez de romperse.
const MODULOS_BANNER = [
  {
    slug: 'tareas',
    href: '/dashboard/tareas',
    titulo: 'Tareas',
    cta: 'Ver más',
    foto: 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=800&q=80&auto=format&fit=crop',
  },
  {
    slug: 'gastos',
    href: '/dashboard/gastos',
    titulo: 'Gastos',
    cta: 'Ver más',
    foto: 'https://images.unsplash.com/photo-1580519542036-c47de6196ba5?w=800&q=80&auto=format&fit=crop',
  },
  {
    slug: 'espacios',
    href: '/dashboard/espacios',
    titulo: 'Espacios',
    cta: 'Gestionar',
    foto: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800&q=80&auto=format&fit=crop',
  },
];

export const formatCOP = (n) => '$' + Math.round(n).toLocaleString('es-CO');
const formatEjeCorto = (n) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (abs >= 1_000) return Math.round(n / 1_000) + 'k';
  return '' + Math.round(n);
};

// Techo "redondo" para el eje (1, 2, 5 x potencia de 10) — para que las guías
// caigan en cifras limpias como 1.0M, 2.0M, etc.
function techoRedondo(v) {
  if (v <= 0) return 1;
  const pot = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pot;
  const mult = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return mult * pot;
}

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

// Vence-en-texto-relativo: nunca se muestra la fecha ISO cruda.
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

// Iconos de Actividad reciente: mismo trazo monocromático para todos.
const TIPO_ICONO = {
  gasto: IconWallet,
  idea: IconBulb,
  nota: IconNote,
  tarea: IconSquareCheck,
};

// Mide el ancho real del contenedor para dibujar los gráficos SVG a escala
// de píxel (sin distorsión por preserveAspectRatio). Se recalcula si cambia.
function useAncho() {
  const ref = useRef(null);
  const [ancho, setAncho] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver((entries) => setAncho(entries[0].contentRect.width));
    ro.observe(el);
    setAncho(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  return [ref, ancho];
}

function useCarruselAuto(cantidad, intervaloMs = 4000) {
  const contenedorRef = useRef(null);
  const [indiceActivo, setIndiceActivo] = useState(0);

  useEffect(() => {
    const el = contenedorRef.current;
    if (!el) return undefined;

    const intervalo = setInterval(() => {
      const anchoTarjeta = el.clientWidth;
      if (!anchoTarjeta) return;
      const indiceActual = Math.round(el.scrollLeft / anchoTarjeta);
      const siguiente = (indiceActual + 1) % cantidad;
      el.scrollTo({ left: siguiente * anchoTarjeta, behavior: 'smooth' });
    }, intervaloMs);

    return () => clearInterval(intervalo);
  }, [cantidad, intervaloMs]);

  const onScroll = useCallback(() => {
    const el = contenedorRef.current;
    if (!el) return;
    const anchoTarjeta = el.clientWidth;
    if (!anchoTarjeta) return;
    setIndiceActivo(Math.round(el.scrollLeft / anchoTarjeta));
  }, []);

  return { contenedorRef, indiceActivo, onScroll };
}

// Gráfico de línea + área (SVG a mano, sin librerías). Con eje Y opcional
// (guías punteadas + etiquetas a la derecha) para la tarjeta de balance.
export function GraficoAreaLinea({ valores, color, alto = 120, conEje = false }) {
  const [ref, ancho] = useAncho();
  const gid = `grad-${color.replace('#', '')}-${conEje ? 'eje' : 'mini'}`;

  const vals = valores && valores.length ? valores : [0, 0];
  const padTop = 12;
  const padBottom = conEje ? 18 : 8;
  const padRight = conEje ? 40 : 4;
  const padLeft = 4;
  const innerH = alto - padTop - padBottom;
  const innerW = Math.max(0, ancho - padLeft - padRight);

  const dataMax = Math.max(...vals);
  const dataMin = Math.min(0, ...vals);
  const topEje = conEje ? techoRedondo(dataMax) : dataMax || 1;
  const maxV = conEje ? topEje : dataMax || 1;
  const minV = conEje ? (dataMin < 0 ? -techoRedondo(-dataMin) : 0) : dataMin;
  const rango = maxV - minV || 1;

  const xAt = (i) => padLeft + (vals.length === 1 ? innerW / 2 : (i / (vals.length - 1)) * innerW);
  const yAt = (v) => padTop + innerH - ((v - minV) / rango) * innerH;

  const puntos = vals.map((v, i) => `${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`);
  const lineaPath = 'M' + puntos.join(' L');
  const areaPath = `M${xAt(0).toFixed(1)},${(padTop + innerH).toFixed(1)} L${puntos.join(' L')} L${xAt(vals.length - 1).toFixed(1)},${(padTop + innerH).toFixed(1)} Z`;

  const nTicks = 4;
  const ticks = Array.from({ length: nTicks + 1 }).map((_, k) => minV + (rango * k) / nTicks);

  return (
    <div ref={ref} style={{ width: '100%', height: alto }}>
      {ancho > 0 && (
        <svg width={ancho} height={alto}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.32" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {conEje && ticks.map((t, k) => {
            const yy = yAt(t);
            return (
              <g key={k}>
                <line
                  x1={padLeft} y1={yy} x2={padLeft + innerW} y2={yy}
                  stroke="var(--border-color)" strokeWidth="1" strokeDasharray="3 4"
                />
                <text
                  x={ancho - 2} y={yy + 3} textAnchor="end"
                  fontSize="10" fontWeight="600" fill="var(--text-muted)"
                >
                  {formatEjeCorto(t)}
                </text>
              </g>
            );
          })}

          <path d={areaPath} fill={`url(#${gid})`} />
          <path d={lineaPath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={xAt(vals.length - 1)} cy={yAt(vals[vals.length - 1])} r="4" fill={color} />
        </svg>
      )}
    </div>
  );
}

// Gráfico de barras (SVG). Resalta la barra más alta en color pleno; el resto
// queda tenue. Guías punteadas de fondo opcionales.
export function GraficoBarras({ valores, color, alto = 56 }) {
  const [ref, ancho] = useAncho();
  const vals = valores && valores.length ? valores : [0];
  const max = Math.max(1, ...vals);
  const idxMax = vals.indexOf(Math.max(...vals));
  const gap = 4;
  const bw = vals.length > 0 ? Math.max(3, (ancho - gap * (vals.length - 1)) / vals.length) : 0;
  const padBottom = 2;
  const innerH = alto - padBottom;

  return (
    <div ref={ref} style={{ width: '100%', height: alto }}>
      {ancho > 0 && (
        <svg width={ancho} height={alto}>
          {vals.map((v, i) => {
            const bh = Math.max(3, (v / max) * (innerH - 4));
            const x = i * (bw + gap);
            const activa = i === idxMax && v > 0;
            return (
              <rect
                key={i}
                x={x} y={innerH - bh} width={bw} height={bh} rx={Math.min(3, bw / 2)}
                fill={activa ? color : 'var(--border-color)'}
                opacity={activa ? 1 : 0.8}
              />
            );
          })}
        </svg>
      )}
    </div>
  );
}

// Badge de variación tipo píldora (fondo lima tenue, texto lima) con flecha
// según el signo — igual al mockup para balance y gastos.
export function BadgeVariacion({ pct }) {
  if (pct === null || pct === undefined || Number.isNaN(pct)) return null;
  const subiendo = pct >= 0;
  return (
    <div className="inline-flex items-center gap-2">
      <span
        className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold"
        style={{ background: 'rgba(196,233,56,0.16)', color: LIMA }}
      >
        <IconArrowUpRight
          size={12}
          color={LIMA}
          style={{ transform: subiendo ? 'none' : 'scaleY(-1)' }}
        />
        {Math.abs(pct)}%
      </span>
      <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>vs mes anterior</span>
    </div>
  );
}

// Escena decorativa del hero: colinas al fondo, estrellas y luna (noche) o
// sol (día) según la hora real de Colombia. Todo en lima sobre el degradado
// verde. Puramente decorativo (pointer-events: none).
function HeroEscena({ esDeDia }) {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-[24px]" style={{ pointerEvents: 'none' }}>
      <svg viewBox="0 0 400 168" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 w-full h-full">
        {/* Colinas */}
        <path d="M0 150 Q 90 118 190 140 T 400 128 L400 168 L0 168 Z" fill="rgba(150,180,40,0.30)" />
        <path d="M0 162 Q 130 134 250 154 T 400 150 L400 168 L0 168 Z" fill="rgba(90,115,20,0.55)" />

        {/* Estrellas / destellos (solo de noche) */}
        {!esDeDia && (
          <g fill={LIMA}>
            <circle cx="238" cy="58" r="1.6" opacity="0.9" />
            <circle cx="300" cy="42" r="1.1" opacity="0.7" />
            <circle cx="332" cy="92" r="1.3" opacity="0.8" />
            <circle cx="268" cy="100" r="1" opacity="0.6" />
            <path d="M258 40 l1.4 3.4 3.4 1.4 -3.4 1.4 -1.4 3.4 -1.4 -3.4 -3.4 -1.4 3.4 -1.4 z" opacity="0.9" />
            <path d="M352 60 l1 2.4 2.4 1 -2.4 1 -1 2.4 -1 -2.4 -2.4 -1 2.4 -1 z" opacity="0.8" />
          </g>
        )}
      </svg>

      {/* Luna + nube (noche) o sol (día) */}
      <div className="absolute" style={{ top: '26px', right: '30px' }}>
        {esDeDia ? (
          <IconSun size={54} color={LIMA} strokeWidth={2} />
        ) : (
          <div className="relative">
            <IconMoon size={50} color={LIMA} strokeWidth={2} fill="rgba(196,233,56,0.12)" />
            <IconCloud
              size={30} color={LIMA} strokeWidth={2} fill="rgba(196,233,56,0.10)"
              style={{ position: 'absolute', bottom: '-8px', right: '-16px' }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Banner fotográfico de módulo: foto real + degradado + CTA píldora.
function BannerModulo({ href, titulo, metrica, foto, cta }) {
  const [error, setError] = useState(false);

  return (
    <Link
      href={href}
      prefetch
      className="relative flex-shrink-0 w-full h-[176px] rounded-3xl overflow-hidden"
      style={{ scrollSnapAlign: 'start', background: 'var(--bg-card)' }}
    >
      {!error && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={foto}
          alt=""
          onError={() => setError(true)}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      <div
        className="absolute inset-0"
        style={{
          background: error
            ? 'transparent'
            : 'linear-gradient(100deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.1) 100%)',
        }}
      />
      <div className="absolute inset-0 p-5 flex flex-col justify-between">
        <div>
          <div className="text-[19px] font-extrabold tracking-tight" style={{ color: error ? 'var(--text-primary)' : '#FFFFFF' }}>
            {titulo}
          </div>
          <div className="text-[13px] mt-1" style={{ color: error ? 'var(--text-secondary)' : 'rgba(255,255,255,0.82)' }}>
            {metrica}
          </div>
        </div>
        <div className="self-end">
          <span
            className="inline-flex items-center gap-1 pl-3.5 pr-3 py-2 rounded-full text-[12px] font-bold"
            style={{ background: LIMA, color: '#000000' }}
          >
            {cta}
            <IconArrowUpRight size={14} color="#000000" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function InicioMobile() {
  const {
    data, ideas, notas, tareas, calendario, usuario, resumen, balanceData, loading, setUsuario,
  } = useInicioData();
  const [showProfile, setShowProfile] = useState(false);

  const { contenedorRef, indiceActivo, onScroll } = useCarruselAuto(MODULOS_BANNER.length);

  const nombre = usuario?.como_llamar || usuario?.nombre || '';
  const fotoUrl = usuario?.foto_url || null;

  if (loading) {
    return (
      <div className="min-h-screen pb-32 flex flex-col gap-7" style={{ background: 'var(--bg-primary)' }}>
        <div className="mx-5 pt-6 flex justify-between items-center">
          <div className="h-7 w-28 rounded animate-pulse" style={{ background: 'var(--bg-card)' }} />
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full animate-pulse" style={{ background: 'var(--bg-card)' }} />
            <div className="w-10 h-10 rounded-full animate-pulse" style={{ background: 'var(--bg-card)' }} />
          </div>
        </div>
        <div className="mx-5 rounded-[24px] h-[168px] animate-pulse" style={{ background: 'var(--bg-card)' }} />
        <div className="mx-5 rounded-3xl h-[176px] animate-pulse" style={{ background: 'var(--bg-card)' }} />
        <div className="mx-5 rounded-2xl h-[150px] animate-pulse" style={{ background: 'var(--bg-card)' }} />
      </div>
    );
  }

  const gastos = data?.gastos || [];
  const resumenSeguro = resumen || {
    total_gastos: 0, total_ingresos: 0, balance: 0,
    tareas_pendientes: 0, recordatorios_hoy: 0, metas_activas: 0,
  };

  const hace7dias = new Date();
  hace7dias.setDate(hace7dias.getDate() - 7);
  const gastosSemana = gastos
    .filter((g) => new Date(g.fecha) >= hace7dias)
    .reduce((sum, g) => sum + Number(g.monto), 0);

  // Saludo y fecha SIEMPRE en hora Colombia (UTC-5).
  const horaColombia = parseInt(
    new Date().toLocaleString('en-US', { timeZone: ZONA_COLOMBIA, hour: 'numeric', hour12: false }),
    10
  );
  const saludo = horaColombia < 12 ? 'Buenos días' : horaColombia < 19 ? 'Buenas tardes' : 'Buenas noches';
  const esDeDia = horaColombia >= 6 && horaColombia < 19;
  const fechaHoy = capitalizar(
    new Date().toLocaleDateString('es-CO', { timeZone: ZONA_COLOMBIA, weekday: 'long', day: 'numeric', month: 'long' })
  );
  const hoyStrCO = new Date().toLocaleDateString('en-CA', { timeZone: ZONA_COLOMBIA });

  const eventoHoy = calendario
    .filter((e) => e.fecha === hoyStrCO)
    .sort((a, b) => (a.hora_inicio || '').localeCompare(b.hora_inicio || ''))[0];

  const metricaEspacios = eventoHoy
    ? `Hoy: ${eventoHoy.titulo} · ${formatHora12(eventoHoy.hora_inicio)}`
    : `${notas.length + ideas.length} notas e ideas guardadas`;

  const banners = [
    {
      ...MODULOS_BANNER[0],
      metrica: `${resumenSeguro.tareas_pendientes} pendientes · ${resumenSeguro.recordatorios_hoy} recordatorios hoy`,
    },
    { ...MODULOS_BANNER[1], metrica: `${formatCOP(gastosSemana)} esta semana` },
    { ...MODULOS_BANNER[2], metrica: metricaEspacios },
  ];

  // ===== Datos reales para las tarjetas de Resumen =====
  // Balance general, tendencia mensual y variaciones vienen del endpoint
  // /balance (histórico completo, ingresos - gastos acumulado por mes).
  const balanceGeneral = balanceData?.balance ?? resumenSeguro.balance ?? 0;
  const serieBalance = (balanceData?.serieMensual || []).map((s) => Number(s.total) || 0);
  const varBalance = balanceData?.variacionBalance ?? null;
  const gastosMesReal = balanceData?.gastosMes ?? gastosSemana;
  const varGastos = balanceData?.variacionGastos ?? null;

  // Sparkline de gastos: suma diaria de los últimos 14 días (datos reales).
  const serieGastos = Array.from({ length: 14 }).map((_, idx) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - idx));
    const clave = d.toLocaleDateString('en-CA', { timeZone: ZONA_COLOMBIA });
    return gastos.filter((g) => g.fecha === clave).reduce((s, g) => s + Number(g.monto), 0);
  });

  // Calendario: eventos por día en los próximos 7 días (datos reales).
  const barrasCalendario = Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date();
    d.setDate(d.getDate() + idx);
    const clave = d.toLocaleDateString('en-CA', { timeZone: ZONA_COLOMBIA });
    return calendario.filter((e) => e.fecha === clave).length;
  });
  const eventosProximos = calendario.filter((e) => e.fecha >= hoyStrCO).length;

  // Actividad reciente: gastos/notas/tareas/ideas, top 4.
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
    .slice(0, 4);

  return (
    <div className="min-h-screen pb-32 flex flex-col gap-7" style={{ background: 'var(--bg-primary)' }}>

      {/* Header */}
      <div className="mx-5 pt-6 flex justify-between items-center">
        <div className="relative flex items-center">
          <span className="text-xl font-bold tracking-tight" style={{ color: 'var(--accent)' }}>Du</span>
          <span className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>&nbsp;Life</span>
          <IconSparkles size={14} color="var(--accent)" style={{ marginLeft: '2px', marginTop: '-14px' }} />
        </div>
        <div className="flex items-center gap-2.5">
          <button
            className="relative w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
          >
            <IconBell size={18} color="var(--text-primary)" />
          </button>
          <button type="button" onClick={() => setShowProfile(true)}>
            <Avatar name={nombre} size="md" fotoUrl={fotoUrl} />
          </button>
        </div>
      </div>

      {/* Hero — tarjeta de bienvenida con escena verde (luna/sol según la hora).
          Sin botón; el nombre es el protagonista. */}
      <div
        className="mx-5 relative rounded-[24px] overflow-hidden"
        style={{
          height: '168px',
          background: 'radial-gradient(135% 125% at 78% 16%, #aebf3a 0%, #7c8f28 24%, #45521a 52%, #1f260d 82%, #141a09 100%)',
          border: '1px solid rgba(196,233,56,0.22)',
        }}
      >
        <HeroEscena esDeDia={esDeDia} />
        <div className="relative z-10 p-6 flex flex-col justify-center h-full">
          <div className="text-[14px] font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>{saludo},</div>
          <div className="text-[34px] font-extrabold tracking-tight leading-none mt-1 truncate" style={{ color: '#FFFFFF', maxWidth: '62%' }}>
            {nombre}
          </div>
          <div className="text-[14px] font-semibold mt-2.5" style={{ color: LIMA }}>{fechaHoy}</div>
        </div>
      </div>

      {/* Carousel de banners fotográficos por módulo */}
      <div className="mx-5">
        <div
          ref={contenedorRef}
          onScroll={onScroll}
          className="flex rounded-3xl scroll-x-hidden"
          style={{ overflowX: 'auto', scrollSnapType: 'x mandatory', scrollBehavior: 'smooth' }}
        >
          {banners.map((b) => (
            <BannerModulo key={b.slug} {...b} />
          ))}
        </div>

        <div className="flex justify-center gap-1.5 mt-3.5">
          {banners.map((b, i) => (
            <span
              key={b.slug}
              className="rounded-full transition-all"
              style={{
                width: i === indiceActivo ? '18px' : '5px',
                height: '5px',
                background: i === indiceActivo ? 'var(--accent)' : 'var(--border-color)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Resumen general — tarjetas con gráficos reales */}
      <section className="mx-5 flex flex-col gap-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[12px] font-black uppercase" style={{ color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>
            Resumen general
          </span>
          <Link href="/dashboard/balance" className="flex items-center gap-0.5 text-[12px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
            Ver más <IconChevronRight size={14} color="var(--text-secondary)" />
          </Link>
        </div>

        {/* Balance general (ancha) */}
        <div className="rounded-3xl p-5 flex items-stretch gap-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div className="flex flex-col justify-between flex-shrink-0" style={{ width: '50%' }}>
            <div>
              <div className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>Balance general</div>
              <div
                className="font-black tracking-tight leading-tight mt-1 truncate"
                style={{ color: LIMA, fontSize: 'clamp(20px, 6.4vw, 28px)' }}
              >
                {formatCOP(balanceGeneral)}
              </div>
            </div>
            <div className="mt-3"><BadgeVariacion pct={varBalance} /></div>
          </div>
          <div className="flex-1 min-w-0 flex items-center">
            <GraficoAreaLinea valores={serieBalance} color={LIMA} alto={118} conEje />
          </div>
        </div>

        {/* Gastos + Calendario (mitad y mitad) */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-3xl p-4 flex flex-col justify-between" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', minHeight: '150px' }}>
            <div>
              <div className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>Gastos del mes</div>
              <div className="text-[20px] font-black tracking-tight mt-1" style={{ color: 'var(--text-primary)' }}>
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
            <GraficoAreaLinea valores={serieGastos} color={MORADO} alto={44} />
          </div>

          <div className="rounded-3xl p-4 flex flex-col justify-between" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', minHeight: '150px' }}>
            <div>
              <div className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>Calendario</div>
              <div className="text-[24px] font-black tracking-tight mt-1" style={{ color: 'var(--text-primary)' }}>
                {eventosProximos}
              </div>
              <div className="text-[11px] font-semibold mt-0.5" style={{ color: MORADO }}>eventos próximos</div>
            </div>
            <GraficoBarras valores={barrasCalendario} color={MORADO} alto={44} />
          </div>
        </div>
      </section>

      {/* Actividad reciente */}
      <section className="mx-5 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <span className="text-[12px] font-black uppercase" style={{ color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>
            Actividad reciente
          </span>
          <Link href="/dashboard/timeline" className="flex items-center gap-0.5 text-[12px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
            Ver más <IconChevronRight size={14} color="var(--text-secondary)" />
          </Link>
        </div>

        {actividadReciente.length === 0 ? (
          <div
            className="rounded-2xl py-8 px-5 flex flex-col items-center text-center gap-1"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
          >
            <IconCalendarEvent size={26} strokeWidth={1.5} color="var(--text-secondary)" />
            <div className="text-[13px] font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>Todo tranquilo por aquí</div>
            <div className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>Cuéntale algo a Du Life por WhatsApp y aparecerá acá.</div>
          </div>
        ) : (
          <div>
            {actividadReciente.map((item, i) => {
              const Icon = TIPO_ICONO[item.tipo] || IconNote;
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-3 py-3.5"
                  style={{ borderTop: i > 0 ? '1px solid var(--border-color)' : 'none' }}
                >
                  <div
                    className="w-9 h-9 rounded-[11px] flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
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
          </div>
        )}
      </section>

      <ProfileSheet
        open={showProfile}
        onClose={() => setShowProfile(false)}
        nombre={nombre}
        telefono={usuario?.telefono}
        plan={usuario?.plan}
        fotoUrl={fotoUrl}
        onNombreActualizado={(nuevo) => setUsuario((u) => ({ ...u, como_llamar: nuevo }))}
        onFotoActualizada={(nuevaFoto) => setUsuario((u) => ({ ...u, foto_url: nuevaFoto }))}
      />

    </div>
  );
}
