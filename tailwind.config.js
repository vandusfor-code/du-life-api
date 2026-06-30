/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        page: '#F0F2F5',
        ink: '#1A1D29',
        muted: '#6B7280',
        soft: '#9CA2B8',
        hairline: '#F1F3F7',
        lime: '#C4E938',
        'lime-soft': '#ECFCCB',
        'lime-text': '#65A30D',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.04)',
        nav: '0 6px 24px rgba(45, 49, 66, 0.10)',
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