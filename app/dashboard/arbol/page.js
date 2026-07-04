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
  { top: '58px', left: '0px' },
  { top: '58px', right: '0px' },
  { top: '150px', left: '-10px' },
  { top: '150px', right: '-10px' },
  { top: '242px', left: '-16px' },
  { top: '242px', right: '-16px' },
  { top: '332px', left: '2px' },
  { top: '332px', right: '0px' },
];

const LEAF_POSITIONS = [
  { x: 150, y: 55, r: 13, o: 0.32 }, { x: 128, y: 72, r: 10, o: 0.28 }, { x: 172, y: 68, r: 11, o: 0.3 },
  { x: 88, y: 108, r: 15, o: 0.28 }, { x: 66, y: 92, r: 10, o: 0.26 }, { x: 212, y: 98, r: 14, o: 0.28 },
  { x: 232, y: 88, r: 9, o: 0.26 }, { x: 58, y: 138, r: 11, o: 0.22 }, { x: 242, y: 132, r: 12, o: 0.24 },
  { x: 108, y: 62, r: 8, o: 0.28 }, { x: 190, y: 58, r: 8, o: 0.28 }, { x: 150, y: 38, r: 10, o: 0.3 },
  { x: 42, y: 112, r: 8, o: 0.22 }, { x: 258, y: 112, r: 8, o: 0.22 }, { x: 118, y: 96, r: 7, o: 0.26 },
  { x: 182, y: 96, r: 7, o: 0.26 },
];

const ArbolSVG = memo(function ArbolSVG({ inicial }) {
  const W = 300;
  const H = 380;
  const cx = W / 2;
  const trunkBaseY = H - 30;
  const trunkTopY = H * 0.42;
  const centerY = H * 0.5;

  const ramas = [-95, -60, -25, 25, 60, 95].map((angle, i) => {
    const rad = (angle * Math.PI) / 180;
    const len = 85 + (i % 2) * 22;
    const x2 = cx + Math.sin(rad) * len * 0.9;
    const y2 = trunkTopY - Math.cos(rad) * len * 0.9;
    const midX = cx + Math.sin(rad) * len * 0.5;
    const midY = trunkTopY - Math.cos(rad) * len * 0.5 - 8;
    return { x2, y2, midX, midY };
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%', display: 'block' }}>
      <defs>
        <filter id="glowBlur" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id="glowBlurSoft" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <linearGradient id="trunkGradArbol" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#C4E938" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#C4E938" stopOpacity="1" />
        </linearGradient>
      </defs>

      {/* Raíces */}
      <g stroke="#C4E938" strokeWidth="2" fill="none" opacity="0.45" filter="url(#glowBlurSoft)">
        <path d={`M ${cx - 4} ${trunkBaseY} Q ${cx - 40} ${trunkBaseY + 18} ${cx - 72} ${trunkBaseY + 42}`} />
        <path d={`M ${cx - 2} ${trunkBaseY} Q ${cx - 14} ${trunkBaseY + 24} ${cx - 24} ${trunkBaseY + 52}`} />
        <path d={`M ${cx + 2} ${trunkBaseY} Q ${cx + 14} ${trunkBaseY + 24} ${cx + 24} ${trunkBaseY + 52}`} />
        <path d={`M ${cx + 4} ${trunkBaseY} Q ${cx + 40} ${trunkBaseY + 18} ${cx + 72} ${trunkBaseY + 42}`} />
      </g>

      {/* Tronco con glow */}
      <path
        d={`M ${cx - 9} ${trunkBaseY} Q ${cx - 7} ${(trunkBaseY + trunkTopY) / 2} ${cx - 5} ${trunkTopY} L ${cx + 5} ${trunkTopY} Q ${cx + 7} ${(trunkBaseY + trunkTopY) / 2} ${cx + 9} ${trunkBaseY} Z`}
        fill="url(#trunkGradArbol)"
        filter="url(#glowBlur)"
      />
      <path
        d={`M ${cx - 9} ${trunkBaseY} Q ${cx - 7} ${(trunkBaseY + trunkTopY) / 2} ${cx - 5} ${trunkTopY} L ${cx + 5} ${trunkTopY} Q ${cx + 7} ${(trunkBaseY + trunkTopY) / 2} ${cx + 9} ${trunkBaseY} Z`}
        fill="url(#trunkGradArbol)"
      />

      {/* Ramas */}
      {ramas.map((r, i) => (
        <path
          key={i}
          d={`M ${cx} ${trunkTopY} Q ${r.midX} ${r.midY} ${r.x2} ${r.y2}`}
          stroke="#C4E938"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          opacity="0.85"
          filter="url(#glowBlurSoft)"
        />
      ))}

      {/* Hojas difusas */}
      <g filter="url(#glowBlur)">
        {LEAF_POSITIONS.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={p.r} fill="#C4E938" opacity={p.o} />
        ))}
      </g>

      {/* Centro con inicial */}
      <circle cx={cx} cy={centerY} r="30" fill="#0A0A0A" stroke="#C4E938" strokeWidth="2" filter="url(#glowBlurSoft)" />
      <circle cx={cx} cy={centerY} r="30" fill="#0A0A0A" stroke="#C4E938" strokeWidth="2" />
      <text x={cx} y={centerY + 8} textAnchor="middle" fontSize="26" fontWeight="800" fill="#C4E938">
        {inicial}
      </text>
    </svg>
  );
});

function NodoPill({ icon: Icon, label, count, color, style }) {
  return (
    <div
      className="absolute flex items-center gap-1.5 px-3 py-2 rounded-full"
      style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', whiteSpace: 'nowrap', ...style }}
    >
      <Icon size={14} color={color} />
      <span className="text-[12px] font-bold text-white">{label}</span>
      <span className="text-[12px] font-bold" style={{ color }}>{count}</span>
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

  const nombre = usuario?.como_llamar || usuario?.nombre || 'Duvan';
  const inicial = nombre.charAt(0).toUpperCase();

  if (loading) {
    return (
      <div className="px-5 pt-4 pb-32">
        <div className="flex items-center justify-between mb-5">
          <div className="w-10 h-10 rounded-full animate-pulse" style={{ background: '#1A1A1A' }} />
          <div className="w-10 h-10 rounded-full animate-pulse" style={{ background: '#1A1A1A' }} />
        </div>
        <div className="h-8 w-48 rounded animate-pulse mb-2" style={{ background: '#1A1A1A' }} />
        <div className="h-4 w-56 rounded animate-pulse mb-5" style={{ background: '#1A1A1A' }} />
        <div className="rounded-card h-[46px] animate-pulse mb-5" style={{ background: '#1A1A1A' }} />
        <div className="rounded-hero h-[480px] animate-pulse" style={{ background: '#1A1A1A' }} />
        <div className="rounded-card h-[110px] mt-5 animate-pulse" style={{ background: '#1A1A1A' }} />
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
    <div className="px-5 pt-4 pb-32">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <Link
          href="/dashboard"
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}
        >
          <IconArrowLeft size={18} color="#fff" />
        </Link>
        <button
          type="button"
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}
        >
          <IconDotsVertical size={18} color="#fff" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <div className="text-[26px] font-bold tracking-tight text-white">Árbol de vida</div>
        <IconTree size={22} color="#C4E938" />
      </div>
      <div className="text-[13px] text-muted mt-1 mb-4">Tu historia, visualizada y conectada.</div>

      {/* Tabs */}
      <div className="flex rounded-full p-1 mb-5" style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}>
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-[12px] font-bold"
              style={{
                background: active ? '#242424' : 'transparent',
                color: active ? '#C4E938' : '#71717A',
                borderBottom: active ? '2px solid #C4E938' : '2px solid transparent',
              }}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab !== 'arbol' ? (
        <div
          className="rounded-card p-8 text-center"
          style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}
        >
          <div className="text-[14px] font-bold text-white mb-2">Próximamente</div>
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
            style={{ background: '#0A0A0A', border: '1px solid #2A2A2A', height: '480px', padding: '0 24px' }}
          >
            <div className="relative" style={{ height: '380px', marginTop: '54px' }}>
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
              <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                <ArbolSVG inicial={inicial} />
              </div>
            </div>

            <div
              className="absolute flex items-center gap-1.5 px-4 py-2 rounded-full"
              style={{
                background: '#1A1A1A', border: '1px solid #2A2A2A',
                bottom: '10px', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap',
              }}
            >
              <span className="text-[13px] font-bold text-white">{momentos} momentos</span>
              <IconSparkles size={14} color="#C4E938" />
            </div>
          </div>

          {/* Resumen de tu historia */}
          <div className="rounded-card p-4 mt-5" style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}>
            <div className="text-[15px] font-bold text-white mb-4">Resumen de tu historia</div>
            <div className="grid grid-cols-4 gap-1">
              {STATS.map((s, i) => (
                <div
                  key={s.label}
                  className="text-center px-1"
                  style={{ borderLeft: i > 0 ? '1px solid #242424' : 'none' }}
                >
                  <div className="flex justify-center mb-1.5">
                    <s.icon size={18} color={s.color} />
                  </div>
                  <div className="text-[18px] font-bold text-white leading-tight">{s.valor}</div>
                  <div className="text-[10px] text-soft mt-1 leading-tight">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Insight */}
          <div className="rounded-card p-3.5 mt-4 flex items-center gap-3" style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}>
            <div
              className="w-[38px] h-[38px] rounded-[11px] flex items-center justify-center flex-shrink-0"
              style={{ background: '#C4E938' }}
            >
              <IconSparkles size={19} color="#0A0A0A" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: '#C4E938' }}>
                Insight de tu árbol
              </div>
              <div className="text-[13px] font-bold text-white mt-0.5 leading-snug">
                Este mes has crecido especialmente en aprendizajes y finanzas.
              </div>
            </div>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: '#C4E938' }}
            >
              <IconChevronRight size={18} color="#0A0A0A" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
