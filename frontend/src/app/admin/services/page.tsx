'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/Badge';
import { fetcher } from '@/lib/api';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import {
  PlusIcon,
  FunnelIcon,
  EyeIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';

interface Service {
  id: string;
  pool_name: string;
  client_name: string;
  technician_name: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  ph_level: number;
  chlorine_level: number;
  duration_minutes: number;
}

interface ServiceForm {
  poolId: string;
  technicianId: string;
  scheduledDate: string;
  scheduledTime: string;
}

export default function ServicesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: '',
  });

  const queryParams = new URLSearchParams({
    startDate: filters.startDate,
    endDate: filters.endDate,
    ...(filters.status && { status: filters.status }),
  }).toString();

  const { data, mutate } = useSWR(`/services?${queryParams}`, fetcher);
  const { data: poolsData } = useSWR('/pools?active=true', fetcher);
  const { data: techniciansData } = useSWR('/users/list/technicians', fetcher);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ServiceForm>();

  const onSubmit = async (formData: ServiceForm) => {
    try {
      await api.post('/services', formData);
      toast.success('Servicio programado');
      mutate();
      setIsModalOpen(false);
      reset();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al programar');
    }
  };

  const cancelService = async (id: string) => {
    if (!confirm('¿Cancelar este servicio?')) return;
    try {
      await api.post(`/services/${id}/cancel`, { reason: 'Cancelado por admin' });
      toast.success('Servicio cancelado');
      mutate();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error');
    }
  };

  return (
    <AdminLayout title="Servicios">
      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
            <Input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
            <Input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <select
              className="px-3 py-2 border border-gray-300 rounded-lg"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">Todos</option>
              <option value="pending">Pendiente</option>
              <option value="in_progress">En Progreso</option>
              <option value="completed">Completado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>
          <div className="flex-1" />
          <Button onClick={() => setIsModalOpen(true)} icon={<PlusIcon className="h-5 w-5" />}>
            Nuevo Servicio
          </Button>
        </div>
      </Card>

      {/* Services Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Piscina</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Técnico</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">pH</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Cloro</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data?.services?.map((service: Service) => (
                <tr key={service.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium">
                      {new Date(service.scheduled_date).toLocaleDateString('es-ES')}
                    </div>
                    {service.scheduled_time && (
                      <div className="text-sm text-gray-500">{service.scheduled_time}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">{service.pool_name}</td>
                  <td className="px-6 py-4 text-gray-500">{service.client_name}</td>
                  <td className="px-6 py-4">{service.technician_name}</td>
                  <td className="px-6 py-4 text-center">
                    <StatusBadge status={service.status} />
                  </td>
                  <td className="px-6 py-4 text-center">
                    {service.ph_level?.toFixed(1) || '-'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {service.chlorine_level?.toFixed(1) || '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" icon={<EyeIcon className="h-4 w-4" />} />
                      {service.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => cancelService(service.id)}
                          className="text-red-600"
                        >
                          Cancelar
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data?.services?.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No hay servicios en el período seleccionado
          </div>
        )}
      </Card>

      {/* Create Service Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Programar Servicio"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Piscina</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              {...register('poolId', { required: 'Selecciona una piscina' })}
            >
              <option value="">Seleccionar...</option>
              {poolsData?.pools?.map((pool: any) => (
                <option key={pool.id} value={pool.id}>
                  {pool.name} - {pool.client_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Técnico</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              {...register('technicianId', { required: 'Selecciona un técnico' })}
            >
              <option value="">Seleccionar...</option>
              {techniciansData?.technicians?.map((tech: any) => (
                <option key={tech.id} value={tech.id}>
                  {tech.first_name} {tech.last_name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Fecha"
              type="date"
              {...register('scheduledDate', { required: 'Fecha requerida' })}
            />
            <Input
              label="Hora"
              type="time"
              {...register('scheduledTime')}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Programar</Button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}
