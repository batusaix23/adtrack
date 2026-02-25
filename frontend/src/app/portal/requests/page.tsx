'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  ChatBubbleLeftRightIcon,
  PlusIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface ClientRequest {
  id: string;
  request_type: string;
  subject: string;
  description: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  response: string | null;
  responded_at: string | null;
  created_at: string;
}

const requestTypes = [
  { value: 'service', labelEn: 'Service Issue', labelEs: 'Problema de Servicio' },
  { value: 'billing', labelEn: 'Billing Question', labelEs: 'Pregunta de Facturación' },
  { value: 'schedule', labelEn: 'Schedule Change', labelEs: 'Cambio de Horario' },
  { value: 'equipment', labelEn: 'Equipment Issue', labelEs: 'Problema de Equipo' },
  { value: 'other', labelEn: 'Other', labelEs: 'Otro' },
];

export default function PortalRequestsPage() {
  const { language } = useLanguage();
  const [requests, setRequests] = useState<ClientRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewRequest, setShowNewRequest] = useState(false);

  // New request form
  const [requestType, setRequestType] = useState('service');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem('portalAccessToken');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const response = await axios.get(`${apiUrl}/portal/requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRequests(response.data.requests || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('portalAccessToken');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      await axios.post(
        `${apiUrl}/portal/requests`,
        { requestType, subject, description, priority },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(language === 'es' ? 'Solicitud enviada' : 'Request submitted');
      setShowNewRequest(false);
      resetForm();
      fetchRequests();
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error(language === 'es' ? 'Error al enviar' : 'Error submitting');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setRequestType('service');
    setSubject('');
    setDescription('');
    setPriority('normal');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved':
      case 'closed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'in_progress':
        return <ClockIcon className="h-5 w-5 text-blue-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'bg-green-100 text-green-700';
      case 'closed':
        return 'bg-gray-100 text-gray-700';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-yellow-100 text-yellow-700';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, Record<string, string>> = {
      pending: { en: 'Pending', es: 'Pendiente' },
      in_progress: { en: 'In Progress', es: 'En Progreso' },
      resolved: { en: 'Resolved', es: 'Resuelto' },
      closed: { en: 'Closed', es: 'Cerrado' },
    };
    return labels[status]?.[language] || status;
  };

  const getPriorityColor = (prio: string) => {
    switch (prio) {
      case 'urgent':
        return 'bg-red-100 text-red-700';
      case 'high':
        return 'bg-orange-100 text-orange-700';
      case 'low':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-blue-100 text-blue-700';
    }
  };

  const getTypeLabel = (type: string) => {
    const typeObj = requestTypes.find(t => t.value === type);
    return typeObj ? (language === 'es' ? typeObj.labelEs : typeObj.labelEn) : type;
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">
          {language === 'es' ? 'Solicitudes' : 'Requests'}
        </h1>
        <button
          onClick={() => setShowNewRequest(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <PlusIcon className="h-5 w-5" />
          {language === 'es' ? 'Nueva Solicitud' : 'New Request'}
        </button>
      </div>

      {/* Requests List */}
      {requests.length > 0 ? (
        <div className="space-y-4">
          {requests.map((request) => (
            <div key={request.id} className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {getStatusIcon(request.status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-gray-900">{request.subject}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(request.priority)}`}>
                        {request.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {getTypeLabel(request.request_type)} • {formatDate(request.created_at)}
                    </p>
                    <p className="text-sm text-gray-600 mt-2">{request.description}</p>

                    {request.response && (
                      <div className="mt-3 bg-primary-50 p-3 rounded-lg">
                        <p className="text-xs text-primary-600 font-medium mb-1">
                          {language === 'es' ? 'Respuesta' : 'Response'}
                        </p>
                        <p className="text-sm text-gray-700">{request.response}</p>
                        {request.responded_at && (
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDate(request.responded_at)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(request.status)}`}>
                  {getStatusLabel(request.status)}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <ChatBubbleLeftRightIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">
            {language === 'es' ? 'No hay solicitudes' : 'No requests yet'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {language === 'es'
              ? 'Envíe una solicitud para comunicarse con su proveedor de servicio'
              : 'Submit a request to communicate with your service provider'}
          </p>
          <button
            onClick={() => setShowNewRequest(true)}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            {language === 'es' ? 'Crear Solicitud' : 'Create Request'}
          </button>
        </div>
      )}

      {/* New Request Modal */}
      {showNewRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">
                {language === 'es' ? 'Nueva Solicitud' : 'New Request'}
              </h2>
              <button onClick={() => { setShowNewRequest(false); resetForm(); }}>
                <XMarkIcon className="h-6 w-6 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmitRequest} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'es' ? 'Tipo de Solicitud' : 'Request Type'}
                </label>
                <select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  {requestTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {language === 'es' ? type.labelEs : type.labelEn}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'es' ? 'Asunto' : 'Subject'}
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder={language === 'es' ? 'Breve descripción del problema' : 'Brief description of the issue'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'es' ? 'Descripción' : 'Description'}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder={language === 'es' ? 'Describa el problema en detalle' : 'Describe the issue in detail'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'es' ? 'Prioridad' : 'Priority'}
                </label>
                <div className="flex gap-2">
                  {(['low', 'normal', 'high', 'urgent'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        priority === p
                          ? getPriorityColor(p)
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {p === 'low' ? (language === 'es' ? 'Baja' : 'Low') :
                       p === 'normal' ? 'Normal' :
                       p === 'high' ? (language === 'es' ? 'Alta' : 'High') :
                       (language === 'es' ? 'Urgente' : 'Urgent')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setShowNewRequest(false); resetForm(); }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  {language === 'es' ? 'Cancelar' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  )}
                  {language === 'es' ? 'Enviar' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
