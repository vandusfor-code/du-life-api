/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Fondos
        page: '#0A0A0A',        // fondo principal (dark)
        surface: '#1A1A1A',     // cards / superficies elevadas
        elevated: '#242424',    // segundo nivel de elevación (badges, inputs)

        // Textos
        ink: '#FFFFFF',         // texto principal
        muted: '#A1A1AA',       // texto secundario
        soft: '#71717A',        // texto terciario / disabled

        // Bordes
        hairline: '#2A2A2A',    // bordes sutiles

        // Acentos
        lime: '#C4E938',
        'lime-soft': 'rgba(196, 233, 56, 0.15)',   // fondo de badges lime en dark
        'lime-text': '#C4E938',                     // texto lime
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