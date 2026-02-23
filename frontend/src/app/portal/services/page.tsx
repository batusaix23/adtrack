'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { CalendarIcon, CheckCircleIcon, ClockIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface Service {
  id: string;
  route_date: string;
  status: string;
  arrival_time: string | null;
  departure_time: string | null;
  notes: string | null;
  technician_first_name: string;
  technician_last_name: string;
}

export default function PortalServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const token = localStorage.getItem('portal_token');
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
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '-';
    return new Date(timeStr).toLocaleTimeString('en-US', {
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
        <h1 className="text-2xl font-bold text-gray-900">Service History</h1>
      </div>

      {services.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="divide-y">
            {services.map((service) => (
              <div key={service.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(service.status)}
                    <div>
                      <p className="font-medium text-gray-900">
                        {formatDate(service.route_date)}
                      </p>
                      <p className="text-sm text-gray-500">
                        Technician: {service.technician_first_name} {service.technician_last_name}
                      </p>
                      {service.arrival_time && (
                        <p className="text-xs text-gray-400 mt-1">
                          Arrived: {formatTime(service.arrival_time)}
                          {service.departure_time && ` - Left: ${formatTime(service.departure_time)}`}
                        </p>
                      )}
                      {service.notes && (
                        <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                          {service.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full capitalize ${getStatusBadge(service.status)}`}>
                    {service.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <CalendarIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No service history yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Your service visits will appear here once completed
          </p>
        </div>
      )}
    </div>
  );
}
