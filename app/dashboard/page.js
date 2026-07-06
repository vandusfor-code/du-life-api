'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  IconBell, IconSparkles, IconBrandWhatsapp, IconSquareCheck, IconWallet,
  IconNote, IconBulb, IconSun, IconMoon, IconCloud, IconArrowUpRight,
  IconChevronRight, IconCalendarEvent,
} from '@tabler/icons-react';
import Avatar from '../../components/Avatar';
import ProfileSheet from '../../components/ProfileSheet';
import { useAutoRefresh } from '../../components/useAutoRefresh';

const WHATSAPP_LINK = 'https://wa.me/573239117508';
const NOTIFICACIONES_MOCK = 3;
const ZONA_COLOMBIA = 'America/Bogota';

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

const formatCOP = (n) => '$' + Math.round(n).toLocaleString('es-CO');

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

// Iconos de Actividad reciente: mismo trazo monocromático para todos — solo
// la forma cambia según el tipo de registro (sin colores por categoría, para
// mantener la pantalla limpia).
const TIPO_ICONO = {
  gasto: IconWallet,
  idea: IconBulb,
  nota: IconNote,
  tarea: IconSquareCheck,
};

// Carousel de banners: se desliza solo cada 4s con CSS scroll-snap nativo
// (sin librerías); el usuario puede deslizar manual y el auto-avance sigue
// desde donde haya quedado, recalculando el índice a partir del scroll real
// en vez de un contador separado que podría desincronizarse.
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

// Detalle decorativo del hero: sol de día, luna con nube de noche — según la
// hora real de Colombia. Se dibuja tenue (hero-text-soft) para no competir
// con la tipografía del saludo.
function IconoClima({ esDeDia, color }) {
  if (esDeDia) {
    return <IconSun size={30} color={color} strokeWidth={1.6} />;
  }
  return (
    <div className="relative" style={{ width: '34px', height: '30px' }}>
      <IconMoon size={24} color={color} strokeWidth={1.6} style={{ position: 'absolute', top: 0, left: 4 }} />
      <IconCloud size={18} color={color} strokeWidth={1.6} style={{ position: 'absolute', bottom: -1, right: -2 }} />
    </div>
  );
}

// Banner fotográfico de módulo: foto real + degradado negro-a-transparente
// + CTA píldora. Si la imagen no carga, cae a un fondo sólido en vez de
// mostrar un ícono roto.
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
          <div
            className="text-[19px] font-extrabold tracking-tight"
            style={{ color: error ? 'var(--text-primary)' : '#FFFFFF' }}
          >
            {titulo}
          </div>
          <div
            className="text-[13px] mt-1"
            style={{ color: error ? 'var(--text-secondary)' : 'rgba(255,255,255,0.82)' }}
          >
            {metrica}
          </div>
        </div>
        <div className="self-end">
          <span
            className="inline-flex items-center gap-1 pl-3.5 pr-3 py-2 rounded-full text-[12px] font-bold"
            style={{ background: 'var(--accent)', color: '#000000' }}
          >
            {cta}
            <IconArrowUpRight size={14} color="#000000" />
          </span>
        </div>
      </div>
    </Link>
  );
}

// Fila de métrica del bloque Resumen: etiqueta silenciosa arriba, número
// grande abajo. El acento (lima) se reserva sólo para el dato principal.
function MetricaResumen({ etiqueta, valor, extra, extraColor, destacado }) {
  return (
    <div className="flex flex-col">
      <span className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>{etiqueta}</span>
      <span
        className="font-black tracking-tight mt-1"
        style={{ color: destacado ? 'var(--accent)' : 'var(--text-primary)', fontSize: destacado ? '30px' : '20px' }}
      >
        {valor}
      </span>
      {extra && (
        <span className="text-[11px] font-semibold mt-0.5" style={{ color: extraColor || 'var(--text-secondary)' }}>
          {extra}
        </span>
      )}
    </div>
  );
}

// Encabezado de sección reutilizable: etiqueta uppercase tenue + enlace
// discreto a la derecha. Mantiene la alineación y el ritmo entre bloques.
function TituloSeccion({ children, href }) {
  return (
    <div className="flex justify-between items-center">
      <span
        className="text-[11px] font-bold uppercase"
        style={{ color: 'var(--text-secondary)', letterSpacing: '0.08em' }}
      >
        {children}
      </span>
      {href && (
        <Link
          href={href}
          className="flex items-center gap-0.5 text-[12px] font-semibold"
          style={{ color: 'var(--text-secondary)' }}
        >
          Ver más
          <IconChevronRight size={14} color="var(--text-secondary)" />
        </Link>
      )}
    </div>
  );
}

export default function DashboardInicio() {
  const [data, setData] = useState(null);
  const [ideas, setIdeas] = useState([]);
  const [notas, setNotas] = useState([]);
  const [tareas, setTareas] = useState([]);
  const [calendario, setCalendario] = useState([]);
  const [usuario, setUsuario] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);

  const cargarDatos = useCallback(() => {
    Promise.all([
      fetch('/api/dashboard/gastos').then((r) => r.json()),
      fetch('/api/dashboard/resumen').then((r) => r.json()),
      fetch('/api/dashboard/ideas').then((r) => r.json()),
      fetch('/api/dashboard/notas').then((r) => r.json()),
      fetch('/api/dashboard/tareas').then((r) => r.json()),
      fetch('/api/dashboard/calendario').then((r) => r.json()),
    ])
      .then(([gastosData, resumenData, ideasData, notasData, tareasData, calendarioData]) => {
        setData(gastosData);
        setUsuario(resumenData.usuario);
        setResumen(resumenData.resumen);
        setIdeas(ideasData.ideas || []);
        setNotas(notasData.notas || []);
        setTareas(tareasData.tareas || []);
        setCalendario(calendarioData.eventos || []);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  useAutoRefresh(cargarDatos);

  const { contenedorRef, indiceActivo, onScroll } = useCarruselAuto(MODULOS_BANNER.length);

  const nombre = usuario?.como_llamar || usuario?.nombre || 'Duvan';

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
        <div className="mx-5 rounded-[24px] h-[150px] animate-pulse" style={{ background: 'var(--bg-card)' }} />
        <div className="mx-5 rounded-3xl h-[176px] animate-pulse" style={{ background: 'var(--bg-card)' }} />
        <div className="mx-5 rounded-2xl h-[120px] animate-pulse" style={{ background: 'var(--bg-card)' }} />
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

  // Saludo y fecha SIEMPRE en hora Colombia (UTC-5), sin importar el huso
  // horario configurado en el dispositivo del usuario.
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

  // Resumen general: gastos del mes en curso vs. mes anterior (real, a partir
  // de las fechas de los gastos ya cargados) y eventos de calendario desde
  // hoy en adelante. Si no hay datos del mes anterior no se inventa un %.
  const mesActual = hoyStrCO.slice(0, 7);
  const fechaMesAnterior = new Date();
  fechaMesAnterior.setMonth(fechaMesAnterior.getMonth() - 1);
  const mesAnterior = fechaMesAnterior.toLocaleDateString('en-CA', { timeZone: ZONA_COLOMBIA }).slice(0, 7);

  const gastosMesActual = gastos
    .filter((g) => g.fecha?.startsWith(mesActual))
    .reduce((s, g) => s + Number(g.monto), 0);
  const gastosMesAnterior = gastos
    .filter((g) => g.fecha?.startsWith(mesAnterior))
    .reduce((s, g) => s + Number(g.monto), 0);
  const cambioGastosMes = gastosMesAnterior > 0
    ? Math.round(((gastosMesActual - gastosMesAnterior) / gastosMesAnterior) * 100)
    : null;

  const eventosProximos = calendario.filter((e) => e.fecha >= hoyStrCO).length;

  // Actividad reciente: solo gastos/notas/tareas/ideas, top 4.
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
            {NOTIFICACIONES_MOCK > 0 && (
              <div
                className="absolute flex items-center justify-center rounded-full"
                style={{ width: '16px', height: '16px', background: 'var(--accent)', top: '-2px', right: '-2px' }}
              >
                <span className="font-bold" style={{ fontSize: '9px', color: '#000000' }}>
                  {NOTIFICACIONES_MOCK}
                </span>
              </div>
            )}
          </button>
          <button type="button" onClick={() => setShowProfile(true)}>
            <Avatar name={nombre} size="md" />
          </button>
        </div>
      </div>

      {/* Hero — la única superficie con color de marca de la pantalla: lima en
          dark, oscura en light. El saludo es el protagonista tipográfico
          (nombre en grande, grueso); el botón de WhatsApp es el CTA que
          contrasta con la superficie. */}
      <div
        className="mx-5 rounded-[24px] p-6 flex flex-col justify-between"
        style={{ background: 'var(--hero-bg)', height: '150px' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[13px] font-medium" style={{ color: 'var(--hero-text-soft)' }}>{saludo},</div>
            <div className="text-[27px] font-extrabold tracking-tight leading-none mt-0.5 truncate" style={{ color: 'var(--hero-text)' }}>
              {nombre}
            </div>
            <div className="text-[12px] mt-2" style={{ color: 'var(--hero-text-soft)' }}>{fechaHoy}</div>
          </div>
          <IconoClima esDeDia={esDeDia} color="var(--hero-text-soft)" />
        </div>

        <div className="flex justify-end">
          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full"
            style={{ background: 'var(--whatsapp-btn-bg)' }}
          >
            <IconBrandWhatsapp size={16} color="var(--whatsapp-btn-text)" />
            <span className="text-[13px] font-bold whitespace-nowrap" style={{ color: 'var(--whatsapp-btn-text)' }}>
              Hablar con Du
            </span>
          </a>
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

      {/* Resumen general — cifras completas, monocromo, con el balance como
          único acento en lima. */}
      <section className="mx-5 flex flex-col gap-4">
        <TituloSeccion href="/dashboard/balance">Resumen general</TituloSeccion>

        <MetricaResumen etiqueta="Balance general" valor={formatCOP(resumenSeguro.balance)} destacado />

        <div className="h-px w-full" style={{ background: 'var(--border-color)' }} />

        <div className="grid grid-cols-2 gap-x-6">
          <MetricaResumen
            etiqueta="Gastos del mes"
            valor={formatCOP(gastosMesActual)}
            extra={cambioGastosMes !== null ? `${cambioGastosMes > 0 ? '+' : ''}${cambioGastosMes}% vs mes ant.` : null}
            extraColor={cambioGastosMes !== null ? (cambioGastosMes <= 0 ? 'var(--accent-dark)' : '#F87171') : null}
          />
          <MetricaResumen
            etiqueta="Calendario"
            valor={eventosProximos}
            extra="eventos próximos"
          />
        </div>
      </section>

      {/* Actividad reciente — lista continua limpia, íconos monocromáticos. */}
      <section className="mx-5 flex flex-col gap-4">
        <TituloSeccion href="/dashboard/timeline">Actividad reciente</TituloSeccion>

        {actividadReciente.length === 0 ? (
          <div
            className="rounded-2xl py-8 px-5 flex flex-col items-center text-center gap-1"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
          >
            <IconCalendarEvent size={26} strokeWidth={1.5} color="var(--text-secondary)" />
            <div className="text-[13px] font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>
              Todo tranquilo por aquí
            </div>
            <div className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
              Cuéntale algo a Du Life por WhatsApp y aparecerá acá.
            </div>
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
        onNombreActualizado={(nuevo) => setUsuario((u) => ({ ...u, como_llamar: nuevo }))}
      />

    </div>
  );
}
