import type { CurrentUser } from '@/domain/types';
export declare function logoutUser(currentUser: CurrentUser | null, deps: {
    logoutApi: (id: string) => Promise<void>;
    turnsApi: (body: {
        employeeId: string;
        employeeName: string;
        action: string;
        turnDate: string;
    }) => void;
}): void;
//# sourceMappingURL=logout.d.ts.map