'use client';

import React from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { TechnicianLayout } from '@/components/layout/TechnicianLayout';
import { Card } from '@/components/ui/Card';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useTechnicianAuth } from '@/contexts/TechnicianAuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import api from '@/lib/api';
import {
  MapPinIcon,
  PhoneIcon,
  PlayIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

// Custom fetcher that uses technician token
const techFetcher = async (url: string) => {
  const token = localStorage.getItem('technicianAccessToken');
  const res = await api.get(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

interface RouteStop {
  id: string;
  stop_order: number;
  status: string;
  estimated_arrival: string;
  pool_id: string;
  pool_name: string;
  client_id: string;
  client_name: string;
  client_phone: string;
  client_address: string;
  client_city: string;
  latitude: number;
  longitude: number;
  service_record_id: string;
}

export default function TechnicianHome() {
  const { technician } = useTechnicianAuth();
  const { t } = useLanguage();
  const { data, error, isLoading } = useSWR('/technician-portal/route/today', techFetcher);

  const stops = data?.stops || [];
  const completedCount = stops.filter((s: RouteStop) => s.status === 'completed').length;
  const totalCount = stops.length;

  return (
    <TechnicianLayout>
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-4 py-6">
        <p className="text-primary-100">{t('tech.hello')},</p>
        <h1 className="text-2xl font-bold">{technician?.firstName}</h1>

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

      {/* Route Stops List */}
      <div className="p-4 space-y-3">
        <h2 className="font-semibold text-gray-900">{t('tech.todayServices')}</h2>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : stops.length === 0 ? (
          <Card className="text-center py-8">
            <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-2" />
            <p className="text-gray-600">{t('tech.noServices')}</p>
          </Card>
        ) : (
          stops.map((stop: RouteStop, index: number) => (
            <Card key={stop.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{stop.pool_name}</h3>
                      <StatusBadge status={stop.status || 'pending'} />
                    </div>
                    <p className="text-gray-600">{stop.client_name}</p>

                    <div className="mt-2 space-y-1 text-sm text-gray-500">
                      {stop.estimated_arrival && (
                        <p className="flex items-center gap-1">
                          <ClockIcon className="h-4 w-4" />
                          {new Date(stop.estimated_arrival).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                      {stop.client_address && (
                        <p className="flex items-center gap-1">
                          <MapPinIcon className="h-4 w-4" />
                          {stop.client_address}{stop.client_city ? `, ${stop.client_city}` : ''}
                        </p>
                      )}
                      {stop.client_phone && (
                        <a
                          href={`tel:${stop.client_phone}`}
                          className="flex items-center gap-1 text-primary-600"
                        >
                          <PhoneIcon className="h-4 w-4" />
                          {stop.client_phone}
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {stop.status !== 'completed' && stop.status !== 'skipped' && (
                    <Link href={`/technician/service/${stop.service_record_id}`}>
                      <Button
                        size="sm"
                        icon={<PlayIcon className="h-4 w-4" />}
                      >
                        {stop.status === 'in_progress' ? t('tech.continueService') : t('tech.startService')}
                      </Button>
                    </Link>
                  )}

                  {stop.status === 'completed' && (
                    <Link href={`/technician/service/${stop.service_record_id}`}>
                      <Button variant="secondary" size="sm">
                        {t('tech.viewDetails')}
                      </Button>
                    </Link>
                  )}

                  {stop.latitude && stop.longitude && (
                    <a
                      href={`https://maps.google.com/?q=${stop.latitude},${stop.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="secondary" size="sm" icon={<MapPinIcon className="h-4 w-4" />}>
                        Navegar
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </TechnicianLayout>
  );
}
