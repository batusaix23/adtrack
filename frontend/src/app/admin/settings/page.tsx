'use client';

import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/contexts/AuthContext';
import { fetcher } from '@/lib/api';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import {
  BuildingOfficeIcon,
  UserIcon,
  BellIcon,
  ShieldCheckIcon,
  CreditCardIcon,
  UsersIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

interface Technician {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: string;
  is_active: boolean;
}

interface TechnicianForm {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
  isActive: boolean;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('company');
  const [loading, setLoading] = useState(false);
  const [isTechModalOpen, setIsTechModalOpen] = useState(false);
  const [editingTech, setEditingTech] = useState<Technician | null>(null);

  // Company data
  const { data: companyResponse, mutate: mutateCompany } = useSWR('/company', fetcher);
  const company = companyResponse?.company;

  // Technicians data
  const { data: usersResponse, mutate: mutateUsers } = useSWR('/users?role=technician', fetcher);
  const technicians = usersResponse?.users || [];

  const [companyData, setCompanyData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    instagram: '',
    facebook: '',
    twitter: '',
    feiEin: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<TechnicianForm>();

  // Load company data when it arrives
  useEffect(() => {
    if (company) {
      setCompanyData({
        name: company.name || '',
        email: company.email || '',
        phone: company.phone || '',
        address: company.address || '',
        website: company.website || '',
        instagram: company.instagram || '',
        facebook: company.facebook || '',
        twitter: company.twitter || '',
        feiEin: company.fei_ein || '',
      });
    }
  }, [company]);

  const tabs = [
    { id: 'company', label: 'Empresa', icon: BuildingOfficeIcon },
    { id: 'technicians', label: 'Técnicos', icon: UsersIcon },
    { id: 'profile', label: 'Perfil', icon: UserIcon },
    { id: 'security', label: 'Seguridad', icon: ShieldCheckIcon },
    { id: 'notifications', label: 'Notificaciones', icon: BellIcon },
    { id: 'billing', label: 'Facturación', icon: CreditCardIcon },
  ];

  const handleSaveCompany = async () => {
    setLoading(true);
    try {
      await api.put('/company', companyData);
      toast.success('Información de empresa actualizada');
      mutateCompany();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      toast.success('Contraseña actualizada');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al cambiar contraseña');
    } finally {
      setLoading(false);
    }
  };

  // Technician management
  const openTechModal = (tech?: Technician) => {
    if (tech) {
      setEditingTech(tech);
      reset({
        email: tech.email,
        firstName: tech.first_name,
        lastName: tech.last_name,
        phone: tech.phone || '',
        password: '',
        isActive: tech.is_active,
      });
    } else {
      setEditingTech(null);
      reset({ isActive: true });
    }
    setIsTechModalOpen(true);
  };

  const onSubmitTech = async (formData: TechnicianForm) => {
    try {
      if (editingTech) {
        await api.put(`/users/${editingTech.id}`, {
          ...formData,
          role: 'technician',
        });
        toast.success('Técnico actualizado');
      } else {
        await api.post('/users', {
          ...formData,
          role: 'technician',
        });
        toast.success('Técnico creado');
      }
      mutateUsers();
      setIsTechModalOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al guardar');
    }
  };

  const deleteTechnician = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este técnico?')) return;

    try {
      await api.delete(`/users/${id}`);
      toast.success('Técnico eliminado');
      mutateUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al eliminar');
    }
  };

  const toggleTechStatus = async (tech: Technician) => {
    try {
      await api.put(`/users/${tech.id}`, { isActive: !tech.is_active });
      toast.success(tech.is_active ? 'Técnico desactivado' : 'Técnico activado');
      mutateUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error');
    }
  };

  return (
    <AdminLayout title="Configuración">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64">
          <Card padding="sm">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <tab.icon className="h-5 w-5" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </Card>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'company' && (
            <Card>
              <CardHeader
                title="Información de la Empresa"
                subtitle="Actualiza los datos de tu empresa"
              />
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Datos Básicos</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Nombre de la empresa"
                      value={companyData.name}
                      onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                    />
                    <Input
                      label="FEI/EIN Number"
                      placeholder="XX-XXXXXXX"
                      value={companyData.feiEin}
                      onChange={(e) => setCompanyData({ ...companyData, feiEin: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Email de contacto"
                      type="email"
                      value={companyData.email}
                      onChange={(e) => setCompanyData({ ...companyData, email: e.target.value })}
                    />
                    <Input
                      label="Teléfono"
                      value={companyData.phone}
                      onChange={(e) => setCompanyData({ ...companyData, phone: e.target.value })}
                    />
                  </div>
                  <Input
                    label="Dirección"
                    value={companyData.address}
                    onChange={(e) => setCompanyData({ ...companyData, address: e.target.value })}
                  />
                </div>

                {/* Social Media */}
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-medium text-gray-900">Redes Sociales y Web</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Sitio Web"
                      placeholder="https://www.tuempresa.com"
                      value={companyData.website}
                      onChange={(e) => setCompanyData({ ...companyData, website: e.target.value })}
                    />
                    <Input
                      label="Instagram"
                      placeholder="@tuempresa"
                      value={companyData.instagram}
                      onChange={(e) => setCompanyData({ ...companyData, instagram: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Facebook"
                      placeholder="facebook.com/tuempresa"
                      value={companyData.facebook}
                      onChange={(e) => setCompanyData({ ...companyData, facebook: e.target.value })}
                    />
                    <Input
                      label="Twitter/X"
                      placeholder="@tuempresa"
                      value={companyData.twitter}
                      onChange={(e) => setCompanyData({ ...companyData, twitter: e.target.value })}
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <Button onClick={handleSaveCompany} loading={loading}>
                    Guardar Cambios
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'technicians' && (
            <Card>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-semibold">Gestión de Técnicos</h3>
                  <p className="text-sm text-gray-500">Administra los técnicos de tu empresa</p>
                </div>
                <Button onClick={() => openTechModal()} icon={<PlusIcon className="h-5 w-5" />}>
                  Nuevo Técnico
                </Button>
              </div>

              <div className="space-y-4">
                {technicians.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <UsersIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>No hay técnicos registrados</p>
                    <Button className="mt-4" onClick={() => openTechModal()}>
                      Agregar primer técnico
                    </Button>
                  </div>
                ) : (
                  technicians.map((tech: Technician) => (
                    <div
                      key={tech.id}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        tech.is_active ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          tech.is_active ? 'bg-primary-100 text-primary-700' : 'bg-gray-200 text-gray-500'
                        }`}>
                          {tech.first_name[0]}{tech.last_name[0]}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{tech.first_name} {tech.last_name}</p>
                            <Badge variant={tech.is_active ? 'success' : 'default'} size="sm">
                              {tech.is_active ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500">{tech.email}</p>
                          {tech.phone && <p className="text-sm text-gray-500">{tech.phone}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleTechStatus(tech)}
                        >
                          {tech.is_active ? 'Desactivar' : 'Activar'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openTechModal(tech)}
                          icon={<PencilIcon className="h-4 w-4" />}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteTechnician(tech.id)}
                          icon={<TrashIcon className="h-4 w-4 text-red-500" />}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          )}

          {activeTab === 'profile' && (
            <Card>
              <CardHeader
                title="Información Personal"
                subtitle="Actualiza tu información de perfil"
              />
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Nombre"
                    defaultValue={user?.firstName}
                  />
                  <Input
                    label="Apellido"
                    defaultValue={user?.lastName}
                  />
                </div>
                <Input
                  label="Email"
                  type="email"
                  defaultValue={user?.email}
                  disabled
                />
                <p className="text-sm text-gray-500">
                  Para cambiar tu email, contacta al soporte.
                </p>
                <div className="pt-4">
                  <Button>Guardar Cambios</Button>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'security' && (
            <Card>
              <CardHeader
                title="Cambiar Contraseña"
                subtitle="Asegúrate de usar una contraseña segura"
              />
              <div className="space-y-4 max-w-md">
                <Input
                  label="Contraseña actual"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                />
                <Input
                  label="Nueva contraseña"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                />
                <Input
                  label="Confirmar nueva contraseña"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                />
                <div className="pt-4">
                  <Button onClick={handlePasswordChange} loading={loading}>
                    Cambiar Contraseña
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card>
              <CardHeader
                title="Preferencias de Notificaciones"
                subtitle="Configura cómo quieres recibir notificaciones"
              />
              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Notificaciones Push</p>
                    <p className="text-sm text-gray-500">Recibe alertas en tiempo real</p>
                  </div>
                  <input type="checkbox" className="h-5 w-5 rounded text-primary-600" defaultChecked />
                </label>
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Reportes por Email</p>
                    <p className="text-sm text-gray-500">Recibe reportes semanales</p>
                  </div>
                  <input type="checkbox" className="h-5 w-5 rounded text-primary-600" defaultChecked />
                </label>
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Alertas de Inventario</p>
                    <p className="text-sm text-gray-500">Notificar cuando el stock esté bajo</p>
                  </div>
                  <input type="checkbox" className="h-5 w-5 rounded text-primary-600" defaultChecked />
                </label>
              </div>
            </Card>
          )}

          {activeTab === 'billing' && (
            <Card>
              <CardHeader
                title="Plan y Facturación"
                subtitle="Administra tu suscripción"
              />
              <div className="p-6 bg-primary-50 rounded-lg mb-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-primary-600">Plan actual</p>
                    <p className="text-2xl font-bold text-primary-900">Premium</p>
                  </div>
                  <Button variant="secondary">Cambiar Plan</Button>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Próximo cobro</span>
                  <span className="font-medium">15 de Marzo, 2026</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Monto</span>
                  <span className="font-medium">$49.99/mes</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Método de pago</span>
                  <span className="font-medium">•••• 4242</span>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Technician Modal */}
      <Modal
        isOpen={isTechModalOpen}
        onClose={() => setIsTechModalOpen(false)}
        title={editingTech ? 'Editar Técnico' : 'Nuevo Técnico'}
      >
        <form onSubmit={handleSubmit(onSubmitTech)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nombre"
              error={errors.firstName?.message}
              {...register('firstName', { required: 'Requerido' })}
            />
            <Input
              label="Apellido"
              error={errors.lastName?.message}
              {...register('lastName', { required: 'Requerido' })}
            />
          </div>

          <Input
            label="Email"
            type="email"
            error={errors.email?.message}
            {...register('email', { required: 'Requerido' })}
          />

          <Input
            label="Teléfono"
            {...register('phone')}
          />

          <Input
            label={editingTech ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
            type="password"
            error={errors.password?.message}
            {...register('password', { required: !editingTech ? 'Requerido' : false })}
          />

          {editingTech && (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="font-medium text-gray-900">Estado</label>
                <p className="text-sm text-gray-500">El técnico puede acceder al sistema</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  {...register('isActive')}
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
              </label>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsTechModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {editingTech ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}
