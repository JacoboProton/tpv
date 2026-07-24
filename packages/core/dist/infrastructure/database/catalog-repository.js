export function findProduct(catalog, productId) {
    var _a;
    return ((_a = catalog === null || catalog === void 0 ? void 0 : catalog.products) === null || _a === void 0 ? void 0 : _a.find(p => p.id === productId)) || null;
}
//# sourceMappingURL=catalog-repository.js.map