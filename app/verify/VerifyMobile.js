'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useVerifyForm, formatearTiempo, formatearTelefono } from './useVerifyForm';

export default function VerifyMobile() {
  const { telefono, loading, error, tiempoRestante, verificar, reenviarCodigo } = useVerifyForm();
  const [codigo, setCodigo] = useState(['', '', '', '', '', '']);
  const inputsRef = useRef([]);
  const canvasRef = useRef(null);
  const router = useRouter();

  // Animación de partículas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;

    const particles = Array.from({ length: 50 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.5 + 0.5,
    }));

    let animationId;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 80) {
            ctx.strokeStyle = `rgba(196, 233, 56, ${0.15 * (1 - dist / 80)})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        ctx.fillStyle = 'rgba(196, 233, 56, 0.7)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      animationId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animationId);
  }, []);

  const handleCodigoChange = (index, value) => {
    const val = value.replace(/\D/g, '').slice(0, 1);
    const nuevo = [...codigo];
    nuevo[index] = val;
    setCodigo(nuevo);
    if (val && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
    // Auto-submit cuando complete 6 dígitos
    if (val && index === 5 && nuevo.every((d) => d !== '')) {
      verificarCodigo(nuevo.join(''));
    }
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
      if (paste.length === 6) {
        verificarCodigo(paste);
      }
    }
  };

  const verificarCodigo = (codigoStr) => {
    verificar(codigoStr, () => {
      setCodigo(['', '', '', '', '', '']);
      inputsRef.current[0]?.focus();
    });
  };

  const reenviar = () => {
    reenviarCodigo(() => {
      setCodigo(['', '', '', '', '', '']);
      inputsRef.current[0]?.focus();
    });
  };

  return (
    <main
      className="min-h-screen flex flex-col p-6 max-w-app mx-auto"
      style={{ background: '#0A0A0A' }}
    >
      {/* Back */}
      <button
        onClick={() => router.push('/login')}
        className="w-10 h-10 rounded-full flex items-center justify-center mb-4"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M19 12H5M11 18l-6-6 6-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Animación */}
      <div className="flex justify-center mb-6">
        <canvas ref={canvasRef} className="w-full h-40 max-w-[240px]" />
      </div>

      {/* Título */}
      <div className="text-center mb-8">
        <div className="text-[26px] font-bold text-white tracking-tight leading-tight">
          Ingresa el código
        </div>
        <div className="text-[13px] text-white/60 mt-2">
          Enviado a tu WhatsApp
        </div>
        <div className="text-[13px] text-white/80 font-medium mt-1">
          {formatearTelefono(telefono)}
        </div>
      </div>

      {/* Casillas */}
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
            className="w-12 h-14 text-center text-[22px] font-bold text-white rounded-2xl outline-none"
            style={{
              background: digit ? '#C4E938' : 'rgba(255,255,255,0.06)',
              color: digit ? '#0A0A0A' : '#fff',
              border: `1px solid ${digit ? '#C4E938' : 'rgba(255,255,255,0.1)'}`,
              transition: 'all 0.2s ease',
            }}
            maxLength={1}
          />
        ))}
      </div>

      {error && (
        <div className="text-center text-[13px] text-red-400 mb-4">
          {error}
        </div>
      )}

      {/* Reenviar */}
      <div className="text-center mt-4">
        {tiempoRestante > 0 ? (
          <div className="text-[13px] text-white/50">
            Puedes reenviar en <span className="text-white/80 font-medium">{formatearTiempo(tiempoRestante)}</span>
          </div>
        ) : (
          <button
            onClick={reenviar}
            disabled={loading}
            className="text-[14px] text-lime font-bold"
          >
            Reenviar código
          </button>
        )}
      </div>

      {/* Loader */}
      {loading && (
        <div className="text-center text-[13px] text-white/60 mt-6">
          Verificando...
        </div>
      )}
    </main>
  );
}
