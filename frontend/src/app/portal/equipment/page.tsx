'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useLanguage } from '@/contexts/LanguageContext';
import { WrenchScrewdriverIcon, CalendarIcon } from '@heroicons/react/24/outline';

interface Equipment {
  id: string;
  equipment_type: string;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  install_date: string | null;
  notes: string | null;
}

const equipmentTypeLabels: Record<string, Record<string, string>> = {
  pump: { en: 'Pool Pump', es: 'Bomba de Piscina' },
  filter: { en: 'Filter', es: 'Filtro' },
  heater: { en: 'Heater', es: 'Calentador' },
  chlorinator: { en: 'Chlorinator', es: 'Clorinador' },
  automation: { en: 'Automation System', es: 'Sistema de Automatización' },
  cleaner: { en: 'Pool Cleaner', es: 'Limpiador de Piscina' },
  other: { en: 'Other', es: 'Otro' },
};

const equipmentTypeIcons: Record<string, string> = {
  pump: '🔄',
  filter: '🧹',
  heater: '🔥',
  chlorinator: '💧',
  automation: '🤖',
  cleaner: '🧽',
  other: '🔧',
};

export default function PortalEquipmentPage() {
  const { language } = useLanguage();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEquipment();
  }, []);

  const fetchEquipment = async () => {
    try {
      const token = localStorage.getItem('portalAccessToken');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const response = await axios.get(`${apiUrl}/portal/equipment`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEquipment(response.data.equipment || []);
    } catch (error) {
      console.error('Error fetching equipment:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getTypeLabel = (type: string) => {
    return equipmentTypeLabels[type]?.[language] || type;
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
      <h1 className="text-2xl font-bold text-gray-900">
        {language === 'es' ? 'Equipo de Piscina' : 'Pool Equipment'}
      </h1>

      {equipment.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-4">
          {equipment.map((item) => (
            <div key={item.id} className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-2xl">
                  {equipmentTypeIcons[item.equipment_type] || '🔧'}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">
                    {getTypeLabel(item.equipment_type)}
                  </h3>

                  <div className="mt-2 space-y-1 text-sm">
                    {item.brand && (
                      <p className="text-gray-600">
                        <span className="text-gray-400">{language === 'es' ? 'Marca' : 'Brand'}:</span> {item.brand}
                      </p>
                    )}
                    {item.model && (
                      <p className="text-gray-600">
                        <span className="text-gray-400">{language === 'es' ? 'Modelo' : 'Model'}:</span> {item.model}
                      </p>
                    )}
                    {item.serial_number && (
                      <p className="text-gray-600">
                        <span className="text-gray-400">{language === 'es' ? 'Serie' : 'Serial'}:</span> {item.serial_number}
                      </p>
                    )}
                    {item.install_date && (
                      <p className="text-gray-500 flex items-center gap-1 mt-2">
                        <CalendarIcon className="h-4 w-4" />
                        {language === 'es' ? 'Instalado' : 'Installed'}: {formatDate(item.install_date)}
                      </p>
                    )}
                  </div>

                  {item.notes && (
                    <p className="mt-3 text-sm text-gray-500 bg-gray-50 p-2 rounded">
                      {item.notes}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <WrenchScrewdriverIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">
            {language === 'es' ? 'Sin equipo registrado' : 'No equipment recorded'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {language === 'es'
              ? 'La información de su equipo aparecerá aquí una vez agregada por su proveedor de servicio'
              : 'Your pool equipment information will appear here once added by your service provider'}
          </p>
        </div>
      )}
    </div>
  );
}
