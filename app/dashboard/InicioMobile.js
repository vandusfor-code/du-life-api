'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  IconBell, IconSparkles, IconSquareCheck, IconWallet, IconShoppingBag,
  IconNote, IconBulb, IconArrowUpRight,
  IconChevronRight, IconCalendarEvent,
} from '@tabler/icons-react';
import Avatar from '../../components/Avatar';
import ProfileSheet from '../../components/ProfileSheet';
import LogoComercio from '../../components/LogoComercio';
import { useInicioData } from './useInicioData';

const ZONA_COLOMBIA = 'America/Bogota';

const LIMA = '#C4E938';

// Frase motivacional de la tarjeta de bienvenida: cambia una vez al día
// (misma frase todo el día, rota automáticamente al día siguiente) según el
// día del año — sin necesidad de guardar estado en ningún lado.
const FRASES_DIA = [
  { titulo: 'Hoy es un gran día para avanzar.', subtitulo: 'Un paso pequeño hoy construye tu mejor versión mañana.' },
  { titulo: 'Tu energía crea tu día.', subtitulo: 'Empieza con intención y deja que las cosas fluyan.' },
  { titulo: 'Cada día es una nueva oportunidad.', subtitulo: 'No se trata de ser perfecto, se trata de avanzar.' },
  { titulo: 'Conquista tu día, un paso a la vez.', subtitulo: 'Lo que hagas hoy construye tu futuro.' },
  { titulo: 'Cree en tu progreso.', subtitulo: 'Los grandes cambios empiezan con pequeñas decisiones.' },
  { titulo: 'Hoy puedes más de lo que crees.', subtitulo: 'Confía en el proceso y sigue adelante.' },
  { titulo: 'Tu mejor versión empieza hoy.', subtitulo: 'Cada día suma, cada esfuerzo cuenta.' },
];

function obtenerFraseDelDia(zonaHorario) {
  const inicioAno = new Date(new Date().toLocaleString('en-US', { timeZone: zonaHorario })).setMonth(0, 1);
  const hoy = new Date(new Date().toLocaleString('en-US', { timeZone: zonaHorario }));
  const diaDelAno = Math.floor((hoy - inicioAno) / 86400000);
  return FRASES_DIA[diaDelAno % FRASES_DIA.length];
}

const WHATSAPP_HABLAR_CON_DU = 'https://wa.me/573239117508';

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

// Mini-gráfica decorativa: llena el ancho disponible que le deja el
// contenedor flex (no un ancho fijo) — barritas pequeñas junto al monto.
function MiniTendenciaBarras({ valores, color, alto = 30 }) {
  const [ref, ancho] = useAncho();
  const vals = valores && valores.length ? valores : [0];
  const max = Math.max(1, ...vals);
  const gap = 3;
  const bw = ancho > 0 ? Math.max(2, (ancho - gap * (vals.length - 1)) / vals.length) : 0;

  return (
    <div ref={ref} className="flex-1 min-w-0" style={{ height: alto }}>
      {ancho > 0 && (
        <svg width={ancho} height={alto}>
          {vals.map((v, i) => {
            const bh = Math.max(2, (v / max) * (alto - 4));
            const x = i * (bw + gap);
            const esUltima = i === vals.length - 1;
            return (
              <rect
                key={i}
                x={x} y={alto - bh} width={bw} height={bh} rx={Math.min(2, bw / 2)}
                fill={color}
                opacity={esUltima ? 1 : 0.45}
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

export default function InicioMobile() {
  const {
    data, ideas, notas, tareas, usuario, resumen, balanceData, loading, setUsuario,
  } = useInicioData();
  const [showProfile, setShowProfile] = useState(false);
  const [errorMascota, setErrorMascota] = useState(false);

  const nombre = usuario?.como_llamar || usuario?.nombre || '';
  const fotoUrl = usuario?.foto_url || null;

  if (loading) {
    return (
      <div className="min-h-screen pb-32 flex flex-col gap-7" style={{ background: 'var(--bg-primary)' }}>
        <div className="mx-3 pt-6 flex justify-between items-center">
          <div className="h-7 w-28 rounded animate-pulse" style={{ background: 'var(--bg-card)' }} />
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full animate-pulse" style={{ background: 'var(--bg-card)' }} />
            <div className="w-10 h-10 rounded-full animate-pulse" style={{ background: 'var(--bg-card)' }} />
          </div>
        </div>
        <div className="mx-3 rounded-[24px] h-[168px] animate-pulse" style={{ background: 'var(--bg-card)' }} />
        <div className="mx-3 rounded-3xl h-[176px] animate-pulse" style={{ background: 'var(--bg-card)' }} />
        <div className="mx-3 rounded-2xl h-[150px] animate-pulse" style={{ background: 'var(--bg-card)' }} />
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

  const fraseDelDia = obtenerFraseDelDia(ZONA_COLOMBIA);

  // ===== Datos reales para las tarjetas de Ingresos / Gastos =====
  // Vienen del endpoint /balance (montos del mes actual + variación vs el
  // mes anterior + últimos movimientos, para las mini-gráficas).
  const gastosMesReal = balanceData?.gastosMes ?? gastosSemana;
  const varGastos = balanceData?.variacionGastos ?? null;
  const ingresosMesReal = balanceData?.ingresosMes ?? 0;
  const varIngresos = balanceData?.variacionIngresos ?? null;

  // Sparkline de gastos/ingresos: suma diaria de los últimos 14 días (datos reales).
  const serieGastos = Array.from({ length: 14 }).map((_, idx) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - idx));
    const clave = d.toLocaleDateString('en-CA', { timeZone: ZONA_COLOMBIA });
    return gastos.filter((g) => g.fecha === clave).reduce((s, g) => s + Number(g.monto), 0);
  });
  const ingresosRecientes = balanceData?.ingresosRecientes || [];
  const serieIngresos = Array.from({ length: 14 }).map((_, idx) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - idx));
    const clave = d.toLocaleDateString('en-CA', { timeZone: ZONA_COLOMBIA });
    return ingresosRecientes.filter((i) => i.fecha === clave).reduce((s, i) => s + Number(i.monto), 0);
  });

  // Actividad reciente: gastos/notas/tareas/ideas, top 4.
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
    .slice(0, 4);

  return (
    <div className="relative min-h-screen pb-32 flex flex-col gap-7" style={{ background: 'var(--bg-primary)' }}>
      {/* Degradado lima-a-negro, decorativo. Empieza DESPUÉS del header/saludo
          (nunca toca el status bar) y queda cargado hacia la derecha, no
          centrado ni de lado a lado — se desvanece al negro por todos lados. */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '130px',
          right: '-40px',
          left: '30%',
          height: '300px',
          background: 'radial-gradient(closest-side, rgba(196,233,56,0.20) 0%, rgba(196,233,56,0) 100%)',
        }}
      />

      {/* Header */}
      <div className="relative mx-3 pt-6 flex justify-between items-center">
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

      {/* Saludo simple */}
      <div className="mx-3">
        <div className="text-[26px] font-extrabold leading-snug tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Hola, <span style={{ color: LIMA }}>{nombre}</span>,<br />Bienvenido
        </div>
      </div>

      {/* Tarjeta motivacional — frase del día + CTA a WhatsApp + mascota */}
      <div
        className="mx-3 relative rounded-3xl overflow-hidden p-6"
        style={{
          background: 'radial-gradient(120% 140% at 88% 30%, rgba(196,233,56,0.10) 0%, var(--bg-card) 55%)',
          border: '1px solid var(--border-color)',
        }}
      >
        {/* Resplandor lima detrás de la mascota */}
        <div
          className="absolute pointer-events-none"
          style={{
            right: '-30px',
            top: '10px',
            width: '150px',
            height: '150px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(196,233,56,0.35) 0%, rgba(196,233,56,0) 70%)',
            filter: 'blur(4px)',
          }}
        />

        <div className="relative z-10" style={{ maxWidth: '58%' }}>
          <div className="text-[19px] font-extrabold leading-tight" style={{ color: 'var(--text-primary)' }}>
            {fraseDelDia.titulo}
          </div>
          <div className="text-[13px] mt-2 leading-snug" style={{ color: 'var(--text-secondary)' }}>
            {fraseDelDia.subtitulo}
          </div>
          <a
            href={WHATSAPP_HABLAR_CON_DU}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center mt-4 px-5 py-2.5 rounded-full text-[13px] font-bold"
            style={{ background: LIMA, color: '#000000' }}
          >
            Habla con Du
          </a>
        </div>
        {!errorMascota && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/astronauta.png"
            alt=""
            onError={() => setErrorMascota(true)}
            className="absolute z-10 pointer-events-none select-none"
            style={{ right: '4px', bottom: '-14px', height: '148px', width: 'auto' }}
          />
        )}
      </div>

      {/* Resumen general — tarjetas con gráficos reales */}
      <section className="mx-3 flex flex-col gap-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[12px] font-black uppercase" style={{ color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>
            Resumen general
          </span>
          <Link href="/dashboard/balance" className="flex items-center gap-0.5 text-[12px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
            Ver más <IconChevronRight size={14} color="var(--text-secondary)" />
          </Link>
        </div>

        {/* Ingresos + Gastos (mitad y mitad) */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-3xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', minHeight: '128px' }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(196,233,56,0.14)' }}>
                <IconWallet size={16} color={LIMA} strokeWidth={1.8} />
              </div>
              <span className="text-[12px] font-semibold" style={{ color: 'var(--text-secondary)' }}>Ingresos</span>
            </div>
            <div className="flex items-end mt-3 gap-2">
              <div className="flex-shrink-0">
                <div className="text-[18px] font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  {formatCOP(ingresosMesReal)}
                </div>
                {varIngresos !== null && (
                  <span
                    className="inline-flex items-center gap-0.5 mt-1 text-[10px] font-bold"
                    style={{ color: LIMA }}
                  >
                    <IconArrowUpRight size={11} color={LIMA} style={{ transform: varIngresos <= 0 ? 'scaleY(-1)' : 'none' }} />
                    {Math.abs(varIngresos)}%
                  </span>
                )}
              </div>
              <MiniTendenciaBarras valores={serieIngresos.slice(-6)} color={LIMA} />
            </div>
          </div>

          <div className="rounded-3xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', minHeight: '128px' }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(196,233,56,0.14)' }}>
                <IconShoppingBag size={16} color={LIMA} strokeWidth={1.8} />
              </div>
              <span className="text-[12px] font-semibold" style={{ color: 'var(--text-secondary)' }}>Gastos</span>
            </div>
            <div className="flex items-end mt-3 gap-2">
              <div className="flex-shrink-0">
                <div className="text-[18px] font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  {formatCOP(gastosMesReal)}
                </div>
                {varGastos !== null && (
                  <span
                    className="inline-flex items-center gap-0.5 mt-1 text-[10px] font-bold"
                    style={{ color: LIMA }}
                  >
                    <IconArrowUpRight size={11} color={LIMA} style={{ transform: varGastos <= 0 ? 'scaleY(-1)' : 'none' }} />
                    {Math.abs(varGastos)}%
                  </span>
                )}
              </div>
              <MiniTendenciaBarras valores={serieGastos.slice(-6)} color={LIMA} />
            </div>
          </div>
        </div>
      </section>

      {/* Actividades recientes */}
      <section className="mx-3 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <span className="text-[12px] font-black uppercase" style={{ color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>
            Actividades recientes
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
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
                    >
                      <Icon size={16} strokeWidth={1.6} color="var(--text-primary)" />
                    </div>
                  )}
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
