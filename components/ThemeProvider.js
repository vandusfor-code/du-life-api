'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({ theme: 'dark', toggleTheme: () => {} });

// El flash-de-tema-equivocado se evita con el script síncrono en <head>
// (app/layout.js) que lee localStorage antes del primer paint — no con
// server-side rendering, para no volver dinámicas todas las páginas (ya
// nos pasó una vez con cookies()/revalidate=0 y rompió el límite de
// Serverless Functions de Vercel Hobby). Acá solo se sincroniza el estado
// de React con lo que ese script ya aplicó, y se usa Supabase como
// respaldo cuando no hay nada guardado localmente (dispositivo nuevo).
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const guardado = localStorage.getItem('du-theme');
    if (guardado) {
      setTheme(guardado);
      document.documentElement.setAttribute('data-theme', guardado);
      return;
    }

    fetch('/api/dashboard/resumen')
      .then((r) => r.json())
      .then((data) => {
        const temaGuardado = data?.usuario?.metadata?.tema;
        if (temaGuardado === 'light' || temaGuardado === 'dark') {
          setTheme(temaGuardado);
          document.documentElement.setAttribute('data-theme', temaGuardado);
          localStorage.setItem('du-theme', temaGuardado);
        }
      })
      .catch(() => {});
  }, []);

  const toggleTheme = () => {
    const nuevo = theme === 'dark' ? 'light' : 'dark';
    setTheme(nuevo);
    document.documentElement.setAttribute('data-theme', nuevo);
    localStorage.setItem('du-theme', nuevo);

    fetch('/api/dashboard/preferencias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tema: nuevo }),
    }).catch(() => {});
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
