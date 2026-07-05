import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default function Home() {
  const cookieStore = cookies();
  const token = cookieStore.get('dulife_token');

  if (token) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
