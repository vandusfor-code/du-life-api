'use client';

import { useEffect, useState } from 'react';

const QUERY = '(min-width: 1024px)';

// Antes de montar (SSR + primer render en cliente) se asume móvil: es el caso
// más común (abrir la app en el celular) y evita cualquier regresión visual
// en esa ruta. Solo tras montar se corrige a desktop si corresponde.
export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    setIsDesktop(mql.matches);
    setMounted(true);
    const handler = (e) => setIsDesktop(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return { isDesktop, mounted };
}
