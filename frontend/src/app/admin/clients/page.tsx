'use client';

import React, { useState, useRef } from 'react';
import useSWR from 'swr';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { fetcher } from '@/lib/api';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  PhoneIcon,
  EnvelopeIcon,
  ArrowUpTrayIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';
import { useForm } from 'react-hook-form';

interface Client {
  id: string;
  name: string;
  last_name: string;
  company_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  is_active: boolean;
  pool_count: number;
  total_services: number;
}

interface ClientForm {
  name: string;
  lastName: string;
  companyName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  notes: string;
  isActive: boolean;
}

export default function ClientsPage() {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeParam = activeFilter === 'all' ? '' : `&active=${activeFilter === 'active'}`;
  const { data, error, mutate } = useSWR(`/clients?search=${search}${activeParam}`, fetcher);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ClientForm>();

  const openModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      reset({
        name: client.name,
        lastName: client.last_name || '',
        companyName: client.company_name || '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        city: client.city || '',
        state: client.state || '',
        isActive: client.is_active,
      });
    } else {
      setEditingClient(null);
      reset({ isActive: true });
    }
    setIsModalOpen(true);
  };

  const onSubmit = async (formData: ClientForm) => {
    try {
      if (editingClient) {
        await api.put(`/clients/${editingClient.id}`, formData);
        toast.success(t('common.update') + ' - OK');
      } else {
        await api.post('/clients', formData);
        toast.success(t('common.create') + ' - OK');
      }
      mutate();
      setIsModalOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error');
    }
  };

  const deleteClient = async (id: string) => {
    if (!confirm(t('common.confirm') + '?')) return;

    try {
      await api.delete(`/clients/${id}`);
      toast.success(t('common.delete') + ' - OK');
      mutate();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setImportFile(file);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const response = await api.post('/clients/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success(`${response.data.imported} ${t('clients.importSuccess')}`);
      mutate();
      setIsImportModalOpen(false);
      setImportFile(null);
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('clients.importError'));
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = 'name,email,phone,address,city,state,zip_code\nJohn Doe,john@example.com,555-0100,123 Main St,Miami,FL,33101\nJane Smith,jane@example.com,555-0101,456 Oak Ave,Orlando,FL,32801';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clients_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout title={t('clients.title')}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('clients.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          {/* Filter buttons */}
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeFilter === 'all'
                  ? 'bg-primary-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t('common.all')}
            </button>
            <button
              onClick={() => setActiveFilter('active')}
              className={`px-4 py-2 text-sm font-medium border-l border-gray-300 transition-colors ${
                activeFilter === 'active'
                  ? 'bg-green-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t('clients.active')}
            </button>
            <button
              onClick={() => setActiveFilter('inactive')}
              className={`px-4 py-2 text-sm font-medium border-l border-gray-300 transition-colors ${
                activeFilter === 'inactive'
                  ? 'bg-gray-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t('clients.inactive')}
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setIsImportModalOpen(true)}
            icon={<ArrowUpTrayIcon className="h-5 w-5" />}
          >
            {t('clients.import')}
          </Button>
          <Button onClick={() => openModal()} icon={<PlusIcon className="h-5 w-5" />}>
            {t('clients.new')}
          </Button>
        </div>
      </div>

      {/* Client List */}
      <div className="grid gap-4">
        {data?.clients?.map((client: Client) => (
          <Card key={client.id} className="hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {client.name}{client.last_name ? ` ${client.last_name}` : ''}
                  </h3>
                  <Badge variant={client.is_active ? 'success' : 'default'}>
                    {client.is_active ? t('clients.active') : t('clients.inactive')}
                  </Badge>
                </div>
                {client.company_name && (
                  <p className="text-sm text-primary-600 font-medium">{client.company_name}</p>
                )}

                <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
                  {client.phone && (
                    <span className="flex items-center gap-1">
                      <PhoneIcon className="h-4 w-4" />
                      {client.phone}
                    </span>
                  )}
                  {client.email && (
                    <span className="flex items-center gap-1">
                      <EnvelopeIcon className="h-4 w-4" />
                      {client.email}
                    </span>
                  )}
                </div>

                {client.address && (
                  <p className="mt-1 text-sm text-gray-500">
                    {client.address}{client.city && `, ${client.city}`}{client.state && `, ${client.state}`}
                  </p>
                )}

                <div className="mt-3 flex gap-4 text-sm">
                  <span className="text-gray-500">
                    <span className="font-medium text-gray-900">{client.pool_count || 0}</span> {t('clients.pools')}
                  </span>
                  <span className="text-gray-500">
                    <span className="font-medium text-gray-900">{client.total_services || 0}</span> {t('clients.services')}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openModal(client)}
                  icon={<PencilIcon className="h-4 w-4" />}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteClient(client.id)}
                  icon={<TrashIcon className="h-4 w-4 text-red-500" />}
                />
              </div>
            </div>
          </Card>
        ))}

        {data?.clients?.length === 0 && (
          <Card className="text-center py-12">
            <p className="text-gray-500">{t('clients.noClients')}</p>
            <Button className="mt-4" onClick={() => openModal()}>
              {t('clients.createFirst')}
            </Button>
          </Card>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingClient ? t('clients.edit') : t('clients.new')}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('clients.name')}
              error={errors.name?.message}
              {...register('name', { required: t('clients.name') + ' required' })}
            />
            <Input
              label={t('clients.lastName')}
              {...register('lastName')}
            />
          </div>

          <Input
            label={t('clients.companyName')}
            placeholder="Nombre de la empresa (opcional)"
            {...register('companyName')}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('clients.email')}
              type="email"
              {...register('email')}
            />
            <Input
              label={t('clients.phone')}
              {...register('phone')}
            />
          </div>

          <Input
            label={t('clients.address')}
            {...register('address')}
          />

          <div className="grid grid-cols-3 gap-4">
            <Input
              label={t('clients.city')}
              {...register('city')}
            />
            <Input
              label={t('clients.state')}
              {...register('state')}
            />
            <Input
              label={t('clients.zipCode')}
              {...register('zipCode')}
            />
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="font-medium text-gray-900">{t('clients.status')}</label>
              <p className="text-sm text-gray-500">{t('clients.statusDescription')}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                {...register('isActive')}
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
              <span className="ms-3 text-sm font-medium text-gray-700">
                {t('clients.active')}
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit">
              {editingClient ? t('common.update') : t('common.create')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Import Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => { setIsImportModalOpen(false); setImportFile(null); }}
        title={t('clients.importTitle')}
        size="lg"
      >
        <div className="space-y-6">
          <p className="text-gray-600">{t('clients.importDescription')}</p>

          {/* Download Template */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">{t('clients.downloadTemplate')}</p>
              <p className="text-sm text-gray-500">CSV format</p>
            </div>
            <Button
              variant="secondary"
              onClick={downloadTemplate}
              icon={<DocumentArrowDownIcon className="h-5 w-5" />}
            >
              Download
            </Button>
          </div>

          {/* File Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              importFile ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".csv,.xlsx,.xls"
              className="hidden"
            />

            {importFile ? (
              <div>
                <DocumentArrowDownIcon className="h-12 w-12 text-primary-500 mx-auto mb-2" />
                <p className="font-medium text-gray-900">{importFile.name}</p>
                <p className="text-sm text-gray-500">{(importFile.size / 1024).toFixed(1)} KB</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => setImportFile(null)}
                >
                  {t('common.cancel')}
                </Button>
              </div>
            ) : (
              <div>
                <ArrowUpTrayIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <Button
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {t('clients.selectFile')}
                </Button>
                <p className="text-sm text-gray-500 mt-2">{t('clients.dragDrop')}</p>
                <p className="text-xs text-gray-400 mt-1">{t('clients.supportedFormats')}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => { setIsImportModalOpen(false); setImportFile(null); }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleImport}
              disabled={!importFile}
              loading={importing}
              icon={<ArrowUpTrayIcon className="h-5 w-5" />}
            >
              {importing ? t('clients.importing') : t('common.import')}
            </Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}
