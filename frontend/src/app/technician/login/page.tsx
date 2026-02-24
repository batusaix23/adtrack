'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTechnicianAuth } from '@/contexts/TechnicianAuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import toast from 'react-hot-toast';
import {
  WrenchScrewdriverIcon,
  EnvelopeIcon,
  LockClosedIcon,
  KeyIcon,
} from '@heroicons/react/24/outline';

export default function TechnicianLoginPage() {
  const { login, loginWithPin, technician, loading } = useTechnicianAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [usePin, setUsePin] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && technician) {
      router.push('/technician');
    }
  }, [technician, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (usePin) {
        if (!email || !pin) {
          toast.error('Ingresa tu email y PIN');
          return;
        }
        await loginWithPin(email, pin);
      } else {
        if (!email || !password) {
          toast.error('Ingresa tu email y contraseña');
          return;
        }
        await login(email, password);
      }
      toast.success('Bienvenido');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Error al iniciar sesión';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 to-primary-800">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-800 flex flex-col">
      {/* Header */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-6">
          <WrenchScrewdriverIcon className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Portal Técnico</h1>
        <p className="text-primary-100">Aguadulce Track</p>
      </div>

      {/* Login Form */}
      <div className="bg-white rounded-t-3xl px-6 pt-8 pb-12">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Correo electrónico
            </label>
            <div className="relative">
              <EnvelopeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="tu@email.com"
                autoComplete="email"
              />
            </div>
          </div>

          {usePin ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PIN
              </label>
              <div className="relative">
                <KeyIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-center text-2xl tracking-widest"
                  placeholder="• • • • • •"
                  autoComplete="off"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <LockClosedIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            size="lg"
            loading={submitting}
          >
            Iniciar Sesión
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setUsePin(!usePin);
                setPin('');
                setPassword('');
              }}
              className="text-primary-600 text-sm font-medium"
            >
              {usePin ? 'Usar contraseña' : 'Usar PIN'}
            </button>
          </div>
        </form>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>¿Problemas para acceder?</p>
          <p>Contacta a tu administrador</p>
        </div>
      </div>
    </div>
  );
}
