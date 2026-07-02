'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [telefono, setTelefono] = useState('');
  const [pais, setPais] = useState('57');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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

    const particles = Array.from({ length: 60 }, () => ({
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
      className="min-h-screen flex flex-col justify-between p-6 max-w-app mx-auto"
      style={{ background: '#0A0A0A' }}
    >
      {/* Animación de partículas */}
      <div className="flex-1 flex items-center justify-center relative">
        <canvas
          ref={canvasRef}
          className="w-full h-64 max-w-[280px]"
        />
      </div>

      {/* Texto de bienvenida */}
      <div className="text-center mb-8">
        <div className="text-[42px] font-bold text-white tracking-tight leading-none">
          Du Life
        </div>
        <div
          className="text-[15px] text-white/70 mt-3 italic"
          style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
        >
          Libera tu mente, nosotros tomamos nota.
        </div>
      </div>

      {/* Input teléfono */}
      <div className="mb-4">
        <div className="text-[12px] text-white/60 mb-2 uppercase tracking-wide font-medium">
          Tu WhatsApp
        </div>
        <div className="flex gap-2">
          <select
            value={pais}
            onChange={(e) => setPais(e.target.value)}
            className="bg-white/5 text-white text-[15px] px-3 py-4 rounded-2xl border border-white/10 outline-none font-medium"
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
          <input
            type="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ''))}
            placeholder="3001234567"
            className="flex-1 bg-white/5 text-white text-[16px] px-4 py-4 rounded-2xl border border-white/10 outline-none placeholder:text-white/30"
            maxLength={15}
          />
        </div>

        {error && (
          <div className="mt-3 text-[13px] text-red-400 text-center">
            {error}
          </div>
        )}
      </div>

      {/* Botón enviar */}
      <button
        onClick={enviarCodigo}
        disabled={loading || telefono.length < 7}
        className="w-full h-14 rounded-full flex items-center justify-center gap-2 font-bold text-[15px] transition-opacity"
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
            Enviar código
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M13 6l6 6-6 6" stroke="#0A0A0A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </>
        )}
      </button>

      {/* Legal */}
      <div className="text-center text-[11px] text-white/40 mt-4">
        Al continuar aceptas nuestros términos y política de privacidad
      </div>
    </main>
  );
}