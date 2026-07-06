import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { ThemeProvider } from '../../components/ThemeProvider';
import ResponsiveShell from '../../components/ResponsiveShell';

export default function DashboardLayout({ children }) {
  const cookieStore = cookies();
  if (!cookieStore.get('dulife_token')) {
    redirect('/login');
  }

  return (
    <ThemeProvider>
      <ResponsiveShell>{children}</ResponsiveShell>
    </ThemeProvider>
  );
}
