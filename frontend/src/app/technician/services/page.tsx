'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { TechnicianLayout } from '@/components/layout/TechnicianLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import api from '@/lib/api';
import {
  CalendarIcon,
  MapPinIcon,
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

interface Service {
  id: string;
  pool_name: string;
  client_first_name: string;
  client_last_name: string;
  scheduled_date: string;
  arrival_time: string;
  status: string;
  reading_ph: number;
  reading_chlorine: number;
  duration_minutes: number;
}

export default function TechnicianServicesPage() {
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [page, setPage] = useState(1);

  // Get recent services for this technician
  const { data, isLoading } = useSWR(
    `/technician-portal/services?page=${page}&limit=20`,
    techFetcher
  );

  const services = data?.services || [];

  const filteredServices = services.filter((s: Service) => {
    if (filter === 'pending') return s.status === 'pending' || s.status === 'in_progress';
    if (filter === 'completed') return s.status === 'completed';
    return true;
  });

  // Group by date
  const groupedServices = filteredServices.reduce((acc: Record<string, Service[]>, service: Service) => {
    const date = service.scheduled_date?.split('T')[0] || 'unknown';
    if (!acc[date]) acc[date] = [];
    acc[date].push(service);
    return acc;
  }, {});

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Hoy';
    if (date.toDateString() === yesterday.toDateString()) return 'Ayer';

    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  return (
    <TechnicianLayout title="Mis Servicios">
      <div className="p-4">
        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {[
            { key: 'all', label: 'Todos' },
            { key: 'pending', label: 'Pendientes' },
            { key: 'completed', label: 'Completados' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === tab.key
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Services List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : Object.keys(groupedServices).length === 0 ? (
          <Card className="text-center py-12">
            <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No hay servicios</p>
          </Card>
        ) : (
          Object.entries(groupedServices)
            .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
            .map(([date, services]) => (
              <div key={date} className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2 capitalize">
                  {formatDate(date)}
                </h3>
                <div className="space-y-3">
                  {(services as Service[]).map((service) => (
                    <Link key={service.id} href={`/technician/service/${service.id}`}>
                      <Card className="hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-gray-900">{service.pool_name || 'Piscina'}</h4>
                            <p className="text-sm text-gray-500">
                              {service.client_first_name} {service.client_last_name}
                            </p>

                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                              {service.arrival_time && (
                                <span className="flex items-center gap-1">
                                  <ClockIcon className="h-4 w-4" />
                                  {new Date(service.arrival_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                              {service.duration_minutes && (
                                <span>{service.duration_minutes} min</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <StatusBadge status={service.status} />
                            {service.status === 'completed' && service.reading_ph && (
                              <p className="text-xs text-gray-500 mt-2">
                                pH: {Number(service.reading_ph).toFixed(1)}
                              </p>
                            )}
                          </div>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            ))
        )}
      </div>
    </TechnicianLayout>
  );
}
