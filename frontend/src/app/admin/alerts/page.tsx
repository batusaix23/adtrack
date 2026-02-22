'use client';

import React from 'react';
import useSWR from 'swr';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { fetcher } from '@/lib/api';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  ExclamationTriangleIcon,
  CheckIcon,
  XMarkIcon,
  BellAlertIcon,
} from '@heroicons/react/24/outline';

interface Alert {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'acknowledged' | 'resolved';
  pool_name?: string;
  client_name?: string;
  created_at: string;
}

export default function AlertsPage() {
  const { data, error, mutate } = useSWR('/alerts?status=active', fetcher);
  const { data: countData } = useSWR('/alerts/count', fetcher);

  const acknowledgeAlert = async (id: string) => {
    try {
      await api.post(`/alerts/${id}/acknowledge`);
      toast.success('Alerta reconocida');
      mutate();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error');
    }
  };

  const resolveAlert = async (id: string) => {
    try {
      await api.post(`/alerts/${id}/resolve`, { resolution: 'Resuelto manualmente' });
      toast.success('Alerta resuelta');
      mutate();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error');
    }
  };

  const priorityColors = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
  };

  const priorityIcons = {
    low: '○',
    medium: '◐',
    high: '●',
    critical: '◉',
  };

  return (
    <AdminLayout title="Alertas">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="border-l-4 border-l-red-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Críticas</p>
              <p className="text-2xl font-bold text-red-600">
                {countData?.counts?.critical || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <BellAlertIcon className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Alta Prioridad</p>
              <p className="text-2xl font-bold text-orange-600">
                {countData?.counts?.high || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <div>
            <p className="text-sm text-gray-500">Total Activas</p>
            <p className="text-2xl font-bold">
              {countData?.counts?.active || 0}
            </p>
          </div>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <div>
            <p className="text-sm text-gray-500">Reconocidas</p>
            <p className="text-2xl font-bold text-blue-600">
              {countData?.counts?.acknowledged || 0}
            </p>
          </div>
        </Card>
      </div>

      {/* Alert List */}
      <div className="space-y-4">
        {data?.alerts?.length === 0 ? (
          <Card className="text-center py-12">
            <CheckIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900">No hay alertas activas</p>
            <p className="text-gray-500">Todo está funcionando correctamente</p>
          </Card>
        ) : (
          data?.alerts?.map((alert: Alert) => (
            <Card key={alert.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div
                  className={`p-2 rounded-lg ${
                    alert.priority === 'critical' ? 'bg-red-100' :
                    alert.priority === 'high' ? 'bg-orange-100' :
                    alert.priority === 'medium' ? 'bg-yellow-100' : 'bg-gray-100'
                  }`}
                >
                  <ExclamationTriangleIcon
                    className={`h-6 w-6 ${
                      alert.priority === 'critical' ? 'text-red-600' :
                      alert.priority === 'high' ? 'text-orange-600' :
                      alert.priority === 'medium' ? 'text-yellow-600' : 'text-gray-600'
                    }`}
                  />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{alert.title}</h3>
                    <Badge className={priorityColors[alert.priority]}>
                      {priorityIcons[alert.priority]} {alert.priority}
                    </Badge>
                  </div>

                  {alert.message && (
                    <p className="text-gray-600 mt-1">{alert.message}</p>
                  )}

                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    {alert.pool_name && (
                      <span>{alert.pool_name}</span>
                    )}
                    {alert.client_name && (
                      <span>• {alert.client_name}</span>
                    )}
                    <span>
                      {new Date(alert.created_at).toLocaleString('es-ES', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {alert.status === 'active' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => acknowledgeAlert(alert.id)}
                    >
                      Reconocer
                    </Button>
                  )}
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => resolveAlert(alert.id)}
                    icon={<CheckIcon className="h-4 w-4" />}
                  >
                    Resolver
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </AdminLayout>
  );
}
