import type { Floor } from '../types';
export declare function createTicket(floor: Floor, tableId: string, employeeName?: string): {
    floor: Floor;
    orderId: string;
    ticketNum: number;
};
export declare function deleteTicket(floor: Floor, tableId: string, orderId: string): {
    floor: Floor;
    activeOrderId: string | null;
};
export declare function renameTicket(floor: Floor, orderId: string, label: string): Floor;
export declare function linkCustomer(floor: Floor, orderId: string, customer: any): Floor;
export declare function unlinkCustomer(floor: Floor, orderId: string): Floor;
//# sourceMappingURL=multi-ticket.d.ts.map