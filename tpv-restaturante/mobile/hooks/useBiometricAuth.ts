import * as LocalAuthentication from 'expo-local-authentication';
import { AppState } from 'react-native';
import { useState, useEffect, useCallback } from 'react';

export function useBiometricAuth() {
  const [supported, setSupported] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);

  const check = useCallback(async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const hasEnrollment = await LocalAuthentication.isEnrolledAsync();
      setSupported(hasHardware);
      setEnrolled(hasHardware && hasEnrollment);
    } catch {
      setSupported(false);
      setEnrolled(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') check();
    });
    void Promise.resolve().then(check);
    return () => sub.remove();
  }, [check]);

  const authenticate = useCallback(async (): Promise<boolean> => {
    if (!supported || !enrolled) return false;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Autentícate para acceder',
        fallbackLabel: 'Usar PIN',
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false,
      });
      return result.success;
    } catch {
      return false;
    }
  }, [supported, enrolled]);

  return {
    supported,
    enrolled,
    loading,
    check,
    authenticate,
  };
}