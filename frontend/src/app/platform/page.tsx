'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import {
  BuildingOffice2Icon,
  UsersIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface DashboardStats {
  companies: {
    total: string;
    active: string;
    trial: string;
    expired: string;
    suspended: string;
  };
  revenue: {
    mrr: string;
    paid_this_month: string;
  };
  totals: {
    total_users: string;
    total_clients: string;
    services_30d: string;
  };
  recentCompanies: Array<{
    id: string;
    name: string;
    email: string;
    subscription_plan: string;
    subscription_status: string;
    created_at: string;
  }>;
  expiringTrials: Array<{
    id: string;
    name: string;
    email: string;
    trial_ends_at: string;
  }>;
}

export default function PlatformDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('platform_token');
      const res = await axios.get(`${apiUrl}/platform/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount));
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400';
      case 'trial': return 'bg-blue-500/20 text-blue-400';
      case 'expired': return 'bg-red-500/20 text-red-400';
      case 'suspended': return 'bg-gray-500/20 text-gray-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getDaysUntil = (dateStr: string) => {
    const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
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
      <div>
        <h1 className="text-2xl font-bold text-white">Platform Dashboard</h1>
        <p className="text-slate-400 mt-1">Overview of all companies using Aguadulce Track</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-600/20 rounded-lg">
              <BuildingOffice2Icon className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Total Companies</p>
              <p className="text-2xl font-bold text-white">{stats?.companies.total || 0}</p>
            </div>
          </div>
          <div className="mt-4 flex gap-2 text-xs">
            <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded">
              {stats?.companies.active || 0} active
            </span>
            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
              {stats?.companies.trial || 0} trial
            </span>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-600/20 rounded-lg">
              <CurrencyDollarIcon className="h-6 w-6 text-green-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Monthly Revenue (MRR)</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(stats?.revenue.mrr || 0)}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600/20 rounded-lg">
              <UsersIcon className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Total Users</p>
              <p className="text-2xl font-bold text-white">{stats?.totals.total_users || 0}</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            {stats?.totals.total_clients || 0} clients managed
          </p>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-600/20 rounded-lg">
              <ArrowTrendingUpIcon className="h-6 w-6 text-orange-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Services (30 days)</p>
              <p className="text-2xl font-bold text-white">{stats?.totals.services_30d || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expiring Trials */}
        <div className="bg-slate-800 rounded-xl border border-slate-700">
          <div className="p-4 border-b border-slate-700 flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
            <h2 className="font-semibold text-white">Expiring Trials</h2>
          </div>
          <div className="p-4">
            {stats?.expiringTrials && stats.expiringTrials.length > 0 ? (
              <div className="space-y-3">
                {stats.expiringTrials.map((company) => {
                  const daysLeft = getDaysUntil(company.trial_ends_at);
                  return (
                    <Link
                      key={company.id}
                      href={`/platform/companies/${company.id}`}
                      className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-white">{company.name}</p>
                        <p className="text-sm text-slate-400">{company.email}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        daysLeft <= 2 ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {daysLeft <= 0 ? 'Expired' : `${daysLeft} days left`}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-500 text-center py-4">No trials expiring soon</p>
            )}
          </div>
        </div>

        {/* Recent Companies */}
        <div className="bg-slate-800 rounded-xl border border-slate-700">
          <div className="p-4 border-b border-slate-700 flex items-center gap-2">
            <ClockIcon className="h-5 w-5 text-purple-400" />
            <h2 className="font-semibold text-white">Recent Companies</h2>
          </div>
          <div className="p-4">
            {stats?.recentCompanies && stats.recentCompanies.length > 0 ? (
              <div className="space-y-3">
                {stats.recentCompanies.map((company) => (
                  <Link
                    key={company.id}
                    href={`/platform/companies/${company.id}`}
                    className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-white">{company.name}</p>
                      <p className="text-sm text-slate-400">{formatDate(company.created_at)}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(company.subscription_status)}`}>
                      {company.subscription_status}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-center py-4">No companies yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h2 className="font-semibold text-white mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/platform/companies"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            View All Companies
          </Link>
          <Link
            href="/platform/plans"
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            Manage Plans
          </Link>
          <Link
            href="/platform/activity"
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            View Activity Log
          </Link>
        </div>
      </div>
    </div>
  );
}
