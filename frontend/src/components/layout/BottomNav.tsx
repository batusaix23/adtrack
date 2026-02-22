'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  MapPinIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  ClipboardDocumentListIcon as ClipboardSolid,
  MapPinIcon as MapPinSolid,
  UserCircleIcon as UserSolid,
} from '@heroicons/react/24/solid';

const navigation = [
  {
    name: 'Inicio',
    href: '/technician',
    icon: HomeIcon,
    iconActive: HomeIconSolid,
  },
  {
    name: 'Servicios',
    href: '/technician/services',
    icon: ClipboardDocumentListIcon,
    iconActive: ClipboardSolid,
  },
  {
    name: 'Rutas',
    href: '/technician/routes',
    icon: MapPinIcon,
    iconActive: MapPinSolid,
  },
  {
    name: 'Perfil',
    href: '/technician/profile',
    icon: UserCircleIcon,
    iconActive: UserSolid,
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom z-40">
      <div className="flex items-center justify-around h-16">
        {navigation.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/technician' && pathname.startsWith(item.href));
          const Icon = isActive ? item.iconActive : item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                'flex flex-col items-center justify-center w-full h-full gap-0.5',
                isActive ? 'text-primary-600' : 'text-gray-500'
              )}
            >
              <Icon className="h-6 w-6" />
              <span className="text-xs font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
