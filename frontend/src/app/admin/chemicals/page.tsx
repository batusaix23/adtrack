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
  BeakerIcon,
} from '@heroicons/react/24/outline';

interface Chemical {
  id: string;
  name: string;
  unit: string;
  cost_per_unit: number;
  default_dosage: number;
  category: string;
  is_active: boolean;
  stock_quantity: number;
}

interface ChemicalForm {
  name: string;
  unit: string;
  costPerUnit: number;
  defaultDosage: number;
  category: string;
}

const CATEGORIES = [
  { value: 'sanitizer', label: 'Sanitizante' },
  { value: 'balancer', label: 'Balanceador' },
  { value: 'shock', label: 'Shock' },
  { value: 'algaecide', label: 'Algicida' },
  { value: 'clarifier', label: 'Clarificador' },
  { value: 'stabilizer', label: 'Estabilizador' },
  { value: 'other', label: 'Otro' },
];

const UNITS = [
  { value: 'lb', label: 'Libras (lb)' },
  { value: 'oz', label: 'Onzas (oz)' },
  { value: 'gal', label: 'Galones (gal)' },
  { value: 'qt', label: 'Cuartos (qt)' },
  { value: 'kg', label: 'Kilogramos (kg)' },
  { value: 'l', label: 'Litros (L)' },
];

export default function ChemicalsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChemical, setEditingChemical] = useState<Chemical | null>(null);

  const { data, mutate } = useSWR('/chemicals', fetcher);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ChemicalForm>();

  const openModal = (chemical?: Chemical) => {
    if (chemical) {
      setEditingChemical(chemical);
      reset({
        name: chemical.name,
        unit: chemical.unit,
        costPerUnit: chemical.cost_per_unit,
        defaultDosage: chemical.default_dosage,
        category: chemical.category,
      });
    } else {
      setEditingChemical(null);
      reset({});
    }
    setIsModalOpen(true);
  };

  const onSubmit = async (formData: ChemicalForm) => {
    try {
      if (editingChemical) {
        await api.put(`/chemicals/${editingChemical.id}`, formData);
        toast.success('Químico actualizado');
      } else {
        await api.post('/chemicals', formData);
        toast.success('Químico creado');
      }
      mutate();
      setIsModalOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al guardar');
    }
  };

  const categoryLabels: Record<string, string> = {
    sanitizer: 'Sanitizante',
    balancer: 'Balanceador',
    shock: 'Shock',
    algaecide: 'Algicida',
    clarifier: 'Clarificador',
    stabilizer: 'Estabilizador',
    other: 'Otro',
  };

  // Group chemicals by category
  const groupedChemicals = data?.chemicals?.reduce((acc: Record<string, Chemical[]>, chem: Chemical) => {
    const cat = chem.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(chem);
    return acc;
  }, {}) || {};

  return (
    <AdminLayout title="Químicos">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <p className="text-gray-600">
          {data?.chemicals?.length || 0} químicos registrados
        </p>
        <Button onClick={() => openModal()} icon={<PlusIcon className="h-5 w-5" />}>
          Nuevo Químico
        </Button>
      </div>

      {/* Chemicals by Category */}
      {Object.entries(groupedChemicals).map(([category, chemicals]) => (
        <div key={category} className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            {categoryLabels[category] || category}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(chemicals as Chemical[]).map((chemical) => (
              <Card
                key={chemical.id}
                hover
                onClick={() => openModal(chemical)}
                className="cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary-100 rounded-lg">
                    <BeakerIcon className="h-6 w-6 text-primary-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">{chemical.name}</h4>
                      {!chemical.is_active && (
                        <Badge variant="default" size="sm">Inactivo</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{chemical.unit}</p>
                    <div className="mt-2 flex justify-between text-sm">
                      <span className="text-gray-600">
                        ${Number(chemical.cost_per_unit || 0).toFixed(2)}/{chemical.unit}
                      </span>
                      <span className={`font-medium ${
                        (Number(chemical.stock_quantity) || 0) <= 5 ? 'text-red-600' : 'text-gray-900'
                      }`}>
                        Stock: {Number(chemical.stock_quantity) || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {data?.chemicals?.length === 0 && (
        <Card className="text-center py-12">
          <BeakerIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No hay químicos registrados</p>
          <Button className="mt-4" onClick={() => openModal()}>
            Agregar primer químico
          </Button>
        </Card>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingChemical ? 'Editar Químico' : 'Nuevo Químico'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Nombre"
            placeholder="Cloro Granulado"
            error={errors.name?.message}
            {...register('name', { required: 'El nombre es requerido' })}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                {...register('unit', { required: 'Selecciona una unidad' })}
              >
                <option value="">Seleccionar...</option>
                {UNITS.map((unit) => (
                  <option key={unit.value} value={unit.value}>{unit.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                {...register('category')}
              >
                <option value="">Seleccionar...</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Costo por unidad ($)"
              type="number"
              step="0.01"
              {...register('costPerUnit')}
            />
            <Input
              label="Dosis predeterminada"
              type="number"
              step="0.1"
              {...register('defaultDosage')}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {editingChemical ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}
