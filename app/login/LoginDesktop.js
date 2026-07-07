'use client';

import {
  IconShieldCheck, IconBolt, IconClock, IconLock, IconChevronDown,
  IconPhone, IconArrowRight,
} from '@tabler/icons-react';
import { useLoginForm } from './useLoginForm';

const LIMA = '#C4E938';

const FEATURES = [
  { icon: IconShieldCheck, titulo: 'Seguro', desc: 'Tus datos están protegidos.' },
  { icon: IconBolt, titulo: 'Inteligente', desc: 'Asistencia que entiende tu vida.' },
  { icon: IconClock, titulo: 'Siempre contigo', desc: 'Disponible cuando lo necesitas.' },
];

const PAISES = [
  { value: '57', label: '🇨🇴 +57' },
  { value: '52', label: '🇲🇽 +52' },
  { value: '34', label: '🇪🇸 +34' },
  { value: '1', label: '🇺🇸 +1' },
  { value: '54', label: '🇦🇷 +54' },
  { value: '51', label: '🇵🇪 +51' },
  { value: '56', label: '🇨🇱 +56' },
];

// Marca "Du" del card de login — mismo motivo de la "u" con puntito que ya
// usa el logo móvil, en versión compacta para el header de la tarjeta.
function MarcaDu() {
  return (
    <div className="flex items-baseline justify-center select-none">
      <span className="font-extrabold" style={{ fontSize: '44px', color: '#FFFFFF', letterSpacing: '-0.02em' }}>D</span>
      <span className="relative inline-block" style={{ lineHeight: 1 }}>
        <span className="font-extrabold" style={{ fontSize: '44px', color: LIMA, letterSpacing: '-0.02em' }}>u</span>
        <span
          className="absolute rounded-full"
          style={{ width: '8px', height: '8px', background: LIMA, top: '-2px', left: '50%', transform: 'translateX(-50%)' }}
        />
      </span>
    </div>
  );
}

export default function LoginDesktop() {
  const { telefono, setTelefono, pais, setPais, loading, error, enviarCodigo } = useLoginForm();

  return (
    <main className="min-h-screen flex items-center justify-center gap-16 px-16 py-10" style={{ background: '#000000' }}>
      {/* Panel izquierdo: marketing */}
      <div className="relative flex-1 max-w-xl">
        <div
          className="absolute pointer-events-none"
          style={{
            width: '640px', height: '640px', left: '-140px', top: '-120px',
            background: 'radial-gradient(circle, rgba(196,233,56,0.14) 0%, rgba(196,233,56,0) 65%)',
            filter: 'blur(20px)',
          }}
        />

        <div className="relative flex items-baseline select-none mb-16">
          <span className="text-2xl font-extrabold tracking-tight" style={{ color: LIMA }}>Du</span>
          <span className="text-2xl font-extrabold tracking-tight text-white">&nbsp;Life</span>
        </div>

        <h1 className="relative text-[52px] font-black leading-[1.05] tracking-tight text-white">
          Tu <span style={{ color: LIMA }}>segunda memoria</span>
          <br />
          comienza aquí.
        </h1>

        <p className="relative text-[16px] mt-6 max-w-md" style={{ color: '#A1A1AA' }}>
          Organiza, recuerda y avanza.
          <br />
          Du Life te acompaña todos los días.
        </p>

        <div className="relative mt-6" style={{ width: '48px', height: '3px', background: LIMA, borderRadius: '2px' }} />

        <div className="relative grid grid-cols-3 gap-3 mt-16">
          {FEATURES.map((f) => (
            <div
              key={f.titulo}
              className="rounded-2xl p-4"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <f.icon size={22} color={LIMA} strokeWidth={1.8} />
              <div className="text-[14px] font-bold text-white mt-2.5">{f.titulo}</div>
              <div className="text-[12px] mt-1 leading-snug" style={{ color: '#A1A1AA' }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Panel derecho: tarjeta de login */}
      <div
        className="w-full flex-shrink-0 rounded-3xl p-10"
        style={{ maxWidth: '420px', background: '#0A0A0A', border: '1px solid #1A1A1A' }}
      >
        <MarcaDu />

        <div className="text-center mt-5">
          <div className="text-[22px] font-black text-white">
            Bienvenido <span style={{ color: LIMA }}>de nuevo</span>
          </div>
          <div className="text-[14px] mt-1" style={{ color: '#A1A1AA' }}>Inicia sesión para continuar</div>
        </div>

        <div className="mt-7">
          <div className="text-[13px] mb-2" style={{ color: '#A1A1AA' }}>Número de WhatsApp</div>
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
                {PAISES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              <IconChevronDown size={12} color="#A1A1AA" className="absolute pointer-events-none" style={{ right: 0, top: '50%', transform: 'translateY(-50%)' }} />
            </div>

            <div style={{ width: '1px', height: '22px', background: '#2A2A2A', flexShrink: 0 }} />

            <IconPhone size={16} color={LIMA} style={{ flexShrink: 0 }} />

            <input
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ''))}
              placeholder="Ej: 314 812 7388"
              className="flex-1 bg-transparent text-white text-[15px] outline-none min-w-0"
              style={{ caretColor: LIMA }}
              maxLength={15}
              onKeyDown={(e) => e.key === 'Enter' && enviarCodigo()}
            />
          </div>

          {error && (
            <div className="mt-2.5 text-[13px] text-center" style={{ color: '#F87171' }}>{error}</div>
          )}
        </div>

        <button
          onClick={enviarCodigo}
          disabled={loading || telefono.length < 7}
          className="w-full h-14 rounded-full flex items-center justify-center gap-2 font-bold text-[16px] transition-opacity mt-5"
          style={{ background: LIMA, color: '#0A0A0A', opacity: loading || telefono.length < 7 ? 0.4 : 1 }}
        >
          {loading ? 'Enviando código...' : (<>Continuar <IconArrowRight size={18} /></>)}
        </button>

        <div className="flex items-start justify-center gap-2 mt-6">
          <IconLock size={14} color={LIMA} style={{ marginTop: '2px', flexShrink: 0 }} />
          <div className="text-[12px] leading-snug text-center" style={{ color: '#71717A' }}>
            Solo tú puedes ver tu información.
            <br />
            Tus datos están 100% seguros.
          </div>
        </div>

        <div className="mt-6 pt-5 text-center" style={{ borderTop: '1px solid #1A1A1A' }}>
          <div className="text-[11px] leading-relaxed" style={{ color: '#71717A' }}>
            Al continuar aceptas nuestros{' '}
            <span style={{ color: LIMA }}>términos</span> y{' '}
            <span style={{ color: LIMA }}>política de privacidad</span>.
          </div>
        </div>
      </div>
    </main>
  );
}
