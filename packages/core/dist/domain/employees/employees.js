"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasRole = hasRole;
exports.isAdmin = isAdmin;
exports.requiresAdmin = requiresAdmin;
exports.canAccess = canAccess;
exports.formatEmployeeName = formatEmployeeName;
const ADMIN_ROUTES = new Set(['almacen', 'caja', 'config']);
const ROLE_HIERARCHY = { cocina: 0, camarero: 1, manager: 2, admin: 3 };
function hasRole(employee, requiredRole) {
    if (!employee)
        return false;
    return (ROLE_HIERARCHY[employee.role] || 0) >= (ROLE_HIERARCHY[requiredRole] || 0);
}
function isAdmin(employee) {
    return (employee === null || employee === void 0 ? void 0 : employee.role) === 'admin';
}
function requiresAdmin(entryPoint) {
    return ADMIN_ROUTES.has(entryPoint);
}
function canAccess(employee, entryPoint) {
    if (!requiresAdmin(entryPoint))
        return true;
    return isAdmin(employee);
}
function formatEmployeeName(employee) {
    if (!employee)
        return 'Sin asignar';
    return employee.role ? `${employee.name} (${employee.role})` : employee.name;
}
