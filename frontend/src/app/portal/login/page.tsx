'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';

interface LoginForm {
  email: string;
  password: string;
}

export default function PortalLoginPage() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const response = await axios.post(`${apiUrl}/portal/login`, data);

      localStorage.setItem('portal_token', response.data.token);
      localStorage.setItem('portal_client', JSON.stringify(response.data.client));

      toast.success(language === 'en' ? 'Welcome!' : '¡Bienvenido!');
      router.push('/portal');
    } catch (error: any) {
      toast.error(error.response?.data?.error || (language === 'en' ? 'Login failed' : 'Error de acceso'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Aguadulce Track</h1>
          <p className="text-gray-500 mt-1">
            {language === 'en' ? 'Client Portal' : 'Portal del Cliente'}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth.email')}
            </label>
            <input
              type="email"
              {...register('email', { required: t('validation.emailRequired') })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="your@email.com"
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth.password')}
            </label>
            <input
              type="password"
              {...register('password', { required: t('validation.passwordRequired') })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {loading
              ? (language === 'en' ? 'Signing in...' : 'Ingresando...')
              : t('auth.login')
            }
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          {language === 'en'
            ? 'Contact your pool service provider if you need access.'
            : 'Contacte a su proveedor de servicio de piscinas si necesita acceso.'
          }
        </p>
      </div>
    </div>
  );
}
