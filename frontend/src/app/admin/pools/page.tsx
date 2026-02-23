'use client';

import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { fetcher } from '@/lib/api';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  UserIcon,
  PhoneIcon,
  MapPinIcon,
  PlusIcon,
  TrashIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';

interface AvailableClient {
  id: string;
  name: string;
  last_name: string;
  company_name: string;
  phone: string;
  address: string;
  city: string;
  service_day: string;
  service_frequency: number;
  client_type: string;
}

interface ScheduleClient {
  schedule_id: string;
  client_id: string;
  client_name: string;
  company_name: string;
  phone: string;
  address: string;
  city: string;
  service_frequency: number;
  client_type: string;
  route_order: number;
}

interface TechnicianSchedule {
  technician_id: string;
  technician_name: string;
  clients: ScheduleClient[];
}

interface Technician {
  id: string;
  first_name: string;
  last_name: string;
}

interface RouteInstance {
  id: string;
  route_date: string;
  status: string;
  technician_first_name: string;
  technician_last_name: string;
  total_stops: number;
  completed_stops: number;
}

const SERVICE_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function RoutesPage() {
  const { t } = useLanguage();
  const [selectedDay, setSelectedDay] = useState<string>(SERVICE_DAYS[0]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState<string>('');
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [generating, setGenerating] = useState(false);

  // Fetch data
  const { data: schedulesData, error: schedulesError, mutate: mutateSchedules } = useSWR('/routes/schedules', fetcher);
  const { data: availableData, error: availableError, mutate: mutateAvailable } = useSWR(
    `/routes/available-clients?day=${selectedDay}`,
    fetcher
  );
  const { data: techniciansData } = useSWR('/users/list/technicians', fetcher);
  const { data: historyData, mutate: mutateHistory } = useSWR('/routes/instances?limit=30', fetcher);

  // Debug logging
  useEffect(() => {
    console.log('Schedules Data:', schedulesData);
    console.log('Available Clients:', availableData);
    console.log('Technicians:', techniciansData);
    if (schedulesError) console.error('Schedules Error:', schedulesError);
    if (availableError) console.error('Available Error:', availableError);
  }, [schedulesData, availableData, techniciansData, schedulesError, availableError]);

  const dayLabels: Record<string, string> = {
    Monday: t('days.monday'),
    Tuesday: t('days.tuesday'),
    Wednesday: t('days.wednesday'),
    Thursday: t('days.thursday'),
    Friday: t('days.friday'),
    Saturday: t('days.saturday'),
    Sunday: t('days.sunday'),
  };

  const getSchedulesForDay = (day: string): Record<string, TechnicianSchedule> => {
    return schedulesData?.schedules?.[day] || {};
  };

  const getAvailableClients = (): AvailableClient[] => {
    return availableData?.clients || [];
  };

  const handleAddToSchedule = async () => {
    if (!selectedTechnician || !selectedClient) {
      toast.error('Select technician and client');
      return;
    }

    try {
      await api.post('/routes/schedules', {
        technicianId: selectedTechnician,
        clientId: selectedClient,
        dayOfWeek: selectedDay,
      });
      toast.success('Client added to route');
      mutateSchedules();
      mutateAvailable();
      setIsAddModalOpen(false);
      setSelectedTechnician('');
      setSelectedClient('');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error adding to schedule');
    }
  };

  const handleRemoveFromSchedule = async (scheduleId: string) => {
    if (!confirm('Remove this client from the route?')) return;

    try {
      await api.delete(`/routes/schedules/${scheduleId}`);
      toast.success('Removed from route');
      mutateSchedules();
      mutateAvailable();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error');
    }
  };

  const handleReorder = async (techId: string, clientIndex: number, direction: 'up' | 'down') => {
    const schedules = getSchedulesForDay(selectedDay);
    const techSchedule = schedules[techId];
    if (!techSchedule) return;

    const clients = [...techSchedule.clients];
    const newIndex = direction === 'up' ? clientIndex - 1 : clientIndex + 1;

    // Check bounds
    if (newIndex < 0 || newIndex >= clients.length) return;

    // Swap
    [clients[clientIndex], clients[newIndex]] = [clients[newIndex], clients[clientIndex]];

    // Build orders array
    const orders = clients.map((client, index) => ({
      scheduleId: client.schedule_id,
      order: index
    }));

    try {
      await api.put('/routes/schedules/reorder', { orders });
      toast.success('Order updated');
      mutateSchedules();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error reordering');
    }
  };

  const handleGenerateWeek = async () => {
    setGenerating(true);
    try {
      const today = new Date();
      // Get next Monday
      const monday = new Date(today);
      const dayOfWeek = today.getDay();
      const daysUntilMonday = dayOfWeek === 0 ? 1 : (dayOfWeek === 1 ? 0 : 8 - dayOfWeek);
      monday.setDate(today.getDate() + daysUntilMonday);

      const response = await api.post('/routes/generate', {
        weekStart: monday.toISOString().split('T')[0],
      });
      toast.success(`Generated ${response.data.generated} routes for the week`);
      mutateHistory();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error generating routes');
    } finally {
      setGenerating(false);
    }
  };

  const getTotalClientsForDay = (day: string): number => {
    const schedules = getSchedulesForDay(day);
    return Object.values(schedules).reduce((sum, tech) => sum + tech.clients.length, 0);
  };

  const getTotalTechniciansForDay = (day: string): number => {
    return Object.keys(getSchedulesForDay(day)).length;
  };

  return (
    <AdminLayout title={t('nav.routes')}>
      {/* Header Actions */}
      <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Weekly Route Schedule</h2>
          <p className="text-sm text-gray-500">Assign clients to technicians for each day</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleGenerateWeek}
            variant="secondary"
            icon={<CalendarIcon className="h-5 w-5" />}
            loading={generating}
          >
            {generating ? 'Generating...' : 'Generate This Week'}
          </Button>
          <Button
            onClick={() => setIsHistoryModalOpen(true)}
            variant="secondary"
            icon={<ClockIcon className="h-5 w-5" />}
          >
            History
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        {SERVICE_DAYS.map((day) => {
          const total = getTotalClientsForDay(day);
          const techs = getTotalTechniciansForDay(day);
          const isSelected = selectedDay === day;
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`p-3 rounded-lg text-left transition-all ${
                isSelected
                  ? 'bg-primary-500 text-white shadow-lg scale-105'
                  : 'bg-white text-gray-700 hover:bg-gray-50 shadow'
              }`}
            >
              <p className="font-medium text-sm">{dayLabels[day]}</p>
              <p className={`text-2xl font-bold ${isSelected ? 'text-white' : 'text-primary-600'}`}>
                {total}
              </p>
              <p className={`text-xs ${isSelected ? 'text-primary-100' : 'text-gray-500'}`}>
                {techs} tech{techs !== 1 ? 's' : ''}
              </p>
            </button>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Available Clients Panel */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <div className="p-4 border-b flex justify-between items-center">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-yellow-400"></span>
                  Available for {dayLabels[selectedDay]}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Clients with {dayLabels[selectedDay]} as service day
                </p>
              </div>
              <Badge variant="warning">{getAvailableClients().length}</Badge>
            </div>

            <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
              {getAvailableClients().length > 0 ? (
                getAvailableClients().map((client) => (
                  <div
                    key={client.id}
                    className="p-3 bg-gray-50 rounded-lg border-l-4 border-l-yellow-400"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">
                          {client.name} {client.last_name}
                        </p>
                        {client.company_name && (
                          <p className="text-xs text-primary-600">{client.company_name}</p>
                        )}
                        <div className="flex gap-1 mt-1">
                          <Badge variant="default" size="sm">
                            {client.client_type === 'commercial' ? 'Comm' : 'Res'}
                          </Badge>
                          <Badge variant="info" size="sm">
                            {client.service_frequency}x/wk
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedClient(client.id);
                          setIsAddModalOpen(true);
                        }}
                        icon={<PlusIcon className="h-4 w-4" />}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <ExclamationTriangleIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No clients available</p>
                  <p className="text-xs mt-1">
                    Set "{dayLabels[selectedDay]}" as service day in client settings
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Technician Routes Panel */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <div className="p-4 border-b">
              <h3 className="font-semibold flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-400"></span>
                {dayLabels[selectedDay]} Routes
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Technician assignments for this day
              </p>
            </div>

            <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
              {Object.keys(getSchedulesForDay(selectedDay)).length > 0 ? (
                Object.entries(getSchedulesForDay(selectedDay)).map(([techId, techSchedule]) => (
                  <div key={techId} className="border rounded-lg overflow-hidden">
                    <div className="bg-primary-50 px-4 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-5 w-5 text-primary-600" />
                        <span className="font-semibold text-primary-900">
                          {techSchedule.technician_name}
                        </span>
                      </div>
                      <Badge variant="primary">{techSchedule.clients.length} clients</Badge>
                    </div>

                    <div className="divide-y">
                      {techSchedule.clients.map((client, index) => (
                        <div
                          key={client.schedule_id}
                          className="px-4 py-2 flex items-center gap-3 hover:bg-gray-50"
                        >
                          {/* Reorder buttons */}
                          <div className="flex flex-col gap-0.5">
                            <button
                              onClick={() => handleReorder(techId, index, 'up')}
                              disabled={index === 0}
                              className={`p-0.5 rounded ${
                                index === 0
                                  ? 'text-gray-200 cursor-not-allowed'
                                  : 'text-gray-400 hover:text-primary-600 hover:bg-primary-50'
                              }`}
                              title="Move up"
                            >
                              <ChevronUpIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleReorder(techId, index, 'down')}
                              disabled={index === techSchedule.clients.length - 1}
                              className={`p-0.5 rounded ${
                                index === techSchedule.clients.length - 1
                                  ? 'text-gray-200 cursor-not-allowed'
                                  : 'text-gray-400 hover:text-primary-600 hover:bg-primary-50'
                              }`}
                              title="Move down"
                            >
                              <ChevronDownIcon className="h-4 w-4" />
                            </button>
                          </div>
                          <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900 truncate">
                              {client.client_name}
                            </p>
                            {client.address && (
                              <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                                <MapPinIcon className="h-3 w-3" />
                                {client.address}{client.city ? `, ${client.city}` : ''}
                              </p>
                            )}
                          </div>
                          {client.phone && (
                            <a
                              href={`tel:${client.phone}`}
                              className="text-gray-400 hover:text-primary-600"
                            >
                              <PhoneIcon className="h-4 w-4" />
                            </a>
                          )}
                          <button
                            onClick={() => handleRemoveFromSchedule(client.schedule_id)}
                            className="text-gray-400 hover:text-red-500 p-1"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <CheckCircleIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No routes scheduled for {dayLabels[selectedDay]}</p>
                  <p className="text-sm mt-1">
                    Add clients from the available list
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Add to Schedule Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedClient('');
          setSelectedTechnician('');
        }}
        title={`Add to ${dayLabels[selectedDay]} Route`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Technician *
            </label>
            <select
              value={selectedTechnician}
              onChange={(e) => setSelectedTechnician(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Choose a technician...</option>
              {techniciansData?.technicians?.map((tech: Technician) => (
                <option key={tech.id} value={tech.id}>
                  {tech.first_name} {tech.last_name}
                </option>
              ))}
            </select>
            {(!techniciansData?.technicians || techniciansData.technicians.length === 0) && (
              <p className="text-xs text-red-500 mt-1">
                No technicians available. Add technicians in Settings → Users
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Client *
            </label>
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Choose a client...</option>
              {getAvailableClients().map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} {client.last_name}
                  {client.company_name ? ` (${client.company_name})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="secondary"
              onClick={() => {
                setIsAddModalOpen(false);
                setSelectedClient('');
                setSelectedTechnician('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddToSchedule}
              disabled={!selectedTechnician || !selectedClient}
              icon={<PlusIcon className="h-5 w-5" />}
            >
              Add to Route
            </Button>
          </div>
        </div>
      </Modal>

      {/* History Modal */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title="Route History"
        size="lg"
      >
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {historyData?.instances && historyData.instances.length > 0 ? (
            historyData.instances.map((route: RouteInstance) => (
              <div
                key={route.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium">
                    {new Date(route.route_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                  <p className="text-sm text-gray-600">
                    {route.technician_first_name} {route.technician_last_name}
                  </p>
                </div>
                <div className="text-right">
                  <Badge
                    variant={
                      route.status === 'completed' ? 'success' :
                      route.status === 'in_progress' ? 'warning' :
                      'default'
                    }
                  >
                    {route.status}
                  </Badge>
                  <p className="text-sm text-gray-500 mt-1">
                    {route.completed_stops || 0}/{route.total_stops || 0} stops
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <ClockIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No route history yet</p>
              <p className="text-sm mt-1">
                Generate routes to create history
              </p>
            </div>
          )}
        </div>
      </Modal>
    </AdminLayout>
  );
}
