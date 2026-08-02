import type { PaymentSplit, Payment } from '../types.js';
export type { PaymentSplit, Payment };
export declare function buildPayments(splits: PaymentSplit[]): Payment[];
export declare function isFiado(payments: Payment[]): boolean;
export declare function hasPendingBizum(payments: Payment[]): boolean;
export declare function formatPaymentMethod(payments: Payment[]): string;
export declare function isCardPayment(payments: Payment[]): boolean;
//# sourceMappingURL=payments.d.ts.map