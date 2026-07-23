"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadClockinSummary = loadClockinSummary;
exports.handleClockinAction = handleClockinAction;
async function loadClockinSummary(currentUser, deps) {
    if (!currentUser)
        return;
    deps.setClockinLoading(true);
    try {
        const data = await deps.fetchSummary(currentUser.id, new Date().toISOString().slice(0, 10));
        deps.setClockinSummary(data.summary || null);
    }
    catch (_a) { }
    deps.setClockinLoading(false);
}
async function handleClockinAction(currentUser, action, deps) {
    if (!currentUser)
        return;
    try {
        const r = await deps.fetchClockin({
            employeeId: currentUser.id,
            employeeName: currentUser.name,
            method: 'tpc',
            action,
        });
        const data = await r.json();
        if (data.ok) {
            deps.showToast(`✅ ${action} registrada`);
            loadClockinSummary(currentUser, deps);
        }
        else {
            deps.showToast('❌ ' + (data.error || 'Error'));
        }
    }
    catch (_a) {
        deps.showToast('❌ Error de conexión');
    }
}
