'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { fetcher } from '@/lib/api';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

interface CalendarService {
  id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  pool_name: string;
  client_name: string;
  technician_first_name: string;
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const { data } = useSWR(`/services/calendar?year=${year}&month=${month}`, fetcher);

  // Get calendar days
  const firstDayOfMonth = new Date(year, month - 1, 1);
  const lastDayOfMonth = new Date(year, month, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  const calendarDays: (number | null)[] = [];

  // Add empty slots for days before the first day of the month
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }

  // Add the days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  const getServicesForDay = (day: number) => {
    if (!data?.services) return [];
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return data.services.filter((s: CalendarService) => s.scheduled_date === dateStr);
  };

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const today = new Date();
  const isToday = (day: number) =>
    day === today.getDate() &&
    month === today.getMonth() + 1 &&
    year === today.getFullYear();

  return (
    <AdminLayout title="Calendario">
      <Card>
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigateMonth('prev')}>
            <ChevronLeftIcon className="h-5 w-5" />
          </Button>
          <h2 className="text-xl font-semibold text-gray-900">
            {monthNames[month - 1]} {year}
          </h2>
          <Button variant="ghost" onClick={() => navigateMonth('next')}>
            <ChevronRightIcon className="h-5 w-5" />
          </Button>
        </div>

        {/* Day Names */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map((day) => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => {
            const services = day ? getServicesForDay(day) : [];

            return (
              <div
                key={index}
                className={`min-h-24 p-1 border rounded-lg ${
                  day ? 'bg-white' : 'bg-gray-50'
                } ${isToday(day || 0) ? 'ring-2 ring-primary-500' : 'border-gray-200'}`}
              >
                {day && (
                  <>
                    <div className={`text-sm font-medium mb-1 ${
                      isToday(day) ? 'text-primary-600' : 'text-gray-700'
                    }`}>
                      {day}
                    </div>
                    <div className="space-y-1">
                      {services.slice(0, 3).map((service: CalendarService) => (
                        <div
                          key={service.id}
                          className={`text-xs p-1 rounded truncate ${
                            service.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : service.status === 'cancelled'
                              ? 'bg-red-100 text-red-800'
                              : service.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                          title={`${service.pool_name} - ${service.client_name}`}
                        >
                          {service.scheduled_time?.slice(0, 5)} {service.pool_name}
                        </div>
                      ))}
                      {services.length > 3 && (
                        <div className="text-xs text-gray-500 pl-1">
                          +{services.length - 3} más
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex gap-4 mt-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-yellow-100" />
            <span className="text-sm text-gray-600">Pendiente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-100" />
            <span className="text-sm text-gray-600">En Progreso</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-100" />
            <span className="text-sm text-gray-600">Completado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-100" />
            <span className="text-sm text-gray-600">Cancelado</span>
          </div>
        </div>
      </Card>
    </AdminLayout>
  );
}
