import type { CurrentUser } from '@/domain/types';
export interface ClockinDeps {
    fetchSummary: (employeeId: string, date: string) => Promise<{
        summary?: unknown;
    }>;
    fetchClockin: (body: {
        employeeId: string;
        employeeName: string;
        method: string;
        action: string;
    }) => Promise<Response>;
    showToast: (msg: string) => void;
    setClockinSummary: (s: unknown) => void;
    setClockinLoading: (v: boolean) => void;
}
export declare function loadClockinSummary(currentUser: CurrentUser | null, deps: ClockinDeps): Promise<void>;
export declare function handleClockinAction(currentUser: CurrentUser | null, action: string, deps: ClockinDeps): Promise<void>;
//# sourceMappingURL=clockin.d.ts.map