'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingScreen } from '@/components/ui/Spinner';

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/login');
      } else if (user.role === 'technician') {
        router.replace('/technician');
      } else {
        router.replace('/admin');
      }
    }
  }, [user, loading, router]);

  return <LoadingScreen />;
}
