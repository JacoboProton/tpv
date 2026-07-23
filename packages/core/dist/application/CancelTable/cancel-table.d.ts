import type { Floor, OrderItem } from '@/domain/types';
export interface CancelledItemInfo {
    tableId: string;
    tableName: string;
    orderId: string;
    items: OrderItem[];
    total: number;
    employeeName: string | undefined;
    reason?: string;
    cancelledAt: number;
}
export declare function cancelTable(floor: Floor, tableId: string, employeeName?: string): {
    floor: Floor;
    cancelled: CancelledItemInfo[];
};
export declare function voidTable(floor: Floor, tableId: string, reason: string, employeeName?: string): {
    floor: Floor;
    cancelled: CancelledItemInfo[];
};
//# sourceMappingURL=cancel-table.d.ts.map