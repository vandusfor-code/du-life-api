'use client';

import { useState } from 'react';
import { obtenerLogoComercio } from '../lib/logosComercios';

// Círculo con el logo real del comercio (Netflix, Rappi, Bancolombia...) si
// se reconoce el texto; si no hay match o la imagen falla al cargar, cae al
// ícono de categoría de siempre — nunca deja un hueco vacío.
export default function LogoComercio({ texto, tamano = 40, radio = '9999px', iconoFallback }) {
  const [error, setError] = useState(false);
  const url = obtenerLogoComercio(texto);

  if (!url || error) {
    return (
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{ width: tamano, height: tamano, borderRadius: radio, background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
      >
        {iconoFallback}
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center flex-shrink-0 overflow-hidden"
      style={{ width: tamano, height: tamano, borderRadius: radio, background: '#FFFFFF', border: '1px solid var(--border-color)' }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        onError={() => setError(true)}
        style={{ width: '66%', height: '66%', objectFit: 'contain' }}
      />
    </div>
  );
}
