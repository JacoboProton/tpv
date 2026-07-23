import type { Floor, Catalog, Product } from '@/domain/types';
export interface AddNormalItemInput {
    product: Product;
    modifiers?: any[];
    extraPrice?: number;
    employeeName?: string;
    activeTicketId?: string | null;
}
export interface AddNormalItemResult {
    floor: Floor;
    orderId: string;
    isNewOrder: boolean;
    itemId?: string;
}
export declare function addNormalItem(floor: Floor, tableId: string, catalog: Catalog, input: AddNormalItemInput): AddNormalItemResult | null;
export interface AddMenuItemsInput {
    product: Product;
    menuSel?: {
        productId: string;
    }[];
    employeeName?: string;
}
export interface AddItemsResult {
    floor: Floor;
    orderId: string;
    isNewOrder: boolean;
}
export declare function addMenuItems(floor: Floor, tableId: string, catalog: Catalog, input: AddMenuItemsInput): AddItemsResult | null;
export declare function addComboItems(floor: Floor, tableId: string, catalog: Catalog, input: AddMenuItemsInput): AddItemsResult | null;
export interface EditItemModifiersInput {
    itemId: string;
    product: Product;
    modifiers: any[];
    extraPrice: number;
}
export declare function editItemModifiers(floor: Floor, tableId: string, catalog: Catalog, input: EditItemModifiersInput): Floor | null;
//# sourceMappingURL=add-items-to-order.d.ts.map