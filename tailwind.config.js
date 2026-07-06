/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    // Explícitos (son los defaults de Tailwind) para dejar constancia de que
    // `lg` (1024px) es el corte oficial mobile/desktop del proyecto: <1024px
    // usa el shell móvil actual, >=1024px usa el shell de escritorio nuevo.
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        // Todos apuntan a las CSS variables de tema (app/globals.css) en vez
        // de hex fijos, para que /login y /verify (que no llevan el switch
        // de tema, solo dark) sigan viéndose igual, pero cualquier pantalla
        // del dashboard que use estas clases cambie sola con el tema.
        page: 'var(--bg-primary)',
        surface: 'var(--bg-card)',
        elevated: 'var(--bg-card-hover)',

        ink: 'var(--text-primary)',
        muted: 'var(--text-secondary)',
        soft: 'var(--text-muted)',

        hairline: 'var(--border-color)',

        lime: 'var(--accent)',
        'lime-soft': 'rgba(196, 233, 56, 0.15)',
        'lime-text': 'var(--accent)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: 'none',                              // sin sombra en dark
        nav: '0 -8px 24px rgba(0, 0, 0, 0.5)',
      },
      borderRadius: {
        card: '18px',
        hero: '22px',
        pill: '12px',
      },
      maxWidth: {
        app: '420px',
      },
    },
  },
  plugins: [],
};