'use client';

import { useIsDesktop } from '../../hooks/useIsDesktop';
import InicioMobile from './InicioMobile';
import InicioDesktop from './InicioDesktop';

export default function DashboardPage() {
  const { isDesktop, mounted } = useIsDesktop();
  if (!mounted || !isDesktop) return <InicioMobile />;
  return <InicioDesktop />;
}
