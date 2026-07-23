"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEmployee = createEmployee;
exports.canDeleteEmployee = canDeleteEmployee;
exports.buildTrainingFloor = buildTrainingFloor;
function createEmployee(data) {
    return Object.assign({ id: 'e_' + Date.now() }, data);
}
function canDeleteEmployee(employees, employeeId) {
    const target = employees.find((e) => e.id === employeeId);
    if (!target)
        return { allowed: true };
    if (target.role === 'admin') {
        const adminCount = employees.filter((e) => e.role === 'admin').length;
        if (adminCount <= 1)
            return { allowed: false, error: 'Tiene que quedar al menos un administrador' };
    }
    return { allowed: true };
}
function buildTrainingFloor(floor) {
    const tables = ((floor === null || floor === void 0 ? void 0 : floor.tables) || []).map((t) => (Object.assign(Object.assign({}, t), { orderId: null, orderIds: [], status: 'libre', reserved: null, isFiado: false })));
    return Object.assign(Object.assign({}, JSON.parse(JSON.stringify(floor))), { tables, orders: {}, history: {} });
}
