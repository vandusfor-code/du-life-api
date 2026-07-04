'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// ────────────────────────────────────────────
// Generación determinista de la constelación del cerebro
// (mismo resultado en servidor y cliente, sin Math.random())
// ────────────────────────────────────────────

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dentroDelCerebro(x, y) {
  const enElipse = (cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  return (
    enElipse(150, 80, 108, 52) ||
    enElipse(198, 160, 30, 58) ||
    enElipse(88, 125, 55, 42) ||
    enElipse(150, 118, 70, 34)
  );
}

function generarNodosCerebro() {
  const rand = mulberry32(42);
  const puntos = [];
  let intentos = 0;
  while (puntos.length < 62 && intentos < 5000) {
    intentos++;
    const x = rand() * 270 + 15;
    const y = rand() * 220 + 15;
    if (dentroDelCerebro(x, y)) {
      puntos.push({ x, y });
    }
  }
  return puntos;
}

function generarEdgesCerebro(puntos, maxDist = 32) {
  const edges = [];
  for (let i = 0; i < puntos.length; i++) {
    for (let j = i + 1; j < puntos.length; j++) {
      const dx = puntos[i].x - puntos[j].x;
      const dy = puntos[i].y - puntos[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < maxDist) {
        edges.push({ x1: puntos[i].x, y1: puntos[i].y, x2: puntos[j].x, y2: puntos[j].y, dist });
      }
    }
  }
  return edges;
}

const NODOS_CEREBRO = generarNodosCerebro();
const EDGES_CEREBRO = generarEdgesCerebro(NODOS_CEREBRO);

function BrainSVG() {
  return (
    <svg viewBox="0 0 300 260" style={{ width: '100%', height: '100%', display: 'block' }}>
      <style>{`
        @keyframes node-pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes signal-travel {
          from { stroke-dashoffset: 24; }
          to { stroke-dashoffset: 0; }
        }
        .brain-node {
          animation: node-pulse 2.6s ease-in-out infinite;
          transform-box: fill-box;
        }
        .brain-edge {
          stroke-dasharray: 3 5;
          animation: signal-travel 1.8s linear infinite;
        }
      `}</style>
      <g>
        {EDGES_CEREBRO.map((e, i) => (
          <line
            key={i}
            className="brain-edge"
            x1={e.x1}
            y1={e.y1}
            x2={e.x2}
            y2={e.y2}
            stroke="#C4E938"
            strokeWidth="0.6"
            strokeOpacity={Math.max(0.08, 0.35 * (1 - e.dist / 32))}
            style={{ animationDelay: `${(i % 14) * 0.13}s` }}
          />
        ))}
      </g>
      <g>
        {NODOS_CEREBRO.map((p, i) => (
          <circle
            key={i}
            className="brain-node"
            cx={p.x}
            cy={p.y}
            r={i % 6 === 0 ? 2.4 : 1.3}
            fill="#C4E938"
            style={{
              animationDelay: `${(i % 10) * 0.22}s`,
              filter: 'drop-shadow(0 0 3px rgba(196,233,56,0.9))',
            }}
          />
        ))}
      </g>
    </svg>
  );
}

export default function LoginPage() {
  const [telefono, setTelefono] = useState('');
  const [pais, setPais] = useState('57');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const enviarCodigo = async () => {
    setError('');
    if (!telefono || telefono.length < 7) {
      setError('Ingresa un número válido');
      return;
    }
    setLoading(true);
    try {
      const telefonoCompleto = pais + telefono.replace(/\s/g, '');
      const zonaHoraria = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefono: telefonoCompleto, zona_horaria: zonaHoraria }),
      });
      const data = await response.json();
      if (response.ok) {
        sessionStorage.setItem('login_telefono', telefonoCompleto);
        router.push('/verify');
      } else {
        setError(data.error || 'Hubo un error. Intenta de nuevo.');
      }
    } catch (e) {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="min-h-screen flex flex-col max-w-app mx-auto"
      style={{ background: '#000000' }}
    >
      {/* Hero: cerebro constelación */}
      <div
        className="relative w-full flex items-center justify-center overflow-hidden flex-shrink-0"
        style={{ height: '320px' }}
      >
        <div
          className="absolute pointer-events-none"
          style={{
            width: '300px',
            height: '300px',
            background: 'radial-gradient(circle, rgba(196,233,56,0.12) 0%, rgba(196,233,56,0) 65%)',
            filter: 'blur(10px)',
          }}
        />
        <div style={{ width: '260px', height: '230px', position: 'relative', zIndex: 1 }}>
          <BrainSVG />
        </div>
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: '0px',
            width: '260px',
            height: '90px',
            background: 'radial-gradient(ellipse at center, rgba(196,233,56,0.4) 0%, rgba(196,233,56,0) 70%)',
            filter: 'blur(8px)',
            zIndex: 2,
          }}
        />
      </div>

      {/* Logo + tagline */}
      <div className="px-6 text-center -mt-2">
        <div className="flex justify-center items-baseline select-none">
          <span className="text-white font-extrabold" style={{ fontSize: '46px', letterSpacing: '-0.02em' }}>
            D
          </span>
          <span className="relative inline-block" style={{ lineHeight: 1 }}>
            <span className="font-extrabold" style={{ fontSize: '46px', color: '#C4E938', letterSpacing: '-0.02em' }}>
              u
            </span>
            <span
              className="absolute rounded-full"
              style={{
                width: '8px',
                height: '8px',
                background: '#C4E938',
                top: '-2px',
                left: '50%',
                transform: 'translateX(-50%)',
              }}
            />
          </span>
          <span className="text-white font-extrabold" style={{ fontSize: '46px', letterSpacing: '-0.02em' }}>
            &nbsp;Life
          </span>
        </div>

        <div className="mt-4">
          <div className="text-[18px] text-white">
            Tu <span className="font-bold" style={{ color: '#C4E938' }}>segunda memoria</span>
          </div>
          <div className="text-[18px] text-white">comienza aquí.</div>
        </div>

        <div
          className="mx-auto mt-3"
          style={{ width: '40px', height: '3px', background: '#C4E938', borderRadius: '2px' }}
        />
      </div>

      {/* Input teléfono */}
      <div className="px-6 mt-8">
        <div className="text-[13px] mb-2" style={{ color: '#A1A1AA' }}>
          Número de WhatsApp
        </div>
        <div
          className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
          style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}
        >
          <div className="relative flex items-center pr-4">
            <select
              value={pais}
              onChange={(e) => setPais(e.target.value)}
              className="appearance-none bg-transparent text-white text-[15px] font-medium outline-none pr-4"
              style={{ colorScheme: 'dark' }}
            >
              <option value="57">🇨🇴 +57</option>
              <option value="52">🇲🇽 +52</option>
              <option value="34">🇪🇸 +34</option>
              <option value="1">🇺🇸 +1</option>
              <option value="54">🇦🇷 +54</option>
              <option value="51">🇵🇪 +51</option>
              <option value="56">🇨🇱 +56</option>
            </select>
            <svg
              className="absolute pointer-events-none"
              style={{ right: 0, top: '50%', transform: 'translateY(-50%)' }}
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path d="M6 9l6 6 6-6" stroke="#A1A1AA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <div style={{ width: '1px', height: '22px', background: '#2A2A2A', flexShrink: 0 }} />

          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
            <path
              d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.9 21 3 13.1 3 3.9c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.2 1z"
              fill="#C4E938"
            />
          </svg>

          <input
            type="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ''))}
            placeholder="Ej: 314 812 7388"
            className="flex-1 bg-transparent text-white text-[15px] outline-none min-w-0"
            style={{ caretColor: '#C4E938' }}
            maxLength={15}
          />
        </div>

        {error && (
          <div className="mt-2.5 text-[13px] text-center" style={{ color: '#F87171' }}>
            {error}
          </div>
        )}
      </div>

      {/* Botón continuar */}
      <div className="px-6 mt-5">
        <button
          onClick={enviarCodigo}
          disabled={loading || telefono.length < 7}
          className="w-full h-14 rounded-full flex items-center justify-center gap-2 font-bold text-[16px] transition-opacity"
          style={{
            background: '#C4E938',
            color: '#0A0A0A',
            opacity: loading || telefono.length < 7 ? 0.4 : 1,
          }}
        >
          {loading ? (
            'Enviando código...'
          ) : (
            <>
              Continuar
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M13 6l6 6-6 6" stroke="#0A0A0A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </>
          )}
        </button>
      </div>

      {/* Trust badge */}
      <div className="flex items-start justify-center gap-2 mt-6 px-6">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ marginTop: '2px', flexShrink: 0 }}>
          <rect x="5" y="11" width="14" height="9" rx="2" stroke="#C4E938" strokeWidth="1.6" />
          <path d="M8 11V7a4 4 0 018 0v4" stroke="#C4E938" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <div className="text-[12px] leading-snug text-center" style={{ color: '#71717A' }}>
          Solo tú puedes ver tu información.
          <br />
          Tus datos están 100% seguros.
        </div>
      </div>

      {/* Footer legal */}
      <div className="px-6 mt-auto pt-8 pb-6">
        <div style={{ borderTop: '1px solid #1A1A1A' }} className="pt-5 text-center">
          <div className="text-[11px] leading-relaxed" style={{ color: '#71717A' }}>
            Al continuar aceptas nuestros{' '}
            <span style={{ color: '#C4E938' }}>términos</span> y{' '}
            <span style={{ color: '#C4E938' }}>política de privacidad</span>.
          </div>
          <div className="text-[10px] mt-2" style={{ color: '#3F3F46' }}>
            v1.0
          </div>
        </div>
      </div>
    </main>
  );
}
