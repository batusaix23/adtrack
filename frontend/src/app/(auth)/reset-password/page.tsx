'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import toast from 'react-hot-toast';
import api from '@/lib/api';

interface ResetPasswordForm {
  newPassword: string;
  confirmPassword: string;
}

function ResetPasswordContent() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const { register, handleSubmit, watch, formState: { errors } } = useForm<ResetPasswordForm>();
  const newPassword = watch('newPassword');

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!token) {
      toast.error('Token no encontrado');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        token,
        newPassword: data.newPassword,
      });
      setSuccess(true);
      toast.success('Contraseña actualizada');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al restablecer la contraseña');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Token no encontrado
            </h2>
            <p className="text-gray-600 mb-6">
              El enlace para restablecer la contraseña es inválido o ha expirado.
            </p>
            <Link href="/forgot-password">
              <Button className="w-full">
                Solicitar nuevo enlace
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">AT</span>
            </div>
            <span className="text-xl font-semibold text-gray-900">Aguadulce Track</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          {!success ? (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Nueva contraseña
              </h2>
              <p className="text-gray-600 mb-6">
                Ingresa tu nueva contraseña
              </p>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Input
                  label="Nueva contraseña"
                  type="password"
                  placeholder="••••••••"
                  error={errors.newPassword?.message}
                  {...register('newPassword', {
                    required: 'La contraseña es requerida',
                    minLength: {
                      value: 8,
                      message: 'La contraseña debe tener al menos 8 caracteres',
                    },
                  })}
                />

                <Input
                  label="Confirmar contraseña"
                  type="password"
                  placeholder="••••••••"
                  error={errors.confirmPassword?.message}
                  {...register('confirmPassword', {
                    required: 'Confirma tu contraseña',
                    validate: (value) =>
                      value === newPassword || 'Las contraseñas no coinciden',
                  })}
                />

                <Button type="submit" className="w-full" loading={loading}>
                  Restablecer contraseña
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Contraseña actualizada
              </h2>
              <p className="text-gray-600 mb-6">
                Tu contraseña ha sido restablecida. Serás redirigido al inicio de sesión...
              </p>
            </div>
          )}

          <p className="mt-6 text-center text-gray-600">
            <Link href="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              Volver al inicio de sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
