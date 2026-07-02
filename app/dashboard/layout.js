import BottomNav from '../../components/BottomNav';
import EnableNotifications from '../../components/EnableNotifications';

export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-page max-w-app mx-auto pb-32">
      <EnableNotifications />
      {children}
      <BottomNav />
    </div>
  );
}