import type { TableStatus, Order, Table } from '../types';
export type { TableStatus };
export declare function determineTableStatus(orderIds: string[], isReserved: boolean): TableStatus;
export declare function isDebtPayment(order: Order, isFiado: boolean): boolean;
export declare function closeTableOrders(table: Table, closedOrderId: string): {
    orderId: string | null;
    orderIds: string[];
    status: TableStatus;
    isFiado: boolean;
};
export declare function removeOrderFromTable(table: Table, orderId: string): {
    orderId: string | null;
    orderIds: string[];
    status: TableStatus;
};
export declare function clearTable(table: Table): {
    orderId: null;
    orderIds: [];
    status: 'libre';
    isFiado: false;
};
//# sourceMappingURL=table.d.ts.map