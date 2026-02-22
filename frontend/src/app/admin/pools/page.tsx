'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { fetcher } from '@/lib/api';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import {
  PlusIcon,
  PencilIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';

interface Pool {
  id: string;
  name: string;
  client_name: string;
  client_phone: string;
  pool_type: string;
  volume_gallons: number;
  service_day: string;
  monthly_rate: number;
  has_spa: boolean;
  has_heater: boolean;
  has_salt_system: boolean;
  is_active: boolean;
  last_service_date: string;
}

interface PoolForm {
  clientId: string;
  name: string;
  poolType: string;
  volumeGallons: number;
  serviceDay: string;
  monthlyRate: number;
  hasSpa: boolean;
  hasHeater: boolean;
  hasSaltSystem: boolean;
  address: string;
  notes: string;
}

const SERVICE_DAYS = [
  { value: 'Monday', label: 'Lunes' },
  { value: 'Tuesday', label: 'Martes' },
  { value: 'Wednesday', label: 'Miércoles' },
  { value: 'Thursday', label: 'Jueves' },
  { value: 'Friday', label: 'Viernes' },
  { value: 'Saturday', label: 'Sábado' },
];

const POOL_TYPES = [
  { value: 'residential', label: 'Residencial' },
  { value: 'commercial', label: 'Comercial' },
  { value: 'community', label: 'Comunitaria' },
];

export default function PoolsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPool, setEditingPool] = useState<Pool | null>(null);
  const [filterDay, setFilterDay] = useState('');

  const { data, mutate } = useSWR(`/pools${filterDay ? `?serviceDay=${filterDay}` : ''}`, fetcher);
  const { data: clientsData } = useSWR('/clients?active=true', fetcher);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PoolForm>();

  const openModal = (pool?: Pool) => {
    if (pool) {
      setEditingPool(pool);
      reset({
        name: pool.name,
        poolType: pool.pool_type,
        volumeGallons: pool.volume_gallons,
        serviceDay: pool.service_day,
        monthlyRate: pool.monthly_rate,
        hasSpa: pool.has_spa,
        hasHeater: pool.has_heater,
        hasSaltSystem: pool.has_salt_system,
      });
    } else {
      setEditingPool(null);
      reset({});
    }
    setIsModalOpen(true);
  };

  const onSubmit = async (formData: PoolForm) => {
    try {
      if (editingPool) {
        await api.put(`/pools/${editingPool.id}`, formData);
        toast.success('Piscina actualizada');
      } else {
        await api.post('/pools', formData);
        toast.success('Piscina creada');
      }
      mutate();
      setIsModalOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al guardar');
    }
  };

  const dayLabels: Record<string, string> = {
    Monday: 'Lunes', Tuesday: 'Martes', Wednesday: 'Miércoles',
    Thursday: 'Jueves', Friday: 'Viernes', Saturday: 'Sábado', Sunday: 'Domingo'
  };

  return (
    <AdminLayout title="Piscinas">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
        <div className="flex gap-2">
          <Button
            variant={filterDay === '' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setFilterDay('')}
          >
            Todas
          </Button>
          {SERVICE_DAYS.map((day) => (
            <Button
              key={day.value}
              variant={filterDay === day.value ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFilterDay(day.value)}
            >
              {day.label}
            </Button>
          ))}
        </div>
        <Button onClick={() => openModal()} icon={<PlusIcon className="h-5 w-5" />}>
          Nueva Piscina
        </Button>
      </div>

      {/* Pool Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.pools?.map((pool: Pool) => (
          <Card key={pool.id} hover onClick={() => openModal(pool)}>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-gray-900">{pool.name}</h3>
                <p className="text-sm text-gray-500">{pool.client_name}</p>
              </div>
              <Badge variant={pool.is_active ? 'success' : 'default'}>
                {pool.is_active ? 'Activa' : 'Inactiva'}
              </Badge>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <CalendarDaysIcon className="h-4 w-4" />
                <span>{dayLabels[pool.service_day] || pool.service_day}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <CurrencyDollarIcon className="h-4 w-4" />
                <span>${Number(pool.monthly_rate || 0).toFixed(2)}/mes</span>
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              {pool.has_spa && <Badge variant="info" size="sm">Spa</Badge>}
              {pool.has_heater && <Badge variant="warning" size="sm">Calentador</Badge>}
              {pool.has_salt_system && <Badge variant="primary" size="sm">Sal</Badge>}
            </div>

            {pool.volume_gallons && (
              <p className="mt-2 text-xs text-gray-400">
                {pool.volume_gallons.toLocaleString()} galones
              </p>
            )}
          </Card>
        ))}
      </div>

      {data?.pools?.length === 0 && (
        <Card className="text-center py-12">
          <p className="text-gray-500">No hay piscinas registradas</p>
          <Button className="mt-4" onClick={() => openModal()}>
            Crear primera piscina
          </Button>
        </Card>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPool ? 'Editar Piscina' : 'Nueva Piscina'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {!editingPool && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                {...register('clientId', { required: 'Selecciona un cliente' })}
              >
                <option value="">Seleccionar cliente...</option>
                {clientsData?.clients?.map((client: any) => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </div>
          )}

          <Input
            label="Nombre"
            placeholder="Piscina Principal"
            error={errors.name?.message}
            {...register('name', { required: 'El nombre es requerido' })}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                {...register('poolType')}
              >
                {POOL_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Día de Servicio</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                {...register('serviceDay')}
              >
                {SERVICE_DAYS.map((day) => (
                  <option key={day.value} value={day.value}>{day.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Volumen (galones)"
              type="number"
              {...register('volumeGallons')}
            />
            <Input
              label="Tarifa mensual ($)"
              type="number"
              step="0.01"
              {...register('monthlyRate')}
            />
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2">
              <input type="checkbox" {...register('hasSpa')} className="rounded" />
              <span>Tiene Spa</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" {...register('hasHeater')} className="rounded" />
              <span>Calentador</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" {...register('hasSaltSystem')} className="rounded" />
              <span>Sistema de Sal</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {editingPool ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}
