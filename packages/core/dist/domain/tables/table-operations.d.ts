import type { Floor, Order } from '../types';
export type {};
export declare function moveTableOrder(floor: Floor, srcTableId: string, dstTableId: string): Floor;
export declare function mergeTables(floor: Floor, dstTableId: string, srcTableIds: string[], employeeName?: string): Floor;
export declare function reopenOrder(floor: Floor, tableId: string, historyEntry: Order): {
    floor: Floor;
    orderId: string;
};
//# sourceMappingURL=table-operations.d.ts.map