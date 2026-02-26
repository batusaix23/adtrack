'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  CurrencyDollarIcon,
  DocumentTextIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface Invoice {
  id: string;
  invoice_number: string;
  total: string;
  balance_due: string;
  status: string;
  issue_date: string;
  due_date: string;
  paid_date: string | null;
  billing_period_start: string | null;
  billing_period_end: string | null;
}

interface Profile {
  monthly_service_cost: string | null;
  stabilizer_cost: string | null;
  stabilizer_frequency_months: number | null;
}

export default function PortalBillingPage() {
  const { language } = useLanguage();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      const token = localStorage.getItem('portalAccessToken');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const [profileRes, invoicesRes] = await Promise.all([
        axios.get(`${apiUrl}/portal/profile`, config),
        axios.get(`${apiUrl}/portal/invoices`, config),
      ]);

      setProfile(profileRes.data.client);
      setInvoices(invoicesRes.data.invoices || []);
    } catch (error) {
      console.error('Error fetching billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: string | number | null) => {
    if (!amount) return '$0.00';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'overdue':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-700';
      case 'overdue':
        return 'bg-red-100 text-red-700';
      case 'sent':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-yellow-100 text-yellow-700';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, Record<string, string>> = {
      paid: { en: 'Paid', es: 'Pagada' },
      overdue: { en: 'Overdue', es: 'Vencida' },
      sent: { en: 'Pending', es: 'Pendiente' },
      draft: { en: 'Draft', es: 'Borrador' },
    };
    return labels[status]?.[language] || status;
  };

  const totalOutstanding = invoices
    .filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled')
    .reduce((sum, inv) => sum + Number(inv.balance_due || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">
        {language === 'es' ? 'Facturación' : 'Billing'}
      </h1>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Monthly Rate Card */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl shadow-sm p-6 text-white">
          <p className="text-primary-100 text-sm">
            {language === 'es' ? 'Costo Mensual de Servicio' : 'Monthly Service Cost'}
          </p>
          <p className="text-4xl font-bold mt-1">
            {formatCurrency(profile?.monthly_service_cost ?? 0)}
          </p>
          {profile?.stabilizer_cost && profile?.stabilizer_frequency_months && (
            <p className="text-primary-200 text-sm mt-2">
              + {formatCurrency(profile.stabilizer_cost)} {language === 'es' ? 'estabilizador cada' : 'stabilizer every'} {profile.stabilizer_frequency_months} {language === 'es' ? 'meses' : 'months'}
            </p>
          )}
        </div>

        {/* Outstanding Balance Card */}
        <div className={`rounded-xl shadow-sm p-6 ${totalOutstanding > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
          <p className={`text-sm ${totalOutstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {language === 'es' ? 'Balance Pendiente' : 'Outstanding Balance'}
          </p>
          <p className={`text-4xl font-bold mt-1 ${totalOutstanding > 0 ? 'text-red-700' : 'text-green-700'}`}>
            {formatCurrency(totalOutstanding)}
          </p>
          <p className="text-gray-500 text-sm mt-2">
            {invoices.filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled').length} {language === 'es' ? 'facturas pendientes' : 'pending invoices'}
          </p>
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <DocumentTextIcon className="h-5 w-5 text-primary-600" />
            {language === 'es' ? 'Facturas' : 'Invoices'}
          </h2>
        </div>

        {invoices.length > 0 ? (
          <div className="divide-y">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(invoice.status)}
                    <div>
                      <p className="font-medium text-gray-900">
                        {invoice.invoice_number}
                      </p>
                      <p className="text-sm text-gray-500">
                        {language === 'es' ? 'Emitida' : 'Issued'}: {formatDate(invoice.issue_date)}
                      </p>
                      {invoice.billing_period_start && invoice.billing_period_end && (
                        <p className="text-xs text-gray-400 mt-1">
                          {language === 'es' ? 'Período' : 'Period'}: {formatDate(invoice.billing_period_start)} - {formatDate(invoice.billing_period_end)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(invoice.total)}</p>
                    {Number(invoice.balance_due) > 0 && invoice.status !== 'paid' && (
                      <p className="text-sm text-red-600">
                        {language === 'es' ? 'Pendiente' : 'Due'}: {formatCurrency(invoice.balance_due)}
                      </p>
                    )}
                    <span className={`inline-block mt-1 text-xs px-2 py-1 rounded-full ${getStatusColor(invoice.status)}`}>
                      {getStatusLabel(invoice.status)}
                    </span>
                    {invoice.status !== 'paid' && invoice.due_date && (
                      <p className="text-xs text-gray-400 mt-1 flex items-center justify-end gap-1">
                        <CalendarIcon className="h-3 w-3" />
                        {language === 'es' ? 'Vence' : 'Due'}: {formatDate(invoice.due_date)}
                      </p>
                    )}
                    {invoice.status === 'paid' && invoice.paid_date && (
                      <p className="text-xs text-green-600 mt-1">
                        {language === 'es' ? 'Pagada' : 'Paid'}: {formatDate(invoice.paid_date)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {language === 'es' ? 'No hay facturas aún' : 'No invoices yet'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {language === 'es'
                ? 'Las facturas aparecerán aquí una vez generadas'
                : 'Invoices will appear here once generated'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
