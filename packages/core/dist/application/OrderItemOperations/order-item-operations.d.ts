import type { Floor } from '@/domain/types';
export declare function changeItemQuantity(floor: Floor, orderId: string, itemId: string, delta: number): Floor | null;
export declare function updateItemNotes(floor: Floor, orderId: string, itemId: string, notes: string): Floor | null;
export declare function removeItemFromOrder(floor: Floor, tableId: string, orderId: string, itemId: string): Floor | null;
export declare function sendToKitchenCourse(floor: Floor, orderId: string, course?: string): Floor | null;
export declare function sendSingleItemToKitchen(floor: Floor, orderId: string, itemId: string): {
    floor: Floor;
    itemName: string;
    course: string;
    tableName: string;
} | null;
export declare function updateItemCourse(floor: Floor, orderId: string, itemId: string, course?: string): Floor | null;
export declare function markItemsReady(floor: Floor, orderId: string, ubicacion?: string): {
    floor: Floor;
    names: string[];
    tableName: string;
} | null;
export declare function voidOrderItem(floor: Floor, orderId: string, itemId: string, reason: string, voidedBy?: string): Floor | null;
export declare function setLineDiscount(floor: Floor, orderId: string, itemId: string, pct: number): Floor | null;
export declare function removeLineDiscount(floor: Floor, orderId: string, itemId: string): Floor | null;
export declare function setItemCourtesy(floor: Floor, orderId: string, itemId: string): Floor | null;
export declare function removeItemCourtesy(floor: Floor, orderId: string, itemId: string): Floor | null;
export declare function setItemOverridePrice(floor: Floor, orderId: string, itemId: string, newPrice: number): Floor | null;
//# sourceMappingURL=order-item-operations.d.ts.map