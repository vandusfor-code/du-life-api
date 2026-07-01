import BottomNav from '../../components/BottomNav';

export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-page max-w-app mx-auto pb-32">
      {children}
      <BottomNav />
    </div>
  );
}