"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProduct = createProduct;
exports.ensureCategoryExists = ensureCategoryExists;
exports.removeProduct = removeProduct;
exports.toggleProductAgotado = toggleProductAgotado;
exports.getProductImage = getProductImage;
exports.addProductToCatalog = addProductToCatalog;
exports.setProductField = setProductField;
exports.getLowStockProducts = getLowStockProducts;
exports.detectStockChanges = detectStockChanges;
function createProduct(data) {
    var _a, _b;
    const loc = data.ubicacion || 'Bar';
    return {
        id: 'p_' + Date.now(),
        name: data.name,
        price: Number(data.price),
        category: data.category,
        ubicacion: loc,
        discount: 0,
        stockByLocation: {
            [loc]: { stock: Number((_a = data.stock) !== null && _a !== void 0 ? _a : 0), lowStock: Number((_b = data.lowStock) !== null && _b !== void 0 ? _b : 0) },
        },
    };
}
function ensureCategoryExists(catalog, category) {
    if (catalog.categories.some(c => c.name === category))
        return catalog;
    return Object.assign(Object.assign({}, catalog), { categories: [...catalog.categories, { id: 'cat_' + Date.now(), name: category }] });
}
function removeProduct(catalog, productId) {
    return Object.assign(Object.assign({}, catalog), { products: catalog.products.filter(p => p.id !== productId) });
}
function toggleProductAgotado(catalog, productId, agotado) {
    return Object.assign(Object.assign({}, catalog), { products: catalog.products.map(p => p.id === productId ? Object.assign(Object.assign({}, p), { agotado }) : p) });
}
function getProductImage(catalog, productId) {
    var _a, _b;
    return (_b = (_a = catalog === null || catalog === void 0 ? void 0 : catalog.products) === null || _a === void 0 ? void 0 : _a.find(p => p.id === productId)) === null || _b === void 0 ? void 0 : _b.image;
}
function addProductToCatalog(catalog, productData) {
    const next = JSON.parse(JSON.stringify(catalog));
    next.products.push(createProduct(productData));
    return ensureCategoryExists(next, productData.category);
}
function setProductField(catalog, productId, field, value) {
    const next = JSON.parse(JSON.stringify(catalog));
    const p = next.products.find(p => p.id === productId);
    if (!p)
        return null;
    if (field === 'stockByLocation') {
        p.stockByLocation = value;
    }
    else {
        p[field] = (field === 'name' || field === 'category' || field === 'ubicacion') ? value : Number(value);
    }
    return next;
}
function getLowStockProducts(catalog) {
    if (!(catalog === null || catalog === void 0 ? void 0 : catalog.products))
        return [];
    return catalog.products.filter(p => {
        if (!p.stockByLocation)
            return false;
        return Object.values(p.stockByLocation).some((entry) => { var _a; return entry.stock <= ((_a = entry.lowStock) !== null && _a !== void 0 ? _a : 0); });
    });
}
function detectStockChanges(oldCatalog, newCatalog, productId) {
    var _a, _b;
    const oldProduct = (_a = oldCatalog === null || oldCatalog === void 0 ? void 0 : oldCatalog.products) === null || _a === void 0 ? void 0 : _a.find(p => p.id === productId);
    const newProduct = (_b = newCatalog === null || newCatalog === void 0 ? void 0 : newCatalog.products) === null || _b === void 0 ? void 0 : _b.find(p => p.id === productId);
    if (!oldProduct || !newProduct)
        return [];
    const deltas = [];
    const oldStockByLocation = oldProduct.stockByLocation || {};
    const newStockByLocation = newProduct.stockByLocation || {};
    for (const [loc, entry] of Object.entries(newStockByLocation)) {
        const oldEntry = oldStockByLocation[loc] || { stock: 0 };
        const delta = entry.stock - oldEntry.stock;
        if (delta !== 0) {
            deltas.push({
                productId,
                productName: newProduct.name,
                ubicacion: loc,
                delta,
                newStock: entry.stock,
            });
        }
    }
    return deltas;
}
