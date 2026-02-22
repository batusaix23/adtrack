'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import {
  HomeIcon,
  UsersIcon,
  BuildingOfficeIcon,
  BeakerIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  BellIcon,
  CalendarIcon,
  Cog6ToothIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';

const adminNavigation = [
  { name: 'Dashboard', href: '/admin', icon: HomeIcon },
  { name: 'Servicios', href: '/admin/services', icon: ClipboardDocumentListIcon },
  { name: 'Calendario', href: '/admin/calendar', icon: CalendarIcon },
  { name: 'Clientes', href: '/admin/clients', icon: UsersIcon },
  { name: 'Piscinas', href: '/admin/pools', icon: BuildingOfficeIcon },
  { name: 'Químicos', href: '/admin/chemicals', icon: BeakerIcon },
  { name: 'Inventario', href: '/admin/inventory', icon: CubeIcon },
  { name: 'Alertas', href: '/admin/alerts', icon: BellIcon },
  { name: 'Analíticas', href: '/admin/analytics', icon: ChartBarIcon },
  { name: 'Configuración', href: '/admin/settings', icon: Cog6ToothIcon },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">AT</span>
            </div>
            <span className="font-semibold text-gray-900">Aguadulce Track</span>
          </Link>
        </div>

        {/* Company info */}
        <div className="px-4 py-3 border-b border-gray-200">
          <p className="text-xs text-gray-500">Empresa</p>
          <p className="text-sm font-medium text-gray-900 truncate">
            {user?.companyName}
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {adminNavigation.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/admin' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                <item.icon
                  className={clsx(
                    'h-5 w-5',
                    isActive ? 'text-primary-600' : 'text-gray-400'
                  )}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-primary-700 font-medium">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {user?.role === 'owner' ? 'Propietario' : user?.role === 'admin' ? 'Admin' : 'Técnico'}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
