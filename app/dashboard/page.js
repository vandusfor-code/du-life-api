'use client';

import { useEffect, useState, useCallback, memo } from 'react';
import Link from 'next/link';
import {
  IconBell, IconSparkles, IconChevronRight,
  IconCircleCheck, IconWallet, IconTarget, IconNote, IconBulb, IconUsers,
  IconSquareCheck, IconBrandWhatsapp,
} from '@tabler/icons-react';
import Avatar from '../../components/Avatar';
import ProfileSheet from '../../components/ProfileSheet';
import { useAutoRefresh } from '../../components/useAutoRefresh';

const WHATSAPP_LINK = 'https://wa.me/573239117508';
const NOTIFICACIONES_MOCK = 3;

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

function calcularAnimo(tareasPendientes, recordatoriosHoy) {
  const total = tareasPendientes + recordatoriosHoy;
  if (total === 0) return { palabra: 'tranquilo', emoji: '🌿' };
  if (total <= 3) return { palabra: 'productivo', emoji: '🌿' };
  return { palabra: 'intenso', emoji: '🔥' };
}

function construirResumenTexto(tareasPendientes, recordatoriosHoy) {
  const partes = [];
  if (tareasPendientes > 0) {
    partes.push(`${tareasPendientes} tarea${tareasPendientes === 1 ? '' : 's'}`);
  }
  if (recordatoriosHoy > 0) {
    partes.push(`${recordatoriosHoy} recordatorio${recordatoriosHoy === 1 ? '' : 's'} para hoy`);
  }
  if (partes.length === 0) return 'No tienes pendientes por ahora. Aprovecha para descansar.';
  if (partes.length === 1) return `Tienes ${partes[0]}.`;
  return `Tienes ${partes[0]} y ${partes[1]}.`;
}

function timeAgo(fechaISO) {
  if (!fechaISO) return '';
  const diffMs = Date.now() - new Date(fechaISO).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'hace un momento';
  if (mins < 60) return `hace ${mins} min`;
  const horas = Math.floor(mins / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return 'ayer';
  if (dias < 7) return `hace ${dias} días`;
  return new Date(fechaISO).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

const TIPO_CONFIG = {
  gasto: { label: 'Gasto', color: '#4ADE80', icon: IconWallet },
  idea: { label: 'Idea', color: '#FB923C', icon: IconBulb },
  persona: { label: 'Persona', color: '#A78BFA', icon: IconUsers },
  nota: { label: 'Nota', color: '#C4E938', icon: IconNote },
  tarea: { label: 'Tarea', color: '#2DD4BF', icon: IconSquareCheck },
};

// ────────────────────────────────────────────
// Ilustración de paisaje (SVG estático, sin dependencias)
// ────────────────────────────────────────────

const PaisajeSVG = memo(function PaisajeSVG() {
  return (
    <svg
      viewBox="0 0 400 220"
      preserveAspectRatio="xMidYMax slice"
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      <defs>
        <radialGradient id="solCore" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFE066" />
          <stop offset="100%" stopColor="#F59E0B" />
        </radialGradient>
        <radialGradient id="solGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="overlayIzq" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0F1508" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#0F1508" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#0F1508" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Nubes */}
      <g fill="#9CA3AF" opacity="0.4">
        <ellipse cx="120" cy="45" rx="22" ry="10" />
        <ellipse cx="138" cy="40" rx="16" ry="9" />
        <ellipse cx="345" cy="38" rx="20" ry="9" />
        <ellipse cx="362" cy="34" rx="14" ry="7" />
      </g>

      {/* Sol */}
      <circle cx="300" cy="85" r="46" fill="url(#solGlow)" />
      <circle cx="300" cy="85" r="24" fill="url(#solCore)" />

      {/* Colina trasera */}
      <path d="M0,150 Q100,110 210,140 T400,125 L400,220 L0,220 Z" fill="#1F3D1A" opacity="0.85" />
      {/* Colina delantera */}
      <path d="M0,180 Q130,135 230,165 T400,155 L400,220 L0,220 Z" fill="#2D5A24" />

      {/* Árboles */}
      <g fill="#153016">
        <rect x="58" y="163" width="4" height="14" />
        <circle cx="60" cy="158" r="10" />
        <rect x="108" y="156" width="4" height="14" />
        <circle cx="110" cy="151" r="9" />
        <rect x="248" y="150" width="4" height="14" />
        <circle cx="250" cy="145" r="10" />
        <rect x="288" y="155" width="4" height="14" />
        <circle cx="290" cy="150" r="9" />
      </g>

      {/* Overlay oscuro a la izquierda para legibilidad del texto */}
      <rect x="0" y="0" width="400" height="220" fill="url(#overlayIzq)" />
    </svg>
  );
});

export default function DashboardInicio() {
  const [data, setData] = useState(null);
  const [ideas, setIdeas] = useState([]);
  const [personas, setPersonas] = useState([]);
  const [notas, setNotas] = useState([]);
  const [tareas, setTareas] = useState([]);
  const [usuario, setUsuario] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);

  const cargarDatos = useCallback(() => {
    Promise.all([
      fetch('/api/dashboard/gastos').then((r) => r.json()),
      fetch('/api/dashboard/resumen').then((r) => r.json()),
      fetch('/api/dashboard/ideas').then((r) => r.json()),
      fetch('/api/dashboard/personas').then((r) => r.json()),
      fetch('/api/dashboard/notas').then((r) => r.json()),
      fetch('/api/dashboard/tareas').then((r) => r.json()),
    ])
      .then(([gastosData, resumenData, ideasData, personasData, notasData, tareasData]) => {
        setData(gastosData);
        setUsuario(resumenData.usuario);
        setResumen(resumenData.resumen);
        setIdeas(ideasData.ideas || []);
        setPersonas(personasData.personas || []);
        setNotas(notasData.notas || []);
        setTareas(tareasData.tareas || []);
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

  const nombre = usuario?.como_llamar || usuario?.nombre || 'Duvan';

  if (loading) {
    return (
      <div className="px-5 pt-4 pb-32">
        <div className="flex justify-between items-center mb-5">
          <div className="h-7 w-28 rounded animate-pulse" style={{ background: '#1A1A1A' }} />
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full animate-pulse" style={{ background: '#1A1A1A' }} />
            <div className="w-10 h-10 rounded-full animate-pulse" style={{ background: '#1A1A1A' }} />
          </div>
        </div>
        <div className="h-8 w-56 rounded animate-pulse mb-2" style={{ background: '#1A1A1A' }} />
        <div className="h-4 w-40 rounded animate-pulse mb-5" style={{ background: '#1A1A1A' }} />
        <div className="rounded-hero h-[220px] animate-pulse" style={{ background: '#1A1A1A' }} />
        <div className="grid grid-cols-2 gap-3 mt-3.5">
          <div className="rounded-card h-[100px] animate-pulse" style={{ background: '#1A1A1A' }} />
          <div className="rounded-card h-[100px] animate-pulse" style={{ background: '#1A1A1A' }} />
          <div className="rounded-card h-[100px] animate-pulse" style={{ background: '#1A1A1A' }} />
          <div className="rounded-card h-[100px] animate-pulse" style={{ background: '#1A1A1A' }} />
        </div>
        <div className="rounded-card h-[220px] mt-6 animate-pulse" style={{ background: '#1A1A1A' }} />
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

  const animo = calcularAnimo(resumenSeguro.tareas_pendientes, resumenSeguro.recordatorios_hoy);
  const resumenTexto = construirResumenTexto(resumenSeguro.tareas_pendientes, resumenSeguro.recordatorios_hoy);

  const fechaHoy = capitalizar(
    new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
  );

  const h = new Date().getHours();
  const saludo = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';

  const METRICAS = [
    {
      valor: resumenSeguro.tareas_pendientes, label: 'Tareas pendientes',
      icon: IconCircleCheck, color: '#A78BFA', bg: 'rgba(167,139,250,0.15)',
    },
    {
      valor: resumenSeguro.recordatorios_hoy, label: 'Recordatorios hoy',
      icon: IconBell, color: '#FB923C', bg: 'rgba(251,146,60,0.15)',
    },
    {
      valor: formatCOPCorto(gastosSemana), label: 'Gastos esta semana',
      icon: IconWallet, color: '#4ADE80', bg: 'rgba(74,222,128,0.15)',
    },
    {
      valor: resumenSeguro.metas_activas, label: 'Metas activas',
      icon: IconTarget, color: '#60A5FA', bg: 'rgba(96,165,250,0.15)',
    },
  ];

  // Timeline corto: mezclar gastos + ideas + personas + notas + tareas, ordenar desc, top 5
  const timelineCorto = [
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
    ...personas.map((p) => ({
      id: `persona-${p.id}`,
      tipo: 'persona',
      titulo: p.nombre,
      subtitulo: p.descripcion || '',
      fechaHora: new Date(p.creado_en),
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
    .slice(0, 5);

  return (
    <div className="px-5 pt-4 pb-32">

      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <div className="relative flex items-center">
          <span className="text-xl font-bold tracking-tight" style={{ color: '#C4E938' }}>
            Du
          </span>
          <span className="text-xl font-bold tracking-tight text-white">&nbsp;Life</span>
          <IconSparkles size={14} color="#C4E938" style={{ marginLeft: '2px', marginTop: '-14px' }} />
        </div>
        <div className="flex items-center gap-2">
          <button
            className="relative w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}
          >
            <IconBell size={18} color="#fff" />
            {NOTIFICACIONES_MOCK > 0 && (
              <div
                className="absolute flex items-center justify-center rounded-full"
                style={{ width: '16px', height: '16px', background: '#C4E938', top: '-2px', right: '-2px' }}
              >
                <span className="font-bold" style={{ fontSize: '9px', color: '#0A0A0A' }}>
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

      {/* Saludo */}
      <div className="text-[22px] font-bold tracking-tight text-white">
        {saludo}, <span style={{ color: '#C4E938' }}>{nombre}</span>
      </div>
      <div className="text-[13px] text-muted mt-0.5 mb-5">{fechaHoy}</div>

      {/* Hero: Resumen de hoy */}
      <div className="rounded-hero relative overflow-hidden" style={{ height: '220px' }}>
        <div className="absolute inset-0">
          <PaisajeSVG />
        </div>
        <div className="relative z-10 h-full flex flex-col justify-between p-5">
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full w-fit"
            style={{ background: 'rgba(255,255,255,0.12)' }}
          >
            <IconSparkles size={13} color="#fff" />
            <span className="text-[12px] font-bold text-white">Resumen de hoy</span>
          </div>

          <div>
            <div className="text-[20px] font-bold tracking-tight text-white leading-snug">
              Hoy será un día{' '}
              <span style={{ color: '#C4E938' }}>
                {animo.palabra} {animo.emoji}
              </span>
            </div>
            <div className="text-[13px] mt-1.5" style={{ color: 'rgba(255,255,255,0.65)' }}>
              {resumenTexto}
            </div>
            <button
              className="mt-3 flex items-center gap-1 px-4 py-2 rounded-full text-[13px] font-bold text-white"
              style={{ border: '1px solid rgba(255,255,255,0.4)' }}
            >
              Ver detalles <IconChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Grid de métricas */}
      <div className="grid grid-cols-2 gap-3 mt-3.5">
        {METRICAS.map((m) => (
          <div
            key={m.label}
            className="rounded-card p-3.5"
            style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: m.bg }}
              >
                <m.icon size={17} color={m.color} />
              </div>
              <div className="text-[19px] font-bold tracking-tight text-white">{m.valor}</div>
            </div>
            <div className="text-[12px] text-muted mt-2.5">{m.label}</div>
            <div className="h-[3px] rounded-full mt-2" style={{ background: '#242424' }}>
              <div className="h-full rounded-full" style={{ width: '55%', background: m.color }} />
            </div>
          </div>
        ))}
      </div>

      {/* Tu timeline */}
      <Link href="/dashboard/timeline" prefetch className="flex justify-between items-center mt-6 mb-3">
        <div>
          <div className="text-[17px] font-bold tracking-tight text-white">Tu timeline</div>
          <div className="text-[12px] text-muted mt-0.5">Todo lo que has registrado últimamente</div>
        </div>
        <span
          className="flex items-center gap-0.5 px-3 py-1.5 rounded-full text-[12px] font-bold flex-shrink-0"
          style={{ border: '1px solid #C4E938', color: '#C4E938' }}
        >
          Ver todo <IconChevronRight size={13} />
        </span>
      </Link>

      {timelineCorto.length === 0 ? (
        <div
          className="rounded-card p-6 text-center text-muted text-[13px]"
          style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}
        >
          Aún no has registrado nada. Cuéntale a Du Life por WhatsApp.
        </div>
      ) : (
        <div className="flex">
          <div className="flex flex-col items-center pt-1" style={{ width: '68px' }}>
            {timelineCorto.map((item, i) => (
              <div key={item.id} className="flex flex-col items-center" style={{ minHeight: '92px' }}>
                <div className="text-[10px] text-soft text-center leading-tight">{timeAgo(item.fechaHora)}</div>
                <div
                  className="w-1.5 h-1.5 rounded-full mt-1.5"
                  style={{ background: TIPO_CONFIG[item.tipo]?.color || '#71717A' }}
                />
                {i < timelineCorto.length - 1 && (
                  <div className="flex-1 w-px mt-1" style={{ background: '#242424' }} />
                )}
              </div>
            ))}
          </div>
          <div className="flex-1 min-w-0 flex flex-col gap-2.5">
            {timelineCorto.map((item) => {
              const cfg = TIPO_CONFIG[item.tipo] || { label: item.tipo, color: '#71717A', icon: IconNote };
              const Icon = cfg.icon;
              return (
                <div
                  key={item.id}
                  className="rounded-card p-3.5 flex items-center gap-3"
                  style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', minHeight: '76px' }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: `${cfg.color}26` }}
                  >
                    <Icon size={18} color={cfg.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold" style={{ color: cfg.color }}>
                      {cfg.label}
                    </div>
                    <div className="text-[14px] font-bold text-white truncate">{item.titulo}</div>
                    {item.subtitulo && (
                      <div className="text-[12px] text-soft truncate mt-0.5">{item.subtitulo}</div>
                    )}
                  </div>
                  {item.tipo === 'gasto' && (
                    <div className="text-[14px] font-bold flex-shrink-0" style={{ color: '#fff' }}>
                      -{formatCOP(item.monto)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="text-center text-[13px] text-muted mt-6">
        Así es tu vida, día a día 🖤
      </div>

      {/* Botón flotante WhatsApp */}
      <a
        href={WHATSAPP_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-24 left-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-lime active:scale-90 transition-transform duration-150"
        style={{ boxShadow: '0 0 16px rgba(196,233,56,0.4)' }}
      >
        <IconBrandWhatsapp size={24} color="#000000" />
      </a>

      <ProfileSheet
        open={showProfile}
        onClose={() => setShowProfile(false)}
        nombre={nombre}
        telefono={usuario?.telefono}
        plan={usuario?.plan}
      />

    </div>
  );
}
