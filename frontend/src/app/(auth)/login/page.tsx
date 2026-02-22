'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import toast from 'react-hot-toast';

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      await login(data.email, data.password);
      toast.success('Bienvenido');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - gradient */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 to-primary-800 p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">AT</span>
            </div>
            <span className="text-white text-xl font-semibold">Aguadulce Track</span>
          </div>
        </div>
        <div>
          <h1 className="text-4xl font-bold text-white mb-4">
            Gestión inteligente de piscinas
          </h1>
          <p className="text-primary-100 text-lg">
            Optimiza tu negocio de mantenimiento de piscinas con nuestra plataforma completa.
          </p>
        </div>
        <div className="flex gap-8 text-primary-100">
          <div>
            <p className="text-3xl font-bold text-white">500+</p>
            <p>Piscinas gestionadas</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-white">50+</p>
            <p>Empresas activas</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-white">10k+</p>
            <p>Servicios completados</p>
          </div>
        </div>
      </div>

      {/* Right side - form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <div className="inline-flex items-center gap-2">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">AT</span>
              </div>
              <span className="text-xl font-semibold text-gray-900">Aguadulce Track</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Iniciar sesión
            </h2>
            <p className="text-gray-600 mb-6">
              Ingresa tus credenciales para acceder
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Correo electrónico"
                type="email"
                placeholder="tu@email.com"
                error={errors.email?.message}
                {...register('email', {
                  required: 'El email es requerido',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Email inválido',
                  },
                })}
              />

              <Input
                label="Contraseña"
                type="password"
                placeholder="••••••••"
                error={errors.password?.message}
                {...register('password', {
                  required: 'La contraseña es requerida',
                })}
              />

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                  <span className="text-sm text-gray-600">Recordarme</span>
                </label>
                <Link href="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              <Button type="submit" className="w-full" loading={loading}>
                Iniciar sesión
              </Button>
            </form>

            <p className="mt-6 text-center text-gray-600">
              ¿No tienes cuenta?{' '}
              <Link href="/register" className="text-primary-600 hover:text-primary-700 font-medium">
                Registrar empresa
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
