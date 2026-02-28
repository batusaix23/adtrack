'use client';

import React, { useState } from 'react';
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
  CubeIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
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

interface LowStockItem {
  id: string;
  name: string;
  quantity: number;
  min_stock_level: number;
  unit: string;
}

export default function AlertsPage() {
  const [activeTab, setActiveTab] = useState<'alerts' | 'inventory' | 'settings'>('alerts');
  const [checkingInventory, setCheckingInventory] = useState(false);

  const { data, error, mutate } = useSWR('/alerts?status=active', fetcher);
  const { data: countData, mutate: mutateCount } = useSWR('/alerts/count', fetcher);
  const { data: lowStockData, mutate: mutateLowStock } = useSWR('/inventory/status/low-stock', fetcher);
  const { data: zeroStockData } = useSWR('/inventory/status/zero-stock', fetcher);

  const checkInventoryAlerts = async () => {
    setCheckingInventory(true);
    try {
      const response = await api.post('/inventory/check-alerts');
      if (response.data.alertsCreated?.length > 0) {
        toast.success(`Se crearon ${response.data.alertsCreated.length} alertas de inventario`);
      } else {
        toast.success('Inventario verificado. No hay nuevas alertas.');
      }
      mutate();
      mutateCount();
      mutateLowStock();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al verificar inventario');
    } finally {
      setCheckingInventory(false);
    }
  };

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
      {/* Tabs */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'alerts'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <BellAlertIcon className="h-4 w-4 inline mr-1" />
            Alertas
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 text-sm font-medium border-l ${
              activeTab === 'inventory'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <CubeIcon className="h-4 w-4 inline mr-1" />
            Inventario
            {(zeroStockData?.zeroStockItems?.length > 0 || lowStockData?.lowStockItems?.length > 0) && (
              <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5">
                {(zeroStockData?.zeroStockItems?.length || 0) + (lowStockData?.lowStockItems?.length || 0)}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 text-sm font-medium border-l ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Cog6ToothIcon className="h-4 w-4 inline mr-1" />
            Configurar
          </button>
        </div>
        <div className="flex-1" />
        <Button
          variant="secondary"
          onClick={checkInventoryAlerts}
          disabled={checkingInventory}
          icon={<ArrowPathIcon className={`h-4 w-4 ${checkingInventory ? 'animate-spin' : ''}`} />}
        >
          Verificar Inventario
        </Button>
      </div>

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

      {/* Tab Content */}
      {activeTab === 'alerts' && (
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
                    {alert.type === 'inventory' ? (
                      <CubeIcon
                        className={`h-6 w-6 ${
                          alert.priority === 'critical' ? 'text-red-600' :
                          alert.priority === 'high' ? 'text-orange-600' : 'text-yellow-600'
                        }`}
                      />
                    ) : (
                      <ExclamationTriangleIcon
                        className={`h-6 w-6 ${
                          alert.priority === 'critical' ? 'text-red-600' :
                          alert.priority === 'high' ? 'text-orange-600' :
                          alert.priority === 'medium' ? 'text-yellow-600' : 'text-gray-600'
                        }`}
                      />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{alert.title}</h3>
                      <Badge className={priorityColors[alert.priority]}>
                        {priorityIcons[alert.priority]} {alert.priority}
                      </Badge>
                      {alert.type && (
                        <Badge className="bg-gray-100 text-gray-600">
                          {alert.type === 'inventory' ? 'Inventario' :
                           alert.type === 'chemical' ? 'Químicos' :
                           alert.type === 'equipment' ? 'Equipo' : alert.type}
                        </Badge>
                      )}
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
      )}

      {activeTab === 'inventory' && (
        <div className="space-y-6">
          {/* Zero Stock - Critical */}
          {zeroStockData?.zeroStockItems?.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-red-600 mb-3 flex items-center gap-2">
                <ExclamationTriangleIcon className="h-5 w-5" />
                Sin Stock (Crítico)
              </h3>
              <div className="grid gap-3">
                {zeroStockData.zeroStockItems.map((item: LowStockItem) => (
                  <Card key={item.id} className="border-l-4 border-l-red-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{item.name}</h4>
                        <p className="text-sm text-gray-500">
                          Cantidad: <span className="text-red-600 font-semibold">{item.quantity} {item.unit}</span>
                          {' | '}Mínimo: {item.min_stock_level} {item.unit}
                        </p>
                      </div>
                      <Badge className="bg-red-100 text-red-800">Sin Stock</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Low Stock - Warning */}
          {lowStockData?.lowStockItems?.filter((i: LowStockItem) => i.quantity > 0).length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-orange-600 mb-3 flex items-center gap-2">
                <BellAlertIcon className="h-5 w-5" />
                Stock Bajo
              </h3>
              <div className="grid gap-3">
                {lowStockData.lowStockItems
                  .filter((item: LowStockItem) => item.quantity > 0)
                  .map((item: LowStockItem) => (
                  <Card key={item.id} className="border-l-4 border-l-orange-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{item.name}</h4>
                        <p className="text-sm text-gray-500">
                          Cantidad: <span className="text-orange-600 font-semibold">{item.quantity} {item.unit}</span>
                          {' | '}Mínimo: {item.min_stock_level} {item.unit}
                        </p>
                      </div>
                      <Badge className="bg-orange-100 text-orange-800">Stock Bajo</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {(!zeroStockData?.zeroStockItems?.length && !lowStockData?.lowStockItems?.length) && (
            <Card className="text-center py-12">
              <CheckIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900">Inventario en buen estado</p>
              <p className="text-gray-500">Todos los items tienen stock suficiente</p>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          <Card>
            <h3 className="text-lg font-semibold mb-4">Configuración de Alertas</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium">Alertas de Inventario</h4>
                  <p className="text-sm text-gray-500">Notificar cuando el stock esté bajo o en cero</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium">Alertas de Químicos</h4>
                  <p className="text-sm text-gray-500">Notificar niveles anormales de pH o cloro</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium">Alertas de Equipos</h4>
                  <p className="text-sm text-gray-500">Notificar mantenimiento preventivo de equipos</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium">Alertas por Email</h4>
                  <p className="text-sm text-gray-500">Enviar notificaciones al email del administrador</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold mb-4">Tipos de Alertas</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Tipo</th>
                    <th className="text-left py-2">Descripción</th>
                    <th className="text-center py-2">Prioridad</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-3 font-medium">inventory</td>
                    <td className="py-3 text-gray-500">Stock bajo o agotado</td>
                    <td className="py-3 text-center"><Badge className="bg-red-100 text-red-800">Crítico/Alto</Badge></td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 font-medium">chemical</td>
                    <td className="py-3 text-gray-500">Niveles de pH o cloro fuera de rango</td>
                    <td className="py-3 text-center"><Badge className="bg-orange-100 text-orange-800">Alto</Badge></td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 font-medium">equipment</td>
                    <td className="py-3 text-gray-500">Mantenimiento preventivo requerido</td>
                    <td className="py-3 text-center"><Badge className="bg-yellow-100 text-yellow-800">Medio</Badge></td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 font-medium">service</td>
                    <td className="py-3 text-gray-500">Servicio vencido o retrasado</td>
                    <td className="py-3 text-center"><Badge className="bg-yellow-100 text-yellow-800">Medio</Badge></td>
                  </tr>
                  <tr>
                    <td className="py-3 font-medium">billing</td>
                    <td className="py-3 text-gray-500">Factura vencida o pago pendiente</td>
                    <td className="py-3 text-center"><Badge className="bg-blue-100 text-blue-800">Bajo</Badge></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </AdminLayout>
  );
}
