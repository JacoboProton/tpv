import type { OrderItem, Product } from '../types';
export declare function calculateLineTotal(item: OrderItem, product?: Product): number;
export declare function calculateOrderSubtotal(items: OrderItem[], catalog?: {
    products?: Product[];
}): number;
//# sourceMappingURL=line-totals.d.ts.map