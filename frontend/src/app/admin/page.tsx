'use client';

import React from 'react';
import useSWR from 'swr';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { fetcher } from '@/lib/api';
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';

export default function AdminDashboard() {
  const { data, error, isLoading } = useSWR('/analytics/dashboard', fetcher);

  if (isLoading) {
    return (
      <AdminLayout title="Dashboard">
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  const { today, week, alerts, inventory, recentServices } = data || {};

  return (
    <AdminLayout title="Dashboard">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="border-l-4 border-l-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Completados Hoy</p>
              <p className="text-3xl font-bold text-gray-900">{today?.completed || 0}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pendientes Hoy</p>
              <p className="text-3xl font-bold text-gray-900">{today?.pending || 0}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <ClockIcon className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Alertas Activas</p>
              <p className="text-3xl font-bold text-gray-900">{alerts?.total_active || 0}</p>
              {alerts?.critical > 0 && (
                <Badge variant="danger" size="sm">{alerts.critical} críticas</Badge>
              )}
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Inventario Bajo</p>
              <p className="text-3xl font-bold text-gray-900">{inventory?.low_stock_count || 0}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <CubeIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Services */}
        <Card>
          <CardHeader title="Servicios Recientes" />
          <div className="space-y-3">
            {recentServices?.length > 0 ? (
              recentServices.map((service: any) => (
                <div
                  key={service.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">{service.pool_name}</p>
                    <p className="text-sm text-gray-500">{service.client_name}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-sm">
                      <span>pH: {service.ph_level?.toFixed(1) || '-'}</span>
                      <span>Cl: {service.chlorine_level?.toFixed(1) || '-'}</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(service.scheduled_date).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No hay servicios recientes</p>
            )}
          </div>
        </Card>

        {/* Weekly Summary */}
        <Card>
          <CardHeader title="Resumen Semanal" />
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Servicios totales</span>
              <span className="font-semibold">{week?.total_services || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Completados</span>
              <span className="font-semibold text-green-600">{week?.completed || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Tiempo total</span>
              <span className="font-semibold">
                {week?.total_minutes ? `${Math.round(week.total_minutes / 60)}h` : '0h'}
              </span>
            </div>
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Tasa de completado</span>
                <span className="font-semibold text-primary-600">
                  {week?.total_services
                    ? `${Math.round((week.completed / week.total_services) * 100)}%`
                    : '0%'}
                </span>
              </div>
              <div className="mt-2 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full"
                  style={{
                    width: `${week?.total_services ? (week.completed / week.total_services) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
