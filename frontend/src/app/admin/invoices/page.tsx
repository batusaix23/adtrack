'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
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
} from '@heroicons/react/24/outline';

interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  client_name: string;
  client_last_name: string;
  client_email: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  subtotal: string;
  tax_rate: string;
  tax_amount: string;
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
  amount: string;
}

interface Client {
  id: string;
  name: string;
  last_name: string;
  email: string;
}

interface Stats {
  draft_count: string;
  sent_count: string;
  paid_count: string;
  overdue_count: string;
  total_outstanding: string;
  paid_this_month: string;
}

export default function InvoicesPage() {
  const { t } = useLanguage();
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
  const [newInvoiceItems, setNewInvoiceItems] = useState([{ description: '', quantity: 1, unitPrice: 0 }]);
  const [newInvoiceTaxRate, setNewInvoiceTaxRate] = useState(0);
  const [newInvoiceNotes, setNewInvoiceNotes] = useState('');
  const [newInvoiceDueDate, setNewInvoiceDueDate] = useState('');

  // Payment form
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

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

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount));
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
    return t(`invoices.${status}`) || status;
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
        })),
        taxRate: newInvoiceTaxRate,
        notes: newInvoiceNotes,
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
      alert(`${t('invoices.generateSuccess')}: ${result.data.totalGenerated} invoices`);
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
    if (!confirm(t('invoices.confirmDelete'))) return;

    try {
      await axios.delete(`${apiUrl}/invoices/${invoiceId}`, getAuthHeaders());
      fetchData();
    } catch (error) {
      console.error('Error deleting invoice:', error);
    }
  };

  const resetNewInvoiceForm = () => {
    setNewInvoiceClient('');
    setNewInvoiceItems([{ description: '', quantity: 1, unitPrice: 0 }]);
    setNewInvoiceTaxRate(0);
    setNewInvoiceNotes('');
    setNewInvoiceDueDate('');
  };

  const addItem = () => {
    setNewInvoiceItems([...newInvoiceItems, { description: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeItem = (index: number) => {
    setNewInvoiceItems(newInvoiceItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    const updated = [...newInvoiceItems];
    updated[index] = { ...updated[index], [field]: value };
    setNewInvoiceItems(updated);
  };

  const calculateSubtotal = () => {
    return newInvoiceItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">{t('invoices.title')}</h1>
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
            {t('invoices.generateMonthly')}
          </button>
          <button
            onClick={() => setShowNewInvoice(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <PlusIcon className="h-5 w-5" />
            {t('invoices.new')}
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
                <p className="text-sm text-gray-500">{t('invoices.draft')}</p>
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
                <p className="text-sm text-gray-500">{t('invoices.outstanding')}</p>
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
                <p className="text-sm text-gray-500">{t('invoices.overdue')}</p>
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
                <p className="text-sm text-gray-500">{t('invoices.paidThisMonth')}</p>
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
          <option value="">{t('invoices.allStatuses')}</option>
          <option value="draft">{t('invoices.draft')}</option>
          <option value="sent">{t('invoices.sent')}</option>
          <option value="paid">{t('invoices.paid')}</option>
          <option value="overdue">{t('invoices.overdue')}</option>
        </select>
        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
        >
          <option value="">{t('invoices.selectClient')}</option>
          {clients.map(client => (
            <option key={client.id} value={client.id}>
              {client.name} {client.last_name}
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
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">{t('invoices.invoiceNumber')}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">{t('invoices.client')}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">{t('invoices.issueDate')}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">{t('invoices.dueDate')}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">{t('invoices.total')}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">{t('invoices.balanceDue')}</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">{t('invoices.status')}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map(invoice => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-primary-600">{invoice.invoice_number}</span>
                    </td>
                    <td className="px-4 py-3">
                      {invoice.client_name} {invoice.client_last_name}
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
                          title={t('invoices.viewDetails')}
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                        {invoice.status === 'draft' && (
                          <button
                            onClick={() => handleMarkAsSent(invoice.id)}
                            className="p-1 text-gray-500 hover:text-blue-600"
                            title={t('invoices.markAsSent')}
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
                            title={t('invoices.recordPayment')}
                          >
                            <BanknotesIcon className="h-5 w-5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteInvoice(invoice.id)}
                          className="p-1 text-gray-500 hover:text-red-600"
                          title={t('invoices.delete')}
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
            <p className="text-gray-500">{t('invoices.noInvoices')}</p>
            <button
              onClick={() => setShowNewInvoice(true)}
              className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              {t('invoices.createFirst')}
            </button>
          </div>
        )}
      </div>

      {/* New Invoice Modal */}
      {showNewInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">{t('invoices.new')}</h2>
              <button onClick={() => { setShowNewInvoice(false); resetNewInvoiceForm(); }}>
                <XMarkIcon className="h-6 w-6 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoices.client')}</label>
                <div className="flex gap-2">
                  <select
                    value={newInvoiceClient}
                    onChange={(e) => setNewInvoiceClient(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">{t('invoices.selectClient')}</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.name} {client.last_name}
                      </option>
                    ))}
                  </select>
                  {newInvoiceClient && (
                    <button
                      onClick={() => handleGenerateFromRates(newInvoiceClient)}
                      className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 whitespace-nowrap"
                    >
                      {t('invoices.generateFromRates')}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('invoices.items')}</label>
                {newInvoiceItems.map((item, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder={t('invoices.description')}
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                    <input
                      type="number"
                      placeholder={t('invoices.quantity')}
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                    <input
                      type="number"
                      step="0.01"
                      placeholder={t('invoices.unitPrice')}
                      value={item.unitPrice}
                      onChange={(e) => updateItem(index, 'unitPrice', Number(e.target.value))}
                      className="w-28 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                    {newInvoiceItems.length > 1 && (
                      <button
                        onClick={() => removeItem(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addItem}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  + {t('invoices.addItem')}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoices.tax')} (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newInvoiceTaxRate}
                    onChange={(e) => setNewInvoiceTaxRate(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoices.dueDate')}</label>
                  <input
                    type="date"
                    value={newInvoiceDueDate}
                    onChange={(e) => setNewInvoiceDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoices.notes')}</label>
                <textarea
                  value={newInvoiceNotes}
                  onChange={(e) => setNewInvoiceNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span>{t('invoices.subtotal')}:</span>
                  <span>{formatCurrency(calculateSubtotal())}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>{t('invoices.tax')} ({newInvoiceTaxRate}%):</span>
                  <span>{formatCurrency(calculateSubtotal() * (newInvoiceTaxRate / 100))}</span>
                </div>
                <div className="flex justify-between font-semibold mt-2 pt-2 border-t">
                  <span>{t('invoices.total')}:</span>
                  <span>{formatCurrency(calculateSubtotal() * (1 + newInvoiceTaxRate / 100))}</span>
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button
                onClick={() => { setShowNewInvoice(false); resetNewInvoiceForm(); }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleCreateInvoice}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                {t('common.create')}
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
              <h2 className="text-lg font-semibold">{t('invoices.recordPayment')}</h2>
              <button onClick={() => setShowPaymentModal(false)}>
                <XMarkIcon className="h-6 w-6 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-600">
                {t('invoices.invoiceNumber')}: <span className="font-medium">{selectedInvoice.invoice_number}</span>
              </p>
              <p className="text-sm text-gray-600">
                {t('invoices.balanceDue')}: <span className="font-medium text-red-600">{formatCurrency(selectedInvoice.balance_due)}</span>
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoices.paymentAmount')}</label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoices.paymentMethod')}</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="cash">{t('invoices.cash')}</option>
                  <option value="check">{t('invoices.check')}</option>
                  <option value="card">{t('invoices.card')}</option>
                  <option value="transfer">{t('invoices.transfer')}</option>
                  <option value="other">{t('invoices.other')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('invoices.paymentDate')}</label>
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
                {t('common.cancel')}
              </button>
              <button
                onClick={handleRecordPayment}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                {t('invoices.recordPayment')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">{selectedInvoice.invoice_number}</h2>
              <button onClick={() => setShowDetailsModal(false)}>
                <XMarkIcon className="h-6 w-6 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">{selectedInvoice.client_name} {selectedInvoice.client_last_name}</p>
                  <p className="text-sm text-gray-500">{selectedInvoice.client_email}</p>
                </div>
                <span className={`px-3 py-1 rounded-full ${getStatusColor(selectedInvoice.status)}`}>
                  {getStatusLabel(selectedInvoice.status)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">{t('invoices.issueDate')}:</span>
                  <p className="font-medium">{formatDate(selectedInvoice.issue_date)}</p>
                </div>
                <div>
                  <span className="text-gray-500">{t('invoices.dueDate')}:</span>
                  <p className="font-medium">{formatDate(selectedInvoice.due_date)}</p>
                </div>
              </div>

              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">{t('invoices.description')}</th>
                    <th className="px-3 py-2 text-center">{t('invoices.quantity')}</th>
                    <th className="px-3 py-2 text-right">{t('invoices.unitPrice')}</th>
                    <th className="px-3 py-2 text-right">{t('invoices.amount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceItems.map(item => (
                    <tr key={item.id} className="border-b">
                      <td className="px-3 py-2">{item.description}</td>
                      <td className="px-3 py-2 text-center">{item.quantity}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(item.unit_price)}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span>{t('invoices.subtotal')}:</span>
                  <span>{formatCurrency(selectedInvoice.subtotal)}</span>
                </div>
                {Number(selectedInvoice.tax_amount) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>{t('invoices.tax')} ({selectedInvoice.tax_rate}%):</span>
                    <span>{formatCurrency(selectedInvoice.tax_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold mt-2 pt-2 border-t">
                  <span>{t('invoices.total')}:</span>
                  <span>{formatCurrency(selectedInvoice.total)}</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span>{t('invoices.paid')}:</span>
                  <span className="text-green-600">{formatCurrency(selectedInvoice.amount_paid)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>{t('invoices.balanceDue')}:</span>
                  <span className={Number(selectedInvoice.balance_due) > 0 ? 'text-red-600' : 'text-green-600'}>
                    {formatCurrency(selectedInvoice.balance_due)}
                  </span>
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">{t('invoices.settings')}</h2>
              <button onClick={() => setShowSettingsModal(false)}>
                <XMarkIcon className="h-6 w-6 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-500">
                Invoice settings can be configured in the backend. Contact support for custom configuration.
              </p>
            </div>
            <div className="p-4 border-t flex justify-end">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
