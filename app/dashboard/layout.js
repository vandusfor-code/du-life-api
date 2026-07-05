import BottomNav from '../../components/BottomNav';
import EnableNotifications from '../../components/EnableNotifications';

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
