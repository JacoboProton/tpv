import type { OrderItem, Catalog, Employee } from '../types';
export type {};
export declare function calculatePersonalDiscountAmount(items: OrderItem[], rates: Record<string, number>, catalog?: Catalog): number;
export declare function applyDiscountRates(items: OrderItem[], rates: Record<string, number>, catalog?: Catalog): OrderItem[];
export declare function removeDiscountRates(items: OrderItem[], rates: Record<string, number>, catalog?: Catalog): OrderItem[];
export declare function buildEmployeeMonthlyUsage(employees: Employee[], empId: string, discountAmount: number, now?: Date): Employee[];
export declare function buildEmployeeMonthlyUsageDecrement(employees: Employee[], empId: string, discountAmount: number, now?: Date): Employee[];
//# sourceMappingURL=personal-discount.d.ts.map