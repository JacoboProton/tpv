import type { VerifiedEmployee } from '@/application/auth/verify-pin';
import type { Floor, Catalog, Employee } from '@/domain/types';
export interface ApplyPersonalDiscountDeps {
    verifyEmployeePin: (pin: string) => Promise<VerifiedEmployee | null>;
    getRates: () => Record<string, number>;
    showToast: (msg: string) => void;
    euros: (n: number) => string;
}
export declare function applyPersonalDiscount(floor: Floor, employees: Employee[], catalog: Catalog, orderId: string, employeePin: string, deps: ApplyPersonalDiscountDeps): Promise<{
    floor: Floor;
    employees: Employee[];
} | null>;
export interface RemovePersonalDiscountDeps {
    getRates: () => Record<string, number>;
    showToast: (msg: string) => void;
}
export declare function removePersonalDiscount(floor: Floor, employees: Employee[], catalog: Catalog, orderId: string, deps: RemovePersonalDiscountDeps): {
    floor: Floor;
    employees: Employee[];
} | null;
//# sourceMappingURL=apply-personal-discount.d.ts.map