'use client';

import { useIsDesktop } from '../../../hooks/useIsDesktop';
import NegocioMobile from './NegocioMobile';
import NegocioDesktop from './NegocioDesktop';

export default function NegocioPage() {
  const { isDesktop, mounted } = useIsDesktop();
  if (!mounted || !isDesktop) return <NegocioMobile />;
  return <NegocioDesktop />;
}
