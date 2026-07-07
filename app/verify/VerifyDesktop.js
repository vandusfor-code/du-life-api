'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { IconArrowLeft, IconShieldCheck, IconBolt, IconClock } from '@tabler/icons-react';
import { useVerifyForm, formatearTiempo, formatearTelefono } from './useVerifyForm';

const LIMA = '#C4E938';

const FEATURES = [
  { icon: IconShieldCheck, titulo: 'Seguro', desc: 'Tus datos están protegidos.' },
  { icon: IconBolt, titulo: 'Inteligente', desc: 'Asistencia que entiende tu vida.' },
  { icon: IconClock, titulo: 'Siempre contigo', desc: 'Disponible cuando lo necesitas.' },
];

export default function VerifyDesktop() {
  const { telefono, loading, error, tiempoRestante, verificar, reenviarCodigo } = useVerifyForm();
  const [codigo, setCodigo] = useState(['', '', '', '', '', '']);
  const inputsRef = useRef([]);
  const router = useRouter();

  const verificarCodigo = (codigoStr) => {
    verificar(codigoStr, () => {
      setCodigo(['', '', '', '', '', '']);
      inputsRef.current[0]?.focus();
    });
  };

  const handleCodigoChange = (index, value) => {
    const val = value.replace(/\D/g, '').slice(0, 1);
    const nuevo = [...codigo];
    nuevo[index] = val;
    setCodigo(nuevo);
    if (val && index < 5) inputsRef.current[index + 1]?.focus();
    if (val && index === 5 && nuevo.every((d) => d !== '')) verificarCodigo(nuevo.join(''));
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !codigo[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (paste.length > 0) {
      const nuevo = paste.split('').concat(Array(6 - paste.length).fill(''));
      setCodigo(nuevo);
      const lastIndex = Math.min(paste.length, 5);
      inputsRef.current[lastIndex]?.focus();
      if (paste.length === 6) verificarCodigo(paste);
    }
  };

  const reenviar = () => {
    reenviarCodigo(() => {
      setCodigo(['', '', '', '', '', '']);
      inputsRef.current[0]?.focus();
    });
  };

  return (
    <main className="min-h-screen flex items-center justify-center gap-16 px-16 py-10" style={{ background: '#000000' }}>
      {/* Panel izquierdo: mismo que el login, para continuidad de marca */}
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
            <div key={f.titulo} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <f.icon size={22} color={LIMA} strokeWidth={1.8} />
              <div className="text-[14px] font-bold text-white mt-2.5">{f.titulo}</div>
              <div className="text-[12px] mt-1 leading-snug" style={{ color: '#A1A1AA' }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Panel derecho: tarjeta de código */}
      <div
        className="w-full flex-shrink-0 rounded-3xl p-10"
        style={{ maxWidth: '420px', background: '#0A0A0A', border: '1px solid #1A1A1A' }}
      >
        <button
          onClick={() => router.push('/login')}
          className="w-10 h-10 rounded-full flex items-center justify-center mb-6"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        >
          <IconArrowLeft size={18} color="#FFFFFF" />
        </button>

        <div className="text-center mb-8">
          <div className="text-[22px] font-black text-white tracking-tight">Ingresa el código</div>
          <div className="text-[13px] mt-2" style={{ color: '#A1A1AA' }}>Enviado a tu WhatsApp</div>
          <div className="text-[13px] font-medium mt-1 text-white">{formatearTelefono(telefono)}</div>
        </div>

        <div className="flex justify-between gap-2 mb-4" onPaste={handlePaste}>
          {codigo.map((digit, i) => (
            <input
              key={i}
              ref={(el) => (inputsRef.current[i] = el)}
              type="tel"
              inputMode="numeric"
              value={digit}
              onChange={(e) => handleCodigoChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="w-12 h-14 text-center text-[22px] font-bold rounded-2xl outline-none"
              style={{
                background: digit ? LIMA : 'rgba(255,255,255,0.06)',
                color: digit ? '#0A0A0A' : '#fff',
                border: `1px solid ${digit ? LIMA : 'rgba(255,255,255,0.1)'}`,
                transition: 'all 0.2s ease',
              }}
              maxLength={1}
            />
          ))}
        </div>

        {error && <div className="text-center text-[13px] text-red-400 mb-4">{error}</div>}

        <div className="text-center mt-4">
          {tiempoRestante > 0 ? (
            <div className="text-[13px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Puedes reenviar en <span className="font-medium text-white">{formatearTiempo(tiempoRestante)}</span>
            </div>
          ) : (
            <button onClick={reenviar} disabled={loading} className="text-[14px] font-bold" style={{ color: LIMA }}>
              Reenviar código
            </button>
          )}
        </div>

        {loading && (
          <div className="text-center text-[13px] mt-6" style={{ color: 'rgba(255,255,255,0.6)' }}>Verificando...</div>
        )}
      </div>
    </main>
  );
}
