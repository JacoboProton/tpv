import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Floor, Employee } from './types';
import { setEmployeeSession, clearEmployeeSession, setTenantId as setApiTenantId } from './api';

interface AppState {
  floor: Floor | null;
  user: Employee | null;
  tenantId: string;
  setFloor: (f: Floor | null) => void;
  setUser: (u: Employee | null) => void;
  setTenantId: (id: string) => void;
}

const AppContext = createContext<AppState | null>(null);

const STORAGE_KEY = 'tpv:tenant';

export function AppProvider({ children }: { children: ReactNode }) {
  const [floor, setFloor] = useState<Floor | null>(null);
  const [user, setUser] = useState<Employee | null>(null);
  const [tenantId, setTenantIdState] = useState('default');

  // Load persisted tenant on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(stored => {
      const id = stored || 'default';
      setTenantIdState(id);
      setApiTenantId(id);
    });
  }, []);

  const setUserWithSession = (u: Employee | null) => {
    setUser(u);
    if (u) setEmployeeSession(u.id, u.role);
    else clearEmployeeSession();
  };

  const handleSetTenantId = (id: string) => {
    setTenantIdState(id);
    setApiTenantId(id);
    AsyncStorage.setItem(STORAGE_KEY, id);
  };

  return (
    <AppContext.Provider value={{ floor, user, tenantId, setFloor, setUser: setUserWithSession, setTenantId: handleSetTenantId }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}
