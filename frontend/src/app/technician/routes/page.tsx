'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { TechnicianLayout } from '@/components/layout/TechnicianLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import api from '@/lib/api';
import {
  CalendarIcon,
  MapPinIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

// Custom fetcher that uses technician token
const techFetcher = async (url: string) => {
  const token = localStorage.getItem('technicianAccessToken');
  const res = await api.get(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

interface DaySchedule {
  date: string;
  dayOfWeek: string;
  totalStops: number;
  completedStops: number;
}

export default function TechnicianRoutesPage() {
  const [weekStart, setWeekStart] = useState(() => {
    const now = new Date();
    now.setDate(now.getDate() - now.getDay()); // Start of current week
    return now.toISOString().split('T')[0];
  });

  const { data, isLoading } = useSWR(
    `/technician-portal/schedule/week?startDate=${weekStart}`,
    techFetcher
  );

  const schedule: DaySchedule[] = data?.schedule || [];

  const goToPreviousWeek = () => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() - 7);
    setWeekStart(date.toISOString().split('T')[0]);
  };

  const goToNextWeek = () => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + 7);
    setWeekStart(date.toISOString().split('T')[0]);
  };

  const goToToday = () => {
    const now = new Date();
    now.setDate(now.getDate() - now.getDay());
    setWeekStart(now.toISOString().split('T')[0]);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const isToday = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  };

  const dayNames: Record<string, string> = {
    'Sun': 'Dom',
    'Mon': 'Lun',
    'Tue': 'Mar',
    'Wed': 'Mié',
    'Thu': 'Jue',
    'Fri': 'Vie',
    'Sat': 'Sáb',
  };

  return (
    <TechnicianLayout title="Mis Rutas">
      <div className="p-4 space-y-4">
        {/* Week Navigation */}
        <Card>
          <div className="flex items-center justify-between">
            <button
              onClick={goToPreviousWeek}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
            </button>

            <div className="text-center">
              <button
                onClick={goToToday}
                className="text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                Hoy
              </button>
              <p className="text-gray-500 text-sm mt-1">
                Semana del {new Date(weekStart).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
              </p>
            </div>

            <button
              onClick={goToNextWeek}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRightIcon className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </Card>

        {/* Schedule Grid */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {schedule.map((day) => (
              <Link key={day.date} href={`/technician/routes/${day.date}`}>
                <Card
                  className={`hover:shadow-md transition-shadow ${
                    isToday(day.date) ? 'ring-2 ring-primary-500 bg-primary-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center ${
                        isToday(day.date) ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
                      }`}>
                        <span className="text-xs font-medium">
                          {dayNames[day.dayOfWeek] || day.dayOfWeek}
                        </span>
                        <span className="text-lg font-bold">
                          {new Date(day.date).getDate()}
                        </span>
                      </div>

                      <div>
                        <p className={`font-medium ${isToday(day.date) ? 'text-primary-900' : 'text-gray-900'}`}>
                          {formatDate(day.date)}
                        </p>
                        {day.totalStops > 0 ? (
                          <p className="text-sm text-gray-500">
                            {day.totalStops} paradas programadas
                          </p>
                        ) : (
                          <p className="text-sm text-gray-400">Sin paradas</p>
                        )}
                      </div>
                    </div>

                    {day.totalStops > 0 && (
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          {day.completedStops === day.totalStops ? (
                            <CheckCircleIcon className="h-6 w-6 text-green-500" />
                          ) : (
                            <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary-600 rounded-full"
                                style={{
                                  width: `${(day.completedStops / day.totalStops) * 100}%`
                                }}
                              />
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {day.completedStops}/{day.totalStops}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </TechnicianLayout>
  );
}
