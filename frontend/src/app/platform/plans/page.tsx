'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { CreditCardIcon, CheckIcon } from '@heroicons/react/24/outline';

interface Plan {
  id: string;
  name: string;
  display_name: string;
  monthly_price: string;
  annual_price: string;
  max_users: number;
  max_clients: number;
  features: string[];
  is_active: boolean;
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const token = localStorage.getItem('platform_token');
      const res = await axios.get(`${apiUrl}/platform/plans`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPlans(res.data.plans || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount));
  };

  const getPlanColor = (name: string) => {
    switch (name) {
      case 'enterprise': return 'from-purple-600 to-purple-800 border-purple-500';
      case 'professional': return 'from-blue-600 to-blue-800 border-blue-500';
      case 'basic': return 'from-green-600 to-green-800 border-green-500';
      default: return 'from-slate-600 to-slate-800 border-slate-500';
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
      <div>
        <h1 className="text-2xl font-bold text-white">Subscription Plans</h1>
        <p className="text-slate-400">Manage pricing and features for each plan</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`bg-gradient-to-b ${getPlanColor(plan.name)} rounded-xl border overflow-hidden`}
          >
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <CreditCardIcon className="h-6 w-6 text-white" />
                <h3 className="text-lg font-bold text-white capitalize">{plan.display_name}</h3>
              </div>

              <div className="mb-6">
                <p className="text-3xl font-bold text-white">
                  {formatCurrency(plan.monthly_price)}
                  <span className="text-sm font-normal text-white/70">/month</span>
                </p>
                {Number(plan.annual_price) > 0 && (
                  <p className="text-sm text-white/70 mt-1">
                    or {formatCurrency(plan.annual_price)}/year
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-white">
                  <CheckIcon className="h-5 w-5" />
                  <span>{plan.max_users === -1 ? 'Unlimited' : plan.max_users} users</span>
                </div>
                <div className="flex items-center gap-2 text-white">
                  <CheckIcon className="h-5 w-5" />
                  <span>{plan.max_clients === -1 ? 'Unlimited' : plan.max_clients} clients</span>
                </div>
                {plan.features && Array.isArray(plan.features) && plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-white/80">
                    <CheckIcon className="h-5 w-5" />
                    <span className="capitalize">{feature.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 bg-black/20">
              <span className={`px-2 py-1 rounded text-xs ${plan.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {plan.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h2 className="font-semibold text-white mb-4">Plan Configuration</h2>
        <p className="text-slate-400 text-sm">
          To modify plan pricing or features, update the database directly or contact the development team.
          Future versions will include a full plan editor interface.
        </p>
      </div>
    </div>
  );
}
