'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import {
  HomeIcon,
  BuildingOffice2Icon,
  CreditCardIcon,
  ClipboardDocumentListIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

interface PlatformAdmin {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [admin, setAdmin] = useState<PlatformAdmin | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

  // Skip auth check for login page
  const isLoginPage = pathname === '/platform/login';

  useEffect(() => {
    if (isLoginPage) {
      setLoading(false);
      return;
    }

    const token = localStorage.getItem('platform_token');
    if (!token) {
      router.push('/platform/login');
      return;
    }

    // Verify token
    axios.get(`${apiUrl}/platform/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      setAdmin(res.data.admin);
      setLoading(false);
    })
    .catch(() => {
      localStorage.removeItem('platform_token');
      localStorage.removeItem('platform_admin');
      router.push('/platform/login');
    });
  }, [pathname, router, apiUrl, isLoginPage]);

  const handleLogout = () => {
    localStorage.removeItem('platform_token');
    localStorage.removeItem('platform_admin');
    router.push('/platform/login');
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  const navigation = [
    { name: 'Dashboard', href: '/platform', icon: HomeIcon },
    { name: 'Companies', href: '/platform/companies', icon: BuildingOffice2Icon },
    { name: 'Subscription Plans', href: '/platform/plans', icon: CreditCardIcon },
    { name: 'Activity Log', href: '/platform/activity', icon: ClipboardDocumentListIcon },
  ];

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-800 border-r border-slate-700 transform transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
              <ShieldCheckIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-semibold text-white">Platform Admin</p>
              <p className="text-xs text-slate-400">Aguadulce Track</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-600/20 rounded-full flex items-center justify-center">
              <span className="text-purple-400 font-medium">
                {admin?.firstName?.[0]}{admin?.lastName?.[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {admin?.firstName} {admin?.lastName}
              </p>
              <p className="text-xs text-slate-400 truncate">{admin?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-slate-300 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <header className="h-16 bg-slate-800 border-b border-slate-700 flex items-center px-4 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-400">
            <Bars3Icon className="h-6 w-6" />
          </button>
          <span className="ml-4 font-semibold text-white">Platform Admin</span>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
