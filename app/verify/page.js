'use client';

import { useIsDesktop } from '../../hooks/useIsDesktop';
import VerifyMobile from './VerifyMobile';
import VerifyDesktop from './VerifyDesktop';

export default function VerifyPage() {
  const { isDesktop, mounted } = useIsDesktop();
  if (!mounted || !isDesktop) return <VerifyMobile />;
  return <VerifyDesktop />;
}
