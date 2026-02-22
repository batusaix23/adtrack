'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import toast from 'react-hot-toast';
import api from '@/lib/api';

interface ForgotPasswordForm {
  email: string;
}

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordForm>();

  const onSubmit = async (data: ForgotPasswordForm) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', data);
      setSubmitted(true);
      // For development/testing - show reset token if returned
      if (response.data.resetToken) {
        setResetToken(response.data.resetToken);
      }
      toast.success('Instrucciones enviadas');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al procesar la solicitud');
    } finally {
      setLoading(false);
    }
  };

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
          {!submitted ? (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Recuperar contraseña
              </h2>
              <p className="text-gray-600 mb-6">
                Ingresa tu email y te enviaremos instrucciones para restablecer tu contraseña
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

                <Button type="submit" className="w-full" loading={loading}>
                  Enviar instrucciones
                </Button>
              </form>
            </>
          ) : (
            <>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Revisa tu correo
                </h2>
                <p className="text-gray-600 mb-6">
                  Si el email está registrado, recibirás instrucciones para restablecer tu contraseña.
                </p>

                {resetToken && (
                  <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200 text-left">
                    <p className="text-sm font-medium text-yellow-800 mb-2">Modo desarrollo - Token de reset:</p>
                    <Link
                      href={`/reset-password?token=${resetToken}`}
                      className="text-sm text-primary-600 hover:text-primary-700 break-all"
                    >
                      Haz clic aquí para restablecer tu contraseña
                    </Link>
                  </div>
                )}
              </div>
            </>
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
