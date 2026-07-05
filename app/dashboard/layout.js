import BottomNav from '../../components/BottomNav';
import EnableNotifications from '../../components/EnableNotifications';
import { ThemeProvider } from '../../components/ThemeProvider';

export default function DashboardLayout({ children }) {
  return (
    <ThemeProvider>
      <div className="min-h-screen flex flex-col max-w-app mx-auto" style={{ background: 'var(--bg-primary)' }}>
        <EnableNotifications />
        <div className="flex-1 overflow-y-auto pb-[calc(64px+env(safe-area-inset-bottom))]">
          {children}
        </div>
        <BottomNav />
      </div>
    </ThemeProvider>
  );
}
