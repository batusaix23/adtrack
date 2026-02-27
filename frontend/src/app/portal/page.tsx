'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  WrenchScrewdriverIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

interface ClientProfile {
  name: string;
  last_name: string;
  company_name: string;
  service_day: string;
  service_frequency: number;
  address: string;
  city: string;
}

interface UpcomingService {
  id: string;
  route_date: string;
  technician_first_name: string;
  technician_last_name: string;
}

interface Rate {
  id: string;
  name: string;
  amount: string;
  frequency: string;
}

export default function PortalDashboardPage() {
  const { language, t } = useLanguage();
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingService[]>([]);
  const [rates, setRates] = useState<Rate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('portalAccessToken');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const [profileRes, upcomingRes, ratesRes] = await Promise.all([
        axios.get(`${apiUrl}/portal/profile`, config),
        axios.get(`${apiUrl}/portal/services/upcoming`, config),
        axios.get(`${apiUrl}/portal/rates`, config),
      ]);

      setProfile(profileRes.data.client);
      setUpcoming(upcomingRes.data.upcoming || []);
      setRates(ratesRes.data.rates || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
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
      {/* Welcome Section */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {t('portal.welcome')}, {profile?.name} {profile?.last_name}!
        </h1>
        {profile?.company_name && (
          <p className="text-primary-600 font-medium">{profile.company_name}</p>
        )}
        <p className="text-gray-500 mt-1">
          {profile?.address}{profile?.city ? `, ${profile.city}` : ''}
        </p>

        <div className="mt-4 flex gap-4 flex-wrap">
          {profile?.service_day && (
            <div className="flex items-center gap-2 text-sm bg-primary-50 text-primary-700 px-3 py-1 rounded-full">
              <CalendarDaysIcon className="h-4 w-4" />
              {language === 'es' ? 'Servicio' : 'Service'}: {profile.service_day}
            </div>
          )}
          {profile?.service_frequency && (
            <div className="flex items-center gap-2 text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
              {profile.service_frequency}x {t('frequency.perWeek')}
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Upcoming Services */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ClipboardDocumentListIcon className="h-5 w-5 text-primary-600" />
              {language === 'es' ? 'Próximos Servicios' : 'Upcoming Services'}
            </h2>
            <Link href="/portal/services" className="text-primary-600 text-sm hover:underline">
              {t('portal.viewAll')}
            </Link>
          </div>

          {upcoming.length > 0 ? (
            <div className="space-y-3">
              {upcoming.slice(0, 3).map((service) => (
                <div key={service.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{formatDate(service.route_date)}</p>
                    <p className="text-sm text-gray-500">
                      {language === 'es' ? 'Técnico' : 'Tech'}: {service.technician_first_name} {service.technician_last_name}
                    </p>
                  </div>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                    {language === 'es' ? 'Programado' : 'Scheduled'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">
              {language === 'es' ? 'No hay servicios programados' : 'No upcoming services scheduled'}
            </p>
          )}
        </div>

        {/* Current Rates */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <CurrencyDollarIcon className="h-5 w-5 text-primary-600" />
              {language === 'es' ? 'Tarifas Actuales' : 'Current Rates'}
            </h2>
            <Link href="/portal/billing" className="text-primary-600 text-sm hover:underline">
              {language === 'es' ? 'Ver facturación' : 'View billing'}
            </Link>
          </div>

          {rates.length > 0 ? (
            <div className="space-y-3">
              {rates.map((rate) => (
                <div key={rate.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{rate.name}</p>
                    <p className="text-sm text-gray-500 capitalize">{rate.frequency}</p>
                  </div>
                  <span className="font-semibold text-primary-600">
                    ${Number(rate.amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">
              {language === 'es' ? 'Sin tarifas activas' : 'No active rates'}
            </p>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link
          href="/portal/services"
          className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <ClipboardDocumentListIcon className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{t('portal.serviceHistory')}</p>
            <p className="text-xs text-gray-500">
              {language === 'es' ? 'Ver servicios anteriores' : 'View past services'}
            </p>
          </div>
          <ChevronRightIcon className="h-5 w-5 text-gray-400 ml-auto" />
        </Link>

        <Link
          href="/portal/billing"
          className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <CurrencyDollarIcon className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">
              {language === 'es' ? 'Facturación' : 'Billing'}
            </p>
            <p className="text-xs text-gray-500">
              {language === 'es' ? 'Tarifas y facturas' : 'Rates & invoices'}
            </p>
          </div>
          <ChevronRightIcon className="h-5 w-5 text-gray-400 ml-auto" />
        </Link>

        <Link
          href="/portal/equipment"
          className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
            <WrenchScrewdriverIcon className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{t('equipment.title')}</p>
            <p className="text-xs text-gray-500">
              {language === 'es' ? 'Info del equipo de piscina' : 'Pool equipment info'}
            </p>
          </div>
          <ChevronRightIcon className="h-5 w-5 text-gray-400 ml-auto" />
        </Link>
      </div>
    </div>
  );
}
