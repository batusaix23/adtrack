'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import Link from 'next/link';
import { TechnicianLayout } from '@/components/layout/TechnicianLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import api from '@/lib/api';
import {
  MapPinIcon,
  PhoneIcon,
  PlayIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
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
  sequence_order: number;
  status: string;
  estimated_arrival: string;
  actual_arrival: string;
  actual_departure: string;
  skip_reason: string;
  client_id: string;
  first_name: string;
  last_name: string;
  client_company: string;
  address: string;
  city: string;
  phone: string;
  gate_code: string;
  access_notes: string;
  latitude: number;
  longitude: number;
  pool_name: string;
  volume_gallons: number;
  has_salt_system: boolean;
  service_record_id: string;
  last_chlorine: number;
  last_ph: number;
}

export default function RouteDetailPage() {
  const params = useParams();
  const date = params.date as string;

  const { data, isLoading } = useSWR(`/technician-portal/route/${date}`, techFetcher);

  const route = data?.route;
  const stops: RouteStop[] = data?.stops || [];

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const isToday = () => {
    return date === new Date().toISOString().split('T')[0];
  };

  return (
    <TechnicianLayout title={isToday() ? 'Ruta de Hoy' : formatDate(date)} showBack>
      <div className="p-4 space-y-4">
        {/* Progress Header */}
        {route && (
          <Card className="bg-gradient-to-r from-primary-600 to-primary-700 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-100 text-sm">Progreso</p>
                <p className="text-2xl font-bold">
                  {route.progress?.completed || 0} / {route.progress?.total || 0}
                </p>
                <p className="text-primary-100 text-sm">paradas completadas</p>
              </div>
              <div className="w-16 h-16">
                <svg viewBox="0 0 36 36" className="w-full h-full">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    strokeDasharray={`${route.progress?.percentage || 0}, 100`}
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
          </Card>
        )}

        {/* Stops List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : stops.length === 0 ? (
          <Card className="text-center py-8">
            <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">{data?.message || 'No hay paradas para este día'}</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {stops.map((stop, index) => (
              <Card
                key={stop.id}
                className={`transition-shadow ${
                  stop.status === 'skipped' ? 'opacity-60' : 'hover:shadow-md'
                }`}
              >
                <div className="flex gap-3">
                  {/* Stop Number */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                    stop.status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : stop.status === 'in_progress'
                      ? 'bg-yellow-100 text-yellow-700'
                      : stop.status === 'skipped'
                      ? 'bg-gray-100 text-gray-500'
                      : 'bg-primary-100 text-primary-700'
                  }`}>
                    {stop.status === 'completed' ? (
                      <CheckCircleIcon className="h-6 w-6" />
                    ) : stop.status === 'skipped' ? (
                      <ExclamationTriangleIcon className="h-5 w-5" />
                    ) : (
                      index + 1
                    )}
                  </div>

                  {/* Stop Details */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">
                        {stop.first_name} {stop.last_name}
                        {stop.client_company && ` (${stop.client_company})`}
                      </h3>
                      <StatusBadge status={stop.status || 'pending'} />
                    </div>

                    {stop.pool_name && (
                      <p className="text-sm text-gray-600">{stop.pool_name}</p>
                    )}

                    {stop.skip_reason && (
                      <p className="text-sm text-orange-600 mt-1">
                        Motivo: {stop.skip_reason}
                      </p>
                    )}

                    <div className="mt-2 space-y-1 text-sm text-gray-500">
                      {stop.estimated_arrival && stop.status === 'pending' && (
                        <p className="flex items-center gap-1">
                          <ClockIcon className="h-4 w-4" />
                          Est. {new Date(stop.estimated_arrival).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}

                      {stop.address && (
                        <p className="flex items-center gap-1">
                          <MapPinIcon className="h-4 w-4" />
                          {stop.address}{stop.city ? `, ${stop.city}` : ''}
                        </p>
                      )}

                      {stop.phone && (
                        <a
                          href={`tel:${stop.phone}`}
                          className="flex items-center gap-1 text-primary-600"
                        >
                          <PhoneIcon className="h-4 w-4" />
                          {stop.phone}
                        </a>
                      )}

                      {stop.gate_code && (
                        <p className="text-xs bg-gray-100 px-2 py-1 rounded inline-block">
                          Código: {stop.gate_code}
                        </p>
                      )}

                      {stop.last_ph && stop.last_chlorine && (
                        <p className="text-xs text-gray-400">
                          Último servicio: pH {Number(stop.last_ph).toFixed(1)}, Cl {Number(stop.last_chlorine).toFixed(1)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    {stop.status !== 'completed' && stop.status !== 'skipped' && (
                      <Link href={`/technician/service/${stop.service_record_id || stop.id}`}>
                        <Button
                          size="sm"
                          icon={<PlayIcon className="h-4 w-4" />}
                        >
                          {stop.status === 'in_progress' ? 'Continuar' : 'Iniciar'}
                        </Button>
                      </Link>
                    )}

                    {stop.status === 'completed' && stop.service_record_id && (
                      <Link href={`/technician/service/${stop.service_record_id}`}>
                        <Button variant="secondary" size="sm">
                          Ver
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
                          GPS
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </TechnicianLayout>
  );
}

// Add missing icon
function CalendarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
}
