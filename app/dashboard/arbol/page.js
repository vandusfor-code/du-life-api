'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { IconArrowLeft } from '@tabler/icons-react';
import { useAutoRefresh } from '../../../components/useAutoRefresh';

export default function ArbolPage() {
  const router = useRouter();
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [animKey, setAnimKey] = useState(0);

  const cargarDatos = () => {
    fetch('/api/dashboard/arbol')
      .then((r) => r.json())
      .then((d) => {
        setAreas(d.areas || []);
        setLoading(false);
        setAnimKey((k) => k + 1);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  useAutoRefresh(cargarDatos);

  const { ramas, totalEntidades } = useMemo(() => {
    if (!areas.length) return { ramas: [], totalEntidades: 0 };

    const mapa = {};
    for (const a of areas) {
      const key = a.rama || 'otros';
      if (!mapa[key]) {
        mapa[key] = {
          rama: key,
          icono: a.icono || '🌳',
          color: a.color || '#C4E938',
          count: 0,
          importancia_total: 0,
          ultima_actualizacion: a.actualizado_en,
        };
      }
      mapa[key].count += 1;
      mapa[key].importancia_total += (a.importancia || 0);
      if (a.actualizado_en > mapa[key].ultima_actualizacion) {
        mapa[key].ultima_actualizacion = a.actualizado_en;
      }
    }

    const listaRamas = Object.values(mapa).sort((a, b) => b.count - a.count);
    return { ramas: listaRamas, totalEntidades: areas.length };
  }, [areas]);

  if (loading) {
    return (
      <div className="px-5 pt-4 flex items-center justify-center min-h-screen">
        <div className="text-muted">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="px-5 pt-4 pb-32">

      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => router.push('/dashboard')}
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}
        >
          <IconArrowLeft size={18} color="#fff" />
        </button>
        <div>
          <div className="text-[13px] text-muted">
            {ramas.length} {ramas.length === 1 ? 'rama' : 'ramas'} · {totalEntidades} {totalEntidades === 1 ? 'entidad' : 'entidades'}
          </div>
          <div className="text-[19px] font-bold tracking-tight text-white">Árbol de vida</div>
        </div>
      </div>

      {areas.length === 0 ? (
        <div
          className="rounded-card p-8 mt-6 text-center"
          style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}
        >
          <div className="text-[36px] mb-2">🌱</div>
          <div className="text-[14px] font-bold text-white mb-2">
            Tu árbol está esperando crecer
          </div>
          <div className="text-[13px] text-muted leading-relaxed">
            Cuéntale a Du Life sobre tu familia, salud, trabajo, sueños. Cada cosa que le digas hará crecer una rama.
          </div>
        </div>
      ) : (
        <>
          {/* Árbol visual SVG */}
          <div
            className="rounded-hero p-5 relative overflow-hidden"
            style={{
              background: 'radial-gradient(circle at 50% 100%, rgba(196,233,56,0.08) 0%, #0F0F0F 70%)',
              border: '1px solid #2A2A2A',
              minHeight: '380px',
            }}
          >
            <TreeSVG ramas={ramas} key={animKey} />
          </div>

          {/* Grid de ramas debajo */}
          <div className="flex items-center justify-between mt-6 mb-2.5">
            <div className="text-[17px] font-bold tracking-tight text-white">Tus ramas</div>
            <div className="text-[13px] text-muted font-medium">{ramas.length}</div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {ramas.map((r) => (
              <button
                key={r.rama}
                className="rounded-card p-4 text-left"
                style={{
                  background: '#1A1A1A',
                  border: '1px solid #2A2A2A',
                }}
              >
                <div className="flex items-center justify-between">
                  <div
                    className="w-11 h-11 rounded-[12px] flex items-center justify-center text-[22px]"
                    style={{ background: `${r.color}20` }}
                  >
                    {r.icono}
                  </div>
                </div>
                <div className="text-[14px] font-bold text-white mt-3 capitalize truncate">
                  {r.rama}
                </div>
                <div className="text-[11px] text-soft mt-0.5">
                  {r.count} {r.count === 1 ? 'entidad' : 'entidades'}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ────────────────────────────────────────────
// COMPONENTE: TreeSVG (árbol generado matemáticamente)
// ────────────────────────────────────────────

function TreeSVG({ ramas }) {
  const width = 340;
  const height = 340;
  const cx = width / 2;
  const trunkBaseY = height - 20;
  const trunkTopY = height * 0.55;

  const numRamas = ramas.length;
  // Distribuir ángulos: de -80° a +80° según cantidad
  const angleSpread = numRamas === 1 ? 0 : Math.min(160, 60 + numRamas * 15);
  const anglesStart = -angleSpread / 2;

  return (
    <>
      <style>{`
        @keyframes grow-branch {
          from { stroke-dashoffset: 200; opacity: 0; }
          to { stroke-dashoffset: 0; opacity: 1; }
        }
        @keyframes grow-node {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes glow-pulse {
          0%, 100% { filter: drop-shadow(0 0 4px #C4E938); }
          50% { filter: drop-shadow(0 0 12px #C4E938); }
        }
        .branch-path {
          stroke-dasharray: 200;
          animation: grow-branch 1.2s ease-out forwards;
        }
        .branch-node {
          transform-origin: center;
          transform-box: fill-box;
          animation: grow-node 0.5s ease-out forwards;
          opacity: 0;
        }
        .trunk-glow {
          animation: glow-pulse 3s ease-in-out infinite;
        }
      `}</style>

      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ display: 'block', maxWidth: '100%' }}
      >
        <defs>
          {/* Gradiente lime para tronco */}
          <linearGradient id="trunkGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#C4E938" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#C4E938" stopOpacity="1" />
          </linearGradient>
          {/* Gradiente para ramas */}
          <linearGradient id="branchGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#C4E938" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#C4E938" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* Suelo (línea sutil) */}
        <line
          x1={cx - 100}
          y1={trunkBaseY + 5}
          x2={cx + 100}
          y2={trunkBaseY + 5}
          stroke="#C4E938"
          strokeWidth="1"
          strokeOpacity="0.15"
          strokeDasharray="2 4"
        />

        {/* Tronco */}
        <path
          className="trunk-glow"
          d={`M ${cx - 6} ${trunkBaseY} Q ${cx - 4} ${(trunkBaseY + trunkTopY) / 2} ${cx - 3} ${trunkTopY} L ${cx + 3} ${trunkTopY} Q ${cx + 4} ${(trunkBaseY + trunkTopY) / 2} ${cx + 6} ${trunkBaseY} Z`}
          fill="url(#trunkGrad)"
          stroke="#C4E938"
          strokeWidth="1"
          strokeOpacity="0.4"
        />

        {/* Nodo raíz del tronco */}
        <circle
          cx={cx}
          cy={trunkTopY}
          r="4"
          fill="#C4E938"
          opacity="0.9"
        />

        {/* Ramas */}
        {ramas.map((r, i) => {
          // Ángulo de esta rama
          const angleDeg = numRamas === 1
            ? -90
            : anglesStart + (angleSpread * i) / (numRamas - 1) - 90;
          const angleRad = (angleDeg * Math.PI) / 180;

          // Longitud proporcional a importancia (min 90, max 140)
          const importanciaPromedio = r.importancia_total / r.count;
          const length = 100 + Math.min(40, importanciaPromedio * 6);

          // Punto final
          const endX = cx + Math.cos(angleRad) * length;
          const endY = trunkTopY + Math.sin(angleRad) * length;

          // Punto de control para curva
          const midX = cx + Math.cos(angleRad) * (length * 0.5);
          const midY = trunkTopY + Math.sin(angleRad) * (length * 0.5) - 15;

          const delay = 0.4 + i * 0.15;

          return (
            <g key={r.rama}>
              {/* Rama curva */}
              <path
                className="branch-path"
                d={`M ${cx} ${trunkTopY} Q ${midX} ${midY} ${endX} ${endY}`}
                stroke="url(#branchGrad)"
                strokeWidth={2.5 - i * 0.15}
                fill="none"
                strokeLinecap="round"
                style={{ animationDelay: `${delay}s` }}
              />

              {/* Nodo circular al final de la rama */}
              <g
                className="branch-node"
                style={{
                  animationDelay: `${delay + 1}s`,
                  transformOrigin: `${endX}px ${endY}px`,
                }}
              >
                {/* Glow externo */}
                <circle
                  cx={endX}
                  cy={endY}
                  r="22"
                  fill={r.color}
                  opacity="0.15"
                />
                {/* Círculo relleno */}
                <circle
                  cx={endX}
                  cy={endY}
                  r="18"
                  fill="#0F0F0F"
                  stroke={r.color}
                  strokeWidth="1.5"
                />
                {/* Emoji dentro */}
                <text
                  x={endX}
                  y={endY + 6}
                  textAnchor="middle"
                  fontSize="16"
                >
                  {r.icono}
                </text>
                {/* Label de la rama */}
                <text
                  x={endX}
                  y={endY + 38}
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize="10"
                  fontWeight="600"
                  style={{ textTransform: 'capitalize' }}
                >
                  {r.rama}
                </text>
                {/* Count */}
                <text
                  x={endX}
                  y={endY + 50}
                  textAnchor="middle"
                  fill="#71717A"
                  fontSize="9"
                >
                  {r.count} {r.count === 1 ? 'entidad' : 'entidades'}
                </text>
              </g>
            </g>
          );
        })}
      </svg>
    </>
  );
}
