'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
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

const equipmentTypeLabels: Record<string, string> = {
  pump: 'Pool Pump',
  filter: 'Filter',
  heater: 'Heater',
  chlorinator: 'Chlorinator',
  automation: 'Automation System',
  cleaner: 'Pool Cleaner',
  other: 'Other',
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
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEquipment();
  }, []);

  const fetchEquipment = async () => {
    try {
      const token = localStorage.getItem('portal_token');
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
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
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
      <h1 className="text-2xl font-bold text-gray-900">Pool Equipment</h1>

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
                    {equipmentTypeLabels[item.equipment_type] || item.equipment_type}
                  </h3>

                  <div className="mt-2 space-y-1 text-sm">
                    {item.brand && (
                      <p className="text-gray-600">
                        <span className="text-gray-400">Brand:</span> {item.brand}
                      </p>
                    )}
                    {item.model && (
                      <p className="text-gray-600">
                        <span className="text-gray-400">Model:</span> {item.model}
                      </p>
                    )}
                    {item.serial_number && (
                      <p className="text-gray-600">
                        <span className="text-gray-400">Serial:</span> {item.serial_number}
                      </p>
                    )}
                    {item.install_date && (
                      <p className="text-gray-500 flex items-center gap-1 mt-2">
                        <CalendarIcon className="h-4 w-4" />
                        Installed: {formatDate(item.install_date)}
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
          <p className="text-gray-500">No equipment recorded</p>
          <p className="text-sm text-gray-400 mt-1">
            Your pool equipment information will appear here once added by your service provider
          </p>
        </div>
      )}
    </div>
  );
}
