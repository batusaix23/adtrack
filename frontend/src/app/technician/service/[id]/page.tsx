'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { TechnicianLayout } from '@/components/layout/TechnicianLayout';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { fetcher } from '@/lib/api';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  PlayIcon,
  CheckIcon,
  CameraIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';

interface Chemical {
  id: string;
  name: string;
  unit: string;
}

export default function ServicePage() {
  const params = useParams();
  const router = useRouter();
  const serviceId = params.id as string;

  const { data: serviceData, mutate } = useSWR(`/services/${serviceId}`, fetcher);
  const { data: chemicalsData } = useSWR('/chemicals', fetcher);

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    phLevel: '',
    chlorineLevel: '',
    alkalinity: '',
    saltLevel: '',
    waterTemperature: '',
    skimmedSurface: false,
    brushedWalls: false,
    vacuumedPool: false,
    cleanedSkimmer: false,
    checkedEquipment: false,
    backwashedFilter: false,
    emptiedPumpBasket: false,
    notes: '',
    chemicals: {} as Record<string, number>,
  });
  const [signature, setSignature] = useState<string | null>(null);
  const [signatureName, setSignatureName] = useState('');
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Get current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => console.error('Error getting location:', error)
      );
    }
  }, []);

  const service = serviceData?.service;

  const startService = async () => {
    setLoading(true);
    try {
      await api.post(`/services/${serviceId}/start`, {
        latitude: location?.latitude,
        longitude: location?.longitude,
      });
      toast.success('Servicio iniciado');
      mutate();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al iniciar');
    } finally {
      setLoading(false);
    }
  };

  const completeService = async () => {
    setLoading(true);
    try {
      const chemicals = Object.entries(formData.chemicals)
        .filter(([_, qty]) => qty > 0)
        .map(([chemicalId, quantity]) => ({ chemicalId, quantity }));

      await api.post(`/services/${serviceId}/complete`, {
        ...formData,
        phLevel: parseFloat(formData.phLevel) || null,
        chlorineLevel: parseFloat(formData.chlorineLevel) || null,
        alkalinity: parseFloat(formData.alkalinity) || null,
        saltLevel: parseFloat(formData.saltLevel) || null,
        waterTemperature: parseFloat(formData.waterTemperature) || null,
        chemicals,
        signature,
        signatureName,
        latitude: location?.latitude,
        longitude: location?.longitude,
      });
      toast.success('Servicio completado');
      router.push('/technician');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al completar');
    } finally {
      setLoading(false);
    }
  };

  const handleTaskToggle = (task: string) => {
    setFormData((prev) => ({
      ...prev,
      [task]: !prev[task as keyof typeof prev],
    }));
  };

  const tasks = [
    { key: 'skimmedSurface', label: 'Superficie desnatada' },
    { key: 'brushedWalls', label: 'Paredes cepilladas' },
    { key: 'vacuumedPool', label: 'Piscina aspirada' },
    { key: 'cleanedSkimmer', label: 'Skimmer limpio' },
    { key: 'checkedEquipment', label: 'Equipo revisado' },
    { key: 'backwashedFilter', label: 'Filtro lavado' },
    { key: 'emptiedPumpBasket', label: 'Cesta de bomba vaciada' },
  ];

  if (!service) {
    return (
      <TechnicianLayout title="Cargando..." showBack>
        <div className="p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-gray-200 rounded-xl" />
            <div className="h-48 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </TechnicianLayout>
    );
  }

  return (
    <TechnicianLayout title={service.pool_name} showBack>
      <div className="p-4 space-y-4 pb-24">
        {/* Pool Info */}
        <Card>
          <h3 className="font-semibold text-gray-900">{service.client_name}</h3>
          <p className="text-sm text-gray-500">
            {service.volume_gallons?.toLocaleString()} galones
            {service.has_salt_system && ' • Sistema de sal'}
          </p>
        </Card>

        {/* Start Button (if pending) */}
        {service.status === 'pending' && (
          <Button
            className="w-full"
            size="lg"
            onClick={startService}
            loading={loading}
            icon={<PlayIcon className="h-5 w-5" />}
          >
            Iniciar Servicio
          </Button>
        )}

        {/* Service Form (if in progress) */}
        {service.status === 'in_progress' && (
          <>
            {/* Water Readings */}
            <Card>
              <CardHeader title="Lecturas de Agua" />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="pH"
                  type="number"
                  step="0.1"
                  placeholder="7.2"
                  value={formData.phLevel}
                  onChange={(e) => setFormData({ ...formData, phLevel: e.target.value })}
                />
                <Input
                  label="Cloro (ppm)"
                  type="number"
                  step="0.1"
                  placeholder="2.0"
                  value={formData.chlorineLevel}
                  onChange={(e) => setFormData({ ...formData, chlorineLevel: e.target.value })}
                />
                <Input
                  label="Alcalinidad"
                  type="number"
                  placeholder="100"
                  value={formData.alkalinity}
                  onChange={(e) => setFormData({ ...formData, alkalinity: e.target.value })}
                />
                {service.has_salt_system && (
                  <Input
                    label="Sal (ppm)"
                    type="number"
                    placeholder="3200"
                    value={formData.saltLevel}
                    onChange={(e) => setFormData({ ...formData, saltLevel: e.target.value })}
                  />
                )}
              </div>
            </Card>

            {/* Tasks */}
            <Card>
              <CardHeader title="Tareas Completadas" />
              <div className="space-y-2">
                {tasks.map((task) => (
                  <label
                    key={task.key}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData[task.key as keyof typeof formData] as boolean}
                      onChange={() => handleTaskToggle(task.key)}
                      className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-gray-700">{task.label}</span>
                  </label>
                ))}
              </div>
            </Card>

            {/* Chemicals */}
            <Card>
              <CardHeader title="Químicos Utilizados" />
              <div className="space-y-3">
                {chemicalsData?.chemicals?.map((chemical: Chemical) => (
                  <div key={chemical.id} className="flex items-center gap-3">
                    <span className="flex-1 text-gray-700">{chemical.name}</span>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="0"
                      className="w-24"
                      value={formData.chemicals[chemical.id] || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          chemicals: {
                            ...formData.chemicals,
                            [chemical.id]: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                    />
                    <span className="text-gray-500 text-sm w-10">{chemical.unit}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader title="Notas" />
              <textarea
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                rows={3}
                placeholder="Observaciones del servicio..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </Card>

            {/* Complete Button */}
            <div className="fixed bottom-20 left-0 right-0 p-4 bg-white border-t border-gray-200">
              <Button
                className="w-full"
                size="lg"
                variant="success"
                onClick={completeService}
                loading={loading}
                icon={<CheckIcon className="h-5 w-5" />}
              >
                Completar Servicio
              </Button>
            </div>
          </>
        )}

        {/* Completed Service Summary */}
        {service.status === 'completed' && (
          <Card>
            <CardHeader title="Servicio Completado" />
            <div className="space-y-2 text-sm">
              <p><span className="text-gray-500">pH:</span> {service.ph_level?.toFixed(1) || '-'}</p>
              <p><span className="text-gray-500">Cloro:</span> {service.chlorine_level?.toFixed(1) || '-'} ppm</p>
              <p><span className="text-gray-500">Duración:</span> {service.duration_minutes || '-'} min</p>
              {service.notes && (
                <p><span className="text-gray-500">Notas:</span> {service.notes}</p>
              )}
            </div>
          </Card>
        )}
      </div>
    </TechnicianLayout>
  );
}
