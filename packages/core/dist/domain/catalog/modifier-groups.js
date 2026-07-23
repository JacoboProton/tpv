"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getModifierGroupsForProduct = getModifierGroupsForProduct;
function getModifierGroupsForProduct(modifierData, productId) {
    const groupIds = modifierData.productModifiers[productId] || [];
    return modifierData.groups.filter(g => groupIds.includes(g.id));
}
