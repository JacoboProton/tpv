import type { Floor, Order, Catalog, Offer, PaymentSplit, Sale } from '@/domain/types';
export interface CloseOrderItem {
    id: string;
    productId?: string;
    name: string;
    qty: number;
    price?: number;
    modifiers?: {
        optionId: string;
    }[];
    voided?: boolean;
    sent?: boolean;
    ready?: boolean;
    served?: boolean;
}
export interface CloseOrderModifierGroup {
    id: string;
    options: CloseOrderModifierOption[];
}
export interface CloseOrderModifierOption {
    id: string;
    stockDeduct?: boolean;
    stockArticleId?: string;
    stockQuantity?: number;
}
export interface CloseOrderTable {
    id: string;
    name: string;
    orderId: string;
    isFiado?: boolean;
    [key: string]: unknown;
}
export interface CloseOrderInput {
    floor: Floor;
    selectedTableId: string;
    order: Order;
    catalog: Catalog;
    modifierData: {
        groups: CloseOrderModifierGroup[];
    };
    offers: Offer[];
    orderDiscount: number;
    tipAmount: number;
    tipMethod: string;
    paymentSplits: PaymentSplit[];
    paymentIntentId: string;
    currentUser: {
        id?: string;
        name?: string;
    } | null;
    invoice: {
        nif: string;
        name: string;
        address: string;
        email: string;
    };
    trainingMode: boolean;
}
export interface CloseOrderStockLog {
    productId: string;
    productName: string;
    oldStock: number;
    newStock: number;
    reason: string;
    employeeName?: string;
    createdAt: number;
}
export interface CloseOrderResult {
    nextFloor: Floor;
    nextCatalog: Catalog;
    sale: Sale;
    stockLogs: CloseOrderStockLog[];
    warnings: string[];
    wasDebt: boolean;
}
export declare function executeCloseOrder(input: CloseOrderInput): CloseOrderResult;
//# sourceMappingURL=close-order.d.ts.map