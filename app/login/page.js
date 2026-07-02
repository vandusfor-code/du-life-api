'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [telefono, setTelefono] = useState('');
  const [pais, setPais] = useState('57');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sliderProgress, setSliderProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const sliderRef = useRef(null);
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

      // Líneas entre partículas cercanas
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

      // Puntos
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

  // Handlers del slider
  const handleSliderStart = (e) => {
    if (loading || telefono.length < 7) return;
    setDragging(true);
    e.preventDefault();
  };

  const handleSliderMove = (clientX) => {
    if (!dragging || !sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const maxX = rect.width - 56; // 56 = ancho del thumb
    const progress = Math.max(0, Math.min(1, relativeX / maxX));
    setSliderProgress(progress);
  };

  const handleSliderEnd = async () => {
    if (!dragging) return;
    setDragging(false);
    if (sliderProgress >= 0.9) {
      setSliderProgress(1);
      await enviarCodigo();
    } else {
      setSliderProgress(0);
    }
  };

  const enviarCodigo = async () => {
    setError('');
    if (!telefono || telefono.length < 7) {
      setError('Ingresa un número válido');
      setSliderProgress(0);
      return;
    }
    setLoading(true);
    try {
      const telefonoCompleto = pais + telefono.replace(/\s/g, '');
      // Detectar zona horaria en background
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
        setSliderProgress(0);
      }
    } catch (e) {
      setError('Error de conexión. Intenta de nuevo.');
      setSliderProgress(0);
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
        <div className="text-[38px] font-bold text-white tracking-tight leading-tight">
          Du Life
        </div>
        <div className="text-[14px] text-white/60 mt-2">
          Tu segundo cerebro por WhatsApp
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

      {/* Slider */}
      <div
        ref={sliderRef}
        className="relative h-14 rounded-full overflow-hidden select-none"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
        onMouseMove={(e) => handleSliderMove(e.clientX)}
        onMouseUp={handleSliderEnd}
        onMouseLeave={handleSliderEnd}
        onTouchMove={(e) => handleSliderMove(e.touches[0].clientX)}
        onTouchEnd={handleSliderEnd}
      >
        {/* Fill lime */}
        <div
          className="absolute inset-y-0 left-0 pointer-events-none"
          style={{
            width: `${sliderProgress * 100}%`,
            background: '#C4E938',
            transition: dragging ? 'none' : 'width 0.3s ease',
          }}
        />

        {/* Texto */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{
            opacity: 1 - sliderProgress,
            transition: dragging ? 'none' : 'opacity 0.3s ease',
          }}
        >
          <div className="text-[14px] font-bold text-white/70 tracking-wide">
            {loading ? 'Enviando...' : 'Desliza para enviar código →'}
          </div>
        </div>

        {/* Thumb */}
        <div
          onMouseDown={handleSliderStart}
          onTouchStart={handleSliderStart}
          className="absolute top-1 left-1 h-12 w-12 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing"
          style={{
            background: '#FFFFFF',
            transform: `translateX(${sliderProgress * (sliderRef.current?.offsetWidth ? sliderRef.current.offsetWidth - 56 : 0)}px)`,
            transition: dragging ? 'none' : 'transform 0.3s ease',
            touchAction: 'none',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M5 12h14M13 6l6 6-6 6" stroke="#0A0A0A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Legal */}
      <div className="text-center text-[11px] text-white/40 mt-6">
        Al continuar aceptas nuestros términos y política de privacidad
      </div>
    </main>
  );
}