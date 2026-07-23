import type { NewProductInput, StockDelta, Product, Catalog } from '../types';
export type { NewProductInput, StockDelta };
export declare function createProduct(data: NewProductInput): Product;
export declare function ensureCategoryExists(catalog: Catalog, category: string): Catalog;
export declare function removeProduct(catalog: Catalog, productId: string): Catalog;
export declare function toggleProductAgotado(catalog: Catalog, productId: string, agotado: boolean): Catalog;
export declare function getProductImage(catalog: Catalog, productId: string): string | undefined;
export declare function addProductToCatalog(catalog: Catalog, productData: NewProductInput): Catalog;
export declare function setProductField(catalog: Catalog, productId: string, field: string, value: any): Catalog | null;
export declare function getLowStockProducts(catalog: Catalog): Product[];
export declare function detectStockChanges(oldCatalog: Catalog, newCatalog: Catalog, productId: string): StockDelta[];
//# sourceMappingURL=product-operations.d.ts.map