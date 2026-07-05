'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  IconBell, IconSparkles, IconBrandWhatsapp, IconSquareCheck, IconWallet,
  IconCalendarEvent, IconCoins, IconAdjustmentsHorizontal, IconNotes,
  IconNote, IconBulb,
} from '@tabler/icons-react';
import Avatar from '../../components/Avatar';
import ProfileSheet from '../../components/ProfileSheet';
import { useAutoRefresh } from '../../components/useAutoRefresh';

const WHATSAPP_LINK = 'https://wa.me/573239117508';
const NOTIFICACIONES_MOCK = 3;
const ZONA_COLOMBIA = 'America/Bogota';

const formatCOP = (n) => '$' + Math.round(n).toLocaleString('es-CO');
const formatCOPCorto = (n) => {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return '$' + Math.round(n / 1_000) + 'k';
  return '$' + Math.round(n);
};

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
  if (mins < 1) return 'hace un momento';
  if (mins < 60) return `hace ${mins} min`;
  const horas = Math.floor(mins / 60);
  if (horas < 24) return `hace ${horas}h`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return 'ayer';
  if (dias < 7) return `hace ${dias}d`;
  return new Date(fechaISO).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

const TIPO_CONFIG = {
  gasto: { color: '#4ADE80', icon: IconWallet },
  idea: { color: '#FB923C', icon: IconBulb },
  nota: { color: '#60A5FA', icon: IconNote },
  tarea: { color: '#A78BFA', icon: IconSquareCheck },
};

const MODULOS_DECORATIVOS = [
  { key: 'finanzas', label: 'Finanzas', icon: IconCoins, size: 48 },
  { key: 'control', label: 'Control', icon: IconAdjustmentsHorizontal, size: 64 },
  { key: 'notas', label: 'Notas', icon: IconNotes, size: 48 },
];

// Carousel de métricas: se desliza solo cada 3s con CSS scroll-snap nativo
// (sin librerías); el usuario puede deslizar manual y el auto-avance sigue
// desde donde haya quedado, recalculando el índice a partir del scroll real
// en vez de un contador separado que podría desincronizarse.
function useCarruselAuto(cantidad, intervaloMs = 3000) {
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

// Líneas onduladas con un punto de luz que viaja de izquierda a derecha y
// vuelve, en loop suave — puramente decorativo (ver Quick Controls).
function LineaOndulada() {
  return (
    <svg
      viewBox="0 0 300 60"
      width="100%"
      height="60"
      style={{ position: 'absolute', top: '50%', left: 0, transform: 'translateY(-50%)', zIndex: 0, pointerEvents: 'none' }}
    >
      <path
        id="linea-quick-controls"
        d="M 32 30 Q 90 8, 150 30 Q 210 52, 268 30"
        fill="none"
        stroke="#C4E938"
        strokeOpacity="0.3"
        strokeWidth="1.5"
      />
      <circle r="3" fill="#C4E938" style={{ filter: 'drop-shadow(0 0 4px rgba(196,233,56,0.9))' }}>
        <animateMotion
          dur="3s"
          repeatCount="indefinite"
          keyPoints="0;1;0"
          keyTimes="0;0.5;1"
          calcMode="spline"
          keySplines="0.42 0 0.58 1;0.42 0 0.58 1"
        >
          <mpath href="#linea-quick-controls" />
        </animateMotion>
      </circle>
    </svg>
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

  const { contenedorRef, indiceActivo, onScroll } = useCarruselAuto(4);

  const nombre = usuario?.como_llamar || usuario?.nombre || 'Duvan';

  if (loading) {
    return (
      <div className="px-5 pt-4 pb-32 min-h-screen" style={{ background: 'var(--bg-primary)' }}>
        <div className="flex justify-between items-center mb-5">
          <div className="h-7 w-28 rounded animate-pulse" style={{ background: 'var(--bg-card)' }} />
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full animate-pulse" style={{ background: 'var(--bg-card)' }} />
            <div className="w-10 h-10 rounded-full animate-pulse" style={{ background: 'var(--bg-card)' }} />
          </div>
        </div>
        <div className="rounded-[20px] h-[150px] animate-pulse" style={{ background: 'var(--bg-card)' }} />
        <div className="rounded-2xl h-[110px] mt-4 animate-pulse" style={{ background: 'var(--bg-card)' }} />
        <div className="rounded-2xl h-[130px] mt-5 animate-pulse" style={{ background: 'var(--bg-card)' }} />
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
  const fechaHoy = capitalizar(
    new Date().toLocaleDateString('es-CO', { timeZone: ZONA_COLOMBIA, weekday: 'long', day: 'numeric', month: 'long' })
  );

  const eventoHoy = calendario
    .filter((e) => e.fecha === new Date().toLocaleDateString('en-CA', { timeZone: ZONA_COLOMBIA }))
    .sort((a, b) => (a.hora_inicio || '').localeCompare(b.hora_inicio || ''))[0];

  const METRICAS = [
    {
      key: 'tareas',
      valor: resumenSeguro.tareas_pendientes,
      label: 'Tareas pendientes',
      icon: IconSquareCheck,
    },
    {
      key: 'recordatorios',
      valor: resumenSeguro.recordatorios_hoy,
      label: 'Recordatorios hoy',
      icon: IconBell,
    },
    {
      key: 'gastos',
      valor: formatCOPCorto(gastosSemana),
      label: 'Gastos esta semana',
      icon: IconWallet,
    },
    {
      key: 'agenda',
      esAgenda: true,
      label: 'Agenda hoy',
      icon: IconCalendarEvent,
    },
  ];

  // Actividad reciente: solo gastos/notas/tareas/ideas, top 3.
  const actividadReciente = [
    ...gastos.map((g) => ({
      id: `gasto-${g.id}`,
      tipo: 'gasto',
      titulo: g.descripcion || 'Gasto',
      subtitulo: g.categoria || g.lugar || '',
      monto: Number(g.monto),
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
      subtitulo: t.fecha_vencimiento ? `Vence ${t.fecha_vencimiento}` : '',
      fechaHora: new Date(t.creado_en),
    })),
  ]
    .sort((a, b) => b.fechaHora - a.fechaHora)
    .slice(0, 3);

  return (
    <div className="px-5 pt-4 pb-32 min-h-screen" style={{ background: 'var(--bg-primary)' }}>

      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <div className="relative flex items-center">
          <span className="text-xl font-bold tracking-tight" style={{ color: 'var(--accent)' }}>Du</span>
          <span className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>&nbsp;Life</span>
          <IconSparkles size={14} color="var(--accent)" style={{ marginLeft: '2px', marginTop: '-14px' }} />
        </div>
        <div className="flex items-center gap-2">
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
                <span className="font-bold" style={{ fontSize: '9px', color: 'var(--hero-text)' }}>
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

      {/* Hero card */}
      <div className="rounded-[20px] p-5" style={{ background: 'var(--hero-bg)' }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[21px] font-bold tracking-tight leading-tight" style={{ color: 'var(--hero-text)' }}>
              {saludo}, {nombre}
            </div>
            <div className="text-[13px] mt-1" style={{ color: 'rgba(0,0,0,0.6)' }}>{fechaHoy}</div>
          </div>
          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-full flex-shrink-0"
            style={{ background: '#0A0A0A' }}
          >
            <IconBrandWhatsapp size={16} color="#fff" />
            <span className="text-[12px] font-bold text-white whitespace-nowrap">Hablar con Du</span>
          </a>
        </div>
      </div>

      {/* Carousel auto-deslizante de métricas */}
      <div
        ref={contenedorRef}
        onScroll={onScroll}
        className="flex mt-4 rounded-2xl scroll-x-hidden"
        style={{ overflowX: 'auto', scrollSnapType: 'x mandatory', scrollBehavior: 'smooth' }}
      >
        {METRICAS.map((m) => (
          <div
            key={m.key}
            className="flex-shrink-0 w-full rounded-2xl p-5"
            style={{ scrollSnapAlign: 'start', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
          >
            <m.icon size={20} color="var(--accent)" />
            {m.esAgenda ? (
              eventoHoy ? (
                <>
                  <div className="text-[16px] font-bold tracking-tight mt-3 truncate" style={{ color: 'var(--text-primary)' }}>
                    {eventoHoy.titulo}
                  </div>
                  <div className="text-[12px] mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {formatHora12(eventoHoy.hora_inicio)}
                  </div>
                </>
              ) : (
                <div className="text-[16px] font-bold tracking-tight mt-3" style={{ color: 'var(--text-primary)' }}>
                  Sin eventos hoy
                </div>
              )
            ) : (
              <div className="text-[26px] font-bold tracking-tight mt-3" style={{ color: 'var(--accent)' }}>
                {m.valor}
              </div>
            )}
            <div className="text-[12px] mt-1" style={{ color: 'var(--text-secondary)' }}>{m.label}</div>
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-1.5 mt-3">
        {METRICAS.map((m, i) => (
          <span
            key={m.key}
            className="rounded-full transition-all"
            style={{
              width: i === indiceActivo ? '16px' : '6px',
              height: '6px',
              background: i === indiceActivo ? 'var(--accent)' : 'var(--border-color)',
            }}
          />
        ))}
      </div>

      {/* Quick Controls — decorativo */}
      <div className="mt-7">
        <div className="text-[12px] mb-3" style={{ color: 'var(--text-secondary)' }}>Du puede ayudarte con</div>
        <div className="relative flex items-center justify-between px-2" style={{ height: '90px' }}>
          <LineaOndulada />
          {MODULOS_DECORATIVOS.map((m) => (
            <div key={m.key} className="relative flex flex-col items-center gap-2" style={{ zIndex: 1 }}>
              <div
                className="rounded-full flex items-center justify-center"
                style={{
                  width: `${m.size}px`,
                  height: `${m.size}px`,
                  background: '#111111',
                  border: m.size === 64 ? '2px solid var(--accent)' : '1px solid var(--border-color)',
                }}
              >
                <m.icon size={m.size === 64 ? 26 : 20} color="var(--accent)" />
              </div>
              <span className="text-[11px]" style={{ color: 'var(--text-primary)' }}>{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actividad reciente */}
      <div className="mt-7">
        <div className="text-[17px] font-bold tracking-tight mb-3" style={{ color: 'var(--text-primary)' }}>
          Actividad reciente
        </div>

        {actividadReciente.length === 0 ? (
          <div
            className="rounded-2xl p-6 text-center text-[13px]"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
          >
            Aún no has registrado nada. Cuéntale a Du Life por WhatsApp.
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {actividadReciente.map((item) => {
              const cfg = TIPO_CONFIG[item.tipo] || { color: '#71717A', icon: IconNote };
              const Icon = cfg.icon;
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3.5 rounded-2xl"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: `${cfg.color}26` }}
                  >
                    <Icon size={18} color={cfg.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>{item.titulo}</div>
                    {item.subtitulo && (
                      <div className="text-[12px] truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>{item.subtitulo}</div>
                    )}
                  </div>
                  <div className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                    {timeAgo(item.fechaHora)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
