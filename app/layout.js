import './globals.css';

export const metadata = {
  title: 'Du Life — Tu segundo cerebro',
  description: 'Tu asistente personal por WhatsApp',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Du Life',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport = {
  themeColor: '#0A0A0A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" data-theme="dark">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Du Life" />
        <meta name="theme-color" content="#0A0A0A" />
        {/* Script síncrono ANTES del primer paint: evita el flash del tema
            equivocado sin requerir server-side dynamic rendering (cookies()
            en el layout raíz volvería TODAS las páginas dinámicas, cada una
            costando una Serverless Function — ya nos pasó una vez este
            proyecto con revalidate=0 y rompió el límite de Vercel Hobby). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var t = localStorage.getItem('du-theme');
                  if (!t) {
                    // Sin preferencia guardada: escritorio arranca en claro,
                    // móvil se mantiene en oscuro (comportamiento actual).
                    t = window.innerWidth >= 1024 ? 'light' : 'dark';
                  }
                  document.documentElement.setAttribute('data-theme', t);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(reg) { console.log('[SW] Registrado:', reg.scope); })
                    .catch(function(err) { console.log('[SW] Error:', err); });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}