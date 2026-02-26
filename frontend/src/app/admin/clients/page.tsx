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
  ListBulletIcon,
  Squares2X2Icon,
  TableCellsIcon,
  KeyIcon,
  UserCircleIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';

interface Client {
  id: string;
  name: string;
  first_name: string;
  last_name: string;
  company_name: string;
  display_name: string;
  salutation: string;
  email: string;
  phone: string;
  mobile: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  notes: string;
  is_active: boolean;
  pool_count: number;
  total_services: number;
  service_day: string;
  service_frequency: string;
  service_days: string[];
  client_type: string;
  portal_enabled: boolean;
  portal_email: string;
  monthly_service_cost: number;
  payment_terms: string;
  assigned_technician_id: string;
}

interface ClientForm {
  // Basic Info
  salutation: string;
  firstName: string;
  lastName: string;
  companyName: string;
  displayName: string;
  // Contact
  email: string;
  phone: string;
  mobile: string;
  website: string;
  // Service Address
  address: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
  // Billing Address
  billingAddress: string;
  billingCity: string;
  billingState: string;
  billingZip: string;
  billingCountry: string;
  billingEmail: string;
  // Shipping Address
  shippingAddress: string;
  shippingCity: string;
  shippingState: string;
  shippingZip: string;
  shippingCountry: string;
  // Service
  clientType: string;
  serviceFrequency: string;
  serviceDays: string[];
  preferredTime: string;
  assignedTechnicianId: string;
  gateCode: string;
  accessNotes: string;
  // Billing
  monthlyServiceCost: string;
  stabilizerCost: string;
  stabilizerFrequencyMonths: string;
  paymentTerms: string;
  taxId: string;
  autopayEnabled: boolean;
  portalEnabled: boolean;
  // Notes
  notes: string;
  internalNotes: string;
  isActive: boolean;
}

type ViewMode = 'list' | 'grid' | 'table';
type FormTab = 'info' | 'addresses' | 'service' | 'billing';

export default function ClientsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPortalModalOpen, setIsPortalModalOpen] = useState(false);
  const [portalClient, setPortalClient] = useState<Client | null>(null);
  const [portalPassword, setPortalPassword] = useState('');
  const [portalEmail, setPortalEmail] = useState('');
  const [activeTab, setActiveTab] = useState<FormTab>('info');
  const [copyBillingToShipping, setCopyBillingToShipping] = useState(false);

  const activeParam = activeFilter === 'all' ? '' : `&active=${activeFilter === 'active'}`;
  const { data, error, mutate } = useSWR(`/clients?search=${search}${activeParam}`, fetcher);
  const { data: techniciansData } = useSWR('/technicians', fetcher);
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<ClientForm>();

  const watchFirstName = watch('firstName');
  const watchLastName = watch('lastName');
  const watchCompanyName = watch('companyName');

  // Auto-generate display name
  React.useEffect(() => {
    if (watchCompanyName) {
      setValue('displayName', watchCompanyName);
    } else if (watchFirstName || watchLastName) {
      setValue('displayName', `${watchFirstName || ''} ${watchLastName || ''}`.trim());
    }
  }, [watchFirstName, watchLastName, watchCompanyName, setValue]);

  const openModal = (client?: Client) => {
    setActiveTab('info');
    if (client) {
      setEditingClient(client);
      reset({
        salutation: client.salutation || '',
        firstName: client.first_name || client.name || '',
        lastName: client.last_name || '',
        companyName: client.company_name || '',
        displayName: client.display_name || '',
        email: client.email || '',
        phone: client.phone || '',
        mobile: client.mobile || '',
        website: '',
        address: client.address || '',
        addressLine2: '',
        city: client.city || '',
        state: client.state || '',
        zipCode: client.zip_code || '',
        billingAddress: '',
        billingCity: '',
        billingState: '',
        billingZip: '',
        billingCountry: 'Puerto Rico',
        billingEmail: '',
        shippingAddress: '',
        shippingCity: '',
        shippingState: '',
        shippingZip: '',
        shippingCountry: 'Puerto Rico',
        clientType: client.client_type || 'residential',
        serviceFrequency: client.service_frequency || '1x_week',
        serviceDays: client.service_days || [],
        preferredTime: '',
        assignedTechnicianId: client.assigned_technician_id || '',
        gateCode: '',
        accessNotes: '',
        monthlyServiceCost: client.monthly_service_cost?.toString() || '',
        stabilizerCost: '',
        stabilizerFrequencyMonths: '3',
        paymentTerms: client.payment_terms || 'net_30',
        taxId: '',
        autopayEnabled: false,
        portalEnabled: client.portal_enabled || false,
        notes: client.notes || '',
        internalNotes: '',
        isActive: client.is_active,
      });
    } else {
      setEditingClient(null);
      reset({
        salutation: '',
        isActive: true,
        serviceFrequency: '1x_week',
        clientType: 'residential',
        serviceDays: [],
        paymentTerms: 'net_30',
        stabilizerFrequencyMonths: '3',
        billingCountry: 'Puerto Rico',
        shippingCountry: 'Puerto Rico',
      });
    }
    setIsModalOpen(true);
  };

  const onSubmit = async (formData: ClientForm) => {
    try {
      if (editingClient) {
        await api.put(`/clients/${editingClient.id}`, formData);
        toast.success('Cliente actualizado');
      } else {
        await api.post('/clients', formData);
        toast.success('Cliente creado');
      }
      mutate();
      setIsModalOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error');
    }
  };

  const deleteClient = async (id: string) => {
    if (!confirm('¿Eliminar este cliente?')) return;

    try {
      await api.delete(`/clients/${id}`);
      toast.success('Cliente eliminado');
      mutate();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error');
    }
  };

  const openPortalModal = (client: Client) => {
    setPortalClient(client);
    setPortalEmail(client.portal_email || client.email || '');
    setPortalPassword('');
    setIsPortalModalOpen(true);
  };

  const handleEnablePortal = async () => {
    if (!portalClient || !portalPassword) {
      toast.error('Password is required');
      return;
    }

    try {
      await api.post(`/portal/admin/enable/${portalClient.id}`, {
        email: portalEmail,
        password: portalPassword,
      });
      toast.success('Portal access enabled!');
      mutate();
      setIsPortalModalOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error');
    }
  };

  const handleDisablePortal = async (clientId: string) => {
    if (!confirm('Disable portal access for this client?')) return;

    try {
      await api.post(`/portal/admin/disable/${clientId}`);
      toast.success('Portal access disabled');
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

      toast.success(`${response.data.imported} clientes importados`);
      mutate();
      setIsImportModalOpen(false);
      setImportFile(null);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error de importación');
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = `name,last_name,company_name,email,phone,address,city,state,zip_code
John,Doe,Doe Enterprises,john@example.com,555-0100,123 Main St,Miami,FL,33101`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clients_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const serviceDaysOptions = [
    { value: 'monday', label: 'L' },
    { value: 'tuesday', label: 'M' },
    { value: 'wednesday', label: 'X' },
    { value: 'thursday', label: 'J' },
    { value: 'friday', label: 'V' },
    { value: 'saturday', label: 'S' },
    { value: 'sunday', label: 'D' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'info':
        return (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 border-b pb-2">Información Básica</h4>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Tratamiento</label>
                <select
                  {...register('salutation')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">-</option>
                  <option value="Sr.">Sr.</option>
                  <option value="Sra.">Sra.</option>
                  <option value="Dr.">Dr.</option>
                  <option value="Dra.">Dra.</option>
                </select>
              </div>
              <div className="col-span-5">
                <Input
                  label="Nombre *"
                  error={errors.firstName?.message}
                  {...register('firstName', { required: 'Nombre requerido' })}
                />
              </div>
              <div className="col-span-5">
                <Input
                  label="Apellido"
                  {...register('lastName')}
                />
              </div>
            </div>

            <Input
              label="Nombre de Empresa"
              placeholder="Opcional"
              {...register('companyName')}
            />

            <Input
              label="Nombre para Mostrar *"
              placeholder="Se genera automáticamente"
              {...register('displayName')}
            />

            <h4 className="font-medium text-gray-900 border-b pb-2 mt-6">Contacto</h4>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Email"
                type="email"
                {...register('email')}
              />
              <Input
                label="Teléfono"
                {...register('phone')}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Móvil"
                {...register('mobile')}
              />
              <Input
                label="Website"
                placeholder="www.ejemplo.com"
                {...register('website')}
              />
            </div>

            <h4 className="font-medium text-gray-900 border-b pb-2 mt-6">Dirección de Servicio</h4>
            <Input
              label="Dirección *"
              {...register('address', { required: 'Dirección requerida' })}
            />
            <Input
              label="Dirección Línea 2"
              placeholder="Apt, Suite, etc."
              {...register('addressLine2')}
            />
            <div className="grid grid-cols-3 gap-4">
              <Input
                label="Ciudad"
                {...register('city')}
              />
              <Input
                label="Estado"
                {...register('state')}
              />
              <Input
                label="Código Postal"
                {...register('zipCode')}
              />
            </div>
          </div>
        );

      case 'addresses':
        return (
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">Dirección de Facturación</h4>
              </div>
              <div className="space-y-4">
                <Input
                  label="Dirección"
                  {...register('billingAddress')}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Ciudad"
                    {...register('billingCity')}
                  />
                  <Input
                    label="Estado"
                    {...register('billingState')}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Código Postal"
                    {...register('billingZip')}
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">País</label>
                    <select
                      {...register('billingCountry')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="Puerto Rico">Puerto Rico</option>
                      <option value="USA">USA</option>
                    </select>
                  </div>
                </div>
                <Input
                  label="Email de Facturación"
                  type="email"
                  placeholder="Si es diferente al email principal"
                  {...register('billingEmail')}
                />
              </div>
            </div>

            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">Dirección de Envío</h4>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={copyBillingToShipping}
                    onChange={(e) => {
                      setCopyBillingToShipping(e.target.checked);
                      if (e.target.checked) {
                        const billing = watch();
                        setValue('shippingAddress', billing.billingAddress);
                        setValue('shippingCity', billing.billingCity);
                        setValue('shippingState', billing.billingState);
                        setValue('shippingZip', billing.billingZip);
                        setValue('shippingCountry', billing.billingCountry);
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                  Copiar de facturación
                </label>
              </div>
              <div className="space-y-4">
                <Input
                  label="Dirección"
                  disabled={copyBillingToShipping}
                  {...register('shippingAddress')}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Ciudad"
                    disabled={copyBillingToShipping}
                    {...register('shippingCity')}
                  />
                  <Input
                    label="Estado"
                    disabled={copyBillingToShipping}
                    {...register('shippingState')}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Código Postal"
                    disabled={copyBillingToShipping}
                    {...register('shippingZip')}
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">País</label>
                    <select
                      {...register('shippingCountry')}
                      disabled={copyBillingToShipping}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
                    >
                      <option value="Puerto Rico">Puerto Rico</option>
                      <option value="USA">USA</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'service':
        return (
          <div className="space-y-6">
            <h4 className="font-medium text-gray-900 border-b pb-2">Configuración de Servicio</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Cliente</label>
                <select
                  {...register('clientType')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="residential">Residencial</option>
                  <option value="commercial">Comercial</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frecuencia</label>
                <select
                  {...register('serviceFrequency')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="1x_week">1x por semana</option>
                  <option value="2x_week">2x por semana</option>
                  <option value="3x_week">3x por semana</option>
                  <option value="biweekly">Quincenal</option>
                  <option value="monthly">Mensual</option>
                  <option value="on_call">A solicitud</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Días de Servicio</label>
              <div className="flex gap-2">
                {serviceDaysOptions.map((day) => (
                  <label
                    key={day.value}
                    className="flex items-center justify-center w-10 h-10 rounded-full border cursor-pointer transition-colors hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      value={day.value}
                      {...register('serviceDays')}
                      className="sr-only peer"
                    />
                    <span className="text-sm font-medium text-gray-600 peer-checked:text-white peer-checked:bg-primary-500 w-full h-full flex items-center justify-center rounded-full">
                      {day.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Técnico Asignado</label>
                <select
                  {...register('assignedTechnicianId')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Sin asignar</option>
                  {techniciansData?.technicians?.map((tech: any) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.first_name} {tech.last_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hora Preferida</label>
                <select
                  {...register('preferredTime')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Sin preferencia</option>
                  <option value="morning">Mañana (8am - 12pm)</option>
                  <option value="afternoon">Tarde (12pm - 5pm)</option>
                  <option value="any">Cualquier hora</option>
                </select>
              </div>
            </div>

            <h4 className="font-medium text-gray-900 border-b pb-2 mt-6">Acceso a Propiedad</h4>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Código de Portón"
                placeholder="1234#"
                {...register('gateCode')}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas de Acceso</label>
                <textarea
                  {...register('accessNotes')}
                  rows={2}
                  placeholder="Instrucciones especiales..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>
        );

      case 'billing':
        return (
          <div className="space-y-6">
            <h4 className="font-medium text-gray-900 border-b pb-2">Tarifas y Facturación</h4>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Costo Mensual de Servicio"
                type="number"
                step="0.01"
                placeholder="$0.00"
                {...register('monthlyServiceCost')}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Términos de Pago</label>
                <select
                  {...register('paymentTerms')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="due_on_receipt">Al recibir</option>
                  <option value="net_15">Net 15</option>
                  <option value="net_30">Net 30</option>
                  <option value="net_45">Net 45</option>
                  <option value="net_60">Net 60</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Costo de Estabilizador"
                type="number"
                step="0.01"
                placeholder="$0.00"
                {...register('stabilizerCost')}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frecuencia Estabilizador</label>
                <select
                  {...register('stabilizerFrequencyMonths')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="1">Cada mes</option>
                  <option value="2">Cada 2 meses</option>
                  <option value="3">Cada 3 meses</option>
                  <option value="6">Cada 6 meses</option>
                </select>
              </div>
            </div>

            <Input
              label="ID Tributario"
              placeholder="EIN o número contributivo"
              {...register('taxId')}
            />

            <div className="flex flex-col gap-4 p-4 bg-gray-50 rounded-lg">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  {...register('autopayEnabled')}
                  className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="font-medium text-gray-900">Autopago habilitado</span>
                  <p className="text-sm text-gray-500">Cobrar automáticamente al método de pago registrado</p>
                </div>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  {...register('portalEnabled')}
                  className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="font-medium text-gray-900">Acceso al portal del cliente</span>
                  <p className="text-sm text-gray-500">Permitir al cliente ver facturas y servicios en línea</p>
                </div>
              </label>
            </div>

            <h4 className="font-medium text-gray-900 border-b pb-2 mt-6">Notas</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas (visibles al cliente)</label>
              <textarea
                {...register('notes')}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas Internas</label>
              <textarea
                {...register('internalNotes')}
                rows={2}
                placeholder="Solo visible para el equipo..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="font-medium text-gray-900">Estado del Cliente</label>
                <p className="text-sm text-gray-500">Clientes inactivos no aparecen en rutas</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  {...register('isActive')}
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                <span className="ms-3 text-sm font-medium text-gray-700">Activo</span>
              </label>
            </div>
          </div>
        );
    }
  };

  return (
    <AdminLayout title="Clientes">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar clientes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeFilter === 'all'
                  ? 'bg-primary-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setActiveFilter('active')}
              className={`px-4 py-2 text-sm font-medium border-l border-gray-300 transition-colors ${
                activeFilter === 'active'
                  ? 'bg-green-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Activos
            </button>
            <button
              onClick={() => setActiveFilter('inactive')}
              className={`px-4 py-2 text-sm font-medium border-l border-gray-300 transition-colors ${
                activeFilter === 'inactive'
                  ? 'bg-gray-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Inactivos
            </button>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-primary-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              title="Lista"
            >
              <ListBulletIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-2 border-l border-gray-300 ${viewMode === 'grid' ? 'bg-primary-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              title="Grid"
            >
              <Squares2X2Icon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-2 border-l border-gray-300 ${viewMode === 'table' ? 'bg-primary-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              title="Tabla"
            >
              <TableCellsIcon className="h-5 w-5" />
            </button>
          </div>

          <Button
            variant="secondary"
            onClick={() => setIsImportModalOpen(true)}
            icon={<ArrowUpTrayIcon className="h-5 w-5" />}
          >
            Importar
          </Button>
          <Button onClick={() => openModal()} icon={<PlusIcon className="h-5 w-5" />}>
            Nuevo Cliente
          </Button>
        </div>
      </div>

      {/* Client List */}
      {viewMode === 'list' && (
        <div className="grid gap-4">
          {data?.clients?.map((client: Client) => (
            <Card key={client.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {client.display_name || `${client.first_name || client.name}${client.last_name ? ` ${client.last_name}` : ''}`}
                    </h3>
                    <Badge variant={client.is_active ? 'success' : 'default'}>
                      {client.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                    {client.client_type === 'commercial' && (
                      <Badge variant="warning">Comercial</Badge>
                    )}
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
                    {client.monthly_service_cost && (
                      <span className="text-green-600 font-medium">
                        ${Number(client.monthly_service_cost).toFixed(2)}/mes
                      </span>
                    )}
                  </div>

                  {client.address && (
                    <p className="mt-1 text-sm text-gray-500">
                      {client.address}{client.city && `, ${client.city}`}{client.state && `, ${client.state}`}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/admin/clients/${client.id}`)}
                    icon={<EyeIcon className="h-4 w-4" />}
                    title="Ver detalles"
                  />
                  {client.portal_enabled ? (
                    <button
                      onClick={() => handleDisablePortal(client.id)}
                      className="p-1 text-green-600 hover:text-green-700"
                      title="Portal habilitado - Click para deshabilitar"
                    >
                      <UserCircleIcon className="h-5 w-5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => openPortalModal(client)}
                      className="p-1 text-gray-400 hover:text-primary-600"
                      title="Habilitar acceso al portal"
                    >
                      <KeyIcon className="h-5 w-5" />
                    </button>
                  )}
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
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.clients?.map((client: Client) => (
            <Card key={client.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push(`/admin/clients/${client.id}`)}>
              <div className="flex justify-between items-start mb-3">
                <Badge variant={client.is_active ? 'success' : 'default'} size="sm">
                  {client.is_active ? 'Activo' : 'Inactivo'}
                </Badge>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => openModal(client)}
                    className="p-1 text-gray-400 hover:text-primary-600"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteClient(client.id)}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-900">
                {client.display_name || `${client.first_name || client.name}${client.last_name ? ` ${client.last_name}` : ''}`}
              </h3>
              {client.company_name && (
                <p className="text-sm text-primary-600 font-medium">{client.company_name}</p>
              )}

              <div className="mt-3 space-y-1 text-sm text-gray-600">
                {client.phone && (
                  <p className="flex items-center gap-2">
                    <PhoneIcon className="h-4 w-4" />
                    {client.phone}
                  </p>
                )}
                {client.email && (
                  <p className="flex items-center gap-2 truncate">
                    <EnvelopeIcon className="h-4 w-4 flex-shrink-0" />
                    {client.email}
                  </p>
                )}
              </div>

              {client.monthly_service_cost && (
                <div className="mt-3 pt-3 border-t">
                  <span className="text-lg font-bold text-green-600">
                    ${Number(client.monthly_service_cost).toFixed(2)}
                  </span>
                  <span className="text-sm text-gray-500">/mes</span>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empresa</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tarifa</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data?.clients?.map((client: Client) => (
                  <tr key={client.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/admin/clients/${client.id}`)}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {client.display_name || `${client.first_name || client.name}${client.last_name ? ` ${client.last_name}` : ''}`}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{client.company_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div>{client.phone || '-'}</div>
                      <div className="text-xs text-gray-400">{client.email}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Badge variant={client.client_type === 'commercial' ? 'warning' : 'default'} size="sm">
                        {client.client_type === 'commercial' ? 'Comercial' : 'Residencial'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-green-600">
                      {client.monthly_service_cost ? `$${Number(client.monthly_service_cost).toFixed(2)}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={client.is_active ? 'success' : 'default'} size="sm">
                        {client.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openModal(client)}
                          className="p-1 text-gray-400 hover:text-primary-600"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteClient(client.id)}
                          className="p-1 text-gray-400 hover:text-red-500"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {data?.clients?.length === 0 && (
        <Card className="text-center py-12">
          <p className="text-gray-500">No hay clientes</p>
          <Button className="mt-4" onClick={() => openModal()}>
            Crear primer cliente
          </Button>
        </Card>
      )}

      {/* Create/Edit Modal with Tabs */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
        size="xl"
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Tab Navigation */}
          <div className="flex border-b mb-4 -mt-2">
            {[
              { id: 'info', label: 'Información' },
              { id: 'addresses', label: 'Direcciones' },
              { id: 'service', label: 'Servicio' },
              { id: 'billing', label: 'Facturación' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as FormTab)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="max-h-[60vh] overflow-y-auto px-1">
            {renderTabContent()}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t mt-4">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {editingClient ? 'Actualizar' : 'Crear Cliente'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Import Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => { setIsImportModalOpen(false); setImportFile(null); }}
        title="Importar Clientes"
        size="lg"
      >
        <div className="space-y-6">
          <p className="text-gray-600">Sube un archivo CSV o Excel con los datos de tus clientes.</p>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Descargar plantilla</p>
              <p className="text-sm text-gray-500">Formato CSV</p>
            </div>
            <Button
              variant="secondary"
              onClick={downloadTemplate}
              icon={<DocumentArrowDownIcon className="h-5 w-5" />}
            >
              Descargar
            </Button>
          </div>

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
                  Cancelar
                </Button>
              </div>
            ) : (
              <div>
                <ArrowUpTrayIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <Button
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Seleccionar archivo
                </Button>
                <p className="text-sm text-gray-500 mt-2">o arrastra y suelta aquí</p>
                <p className="text-xs text-gray-400 mt-1">CSV, XLSX, XLS</p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => { setIsImportModalOpen(false); setImportFile(null); }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleImport}
              disabled={!importFile}
              loading={importing}
              icon={<ArrowUpTrayIcon className="h-5 w-5" />}
            >
              {importing ? 'Importando...' : 'Importar'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Portal Access Modal */}
      <Modal
        isOpen={isPortalModalOpen}
        onClose={() => setIsPortalModalOpen(false)}
        title="Habilitar Acceso al Portal"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>{portalClient?.display_name || `${portalClient?.first_name || portalClient?.name} ${portalClient?.last_name || ''}`}</strong> podrá acceder al portal de clientes para ver su historial de servicios, facturas y equipos.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email del Portal
            </label>
            <input
              type="email"
              value={portalEmail}
              onChange={(e) => setPortalEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="cliente@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña del Portal
            </label>
            <input
              type="password"
              value={portalPassword}
              onChange={(e) => setPortalPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>URL del Portal:</strong><br />
              <code className="text-primary-600">{typeof window !== 'undefined' ? window.location.origin : ''}/portal/login</code>
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setIsPortalModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEnablePortal} icon={<KeyIcon className="h-5 w-5" />}>
              Habilitar Acceso
            </Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}
