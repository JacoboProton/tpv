export interface VerifiedEmployee {
    id: string;
    name: string;
    role: string;
    personalDiscountEnabled: boolean;
    monthlyLimit: number;
    monthlyUsed: number;
    monthlyUsedMonth: string | null;
}
export declare function verifyEmployeePin(pin: string): Promise<VerifiedEmployee | null>;
//# sourceMappingURL=verify-pin.d.ts.map