'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  BeakerIcon,
} from '@heroicons/react/24/outline';

interface ChemicalReading {
  chemical_name: string;
  value: number;
  unit: string;
}

interface Service {
  id: string;
  route_date: string;
  status: string;
  arrival_time: string | null;
  departure_time: string | null;
  notes: string | null;
  technician_first_name: string;
  technician_last_name: string;
  chemical_readings?: ChemicalReading[];
}

export default function PortalServicesPage() {
  const { language } = useLanguage();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedService, setExpandedService] = useState<string | null>(null);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const token = localStorage.getItem('portalAccessToken');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const response = await axios.get(`${apiUrl}/portal/services`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setServices(response.data.services || []);
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '-';
    return new Date(timeStr).toLocaleTimeString(language === 'es' ? 'es-ES' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'in_progress':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'skipped':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <CalendarIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-green-100 text-green-700',
      in_progress: 'bg-yellow-100 text-yellow-700',
      pending: 'bg-gray-100 text-gray-700',
      skipped: 'bg-red-100 text-red-700',
    };
    return styles[status] || styles.pending;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, Record<string, string>> = {
      completed: { en: 'Completed', es: 'Completado' },
      in_progress: { en: 'In Progress', es: 'En Progreso' },
      pending: { en: 'Scheduled', es: 'Programado' },
      skipped: { en: 'Skipped', es: 'Omitido' },
    };
    return labels[status]?.[language] || status;
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">
          {language === 'es' ? 'Historial de Servicios' : 'Service History'}
        </h1>
      </div>

      {services.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="divide-y">
            {services.map((service) => (
              <div
                key={service.id}
                className="p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => setExpandedService(expandedService === service.id ? null : service.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(service.status)}
                    <div>
                      <p className="font-medium text-gray-900">
                        {formatDate(service.route_date)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {language === 'es' ? 'Técnico' : 'Technician'}: {service.technician_first_name} {service.technician_last_name}
                      </p>
                      {service.arrival_time && (
                        <p className="text-xs text-gray-400 mt-1">
                          {language === 'es' ? 'Llegada' : 'Arrived'}: {formatTime(service.arrival_time)}
                          {service.departure_time && ` - ${language === 'es' ? 'Salida' : 'Left'}: ${formatTime(service.departure_time)}`}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full capitalize ${getStatusBadge(service.status)}`}>
                    {getStatusLabel(service.status)}
                  </span>
                </div>

                {/* Expanded details */}
                {expandedService === service.id && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    {service.notes && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">
                          {language === 'es' ? 'Notas del técnico' : 'Technician Notes'}
                        </p>
                        <p className="text-sm text-gray-700">{service.notes}</p>
                      </div>
                    )}

                    {service.chemical_readings && service.chemical_readings.length > 0 && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <BeakerIcon className="h-4 w-4 text-blue-600" />
                          <p className="text-xs font-medium text-blue-700">
                            {language === 'es' ? 'Lecturas Químicas' : 'Chemical Readings'}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {service.chemical_readings.map((reading, idx) => (
                            <div key={idx} className="bg-white p-2 rounded text-center">
                              <p className="text-xs text-gray-500">{reading.chemical_name}</p>
                              <p className="font-semibold text-gray-900">
                                {reading.value} <span className="text-xs text-gray-400">{reading.unit}</span>
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {!service.notes && (!service.chemical_readings || service.chemical_readings.length === 0) && (
                      <p className="text-sm text-gray-400 text-center py-2">
                        {language === 'es' ? 'Sin detalles adicionales' : 'No additional details'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <CalendarIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">
            {language === 'es' ? 'Sin historial de servicios' : 'No service history yet'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {language === 'es'
              ? 'Las visitas de servicio aparecerán aquí una vez completadas'
              : 'Your service visits will appear here once completed'}
          </p>
        </div>
      )}
    </div>
  );
}
