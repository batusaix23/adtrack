'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import {
  MagnifyingGlassIcon,
  EyeIcon,
  PlayIcon,
  PauseIcon,
  ClockIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

interface Company {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  subscription_plan: string;
  subscription_status: string;
  subscription_expires_at: string | null;
  trial_ends_at: string | null;
  monthly_price: string;
  max_users: number;
  max_clients: number;
  is_active: boolean;
  user_count: string;
  client_count: string;
  created_at: string;
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

  useEffect(() => {
    fetchCompanies();
  }, [search, statusFilter, planFilter, page]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('platform_token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchCompanies = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (planFilter) params.append('plan', planFilter);
      params.append('page', String(page));

      const res = await axios.get(`${apiUrl}/platform/companies?${params}`, getAuthHeaders());
      setCompanies(res.data.companies);
      setTotalPages(res.data.totalPages);
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async (companyId: string) => {
    if (!confirm('Are you sure you want to suspend this company?')) return;
    setActionLoading(companyId);
    try {
      await axios.post(`${apiUrl}/platform/companies/${companyId}/suspend`, {
        reason: 'Manual suspension by admin'
      }, getAuthHeaders());
      fetchCompanies();
    } catch (error) {
      console.error('Error suspending company:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleActivate = async (companyId: string) => {
    setActionLoading(companyId);
    try {
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);
      await axios.post(`${apiUrl}/platform/companies/${companyId}/activate`, {
        expiresAt: expiresAt.toISOString()
      }, getAuthHeaders());
      fetchCompanies();
    } catch (error) {
      console.error('Error activating company:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleExtendTrial = async (companyId: string) => {
    setActionLoading(companyId);
    try {
      await axios.post(`${apiUrl}/platform/companies/${companyId}/extend-trial`, {
        days: 14
      }, getAuthHeaders());
      fetchCompanies();
    } catch (error) {
      console.error('Error extending trial:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400';
      case 'trial': return 'bg-blue-500/20 text-blue-400';
      case 'expired': return 'bg-red-500/20 text-red-400';
      case 'suspended': return 'bg-gray-500/20 text-gray-400';
      case 'cancelled': return 'bg-orange-500/20 text-orange-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'enterprise': return 'bg-purple-500/20 text-purple-400';
      case 'professional': return 'bg-blue-500/20 text-blue-400';
      case 'basic': return 'bg-green-500/20 text-green-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Companies</h1>
          <p className="text-slate-400">Manage all registered companies</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search companies..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="expired">Expired</option>
          <option value="suspended">Suspended</option>
        </select>
        <select
          value={planFilter}
          onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="">All Plans</option>
          <option value="trial">Trial</option>
          <option value="basic">Basic</option>
          <option value="professional">Professional</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>

      {/* Companies Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Company</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Plan</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Status</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-400">Users</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-400">Clients</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-400">Price</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Expires</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {companies.map((company) => (
                <tr key={company.id} className="hover:bg-slate-700/50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-white">{company.name}</p>
                      <p className="text-sm text-slate-400">{company.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${getPlanColor(company.subscription_plan)}`}>
                      {company.subscription_plan || 'free'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${getStatusColor(company.subscription_status)}`}>
                      {company.subscription_status || 'trial'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-white">
                    {company.user_count}/{company.max_users === -1 ? '∞' : company.max_users}
                  </td>
                  <td className="px-4 py-3 text-center text-white">
                    {company.client_count}/{company.max_clients === -1 ? '∞' : company.max_clients}
                  </td>
                  <td className="px-4 py-3 text-right text-white">
                    {formatCurrency(company.monthly_price || 0)}/mo
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-sm">
                    {company.subscription_status === 'trial'
                      ? formatDate(company.trial_ends_at)
                      : formatDate(company.subscription_expires_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Link
                        href={`/platform/companies/${company.id}`}
                        className="p-2 text-slate-400 hover:text-purple-400 hover:bg-slate-700 rounded-lg"
                        title="View Details"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </Link>
                      {company.subscription_status === 'trial' && (
                        <button
                          onClick={() => handleExtendTrial(company.id)}
                          disabled={actionLoading === company.id}
                          className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg disabled:opacity-50"
                          title="Extend Trial (+14 days)"
                        >
                          <ClockIcon className="h-5 w-5" />
                        </button>
                      )}
                      {company.subscription_status === 'suspended' || company.subscription_status === 'expired' ? (
                        <button
                          onClick={() => handleActivate(company.id)}
                          disabled={actionLoading === company.id}
                          className="p-2 text-slate-400 hover:text-green-400 hover:bg-slate-700 rounded-lg disabled:opacity-50"
                          title="Activate"
                        >
                          <PlayIcon className="h-5 w-5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSuspend(company.id)}
                          disabled={actionLoading === company.id}
                          className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg disabled:opacity-50"
                          title="Suspend"
                        >
                          <PauseIcon className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {companies.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-slate-500">No companies found</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-700 flex justify-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1 bg-slate-700 text-white rounded disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-slate-400">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 bg-slate-700 text-white rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
