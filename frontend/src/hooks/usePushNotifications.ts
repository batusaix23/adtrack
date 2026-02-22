import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

interface PushNotificationState {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission | null;
  loading: boolean;
  error: string | null;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isSubscribed: false,
    permission: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const checkSupport = async () => {
      const isSupported = 'serviceWorker' in navigator && 'PushManager' in window;

      if (!isSupported) {
        setState({
          isSupported: false,
          isSubscribed: false,
          permission: null,
          loading: false,
          error: 'Push notifications no soportadas',
        });
        return;
      }

      const permission = Notification.permission;

      // Check if already subscribed
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        setState({
          isSupported: true,
          isSubscribed: !!subscription,
          permission,
          loading: false,
          error: null,
        });
      } catch (error) {
        setState({
          isSupported: true,
          isSubscribed: false,
          permission,
          loading: false,
          error: null,
        });
      }
    };

    checkSupport();
  }, []);

  const subscribe = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // Request permission
      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        setState((prev) => ({
          ...prev,
          permission,
          loading: false,
          error: 'Permiso de notificaciones denegado',
        }));
        return false;
      }

      // Get VAPID public key
      const { data: { publicKey } } = await api.get('/push/vapid-key');

      if (!publicKey) {
        throw new Error('VAPID key not configured');
      }

      // Register service worker
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });

      // Send subscription to server
      await api.post('/push/subscribe', {
        subscription: subscription.toJSON(),
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
        },
      });

      setState((prev) => ({
        ...prev,
        isSubscribed: true,
        permission: 'granted',
        loading: false,
        error: null,
      }));

      return true;
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error.message || 'Error al suscribirse',
      }));
      return false;
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        await api.post('/push/unsubscribe', {
          endpoint: subscription.endpoint,
        });
      }

      setState((prev) => ({
        ...prev,
        isSubscribed: false,
        loading: false,
      }));

      return true;
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error.message,
      }));
      return false;
    }
  }, []);

  return { ...state, subscribe, unsubscribe };
}

// Helper function
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
