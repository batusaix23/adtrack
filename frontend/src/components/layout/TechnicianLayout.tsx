'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { BottomNav } from './BottomNav';
import { LoadingScreen } from '@/components/ui/Spinner';

interface TechnicianLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
}

export function TechnicianLayout({
  children,
  title,
  showBack = false,
  onBack,
}: TechnicianLayoutProps) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      {title && (
        <header className="sticky top-0 bg-white border-b border-gray-200 z-30">
          <div className="flex items-center h-14 px-4">
            {showBack && (
              <button
                type="button"
                onClick={onBack || (() => router.back())}
                className="mr-3 text-gray-500"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <h1 className="text-lg font-semibold text-gray-900 flex-1 truncate">
              {title}
            </h1>
          </div>
        </header>
      )}

      {/* Content */}
      <main>{children}</main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
