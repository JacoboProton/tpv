export function getModifierGroupsForProduct(modifierData, productId) {
    const groupIds = modifierData.productModifiers[productId] || [];
    return modifierData.groups.filter(g => groupIds.includes(g.id));
}
//# sourceMappingURL=modifier-groups.js.map