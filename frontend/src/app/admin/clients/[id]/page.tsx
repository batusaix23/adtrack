'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { fetcher } from '@/lib/api';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  PencilIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  WrenchScrewdriverIcon,
  CpuChipIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  CalendarDaysIcon,
  ClockIcon,
  PlusIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

type TabType = 'summary' | 'invoices' | 'payments' | 'services' | 'equipment';

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;
  const [activeTab, setActiveTab] = useState<TabType>('summary');

  const { data: clientData, mutate } = useSWR(`/clients/${clientId}`, fetcher);
  const { data: summaryData } = useSWR(`/clients/${clientId}/summary`, fetcher);
  const { data: transactionsData } = useSWR(`/clients/${clientId}/transactions`, fetcher);
  const { data: servicesData } = useSWR(`/clients/${clientId}/services?limit=20`, fetcher);
  const { data: equipmentData } = useSWR(`/equipment/client/${clientId}`, fetcher);
  const { data: invoicesData } = useSWR(`/invoices?clientId=${clientId}`, fetcher);

  const client = clientData?.client;
  const summary = summaryData?.summary;
  const transactions = transactionsData?.transactions || [];
  const services = servicesData?.services || [];
  const equipment = equipmentData?.equipment || [];
  const invoices = invoicesData?.invoices || [];

  const formatCurrency = (amount: number | string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount) || 0);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-PR', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-700';
      case 'sent': return 'bg-blue-100 text-blue-700';
      case 'paid': return 'bg-green-100 text-green-700';
      case 'completed': return 'bg-green-100 text-green-700';
      case 'overdue': return 'bg-red-100 text-red-700';
      case 'partial': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handleGenerateInvoice = async () => {
    try {
      await api.post(`/invoices/generate/${clientId}`, {});
      toast.success('Factura generada');
      mutate();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error generando factura');
    }
  };

  if (!client) {
    return (
      <AdminLayout title="Cargando...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </AdminLayout>
    );
  }

  const displayName = client.display_name || `${client.first_name || client.name} ${client.last_name || ''}`.trim();

  const tabs = [
    { id: 'summary', label: 'Resumen', icon: DocumentTextIcon },
    { id: 'invoices', label: 'Facturas', icon: CurrencyDollarIcon },
    { id: 'payments', label: 'Pagos', icon: CheckCircleIcon },
    { id: 'services', label: 'Servicios', icon: WrenchScrewdriverIcon },
    { id: 'equipment', label: 'Equipo', icon: CpuChipIcon },
  ];

  return (
    <AdminLayout title={displayName}>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/admin/clients')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Clientes
        </button>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
              <Badge variant={client.is_active ? 'success' : 'default'}>
                {client.is_active ? 'Activo' : 'Inactivo'}
              </Badge>
              {client.client_type === 'commercial' && (
                <Badge variant="warning">Comercial</Badge>
              )}
            </div>
            {client.company_name && (
              <p className="text-primary-600 font-medium">{client.company_name}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={handleGenerateInvoice}
              icon={<PlusIcon className="h-5 w-5" />}
            >
              Generar Factura
            </Button>
            <Button
              onClick={() => router.push(`/admin/clients?edit=${clientId}`)}
              icon={<PencilIcon className="h-5 w-5" />}
            >
              Editar
            </Button>
          </div>
        </div>
      </div>

      {/* Contact Info Card */}
      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <h3 className="font-medium text-gray-900">Contacto</h3>
            {client.phone && (
              <p className="flex items-center gap-2 text-sm text-gray-600">
                <PhoneIcon className="h-4 w-4" />
                {client.phone}
              </p>
            )}
            {client.mobile && (
              <p className="flex items-center gap-2 text-sm text-gray-600">
                <PhoneIcon className="h-4 w-4" />
                {client.mobile} (Móvil)
              </p>
            )}
            {client.email && (
              <p className="flex items-center gap-2 text-sm text-gray-600">
                <EnvelopeIcon className="h-4 w-4" />
                {client.email}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <h3 className="font-medium text-gray-900">Dirección de Servicio</h3>
            <p className="flex items-start gap-2 text-sm text-gray-600">
              <MapPinIcon className="h-4 w-4 mt-0.5" />
              <span>
                {client.address}
                {client.city && <>, {client.city}</>}
                {client.state && <>, {client.state}</>}
                {client.zip_code && <> {client.zip_code}</>}
              </span>
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-medium text-gray-900">Servicio</h3>
            <p className="flex items-center gap-2 text-sm text-gray-600">
              <CalendarDaysIcon className="h-4 w-4" />
              {client.service_frequency === '1x_week' && '1x por semana'}
              {client.service_frequency === '2x_week' && '2x por semana'}
              {client.service_frequency === '3x_week' && '3x por semana'}
              {client.service_frequency === 'biweekly' && 'Quincenal'}
              {client.service_frequency === 'monthly' && 'Mensual'}
              {client.service_frequency === 'on_call' && 'A solicitud'}
            </p>
            {client.monthly_service_cost && (
              <p className="flex items-center gap-2 text-sm text-green-600 font-medium">
                <CurrencyDollarIcon className="h-4 w-4" />
                {formatCurrency(client.monthly_service_cost)}/mes
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-red-50 border-red-100">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-full">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-red-600">Pendiente</p>
                <p className="text-2xl font-bold text-red-700">{formatCurrency(summary.total_pending)}</p>
              </div>
            </div>
          </Card>
          <Card className="bg-green-50 border-green-100">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-green-600">Pagado</p>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(summary.total_paid)}</p>
              </div>
            </div>
          </Card>
          <Card className="bg-blue-50 border-blue-100">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <CurrencyDollarIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-blue-600">Créditos</p>
                <p className="text-2xl font-bold text-blue-700">{formatCurrency(summary.credits)}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="h-5 w-5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'summary' && (
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Transacciones Recientes</h3>
          {transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referencia</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.slice(0, 10).map((tx: any) => (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-primary-600">{tx.reference}</td>
                      <td className="px-4 py-3 text-sm">
                        <Badge variant={tx.type === 'invoice' ? 'default' : 'success'} size="sm">
                          {tx.type === 'invoice' ? 'Factura' : 'Pago'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(tx.date)}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        <span className={tx.type === 'payment' ? 'text-green-600' : ''}>
                          {tx.type === 'payment' ? '+' : ''}{formatCurrency(tx.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(tx.status)}`}>
                          {tx.status === 'paid' ? 'Pagado' : tx.status === 'sent' ? 'Enviado' : tx.status === 'completed' ? 'Completado' : tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No hay transacciones</p>
          )}
        </Card>
      )}

      {activeTab === 'invoices' && (
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-900">Facturas</h3>
            <Button size="sm" onClick={handleGenerateInvoice} icon={<PlusIcon className="h-4 w-4" />}>
              Nueva Factura
            </Button>
          </div>
          {invoices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Número</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vencimiento</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pendiente</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoices.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-gray-50 cursor-pointer">
                      <td className="px-4 py-3 text-sm font-medium text-primary-600">{inv.invoice_number}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(inv.issue_date)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(inv.due_date)}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(inv.total)}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-red-600">
                        {Number(inv.balance_due) > 0 ? formatCurrency(inv.balance_due) : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(inv.status)}`}>
                          {inv.status === 'paid' ? 'Pagado' : inv.status === 'sent' ? 'Enviado' : inv.status === 'draft' ? 'Borrador' : inv.status === 'overdue' ? 'Vencido' : inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No hay facturas</p>
          )}
        </Card>
      )}

      {activeTab === 'payments' && (
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Historial de Pagos</h3>
          {transactions.filter((t: any) => t.type === 'payment').length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referencia</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Factura</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Método</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.filter((t: any) => t.type === 'payment').map((payment: any) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{payment.reference}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(payment.date)}</td>
                      <td className="px-4 py-3 text-sm text-primary-600">{payment.invoice_reference || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 capitalize">{payment.payment_method || '-'}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-green-600">
                        +{formatCurrency(payment.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No hay pagos registrados</p>
          )}
        </Card>
      )}

      {activeTab === 'services' && (
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Historial de Servicios</h3>
          {services.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Piscina</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Técnico</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {services.map((service: any) => (
                    <tr key={service.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatDate(service.scheduled_date)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{service.pool_name || 'Principal'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{service.technician_name || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(service.status)}`}>
                          {service.status === 'completed' ? 'Completado' : service.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 truncate max-w-xs">{service.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No hay servicios registrados</p>
          )}
        </Card>
      )}

      {activeTab === 'equipment' && (
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-900">Equipo Registrado</h3>
          </div>
          {equipment.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {equipment.map((eq: any) => (
                <div key={eq.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{eq.equipment_type}</h4>
                      {eq.brand && <p className="text-sm text-gray-600">{eq.brand} {eq.model}</p>}
                    </div>
                    <Badge variant={eq.is_active ? 'success' : 'default'} size="sm">
                      {eq.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                  {eq.serial_number && (
                    <p className="text-xs text-gray-500 mt-2">S/N: {eq.serial_number}</p>
                  )}
                  {eq.warranty_expires && (
                    <p className="text-xs text-gray-500">
                      Garantía hasta: {formatDate(eq.warranty_expires)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No hay equipos registrados</p>
          )}
        </Card>
      )}
    </AdminLayout>
  );
}
