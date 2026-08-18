import type { CurrentUser } from '../../domain/types';
export interface LogoutDeps {
    logoutApi: (id: string) => Promise<void>;
    turnsApi: (body: {
        employeeId: string;
        employeeName: string;
        action: string;
        turnDate: string;
    }) => void;
    keepaliveCleanup?: () => void;
    clearSession?: () => void;
}
export declare function logoutUser(currentUser: CurrentUser | null, deps: LogoutDeps): void;
//# sourceMappingURL=logout.d.ts.map