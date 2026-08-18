import type { MenuExpansionItem, Product } from '../types';
export type { MenuExpansionItem };
export declare function expandMenu(product: any, catalog: {
    products: Product[];
}, menuSel?: {
    productId: string;
}[]): MenuExpansionItem[];
export declare function expandCombo(product: any, catalog: {
    products: Product[];
}, comboSel?: {
    productId: string;
}[]): MenuExpansionItem[];
//# sourceMappingURL=menu-expansion.d.ts.map