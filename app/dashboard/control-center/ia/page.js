'use client';

import { useEffect, useState } from 'react';
import { IconSparkles, IconClock, IconCoins } from '@tabler/icons-react';

function Contador({ icon: Icon, label, valor }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <Icon size={16} color="var(--text-secondary)" />
      </div>
      <div className="text-[26px] font-black tracking-tight mt-1" style={{ color: 'var(--text-primary)' }}>{valor}</div>
    </div>
  );
}

export default function IAPage() {
  const [datos, setDatos] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/admin_ia')
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setDatos(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading || !datos) {
    return (
      <div className="p-8">
        <div className="h-8 w-48 rounded animate-pulse mb-6" style={{ background: 'var(--bg-card)' }} />
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: 'var(--bg-card)' }} />)}
        </div>
      </div>
    );
  }

  const maxIntencion = Math.max(1, ...datos.intenciones.map((i) => i.llamadas));

  return (
    <div className="p-8 flex flex-col gap-7">
      <div>
        <h1 className="text-[24px] font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>IA</h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--text-secondary)' }}>
          Uso real de los modelos que clasifican y responden — últimas 2000 respuestas.
        </p>
      </div>

      <section>
        <div className="grid grid-cols-3 gap-4">
          <Contador icon={IconSparkles} label="Llamadas totales" valor={datos.total_llamadas.toLocaleString('es-CO')} />
          <Contador icon={IconClock} label="Llamadas últimos 7 días" valor={datos.llamadas_ultimos_7_dias.toLocaleString('es-CO')} />
          <Contador icon={IconCoins} label="Tokens (output) totales" valor={datos.tokens_total.toLocaleString('es-CO')} />
        </div>
      </section>

      <section>
        <div className="text-[12px] font-black uppercase mb-3" style={{ color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>
          Por modelo
        </div>
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          {datos.modelos.length === 0 ? (
            <div className="px-4 py-6 text-center text-[13px]" style={{ color: 'var(--text-secondary)' }}>Sin datos todavía.</div>
          ) : (
            datos.modelos.map((m, i) => (
              <div key={m.modelo} className="flex items-center justify-between px-4 py-3" style={{ borderTop: i > 0 ? '1px solid var(--border-color)' : 'none' }}>
                <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{m.modelo}</span>
                <div className="flex items-center gap-6 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                  <span>{m.llamadas} llamadas</span>
                  <span>{m.tokens.toLocaleString('es-CO')} tokens</span>
                  <span>{m.duracion_promedio_ms != null ? `${(m.duracion_promedio_ms / 1000).toFixed(1)}s prom.` : 'sin duración'}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <div className="text-[12px] font-black uppercase mb-3" style={{ color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>
          Intenciones más frecuentes
        </div>
        <div className="rounded-2xl p-4 flex flex-col gap-2.5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          {datos.intenciones.length === 0 ? (
            <div className="text-[13px] text-center py-2" style={{ color: 'var(--text-secondary)' }}>Sin datos todavía.</div>
          ) : (
            datos.intenciones.map((it) => (
              <div key={it.intencion} className="flex items-center gap-3">
                <span className="text-[12px] w-40 flex-shrink-0 truncate" style={{ color: 'var(--text-primary)' }}>{it.intencion}</span>
                <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--border-color)' }}>
                  <div className="h-2 rounded-full" style={{ width: `${(it.llamadas / maxIntencion) * 100}%`, background: 'var(--accent)' }} />
                </div>
                <span className="text-[12px] w-10 text-right flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>{it.llamadas}</span>
              </div>
            ))
          )}
        </div>
        <div className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
          Gemini (búsqueda web, redacción, vision, PDFs) no queda registrado con su propio modelo — se ve reflejado
          en el uso de sus intenciones (busqueda_web, redactar_mensaje, etc.) en esta lista.
        </div>
      </section>
    </div>
  );
}
