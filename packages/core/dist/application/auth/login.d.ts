import type { Employee } from '@/domain/types';
export interface LoginDeps {
    fetchVerify: (pin: string, pinHash: string) => Promise<Response>;
    sessionLogin: (id: string, role: string, force?: boolean) => Promise<{
        conflict?: boolean;
    }>;
    startKeepalive: (id: string, onConflict: () => void) => (() => void) | undefined;
    logout: () => void;
    showToast: (msg: string) => void;
    setPinInput: (v: string) => void;
}
export declare function executeLogin(pin: string, deps: LoginDeps): Promise<Employee | null>;
export interface RestoreSessionDeps {
    sessionKeepalive: (id: string) => Promise<{
        ok?: boolean;
    }>;
    startKeepalive: (id: string, onConflict: () => void) => (() => void) | undefined;
    logout: () => void;
    showToast: (msg: string) => void;
    setCurrentUser: (u: Employee) => void;
    currentUser: Employee | null;
}
export declare function tryRestoreSession(emps: Employee[], deps: RestoreSessionDeps): Promise<Employee | null>;
//# sourceMappingURL=login.d.ts.map