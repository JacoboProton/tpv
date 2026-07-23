"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logoutUser = logoutUser;
function logoutUser(currentUser, deps) {
    if (currentUser) {
        const body = { employeeId: currentUser.id, employeeName: currentUser.name, action: 'salida', turnDate: new Date().toISOString().slice(0, 10) };
        deps.turnsApi(body);
        deps.logoutApi(currentUser.id).catch(() => { });
    }
    if (window.__keepaliveCleanup)
        window.__keepaliveCleanup();
    try {
        localStorage.removeItem('tpv:current_user');
        window.__employeeRole = '';
        window.__employeeId = '';
    }
    catch (_a) { }
}
