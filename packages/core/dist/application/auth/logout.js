export function logoutUser(currentUser, deps) {
    var _a, _b;
    if (currentUser) {
        const body = { employeeId: currentUser.id, employeeName: currentUser.name, action: 'salida', turnDate: new Date().toISOString().slice(0, 10) };
        deps.turnsApi(body);
        deps.logoutApi(currentUser.id).catch(() => { });
    }
    (_a = deps.keepaliveCleanup) === null || _a === void 0 ? void 0 : _a.call(deps);
    (_b = deps.clearSession) === null || _b === void 0 ? void 0 : _b.call(deps);
}
//# sourceMappingURL=logout.js.map