'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClientPortalAuth } from '@/contexts/ClientPortalAuthContext';
import {
  UserCircleIcon,
  EnvelopeIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';

interface LoginForm {
  email: string;
  password: string;
}

export default function PortalLoginPage() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const { login, client, loading: authLoading } = useClientPortalAuth();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && client) {
      router.push('/portal');
    }
  }, [client, authLoading, router]);

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      await login(data.email, data.password);
      toast.success(language === 'en' ? 'Welcome!' : '¡Bienvenido!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || (language === 'en' ? 'Login failed' : 'Error de acceso'));
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <UserCircleIcon className="h-12 w-12 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white">Aguadulce Track</h1>
        <p className="text-primary-100 mt-1">
          {language === 'en' ? 'Client Portal' : 'Portal del Cliente'}
        </p>
      </div>

      {/* Login Card */}
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth.email') || 'Correo electrónico'}
            </label>
            <div className="relative">
              <EnvelopeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email"
                {...register('email', { required: t('validation.emailRequired') || 'Email requerido' })}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="tu@email.com"
                autoComplete="email"
              />
            </div>
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth.password') || 'Contraseña'}
            </label>
            <div className="relative">
              <LockClosedIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="password"
                {...register('password', { required: t('validation.passwordRequired') || 'Contraseña requerida' })}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 text-white py-3 rounded-xl font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                {language === 'en' ? 'Signing in...' : 'Ingresando...'}
              </>
            ) : (
              t('auth.login') || 'Iniciar Sesión'
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            {language === 'en'
              ? 'Need access? Contact your pool service provider.'
              : '¿Necesita acceso? Contacte a su proveedor de servicio.'}
          </p>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-8 text-primary-100 text-sm">
        © {new Date().getFullYear()} Aguadulce Track
      </p>
    </div>
  );
}
