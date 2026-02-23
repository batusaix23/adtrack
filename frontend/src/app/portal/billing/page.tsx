'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { CurrencyDollarIcon, DocumentTextIcon, CalendarIcon } from '@heroicons/react/24/outline';

interface Rate {
  id: string;
  name: string;
  amount: string;
  frequency: string;
  next_billing_date: string | null;
}

interface Invoice {
  id: string;
  invoice_number: string;
  total: string;
  balance_due: string;
  status: string;
  issue_date: string;
  due_date: string;
  paid_date: string | null;
  created_at: string;
}

export default function PortalBillingPage() {
  const [rates, setRates] = useState<Rate[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      const token = localStorage.getItem('portal_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const [ratesRes, invoicesRes] = await Promise.all([
        axios.get(`${apiUrl}/portal/rates`, config),
        axios.get(`${apiUrl}/portal/invoices`, config),
      ]);

      setRates(ratesRes.data.rates || []);
      setInvoices(invoicesRes.data.invoices || []);
    } catch (error) {
      console.error('Error fetching billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getFrequencyLabel = (freq: string) => {
    const labels: Record<string, string> = {
      monthly: 'Monthly',
      quarterly: 'Every 3 months',
      semiannual: 'Every 6 months',
      annual: 'Yearly',
    };
    return labels[freq] || freq;
  };

  const calculateMonthlyTotal = () => {
    return rates.reduce((sum, rate) => {
      const amount = Number(rate.amount);
      switch (rate.frequency) {
        case 'monthly':
          return sum + amount;
        case 'quarterly':
          return sum + (amount / 3);
        case 'semiannual':
          return sum + (amount / 6);
        case 'annual':
          return sum + (amount / 12);
        default:
          return sum + amount;
      }
    }, 0);
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
      <h1 className="text-2xl font-bold text-gray-900">Billing & Rates</h1>

      {/* Summary Card */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl shadow-sm p-6 text-white">
        <p className="text-primary-100 text-sm">Estimated Monthly Total</p>
        <p className="text-4xl font-bold mt-1">
          ${calculateMonthlyTotal().toFixed(2)}
        </p>
        <p className="text-primary-200 text-sm mt-2">
          Based on {rates.length} active service rate{rates.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Current Rates */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CurrencyDollarIcon className="h-5 w-5 text-primary-600" />
            Current Rates
          </h2>
        </div>

        {rates.length > 0 ? (
          <div className="divide-y">
            {rates.map((rate) => (
              <div key={rate.id} className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-900">{rate.name}</p>
                  <p className="text-sm text-gray-500">{getFrequencyLabel(rate.frequency)}</p>
                  {rate.next_billing_date && (
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" />
                      Next billing: {formatDate(rate.next_billing_date)}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xl font-semibold text-primary-600">
                    ${Number(rate.amount).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-400">per {rate.frequency.replace('ly', '')}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            No active rates
          </div>
        )}
      </div>

      {/* Invoices */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <DocumentTextIcon className="h-5 w-5 text-primary-600" />
            Invoices
          </h2>
        </div>

        {invoices.length > 0 ? (
          <div className="divide-y">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-900">
                    {invoice.invoice_number}
                  </p>
                  <p className="text-sm text-gray-500">
                    Due: {formatDate(invoice.due_date)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">${Number(invoice.total).toFixed(2)}</p>
                  {Number(invoice.balance_due) > 0 && (
                    <p className="text-xs text-gray-500">
                      Balance: ${Number(invoice.balance_due).toFixed(2)}
                    </p>
                  )}
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    invoice.status === 'paid'
                      ? 'bg-green-100 text-green-700'
                      : invoice.status === 'overdue'
                      ? 'bg-red-100 text-red-700'
                      : invoice.status === 'sent'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {invoice.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p>No invoices yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Invoices will appear here once generated
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
