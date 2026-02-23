'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';

interface Activity {
  id: string;
  admin_email: string;
  admin_first_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: any;
  ip_address: string;
  created_at: string;
}

export default function ActivityLogPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const token = localStorage.getItem('platform_token');
      const res = await axios.get(`${apiUrl}/platform/activity?limit=100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActivities(res.data.activities || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionColor = (action: string) => {
    if (action.includes('delete') || action.includes('suspend')) return 'text-red-400';
    if (action.includes('create') || action.includes('activate')) return 'text-green-400';
    if (action.includes('update') || action.includes('extend')) return 'text-blue-400';
    return 'text-slate-400';
  };

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Activity Log</h1>
        <p className="text-slate-400">Track all platform admin actions</p>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700">
        {activities.length > 0 ? (
          <div className="divide-y divide-slate-700">
            {activities.map((activity) => (
              <div key={activity.id} className="p-4 hover:bg-slate-700/50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-slate-700 rounded-lg">
                      <ClipboardDocumentListIcon className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                      <p className={`font-medium ${getActionColor(activity.action)}`}>
                        {formatAction(activity.action)}
                      </p>
                      <p className="text-sm text-slate-400">
                        by {activity.admin_first_name || activity.admin_email || 'System'}
                        {activity.entity_type && (
                          <span> on {activity.entity_type}</span>
                        )}
                      </p>
                      {activity.details && Object.keys(activity.details).length > 0 && (
                        <p className="text-xs text-slate-500 mt-1">
                          {JSON.stringify(activity.details)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-400">{formatDate(activity.created_at)}</p>
                    {activity.ip_address && (
                      <p className="text-xs text-slate-500">{activity.ip_address}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <ClipboardDocumentListIcon className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500">No activity recorded yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
