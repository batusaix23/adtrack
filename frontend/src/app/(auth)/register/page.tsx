'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import toast from 'react-hot-toast';

interface RegisterForm {
  companyName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const { register: registerUser } = useAuth();
  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterForm>();
  const password = watch('password');

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    try {
      await registerUser({
        companyName: data.companyName,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        password: data.password,
      });
      toast.success('Cuenta creada exitosamente');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al registrar');
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
            Únete a nuestra plataforma
          </h1>
          <p className="text-primary-100 text-lg mb-8">
            Digitaliza tu negocio de mantenimiento de piscinas y mejora la eficiencia de tu equipo.
          </p>
          <ul className="space-y-3 text-primary-100">
            <li className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Gestión de clientes y piscinas
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Control de inventario en tiempo real
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Reportes y analíticas avanzadas
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              App móvil para técnicos
            </li>
          </ul>
        </div>
        <div />
      </div>

      {/* Right side - form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            {/* Progress indicator */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {[1, 2].map((s) => (
                <div
                  key={s}
                  className={`w-3 h-3 rounded-full ${
                    s <= step ? 'bg-primary-600' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {step === 1 ? 'Información de la empresa' : 'Tu información'}
            </h2>
            <p className="text-gray-600 mb-6">
              {step === 1 ? 'Paso 1 de 2' : 'Paso 2 de 2'}
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {step === 1 ? (
                <>
                  <Input
                    label="Nombre de la empresa"
                    placeholder="Mi Empresa de Piscinas"
                    error={errors.companyName?.message}
                    {...register('companyName', { required: 'El nombre es requerido' })}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Nombre"
                      placeholder="Juan"
                      error={errors.firstName?.message}
                      {...register('firstName', { required: 'Requerido' })}
                    />
                    <Input
                      label="Apellido"
                      placeholder="García"
                      error={errors.lastName?.message}
                      {...register('lastName', { required: 'Requerido' })}
                    />
                  </div>

                  <Input
                    label="Teléfono"
                    type="tel"
                    placeholder="555-0100"
                    {...register('phone')}
                  />

                  <Button
                    type="button"
                    className="w-full"
                    onClick={() => setStep(2)}
                  >
                    Continuar
                  </Button>
                </>
              ) : (
                <>
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
                      minLength: { value: 8, message: 'Mínimo 8 caracteres' },
                    })}
                  />

                  <Input
                    label="Confirmar contraseña"
                    type="password"
                    placeholder="••••••••"
                    error={errors.confirmPassword?.message}
                    {...register('confirmPassword', {
                      required: 'Confirma tu contraseña',
                      validate: (value) => value === password || 'Las contraseñas no coinciden',
                    })}
                  />

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      className="flex-1"
                      onClick={() => setStep(1)}
                    >
                      Atrás
                    </Button>
                    <Button type="submit" className="flex-1" loading={loading}>
                      Crear cuenta
                    </Button>
                  </div>
                </>
              )}
            </form>

            <p className="mt-6 text-center text-gray-600">
              ¿Ya tienes cuenta?{' '}
              <Link href="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                Iniciar sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
