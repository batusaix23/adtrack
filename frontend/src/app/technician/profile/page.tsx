'use client';

import React from 'react';
import { TechnicianLayout } from '@/components/layout/TechnicianLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { useTechnicianAuth } from '@/contexts/TechnicianAuthContext';
import {
  UserCircleIcon,
  EnvelopeIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  ArrowRightOnRectangleIcon,
  BellIcon,
  Cog6ToothIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';

export default function ProfilePage() {
  const { technician, logout } = useTechnicianAuth();

  const menuItems = [
    { icon: BellIcon, label: 'Notificaciones', href: '/technician/settings/notifications' },
    { icon: Cog6ToothIcon, label: 'Configuración', href: '/technician/settings' },
    { icon: QuestionMarkCircleIcon, label: 'Ayuda', href: '/technician/help' },
  ];

  return (
    <TechnicianLayout title="Perfil">
      <div className="p-4 space-y-4">
        {/* Profile Header */}
        <Card className="text-center">
          <div className="flex flex-col items-center">
            <Avatar
              name={`${technician?.firstName} ${technician?.lastName}`}
              size="xl"
            />
            <h2 className="mt-4 text-xl font-semibold text-gray-900">
              {technician?.firstName} {technician?.lastName}
            </h2>
            <p className="text-gray-500 capitalize">
              Técnico
            </p>
          </div>
        </Card>

        {/* Info */}
        <Card>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <EnvelopeIcon className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="text-gray-900">{technician?.email}</p>
              </div>
            </div>

            {technician?.phone && (
              <div className="flex items-center gap-3">
                <PhoneIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Teléfono</p>
                  <p className="text-gray-900">{technician?.phone}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Empresa</p>
                <p className="text-gray-900">{technician?.companyName}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Menu */}
        <Card padding="none">
          {menuItems.map((item, index) => (
            <button
              key={item.label}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 ${
                index !== menuItems.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <item.icon className="h-5 w-5 text-gray-400" />
              <span className="text-gray-700">{item.label}</span>
            </button>
          ))}
        </Card>

        {/* Logout */}
        <Button
          variant="danger"
          className="w-full"
          onClick={logout}
          icon={<ArrowRightOnRectangleIcon className="h-5 w-5" />}
        >
          Cerrar Sesión
        </Button>

        {/* Version */}
        <p className="text-center text-sm text-gray-400">
          Aguadulce Track v1.0.0
        </p>
      </div>
    </TechnicianLayout>
  );
}
