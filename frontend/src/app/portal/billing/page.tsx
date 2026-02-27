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
  EyeIcon,
  XMarkIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';

interface Invoice {
  id: string;
  invoice_number: string;
  subtotal?: string;
  tax_amount?: string;
  tax_rate?: string;
  total: string;
  balance_due: string;
  status: string;
  issue_date: string;
  due_date: string;
  paid_date: string | null;
  billing_period_start: string | null;
  billing_period_end: string | null;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: string;
  unit_price: string;
  amount: string;
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
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

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

  const viewInvoiceDetails = async (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setLoadingDetails(true);
    setShowInvoiceModal(true);
    try {
      const token = localStorage.getItem('portalAccessToken');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get(`${apiUrl}/portal/invoices/${invoice.id}`, config);
      setInvoiceItems(res.data.items || []);
      // Update invoice with full details
      setSelectedInvoice(res.data.invoice);
    } catch (error) {
      console.error('Error fetching invoice details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

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
              <div
                key={invoice.id}
                className="p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => viewInvoiceDetails(invoice)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(invoice.status)}
                    <div>
                      <p className="font-medium text-gray-900 flex items-center gap-2">
                        {invoice.invoice_number}
                        <EyeIcon className="h-4 w-4 text-gray-400" />
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

      {/* Invoice Detail Modal */}
      {showInvoiceModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto print:max-w-full print:shadow-none">
            {/* Header */}
            <div className="p-4 border-b flex justify-between items-center print:hidden">
              <h2 className="text-lg font-semibold">{selectedInvoice.invoice_number}</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  title={language === 'es' ? 'Imprimir' : 'Print'}
                >
                  <PrinterIcon className="h-5 w-5" />
                </button>
                <button onClick={() => setShowInvoiceModal(false)}>
                  <XMarkIcon className="h-6 w-6 text-gray-500" />
                </button>
              </div>
            </div>

            {loadingDetails ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              </div>
            ) : (
              <div className="p-6 print:p-8">
                {/* Invoice Header */}
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold text-primary-600">Aguadulce Track</h1>
                  <p className="text-gray-500 text-sm">
                    {language === 'es' ? 'Servicio de Mantenimiento de Piscinas' : 'Pool Maintenance Service'}
                  </p>
                </div>

                {/* Invoice Info */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-xl font-bold">{language === 'es' ? 'FACTURA' : 'INVOICE'}</h2>
                    <p className="text-lg font-semibold text-primary-600">{selectedInvoice.invoice_number}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(selectedInvoice.status)}`}>
                    {getStatusLabel(selectedInvoice.status)}
                  </span>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                  <div>
                    <p className="text-gray-500">{language === 'es' ? 'Fecha de emisión' : 'Issue Date'}:</p>
                    <p className="font-medium">{formatDate(selectedInvoice.issue_date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500">{language === 'es' ? 'Fecha de vencimiento' : 'Due Date'}:</p>
                    <p className="font-medium">{formatDate(selectedInvoice.due_date)}</p>
                  </div>
                </div>

                {/* Items */}
                <table className="w-full text-sm mb-6">
                  <thead>
                    <tr className="border-b-2 border-gray-300">
                      <th className="px-2 py-2 text-left">{language === 'es' ? 'Descripción' : 'Description'}</th>
                      <th className="px-2 py-2 text-center w-16">{language === 'es' ? 'Cant' : 'Qty'}</th>
                      <th className="px-2 py-2 text-right w-24">{language === 'es' ? 'Precio' : 'Price'}</th>
                      <th className="px-2 py-2 text-right w-24">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceItems.map(item => (
                      <tr key={item.id} className="border-b">
                        <td className="px-2 py-3">{item.description}</td>
                        <td className="px-2 py-3 text-center">{item.quantity}</td>
                        <td className="px-2 py-3 text-right">{formatCurrency(item.unit_price)}</td>
                        <td className="px-2 py-3 text-right">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="w-56">
                    <div className="flex justify-between py-1">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(selectedInvoice.subtotal || selectedInvoice.total)}</span>
                    </div>
                    {selectedInvoice.tax_amount && Number(selectedInvoice.tax_amount) > 0 && (
                      <div className="flex justify-between py-1">
                        <span>IVU ({selectedInvoice.tax_rate}%):</span>
                        <span>{formatCurrency(selectedInvoice.tax_amount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-2 border-t-2 font-bold text-lg">
                      <span>TOTAL:</span>
                      <span>{formatCurrency(selectedInvoice.total)}</span>
                    </div>
                    {Number(selectedInvoice.balance_due) > 0 && (
                      <div className="flex justify-between py-2 bg-red-50 px-2 rounded text-red-600 font-semibold">
                        <span>{language === 'es' ? 'PENDIENTE' : 'DUE'}:</span>
                        <span>{formatCurrency(selectedInvoice.balance_due)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-8 pt-4 border-t text-center text-sm text-gray-500">
                  <p>{language === 'es' ? 'Gracias por su preferencia' : 'Thank you for your business'}</p>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="p-4 border-t flex justify-end gap-2 print:hidden">
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
              >
                <PrinterIcon className="h-4 w-4" />
                {language === 'es' ? 'Imprimir' : 'Print'}
              </button>
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                {language === 'es' ? 'Cerrar' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
