'use client';

import React from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { TechnicianLayout } from '@/components/layout/TechnicianLayout';
import { Card } from '@/components/ui/Card';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { fetcher } from '@/lib/api';
import {
  MapPinIcon,
  PhoneIcon,
  PlayIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface Pool {
  id: string;
  name: string;
  client_name: string;
  client_phone: string;
  client_address: string;
  service_record_id: string;
  service_status: string;
}

export default function TechnicianHome() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { data, error, isLoading } = useSWR('/pools/today', fetcher);

  const completedCount = data?.pools?.filter((p: Pool) => p.service_status === 'completed').length || 0;
  const totalCount = data?.pools?.length || 0;

  return (
    <TechnicianLayout>
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-4 py-6">
        <p className="text-primary-100">{t('tech.hello')},</p>
        <h1 className="text-2xl font-bold">{user?.firstName}</h1>

        <div className="mt-4 bg-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-100 text-sm">{t('tech.servicesToday')}</p>
              <p className="text-3xl font-bold">{completedCount}/{totalCount}</p>
            </div>
            <div className="w-16 h-16">
              <svg viewBox="0 0 36 36" className="w-full h-full">
                <path
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                  strokeDasharray={`${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}, 100`}
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Pool List */}
      <div className="p-4 space-y-3">
        <h2 className="font-semibold text-gray-900">{t('tech.todayServices')}</h2>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : data?.pools?.length === 0 ? (
          <Card className="text-center py-8">
            <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-2" />
            <p className="text-gray-600">{t('tech.noServices')}</p>
          </Card>
        ) : (
          data?.pools?.map((pool: Pool) => (
            <Card key={pool.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{pool.name}</h3>
                    <StatusBadge status={pool.service_status || 'pending'} />
                  </div>
                  <p className="text-gray-600">{pool.client_name}</p>

                  <div className="mt-2 space-y-1 text-sm text-gray-500">
                    {pool.client_address && (
                      <p className="flex items-center gap-1">
                        <MapPinIcon className="h-4 w-4" />
                        {pool.client_address}
                      </p>
                    )}
                    {pool.client_phone && (
                      <a
                        href={`tel:${pool.client_phone}`}
                        className="flex items-center gap-1 text-primary-600"
                      >
                        <PhoneIcon className="h-4 w-4" />
                        {pool.client_phone}
                      </a>
                    )}
                  </div>
                </div>

                {pool.service_status !== 'completed' && (
                  <Link href={`/technician/service/${pool.service_record_id || pool.id}`}>
                    <Button
                      size="sm"
                      icon={<PlayIcon className="h-4 w-4" />}
                    >
                      {pool.service_status === 'in_progress' ? t('tech.continueService') : t('tech.startService')}
                    </Button>
                  </Link>
                )}

                {pool.service_status === 'completed' && (
                  <Link href={`/technician/service/${pool.service_record_id}/details`}>
                    <Button variant="secondary" size="sm">
                      {t('tech.viewDetails')}
                    </Button>
                  </Link>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </TechnicianLayout>
  );
}
