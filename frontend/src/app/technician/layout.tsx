'use client';

import { TechnicianAuthProvider } from '@/contexts/TechnicianAuthContext';

export default function TechnicianLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TechnicianAuthProvider>
      {children}
    </TechnicianAuthProvider>
  );
}
