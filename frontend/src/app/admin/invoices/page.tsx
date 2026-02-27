'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdminLayout } from '@/components/layout/AdminLayout';
import axios from 'axios';
import {
  DocumentTextIcon,
  PlusIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  TrashIcon,
  PaperAirplaneIcon,
  BanknotesIcon,
  Cog6ToothIcon,
  XMarkIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  PrinterIcon,
  EnvelopeIcon,
  ChatBubbleLeftIcon,
} from '@heroicons/react/24/outline';

interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  client_first_name: string;
  client_last_name: string;
  client_email: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  subtotal: string;
  tax_rate: string;
  tax_amount: string;
  discount_amount: string;
  adjustment_amount: string;
  adjustment_description: string;
  total: string;
  amount_paid: string;
  balance_due: string;
  issue_date: string;
  due_date: string;
  paid_date: string | null;
  billing_period_start: string | null;
  billing_period_end: string | null;
  created_at: string;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: string;
  unit_price: string;
  discount_percent: string;
  discount_amount: string;
  amount: string;
  service_item_id: string | null;
}

interface Client {
  id: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  email: string;
  monthly_service_cost?: string;
}

interface ServiceItem {
  id: string;
  name: string;
  sku: string;
  description: string;
  item_type: string;
  category: string;
  base_price: string;
  unit: string;
  tax_rate: string;
}

interface Stats {
  draft_count: string;
  sent_count: string;
  paid_count: string;
  overdue_count: string;
  total_outstanding: string;
  paid_this_month: string;
}

interface NewItem {
  description: string;
  quantity: number;
  unitPrice: number;
  serviceItemId: string | null;
}

export default function InvoicesPage() {
  const { t, language } = useLanguage();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [clientFilter, setClientFilter] = useState<string>('');

  // Modals
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [generatingMonthly, setGeneratingMonthly] = useState(false);

  // New invoice form
  const [newInvoiceClient, setNewInvoiceClient] = useState('');
  const [newInvoiceItems, setNewInvoiceItems] = useState<NewItem[]>([
    { description: '', quantity: 1, unitPrice: 0, serviceItemId: null }
  ]);
  const [newInvoiceTaxRate, setNewInvoiceTaxRate] = useState(7.0);
  const [newInvoiceDiscount, setNewInvoiceDiscount] = useState(0);
  const [newInvoiceAdjustment, setNewInvoiceAdjustment] = useState(0);
  const [newInvoiceAdjustmentDesc, setNewInvoiceAdjustmentDesc] = useState('');
  const [newInvoiceNotes, setNewInvoiceNotes] = useState('');
  const [newInvoiceIssueDate, setNewInvoiceIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [newInvoiceDueDate, setNewInvoiceDueDate] = useState('');

  // Item search
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [itemSearchResults, setItemSearchResults] = useState<ServiceItem[]>([]);
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Payment form
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  // Send invoice
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

  useEffect(() => {
    fetchData();
  }, [statusFilter, clientFilter]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchData = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (clientFilter) params.append('clientId', clientFilter);

      const [invoicesRes, clientsRes, statsRes] = await Promise.all([
        axios.get(`${apiUrl}/invoices?${params.toString()}`, getAuthHeaders()),
        axios.get(`${apiUrl}/clients`, getAuthHeaders()),
        axios.get(`${apiUrl}/invoices/stats/summary`, getAuthHeaders()),
      ]);

      setInvoices(invoicesRes.data.invoices || []);
      setClients(clientsRes.data.clients || []);
      setStats(statsRes.data.stats || null);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchItems = async (query: string) => {
    if (query.length < 2) {
      setItemSearchResults([]);
      return;
    }

    try {
      const res = await axios.get(`${apiUrl}/service-items/search?q=${encodeURIComponent(query)}`, getAuthHeaders());
      setItemSearchResults(res.data.items || []);
    } catch (error) {
      console.error('Error searching items:', error);
    }
  };

  const handleItemSearch = (query: string, itemIndex: number) => {
    setItemSearchQuery(query);
    setActiveItemIndex(itemIndex);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchItems(query);
    }, 300);
  };

  const selectServiceItem = (serviceItem: ServiceItem, itemIndex: number) => {
    const updated = [...newInvoiceItems];
    updated[itemIndex] = {
      ...updated[itemIndex],
      description: serviceItem.name,
      unitPrice: Number(serviceItem.base_price),
      serviceItemId: serviceItem.id,
    };
    setNewInvoiceItems(updated);
    setItemSearchResults([]);
    setActiveItemIndex(null);
    setItemSearchQuery('');
  };

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount));
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
      case 'overdue': return 'bg-red-100 text-red-700';
      case 'cancelled': return 'bg-gray-200 text-gray-500';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: 'Borrador',
      sent: 'Enviado',
      paid: 'Pagado',
      overdue: 'Vencido',
      partial: 'Parcial',
      cancelled: 'Cancelado',
    };
    return labels[status] || status;
  };

  const getClientDisplayName = (client: Client) => {
    if (client.display_name) return client.display_name;
    if (client.first_name || client.last_name) {
      return `${client.first_name || ''} ${client.last_name || ''}`.trim();
    }
    return client.name || 'Cliente';
  };

  const handleCreateInvoice = async () => {
    if (!newInvoiceClient || newInvoiceItems.length === 0) return;

    try {
      const items = newInvoiceItems.filter(item => item.description && item.unitPrice > 0);
      await axios.post(`${apiUrl}/invoices`, {
        clientId: newInvoiceClient,
        items: items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          serviceItemId: item.serviceItemId,
        })),
        taxRate: newInvoiceTaxRate,
        discountAmount: newInvoiceDiscount,
        adjustmentAmount: newInvoiceAdjustment,
        adjustmentDescription: newInvoiceAdjustmentDesc,
        notes: newInvoiceNotes,
        issueDate: newInvoiceIssueDate,
        dueDate: newInvoiceDueDate || undefined,
      }, getAuthHeaders());

      setShowNewInvoice(false);
      resetNewInvoiceForm();
      fetchData();
    } catch (error) {
      console.error('Error creating invoice:', error);
    }
  };

  const handleGenerateFromRates = async (clientId: string) => {
    try {
      await axios.post(`${apiUrl}/invoices/generate/${clientId}`, {}, getAuthHeaders());
      setShowNewInvoice(false);
      fetchData();
    } catch (error) {
      console.error('Error generating invoice:', error);
    }
  };

  const handleGenerateMonthly = async () => {
    setGeneratingMonthly(true);
    try {
      const result = await axios.post(`${apiUrl}/invoices/generate-monthly`, {}, getAuthHeaders());
      alert(`Facturas generadas: ${result.data.summary?.created || 0}`);
      fetchData();
    } catch (error) {
      console.error('Error generating monthly invoices:', error);
    } finally {
      setGeneratingMonthly(false);
    }
  };

  const handleMarkAsSent = async (invoiceId: string) => {
    try {
      await axios.put(`${apiUrl}/invoices/${invoiceId}`, { status: 'sent' }, getAuthHeaders());
      fetchData();
    } catch (error) {
      console.error('Error updating invoice:', error);
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedInvoice || !paymentAmount) return;

    try {
      await axios.post(`${apiUrl}/invoices/${selectedInvoice.id}/payment`, {
        amount: Number(paymentAmount),
        paymentMethod,
        paymentDate,
      }, getAuthHeaders());

      setShowPaymentModal(false);
      setPaymentAmount('');
      setPaymentMethod('cash');
      fetchData();
    } catch (error) {
      console.error('Error recording payment:', error);
    }
  };

  const handleViewDetails = async (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    try {
      const res = await axios.get(`${apiUrl}/invoices/${invoice.id}`, getAuthHeaders());
      setInvoiceItems(res.data.items || []);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Error fetching invoice details:', error);
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm('¿Eliminar esta factura?')) return;

    try {
      await axios.delete(`${apiUrl}/invoices/${invoiceId}`, getAuthHeaders());
      fetchData();
    } catch (error) {
      console.error('Error deleting invoice:', error);
    }
  };

  const handlePrintInvoice = () => {
    if (!selectedInvoice) return;
    window.print();
  };

  const handleSendEmail = async () => {
    if (!selectedInvoice) return;
    setSendingEmail(true);
    try {
      await axios.post(`${apiUrl}/invoices/${selectedInvoice.id}/send`, { via: 'email' }, getAuthHeaders());
      alert('Factura enviada por email exitosamente');
      fetchData();
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Error enviando email. Verifique que el cliente tenga email configurado.');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSendWhatsApp = () => {
    if (!selectedInvoice) return;
    const phone = selectedInvoice.client_email ? '' : ''; // We need to get phone from client
    const message = encodeURIComponent(
      `Hola! Le enviamos la factura ${selectedInvoice.invoice_number} por $${Number(selectedInvoice.total).toFixed(2)}. ` +
      `Vence el ${formatDate(selectedInvoice.due_date)}. ` +
      `Pendiente: $${Number(selectedInvoice.balance_due).toFixed(2)}. ¡Gracias!`
    );
    // Get client phone from the invoice or use a placeholder
    const clientPhone = ''; // This would need to come from the invoice details
    if (clientPhone) {
      window.open(`https://wa.me/${clientPhone}?text=${message}`, '_blank');
    } else {
      // Copy message to clipboard as fallback
      navigator.clipboard.writeText(decodeURIComponent(message));
      alert('Mensaje copiado al portapapeles. Pegue en WhatsApp manualmente.');
    }
  };

  const resetNewInvoiceForm = () => {
    setNewInvoiceClient('');
    setNewInvoiceItems([{ description: '', quantity: 1, unitPrice: 0, serviceItemId: null }]);
    setNewInvoiceTaxRate(7.0);
    setNewInvoiceDiscount(0);
    setNewInvoiceAdjustment(0);
    setNewInvoiceAdjustmentDesc('');
    setNewInvoiceNotes('');
    setNewInvoiceIssueDate(new Date().toISOString().split('T')[0]);
    setNewInvoiceDueDate('');
  };

  const addItem = () => {
    setNewInvoiceItems([...newInvoiceItems, { description: '', quantity: 1, unitPrice: 0, serviceItemId: null }]);
  };

  const removeItem = (index: number) => {
    setNewInvoiceItems(newInvoiceItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    const updated = [...newInvoiceItems];
    updated[index] = { ...updated[index], [field]: value };
    setNewInvoiceItems(updated);
  };

  const calculateLineTotal = (item: NewItem) => {
    return item.quantity * item.unitPrice;
  };

  const calculateSubtotal = () => {
    return newInvoiceItems.reduce((sum, item) => sum + calculateLineTotal(item), 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = subtotal * (newInvoiceTaxRate / 100);
    return subtotal + tax - newInvoiceDiscount + newInvoiceAdjustment;
  };

  if (loading) {
    return (
      <AdminLayout title="Facturas">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Facturas">
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Facturas</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSettingsModal(true)}
            className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <Cog6ToothIcon className="h-5 w-5" />
          </button>
          <button
            onClick={handleGenerateMonthly}
            disabled={generatingMonthly}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-5 w-5 ${generatingMonthly ? 'animate-spin' : ''}`} />
            Generar Mensual
          </button>
          <button
            onClick={() => setShowNewInvoice(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <PlusIcon className="h-5 w-5" />
            Nueva Factura
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DocumentTextIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Borrador</p>
                <p className="text-xl font-semibold">{stats.draft_count}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <ClockIcon className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pendiente</p>
                <p className="text-xl font-semibold">{formatCurrency(stats.total_outstanding)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Vencidas</p>
                <p className="text-xl font-semibold">{stats.overdue_count}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pagado este mes</p>
                <p className="text-xl font-semibold">{formatCurrency(stats.paid_this_month)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Todos los estados</option>
          <option value="draft">Borrador</option>
          <option value="sent">Enviado</option>
          <option value="paid">Pagado</option>
          <option value="overdue">Vencido</option>
        </select>
        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Todos los clientes</option>
          {clients.map(client => (
            <option key={client.id} value={client.id}>
              {getClientDisplayName(client)}
            </option>
          ))}
        </select>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {invoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Número</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Cliente</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Fecha</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Vencimiento</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Total</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Pendiente</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Estado</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map(invoice => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-primary-600">{invoice.invoice_number}</span>
                    </td>
                    <td className="px-4 py-3">
                      {invoice.client_first_name} {invoice.client_last_name}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(invoice.issue_date)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(invoice.due_date)}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(invoice.total)}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {Number(invoice.balance_due) > 0 ? (
                        <span className="text-red-600">{formatCurrency(invoice.balance_due)}</span>
                      ) : (
                        <span className="text-green-600">$0.00</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(invoice.status)}`}>
                        {getStatusLabel(invoice.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleViewDetails(invoice)}
                          className="p-1 text-gray-500 hover:text-primary-600"
                          title="Ver detalles"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                        {invoice.status === 'draft' && (
                          <button
                            onClick={() => handleMarkAsSent(invoice.id)}
                            className="p-1 text-gray-500 hover:text-blue-600"
                            title="Marcar como enviado"
                          >
                            <PaperAirplaneIcon className="h-5 w-5" />
                          </button>
                        )}
                        {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                          <button
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setPaymentAmount(invoice.balance_due);
                              setShowPaymentModal(true);
                            }}
                            className="p-1 text-gray-500 hover:text-green-600"
                            title="Registrar pago"
                          >
                            <BanknotesIcon className="h-5 w-5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteInvoice(invoice.id)}
                          className="p-1 text-gray-500 hover:text-red-600"
                          title="Eliminar"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No hay facturas</p>
            <button
              onClick={() => setShowNewInvoice(true)}
              className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Crear primera factura
            </button>
          </div>
        )}
      </div>

      {/* New Invoice Modal */}
      {showNewInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-lg font-semibold">Nueva Factura</h2>
              <button onClick={() => { setShowNewInvoice(false); resetNewInvoiceForm(); }}>
                <XMarkIcon className="h-6 w-6 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Client Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                <div className="flex gap-2">
                  <select
                    value={newInvoiceClient}
                    onChange={(e) => setNewInvoiceClient(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Seleccionar cliente...</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {getClientDisplayName(client)}
                        {client.monthly_service_cost && ` - ${formatCurrency(client.monthly_service_cost)}/mes`}
                      </option>
                    ))}
                  </select>
                  {newInvoiceClient && (
                    <button
                      onClick={() => handleGenerateFromRates(newInvoiceClient)}
                      className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 whitespace-nowrap"
                    >
                      Generar de Tarifas
                    </button>
                  )}
                </div>
              </div>

              {/* Invoice Items */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Items de Factura</label>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Item</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 w-20">Cant</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 w-28">Precio</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 w-28">Total</th>
                        <th className="px-3 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {newInvoiceItems.map((item, index) => (
                        <tr key={index}>
                          <td className="px-3 py-2 relative">
                            <div className="relative">
                              <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <input
                                type="text"
                                placeholder="Buscar item o escribir..."
                                value={activeItemIndex === index ? itemSearchQuery : item.description}
                                onChange={(e) => {
                                  updateItem(index, 'description', e.target.value);
                                  handleItemSearch(e.target.value, index);
                                }}
                                onFocus={() => setActiveItemIndex(index)}
                                className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary-500"
                              />
                              {/* Search Results Dropdown */}
                              {activeItemIndex === index && itemSearchResults.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                  {itemSearchResults.map((serviceItem) => (
                                    <button
                                      key={serviceItem.id}
                                      type="button"
                                      onClick={() => selectServiceItem(serviceItem, index)}
                                      className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b last:border-b-0"
                                    >
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <p className="font-medium text-sm">{serviceItem.name}</p>
                                          {serviceItem.sku && (
                                            <p className="text-xs text-gray-500">SKU: {serviceItem.sku}</p>
                                          )}
                                        </div>
                                        <span className="text-sm font-medium text-green-600">
                                          {formatCurrency(serviceItem.base_price)}
                                        </span>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-center focus:ring-2 focus:ring-primary-500"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) => updateItem(index, 'unitPrice', Number(e.target.value))}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right focus:ring-2 focus:ring-primary-500"
                            />
                          </td>
                          <td className="px-3 py-2 text-right text-sm font-medium">
                            {formatCurrency(calculateLineTotal(item))}
                          </td>
                          <td className="px-3 py-2">
                            {newInvoiceItems.length > 1 && (
                              <button
                                onClick={() => removeItem(index)}
                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                              >
                                <XMarkIcon className="h-4 w-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  onClick={addItem}
                  className="mt-2 text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  <PlusIcon className="h-4 w-4" />
                  Agregar línea
                </button>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Emisión</label>
                  <input
                    type="date"
                    value={newInvoiceIssueDate}
                    onChange={(e) => setNewInvoiceIssueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Vencimiento</label>
                  <input
                    type="date"
                    value={newInvoiceDueDate}
                    onChange={(e) => setNewInvoiceDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Tax and Discount */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IVU (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newInvoiceTaxRate}
                    onChange={(e) => setNewInvoiceTaxRate(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descuento ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newInvoiceDiscount}
                    onChange={(e) => setNewInvoiceDiscount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Adjustment */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ajuste (+/-)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newInvoiceAdjustment}
                    onChange={(e) => setNewInvoiceAdjustment(Number(e.target.value))}
                    placeholder="Ej: -10 o 5"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción del Ajuste</label>
                  <input
                    type="text"
                    value={newInvoiceAdjustmentDesc}
                    onChange={(e) => setNewInvoiceAdjustmentDesc(e.target.value)}
                    placeholder="Ej: Crédito por referido"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea
                  value={newInvoiceNotes}
                  onChange={(e) => setNewInvoiceNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Totals */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(calculateSubtotal())}</span>
                </div>
                {newInvoiceTaxRate > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>IVU ({newInvoiceTaxRate}%):</span>
                    <span>{formatCurrency(calculateSubtotal() * (newInvoiceTaxRate / 100))}</span>
                  </div>
                )}
                {newInvoiceDiscount > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Descuento:</span>
                    <span>-{formatCurrency(newInvoiceDiscount)}</span>
                  </div>
                )}
                {newInvoiceAdjustment !== 0 && (
                  <div className="flex justify-between text-sm text-blue-600">
                    <span>Ajuste{newInvoiceAdjustmentDesc && `: ${newInvoiceAdjustmentDesc}`}:</span>
                    <span>{newInvoiceAdjustment >= 0 ? '+' : ''}{formatCurrency(newInvoiceAdjustment)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold mt-2 pt-2 border-t text-lg">
                  <span>TOTAL:</span>
                  <span>{formatCurrency(calculateTotal())}</span>
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2 sticky bottom-0 bg-white">
              <button
                onClick={() => { setShowNewInvoice(false); resetNewInvoiceForm(); }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateInvoice}
                disabled={!newInvoiceClient || newInvoiceItems.every(i => !i.description)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Crear Factura
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">Registrar Pago</h2>
              <button onClick={() => setShowPaymentModal(false)}>
                <XMarkIcon className="h-6 w-6 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-600">
                Factura: <span className="font-medium">{selectedInvoice.invoice_number}</span>
              </p>
              <p className="text-sm text-gray-600">
                Pendiente: <span className="font-medium text-red-600">{formatCurrency(selectedInvoice.balance_due)}</span>
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto del Pago</label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="cash">Efectivo</option>
                  <option value="check">Cheque</option>
                  <option value="card">Tarjeta</option>
                  <option value="ach">ACH/Transferencia</option>
                  <option value="zelle">Zelle</option>
                  <option value="other">Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha del Pago</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleRecordPayment}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Registrar Pago
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal - Printable Invoice */}
      {showDetailsModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto print:max-w-full print:max-h-full print:overflow-visible print:shadow-none">
            {/* Header with actions - hidden when printing */}
            <div className="p-4 border-b flex justify-between items-center print:hidden">
              <h2 className="text-lg font-semibold">{selectedInvoice.invoice_number}</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintInvoice}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  title="Imprimir"
                >
                  <PrinterIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={sendingEmail}
                  className="p-2 text-gray-600 hover:bg-blue-100 rounded-lg disabled:opacity-50"
                  title="Enviar por Email"
                >
                  <EnvelopeIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={handleSendWhatsApp}
                  className="p-2 text-gray-600 hover:bg-green-100 rounded-lg"
                  title="Enviar por WhatsApp"
                >
                  <ChatBubbleLeftIcon className="h-5 w-5" />
                </button>
                <button onClick={() => setShowDetailsModal(false)}>
                  <XMarkIcon className="h-6 w-6 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Invoice Content - Printable */}
            <div className="p-6 print:p-8" id="invoice-content">
              {/* Company Header */}
              <div className="text-center mb-6 print:mb-8">
                <h1 className="text-2xl font-bold text-primary-600">Aguadulce Track</h1>
                <p className="text-gray-500 text-sm">Servicio de Mantenimiento de Piscinas</p>
              </div>

              {/* Invoice Title and Number */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold">FACTURA</h2>
                  <p className="text-lg font-semibold text-primary-600">{selectedInvoice.invoice_number}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm print:border ${getStatusColor(selectedInvoice.status)}`}>
                  {getStatusLabel(selectedInvoice.status)}
                </span>
              </div>

              {/* Client and Dates */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Facturar a:</p>
                  <p className="font-semibold">{selectedInvoice.client_first_name} {selectedInvoice.client_last_name}</p>
                  <p className="text-sm text-gray-600">{selectedInvoice.client_email}</p>
                </div>
                <div className="text-right">
                  <div className="mb-2">
                    <p className="text-sm text-gray-500">Fecha de emisión:</p>
                    <p className="font-medium">{formatDate(selectedInvoice.issue_date)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Fecha de vencimiento:</p>
                    <p className="font-medium">{formatDate(selectedInvoice.due_date)}</p>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-sm mb-6">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="px-3 py-2 text-left font-semibold">Descripción</th>
                    <th className="px-3 py-2 text-center font-semibold w-20">Cant</th>
                    <th className="px-3 py-2 text-right font-semibold w-28">Precio</th>
                    <th className="px-3 py-2 text-right font-semibold w-28">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceItems.map(item => (
                    <tr key={item.id} className="border-b border-gray-200">
                      <td className="px-3 py-3">{item.description}</td>
                      <td className="px-3 py-3 text-center">{item.quantity}</td>
                      <td className="px-3 py-3 text-right">{formatCurrency(item.unit_price)}</td>
                      <td className="px-3 py-3 text-right">{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64">
                  <div className="flex justify-between py-1">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(selectedInvoice.subtotal)}</span>
                  </div>
                  {Number(selectedInvoice.tax_amount) > 0 && (
                    <div className="flex justify-between py-1">
                      <span>IVU ({selectedInvoice.tax_rate}%):</span>
                      <span>{formatCurrency(selectedInvoice.tax_amount)}</span>
                    </div>
                  )}
                  {Number(selectedInvoice.discount_amount) > 0 && (
                    <div className="flex justify-between py-1 text-red-600">
                      <span>Descuento:</span>
                      <span>-{formatCurrency(selectedInvoice.discount_amount)}</span>
                    </div>
                  )}
                  {Number(selectedInvoice.adjustment_amount) !== 0 && (
                    <div className="flex justify-between py-1 text-blue-600">
                      <span>Ajuste:</span>
                      <span>{formatCurrency(selectedInvoice.adjustment_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-t-2 border-gray-300 font-bold text-lg">
                    <span>TOTAL:</span>
                    <span>{formatCurrency(selectedInvoice.total)}</span>
                  </div>
                  {Number(selectedInvoice.amount_paid) > 0 && (
                    <div className="flex justify-between py-1 text-green-600">
                      <span>Pagado:</span>
                      <span>{formatCurrency(selectedInvoice.amount_paid)}</span>
                    </div>
                  )}
                  {Number(selectedInvoice.balance_due) > 0 && (
                    <div className="flex justify-between py-2 bg-red-50 px-2 rounded font-semibold text-red-600">
                      <span>PENDIENTE:</span>
                      <span>{formatCurrency(selectedInvoice.balance_due)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Note */}
              <div className="mt-8 pt-4 border-t text-center text-sm text-gray-500 print:mt-12">
                <p>Gracias por su preferencia</p>
                <p className="mt-1">Para consultas: info@aguadulcetrack.com</p>
              </div>
            </div>

            {/* Modal Footer - hidden when printing */}
            <div className="p-4 border-t flex justify-between gap-2 print:hidden">
              <div className="flex gap-2">
                <button
                  onClick={handlePrintInvoice}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
                >
                  <PrinterIcon className="h-4 w-4" />
                  Imprimir
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={sendingEmail}
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 flex items-center gap-2 disabled:opacity-50"
                >
                  <EnvelopeIcon className="h-4 w-4" />
                  {sendingEmail ? 'Enviando...' : 'Email'}
                </button>
                <button
                  onClick={handleSendWhatsApp}
                  className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center gap-2"
                >
                  <ChatBubbleLeftIcon className="h-4 w-4" />
                  WhatsApp
                </button>
              </div>
              <div className="flex gap-2">
                {(selectedInvoice.status === 'sent' || selectedInvoice.status === 'overdue') && (
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      setPaymentAmount(selectedInvoice.balance_due);
                      setShowPaymentModal(true);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Registrar Pago
                  </button>
                )}
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">Configuración de Facturas</h2>
              <button onClick={() => setShowSettingsModal(false)}>
                <XMarkIcon className="h-6 w-6 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-500">
                La configuración de facturas se puede ajustar en el panel de administración del backend.
              </p>
            </div>
            <div className="p-4 border-t flex justify-end">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </AdminLayout>
  );
}
