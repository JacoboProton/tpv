import type { OrderItem } from '../types.js';
import type { OrderTotals } from '../types.js';
export type { OrderTotals };
export declare function calculateSubtotal(items: OrderItem[]): number;
export declare function calculateDiscountAmount(subtotal: number, discountPct: number): number;
export declare function calculateTotal(subtotal: number, discountAmount: number): number;
export declare function calculateTotalWithTip(total: number, tip: number): number;
export declare function calculateOrderTotals(items: OrderItem[], discountPct: number, offerDiscountAmount: number, tip: number): OrderTotals;
//# sourceMappingURL=order.d.ts.map