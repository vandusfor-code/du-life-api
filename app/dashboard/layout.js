import BottomNav from '../../components/BottomNav';
import EnableNotifications from '../../components/EnableNotifications';

// Todas las pantallas del dashboard obtienen sus datos por fetch client-side;
// sin esto Next.js las prerenderiza estáticas en build y puede servir un
// shell viejo desde caché entre despliegues.
export const revalidate = 0;

export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-page max-w-app mx-auto">
      <EnableNotifications />
      <div className="flex-1 overflow-y-auto pb-[calc(64px+env(safe-area-inset-bottom))]">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
