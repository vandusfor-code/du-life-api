'use client';

import { useEffect, useState, useCallback, memo } from 'react';
import Link from 'next/link';
import {
  IconArrowLeft, IconDotsVertical, IconTree, IconActivity, IconBookmark,
  IconTarget, IconUsers, IconTrophy, IconStar, IconBulb, IconBook, IconNote,
  IconAlertTriangle, IconCoin, IconSparkles, IconCalendar, IconHeart, IconCircle,
  IconChevronRight,
} from '@tabler/icons-react';
import { useAutoRefresh } from '../../../components/useAutoRefresh';

const TABS = [
  { id: 'arbol', label: 'Vista árbol', icon: IconTree },
  { id: 'tiempo', label: 'Línea de tiempo', icon: IconActivity },
  { id: 'momentos', label: 'Momentos', icon: IconBookmark },
];

const CATEGORIAS_CONFIG = [
  { key: 'metas', label: 'Metas', icon: IconTarget, color: '#C4E938' },
  { key: 'personas', label: 'Personas', icon: IconUsers, color: '#A78BFA' },
  { key: 'logros', label: 'Logros', icon: IconTrophy, color: '#FBBF24' },
  { key: 'experiencias', label: 'Experiencias', icon: IconStar, color: '#60A5FA' },
  { key: 'ideas', label: 'Ideas', icon: IconBulb, color: '#FB923C' },
  { key: 'aprendizajes', label: 'Aprendizajes', icon: IconBook, color: '#22D3EE' },
  { key: 'notas', label: 'Notas', icon: IconNote, color: '#818CF8' },
  { key: 'retos', label: 'Retos', icon: IconAlertTriangle, color: '#F87171' },
  { key: 'finanzas', label: 'Finanzas', icon: IconCoin, color: '#4ADE80' },
];

const POSICIONES = [
  { top: '0px', left: '50%', transform: 'translateX(-50%)' },
  { top: '38px', left: '0px' },
  { top: '38px', right: '0px' },
  { top: '94px', left: '-8px' },
  { top: '94px', right: '-8px' },
  { top: '150px', left: '-14px' },
  { top: '150px', right: '-14px' },
  { top: '206px', left: '2px' },
  { top: '206px', right: '0px' },
];

const RAMAS_CONFIG = [
  { angulo: 42, longitud: 78 },
  { angulo: 68, longitud: 74 },
  { angulo: 96, longitud: 68 },
  { angulo: 122, longitud: 62 },
];

const RAICES_CONFIG = [
  { angulo: -70, longitud: 58 },
  { angulo: -35, longitud: 48 },
  { angulo: 0, longitud: 38 },
  { angulo: 35, longitud: 48 },
  { angulo: 70, longitud: 58 },
];

const LEAF_DELAYS = [0, 0.5, 1.2, 0.8, 0.3, 1.5, 0.6, 1.0];

const ArbolSVG = memo(function ArbolSVG({ inicial }) {
  const W = 360;
  const H = 420;
  const cx = W / 2;
  const trunkBaseY = 388;
  const trunkTopY = 172;
  const centerY = (trunkBaseY + trunkTopY) / 2;

  const ramas = [];
  RAMAS_CONFIG.forEach(({ angulo, longitud }) => {
    const rad = (angulo * Math.PI) / 180;
    [-1, 1].forEach((lado) => {
      const dirX = Math.sin(rad) * lado;
      const dirY = -Math.cos(rad);
      const x2 = cx + dirX * longitud;
      const y2 = trunkTopY + dirY * longitud;
      const midX = cx + dirX * longitud * 0.55;
      const midY = trunkTopY + dirY * longitud * 0.45 - 8;
      ramas.push({ x2, y2, midX, midY });
    });
  });

  const raices = RAICES_CONFIG.map(({ angulo, longitud }) => {
    const rad = (angulo * Math.PI) / 180;
    const endX = cx + Math.sin(rad) * longitud;
    const endY = trunkBaseY + Math.cos(rad) * longitud * 0.3 + 8;
    const ctrlX = cx + Math.sin(rad) * longitud * 0.5;
    const ctrlY = trunkBaseY + 8;
    const midX = 0.25 * cx + 0.5 * ctrlX + 0.25 * endX;
    const midY = 0.25 * trunkBaseY + 0.5 * ctrlY + 0.25 * endY;
    return { endX, endY, ctrlX, ctrlY, midX, midY };
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%', display: 'block' }}>
      <defs>
        <filter id="subtleGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <style>{`
        @keyframes nodePulse { 0%,100%{ opacity:.9 } 50%{ opacity:1 } }
        @keyframes leafBreath { 0%,100%{ transform: scale(1); } 50%{ transform: scale(1.3); } }
        .arbol-node-center { animation: nodePulse 4s ease-in-out infinite; }
        .arbol-hoja { animation: leafBreath 3.6s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
      `}</style>

      {/* Raíces cónicas (2 segmentos: grueso cerca del tronco, fino en la punta) */}
      <g stroke="#C4E938" fill="none" strokeLinecap="round" opacity="0.5">
        {raices.map((r, i) => (
          <g key={i}>
            <path d={`M ${cx} ${trunkBaseY} Q ${r.ctrlX} ${r.ctrlY} ${r.midX} ${r.midY}`} strokeWidth="5" />
            <path
              d={`M ${r.midX} ${r.midY} Q ${(r.midX + r.endX) / 2} ${(r.midY + r.endY) / 2 + 3} ${r.endX} ${r.endY}`}
              strokeWidth="1.5"
            />
          </g>
        ))}
      </g>

      {/* Tronco */}
      <path
        d={`M ${cx - 10} ${trunkBaseY} Q ${cx - 8} ${(trunkBaseY + trunkTopY) / 2} ${cx - 4} ${trunkTopY} L ${cx + 4} ${trunkTopY} Q ${cx + 8} ${(trunkBaseY + trunkTopY) / 2} ${cx + 10} ${trunkBaseY} Z`}
        fill="#C4E938"
        opacity="0.9"
        filter="url(#subtleGlow)"
      />

      {/* Ramas */}
      {ramas.map((r, i) => (
        <path
          key={i}
          d={`M ${cx} ${trunkTopY} Q ${r.midX} ${r.midY} ${r.x2} ${r.y2}`}
          stroke="#C4E938"
          strokeWidth={6 - (i % 4) * 0.4}
          fill="none"
          strokeLinecap="round"
          opacity="0.85"
          filter="url(#subtleGlow)"
        />
      ))}

      {/* Hojas en las puntas */}
      {ramas.map((r, i) => (
        <g key={`h-${i}`}>
          <circle
            className="arbol-hoja"
            cx={r.x2} cy={r.y2} r="3.5" fill="#C4E938"
            style={{ animationDelay: `${LEAF_DELAYS[i % LEAF_DELAYS.length]}s` }}
          />
          <circle
            className="arbol-hoja"
            cx={(r.x2 + r.midX) / 2 + 4} cy={(r.y2 + r.midY) / 2 - 4} r="3" fill="#C4E938"
            style={{ animationDelay: `${LEAF_DELAYS[(i + 3) % LEAF_DELAYS.length]}s` }}
          />
        </g>
      ))}

      {/* Nodo central */}
      <circle className="arbol-node-center" cx={cx} cy={centerY} r="28" fill="#000" stroke="#C4E938" strokeWidth="3" />
      <text x={cx} y={centerY + 7} textAnchor="middle" fontSize="24" fontWeight="800" fill="#C4E938">
        {inicial}
      </text>
    </svg>
  );
});

function NodoPill({ icon: Icon, label, count, color, style }) {
  return (
    <div
      className="absolute flex items-center gap-1.5 rounded-[20px]"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '6px 12px', whiteSpace: 'nowrap', ...style }}
    >
      <Icon size={13} color={color} />
      <span className="text-[11px] font-bold text-ink">{label}</span>
      <span className="text-[11px] font-bold" style={{ color }}>{count}</span>
    </div>
  );
}

export default function ArbolPage() {
  const [data, setData] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('arbol');

  const cargarDatos = useCallback(() => {
    Promise.all([
      fetch('/api/dashboard/arbol').then((r) => r.json()),
      fetch('/api/dashboard/resumen').then((r) => r.json()),
    ])
      .then(([arbolData, resumenData]) => {
        setData(arbolData);
        setUsuario(resumenData.usuario);
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

  const nombre = usuario?.como_llamar || usuario?.nombre || '';
  const inicial = nombre.charAt(0).toUpperCase();

  if (loading) {
    return (
      <div className="px-5 pt-4 pb-[calc(4rem+env(safe-area-inset-bottom)+16px)] lg:max-w-4xl lg:mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-full animate-pulse" style={{ background: 'var(--bg-card)' }} />
          <div className="w-10 h-10 rounded-full animate-pulse" style={{ background: 'var(--bg-card)' }} />
        </div>
        <div className="h-7 w-44 rounded animate-pulse mb-2" style={{ background: 'var(--bg-card)' }} />
        <div className="h-4 w-52 rounded animate-pulse mb-4" style={{ background: 'var(--bg-card)' }} />
        <div className="rounded-card h-[36px] animate-pulse mb-4" style={{ background: 'var(--bg-card)' }} />
        <div className="rounded-hero h-[320px] animate-pulse" style={{ background: 'var(--bg-card)' }} />
        <div className="rounded-card h-[90px] mt-4 animate-pulse" style={{ background: 'var(--bg-card)' }} />
      </div>
    );
  }

  const categorias = data?.categorias || {
    metas: 0, personas: 0, logros: 0, experiencias: 0, ideas: 0,
    aprendizajes: 0, notas: 0, retos: 0, finanzas: 0,
  };
  const momentos = data?.momentos || 0;
  const diasHistoria = data?.dias_historia || 0;

  const STATS = [
    { icon: IconCalendar, color: '#C4E938', valor: diasHistoria, label: 'Días de tu historia' },
    { icon: IconSparkles, color: '#4ADE80', valor: momentos, label: 'Momentos registrados' },
    { icon: IconHeart, color: '#F87171', valor: categorias.personas, label: 'Personas importantes' },
    { icon: IconCircle, color: '#FBBF24', valor: categorias.metas, label: 'Metas activas' },
  ];

  return (
    <div className="px-5 pt-4 pb-[calc(4rem+env(safe-area-inset-bottom)+16px)] lg:max-w-4xl lg:mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/dashboard"
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          <IconArrowLeft size={18} color="var(--text-primary)" />
        </Link>
        <button
          type="button"
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          <IconDotsVertical size={18} color="var(--text-primary)" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <div className="text-[22px] font-bold tracking-tight text-ink">Árbol de vida</div>
        <IconTree size={19} color="#C4E938" />
      </div>
      <div className="text-[12px] text-muted mt-0.5 mb-3">Tu historia, visualizada y conectada.</div>

      {/* Tabs */}
      <div className="flex rounded-full p-1 mb-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', height: '36px' }}>
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 flex items-center justify-center gap-1 rounded-full overflow-hidden"
              style={{
                background: active ? '#242424' : 'transparent',
                color: active ? '#C4E938' : 'var(--text-secondary)',
                fontSize: '11px',
                fontWeight: 500,
                padding: '0 6px',
                whiteSpace: 'nowrap',
                borderBottom: active ? '2px solid #C4E938' : '2px solid transparent',
              }}
            >
              <t.icon size={13} className="flex-shrink-0" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab !== 'arbol' ? (
        <div
          className="rounded-card p-8 text-center"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          <div className="text-[14px] font-bold text-ink mb-2">Próximamente</div>
          <div className="text-[13px] text-muted leading-relaxed">
            {tab === 'tiempo'
              ? 'Pronto podrás ver la línea de tiempo de tu árbol aquí.'
              : 'Pronto podrás guardar y revisar tus momentos destacados aquí.'}
          </div>
        </div>
      ) : (
        <>
          {/* Árbol + nodos flotantes */}
          <div
            className="rounded-hero relative overflow-visible"
            style={{ background: '#0A0A0A', border: '1px solid var(--border-color)', height: '290px' }}
          >
            <div className="relative" style={{ height: '232px', marginTop: '28px' }}>
              {CATEGORIAS_CONFIG.map((c, i) => (
                <NodoPill
                  key={c.key}
                  icon={c.icon}
                  label={c.label}
                  count={categorias[c.key] || 0}
                  color={c.color}
                  style={POSICIONES[i]}
                />
              ))}
              <div
                style={{
                  position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                  width: '78%', aspectRatio: '360 / 420', zIndex: 0,
                }}
              >
                <ArbolSVG inicial={inicial} />
              </div>
            </div>

            <div
              className="absolute flex items-center gap-1.5 rounded-[20px]"
              style={{
                background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '6px 14px',
                bottom: '6px', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap',
              }}
            >
              <span className="text-[12px] font-bold text-ink">{momentos} momentos</span>
              <IconSparkles size={13} color="#C4E938" />
            </div>
          </div>

          {/* Resumen de tu historia */}
          <div className="rounded-card mt-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '12px' }}>
            <div className="text-[13px] font-bold text-ink mb-3">Resumen de tu historia</div>
            <div className="grid grid-cols-4 gap-1">
              {STATS.map((s, i) => (
                <div
                  key={s.label}
                  className="text-center px-1"
                  style={{ borderLeft: i > 0 ? '1px solid #242424' : 'none' }}
                >
                  <div className="flex justify-center mb-1">
                    <s.icon size={16} color={s.color} />
                  </div>
                  <div className="font-bold text-ink leading-tight" style={{ fontSize: '20px' }}>
                    {s.valor}
                  </div>
                  <div className="text-[11px] text-soft mt-0.5 leading-tight">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Insight */}
          <div className="rounded-card p-3 mt-3 flex items-center gap-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <div
              className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center flex-shrink-0"
              style={{ background: '#C4E938' }}
            >
              <IconSparkles size={17} color="#0A0A0A" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#C4E938' }}>
                Insight de tu árbol
              </div>
              <div className="text-[12px] font-bold text-ink mt-0.5 leading-snug">
                Este mes has crecido especialmente en aprendizajes y finanzas.
              </div>
            </div>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: '#C4E938' }}
            >
              <IconChevronRight size={16} color="#0A0A0A" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
