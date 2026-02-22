'use client';

import React from 'react';
import {
  Bars3Icon,
  BellIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Avatar } from '@/components/ui/Avatar';
import { LanguageToggleSimple } from '@/components/ui/LanguageToggle';

interface HeaderProps {
  onMenuClick: () => void;
  title?: string;
}

export function Header({ onMenuClick, title }: HeaderProps) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6">
      {/* Left side */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          className="lg:hidden p-2 -ml-2 text-gray-500 hover:text-gray-700"
          onClick={onMenuClick}
        >
          <Bars3Icon className="h-6 w-6" />
        </button>
        {title && (
          <h1 className="text-xl font-semibold text-gray-900 hidden sm:block">
            {title}
          </h1>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Language Toggle */}
        <LanguageToggleSimple />

        {/* Notifications */}
        <button
          type="button"
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg relative"
        >
          <BellIcon className="h-6 w-6" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* User menu */}
        <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
          <Avatar
            name={`${user?.firstName} ${user?.lastName}`}
            size="sm"
          />
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-900">
              {user?.firstName}
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            title={t('nav.logout')}
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
