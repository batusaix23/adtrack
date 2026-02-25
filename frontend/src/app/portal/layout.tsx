'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ClientPortalAuthProvider, useClientPortalAuth } from '@/contexts/ClientPortalAuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  WrenchScrewdriverIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  GlobeAltIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';

function PortalLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { language, setLanguage, t } = useLanguage();
  const { client, loading, logout } = useClientPortalAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'es' : 'en');
  };

  // Login page doesn't need full layout
  if (pathname === '/portal/login') {
    return (
      <>
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-2 px-3 py-2 bg-white/90 rounded-lg shadow-md hover:bg-white transition-colors"
          >
            <GlobeAltIcon className="h-5 w-5 text-gray-600" />
            <span className="text-sm font-medium">{language === 'en' ? 'ES' : 'EN'}</span>
          </button>
        </div>
        {children}
      </>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!client) {
    router.push('/portal/login');
    return null;
  }

  const navigation = [
    { name: t('nav.dashboard') || 'Dashboard', href: '/portal', icon: HomeIcon },
    { name: t('nav.services') || 'Servicios', href: '/portal/services', icon: ClipboardDocumentListIcon },
    { name: language === 'es' ? 'Facturación' : 'Billing', href: '/portal/billing', icon: CurrencyDollarIcon },
    { name: t('equipment.title') || 'Equipo', href: '/portal/equipment', icon: WrenchScrewdriverIcon },
    { name: language === 'es' ? 'Solicitudes' : 'Requests', href: '/portal/requests', icon: ChatBubbleLeftRightIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-xl font-bold text-primary-600">Aguadulce Track</span>
              <span className="ml-2 text-sm text-gray-500 hidden sm:block">{t('portal.clientPortal')}</span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-2">
              {navigation.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/portal' && pathname?.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                      isActive
                        ? 'bg-primary-50 text-primary-600'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              {/* Language Toggle */}
              <button
                onClick={toggleLanguage}
                className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <GlobeAltIcon className="h-5 w-5" />
                <span className="font-medium">{language === 'en' ? 'ES' : 'EN'}</span>
              </button>

              {client && (
                <span className="hidden md:block text-sm text-gray-600">
                  {client.firstName} {client.lastName}
                </span>
              )}

              <button
                onClick={logout}
                className="text-gray-500 hover:text-gray-700 flex items-center gap-1 text-sm"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
                <span className="hidden md:inline">{t('nav.logout') || 'Salir'}</span>
              </button>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-gray-500"
              >
                {mobileMenuOpen ? (
                  <XMarkIcon className="h-6 w-6" />
                ) : (
                  <Bars3Icon className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-white">
            <div className="px-2 py-3 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/portal' && pathname?.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-3 py-2 rounded-lg text-base font-medium flex items-center gap-2 ${
                      isActive
                        ? 'bg-primary-50 text-primary-600'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
          <p>{client.serviceCompany}</p>
          <p className="mt-1">Powered by Aguadulce Track</p>
        </div>
      </footer>
    </div>
  );
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClientPortalAuthProvider>
      <PortalLayoutContent>{children}</PortalLayoutContent>
    </ClientPortalAuthProvider>
  );
}
