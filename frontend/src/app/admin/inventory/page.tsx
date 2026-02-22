'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { fetcher } from '@/lib/api';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { useForm } from 'react-hook-form';

interface InventoryItem {
  id: string;
  chemical_id: string;
  name: string;
  unit: string;
  category: string;
  quantity: number;
  min_stock_level: number;
  cost_per_unit: number;
  is_low_stock: boolean;
}

interface AddStockForm {
  quantity: number;
  unitCost: number;
  notes: string;
}

export default function InventoryPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  const { data, error, mutate } = useSWR(
    `/inventory${showLowStockOnly ? '?lowStock=true' : ''}`,
    fetcher
  );
  const { register, handleSubmit, reset, formState: { errors } } = useForm<AddStockForm>();

  const openAddModal = (item: InventoryItem) => {
    setSelectedItem(item);
    reset({ quantity: 0, unitCost: item.cost_per_unit || 0, notes: '' });
    setIsAddModalOpen(true);
  };

  const onAddStock = async (formData: AddStockForm) => {
    if (!selectedItem) return;

    try {
      await api.post(`/inventory/${selectedItem.id}/add`, formData);
      toast.success('Stock agregado');
      mutate();
      setIsAddModalOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al agregar stock');
    }
  };

  const lowStockCount = data?.inventory?.filter((i: InventoryItem) => i.is_low_stock).length || 0;

  return (
    <AdminLayout title="Inventario">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Productos</p>
              <p className="text-2xl font-bold">{data?.inventory?.length || 0}</p>
            </div>
          </div>
        </Card>

        <Card className={lowStockCount > 0 ? 'border-l-4 border-l-red-500' : ''}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Stock Bajo</p>
              <p className="text-2xl font-bold text-red-600">{lowStockCount}</p>
            </div>
            {lowStockCount > 0 && (
              <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Valor Total</p>
              <p className="text-2xl font-bold">
                ${(data?.inventory?.reduce((sum: number, item: InventoryItem) =>
                  sum + (Number(item.quantity) * Number(item.cost_per_unit || 0)), 0
                ) || 0).toFixed(2)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-4 mb-6">
        <Button
          variant={showLowStockOnly ? 'primary' : 'secondary'}
          onClick={() => setShowLowStockOnly(!showLowStockOnly)}
          icon={<ExclamationTriangleIcon className="h-5 w-5" />}
        >
          Solo stock bajo
        </Button>
      </div>

      {/* Inventory Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Producto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Categoría
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Cantidad
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Mínimo
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Costo/Unidad
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Valor Total
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Estado
                </th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data?.inventory?.map((item: InventoryItem) => (
                <tr key={item.id} className={item.is_low_stock ? 'bg-red-50' : ''}>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{item.name}</div>
                    <div className="text-sm text-gray-500">{item.unit}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-500 capitalize">
                    {item.category || '-'}
                  </td>
                  <td className="px-6 py-4 text-right font-medium">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-500">
                    {item.min_stock_level} {item.unit}
                  </td>
                  <td className="px-6 py-4 text-right">
                    ${Number(item.cost_per_unit || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right font-medium">
                    ${(Number(item.quantity || 0) * Number(item.cost_per_unit || 0)).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {item.is_low_stock ? (
                      <Badge variant="danger">Stock Bajo</Badge>
                    ) : (
                      <Badge variant="success">Normal</Badge>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      size="sm"
                      onClick={() => openAddModal(item)}
                      icon={<PlusIcon className="h-4 w-4" />}
                    >
                      Agregar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Stock Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={`Agregar Stock: ${selectedItem?.name}`}
      >
        <form onSubmit={handleSubmit(onAddStock)} className="space-y-4">
          <Input
            label={`Cantidad (${selectedItem?.unit})`}
            type="number"
            step="0.01"
            error={errors.quantity?.message}
            {...register('quantity', {
              required: 'La cantidad es requerida',
              min: { value: 0.01, message: 'Debe ser mayor a 0' },
            })}
          />

          <Input
            label="Costo por unidad ($)"
            type="number"
            step="0.01"
            {...register('unitCost')}
          />

          <Input
            label="Notas (opcional)"
            {...register('notes')}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsAddModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              Agregar Stock
            </Button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}
