'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardHeader } from '@/components/ui/Card';
import { fetcher } from '@/lib/api';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);

  const { data: trends } = useSWR(`/analytics/trends/services?days=${days}`, fetcher);
  const { data: chemicalTrends } = useSWR(`/analytics/trends/chemicals?days=${days}`, fetcher);
  const { data: waterQuality } = useSWR(`/analytics/water-quality?days=${days}`, fetcher);
  const { data: techPerformance } = useSWR(`/analytics/performance/technicians?days=${days}`, fetcher);
  const { data: poolsAttention } = useSWR('/analytics/pools/attention', fetcher);

  return (
    <AdminLayout title="Analíticas">
      {/* Period Selector */}
      <div className="flex gap-2 mb-6">
        {[7, 14, 30, 90].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              days === d
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            {d} días
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Services Trend */}
        <Card>
          <CardHeader title="Tendencia de Servicios" />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends?.trend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleDateString('es-ES')}
                />
                <Line
                  type="monotone"
                  dataKey="completed"
                  stroke="#22c55e"
                  strokeWidth={2}
                  name="Completados"
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  name="Total"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Water Quality */}
        <Card>
          <CardHeader title="Calidad del Agua (Promedio)" />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={waterQuality?.waterQuality || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                />
                <YAxis tick={{ fontSize: 12 }} domain={[6, 8.5]} />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleDateString('es-ES')}
                />
                <Line
                  type="monotone"
                  dataKey="avg_ph"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  name="pH"
                />
                <Line
                  type="monotone"
                  dataKey="avg_chlorine"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  name="Cloro"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Technician Performance */}
        <Card>
          <CardHeader title="Rendimiento de Técnicos" />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={techPerformance?.technicians || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" />
                <YAxis
                  dataKey="first_name"
                  type="category"
                  tick={{ fontSize: 12 }}
                  width={80}
                />
                <Tooltip />
                <Bar dataKey="completed" fill="#22c55e" name="Completados" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Pools Requiring Attention */}
        <Card>
          <CardHeader title="Piscinas que Requieren Atención" />
          <div className="space-y-3 max-h-72 overflow-y-auto">
            {poolsAttention?.pools?.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Todas las piscinas están en buen estado
              </p>
            ) : (
              poolsAttention?.pools?.map((pool: any) => (
                <div
                  key={pool.id}
                  className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">{pool.name}</p>
                    <p className="text-sm text-gray-500">{pool.client_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-red-600">{pool.issue}</p>
                    {pool.last_service && (
                      <p className="text-xs text-gray-500">
                        Último servicio: {new Date(pool.last_service).toLocaleDateString('es-ES')}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Technician Stats Table */}
      <Card className="mt-6">
        <CardHeader title="Estadísticas Detalladas por Técnico" />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Técnico</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Servicios</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Completados</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">% Completado</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Duración Prom.</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Días Activos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {techPerformance?.technicians?.map((tech: any) => (
                <tr key={tech.id}>
                  <td className="px-4 py-3 font-medium">
                    {tech.first_name} {tech.last_name}
                  </td>
                  <td className="px-4 py-3 text-center">{tech.total_services || 0}</td>
                  <td className="px-4 py-3 text-center text-green-600 font-medium">
                    {tech.completed || 0}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {tech.total_services
                      ? `${Math.round((tech.completed / tech.total_services) * 100)}%`
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {tech.avg_duration ? `${Math.round(tech.avg_duration)} min` : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">{tech.active_days || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AdminLayout>
  );
}
