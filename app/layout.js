import './globals.css';

export const metadata = {
  title: 'Du Life — Tu segundo cerebro',
  description: 'Asistente personal con IA',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}