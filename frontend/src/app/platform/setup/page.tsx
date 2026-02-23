'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { ShieldCheckIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export default function PlatformSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    setupKey: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  });

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      await axios.post(`${apiUrl}/platform/setup`, {
        setupKey: formData.setupKey,
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
      });

      setSuccess(true);
      setTimeout(() => {
        router.push('/platform/login');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20 text-center max-w-md">
          <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircleIcon className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Setup Complete!</h1>
          <p className="text-purple-200 mb-4">
            Your platform admin account has been created. Redirecting to login...
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <ShieldCheckIcon className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Platform Setup</h1>
            <p className="text-purple-200 mt-2">Create your first platform administrator</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {step === 1 && (
              <>
                <div>
                  <label className="block text-purple-200 text-sm font-medium mb-2">Setup Key</label>
                  <input
                    type="password"
                    value={formData.setupKey}
                    onChange={(e) => setFormData({ ...formData, setupKey: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter setup key"
                    required
                  />
                  <p className="text-purple-300 text-xs mt-2">
                    Default key: aguadulce-setup-2024
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
                >
                  Continue
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-purple-200 text-sm font-medium mb-2">First Name</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-purple-200 text-sm font-medium mb-2">Last Name</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-purple-200 text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="admin@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-purple-200 text-sm font-medium mb-2">Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Minimum 8 characters"
                    required
                  />
                </div>

                <div>
                  <label className="block text-purple-200 text-sm font-medium mb-2">Confirm Password</label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Creating...' : 'Create Admin'}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>

        <p className="text-center text-purple-300 text-sm mt-6">
          This setup can only be completed once
        </p>
      </div>
    </div>
  );
}
