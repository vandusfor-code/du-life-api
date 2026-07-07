'use client';

import { useIsDesktop } from '../../hooks/useIsDesktop';
import LoginMobile from './LoginMobile';
import LoginDesktop from './LoginDesktop';

export default function LoginPage() {
  const { isDesktop, mounted } = useIsDesktop();
  if (!mounted || !isDesktop) return <LoginMobile />;
  return <LoginDesktop />;
}
