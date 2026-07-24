export interface CatalogProduct {
    id: string;
    name: string;
    category: string;
    price: number;
    ubicacion: string;
    image?: string | null;
    allergens?: string[];
    description?: string | null;
    featured?: boolean;
    active?: boolean;
    showTpv?: boolean;
    showQr?: boolean;
    agotado?: boolean;
    carouselSort?: number | null;
    type?: string;
    inventariable?: boolean;
    discount?: number;
    stockByLocation?: Record<string, {
        stock: number;
        lowStock?: number;
    }>;
    stock?: number;
    lowStock?: number;
    course?: string;
}
export interface Catalog {
    products: CatalogProduct[];
    categories: string[];
    combos: any[];
    mealMenus: any[];
    priceRules: any[];
    carrusel?: any[];
    cartas?: any[];
}
export declare function findProduct(catalog: Catalog | null, productId: string): CatalogProduct | null;
//# sourceMappingURL=catalog-repository.d.ts.map