"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeLogin = executeLogin;
exports.tryRestoreSession = tryRestoreSession;
const crypto_1 = require("@/lib/crypto");
async function executeLogin(pin, deps) {
    const { fetchVerify, showToast, setPinInput } = deps;
    try {
        const res = await fetchVerify(pin, await (0, crypto_1.sha256)(pin));
        if (!res.ok) {
            showToast('PIN incorrecto');
            setPinInput('');
            return null;
        }
        const emp = await res.json();
        if (!emp || !emp.id) {
            showToast('PIN incorrecto');
            setPinInput('');
            return null;
        }
        if (emp.role !== 'admin') {
            const sessionRes = await deps.sessionLogin(emp.id, emp.role);
            if (sessionRes.conflict) {
                const forceLogin = window.confirm(`${emp.name} ya está conectado en otro terminal. ¿Cerrar esa sesión y continuar aquí?`);
                if (!forceLogin) {
                    setPinInput('');
                    return null;
                }
                await deps.sessionLogin(emp.id, emp.role, true);
            }
        }
        else {
            deps.sessionLogin(emp.id, emp.role).catch(() => { });
        }
        if (window.__keepaliveCleanup)
            window.__keepaliveCleanup();
        setPinInput('');
        window.__keepaliveCleanup = deps.startKeepalive(emp.id, () => {
            deps.showToast('Sesión cerrada en otro terminal');
            deps.logout();
        });
        return emp;
    }
    catch (_a) {
        showToast('Error de conexión');
        setPinInput('');
        return null;
    }
}
async function tryRestoreSession(emps, deps) {
    const storedUserId = localStorage.getItem('tpv:current_user');
    if (!storedUserId || deps.currentUser)
        return null;
    const emp = emps.find((e) => e.id === storedUserId);
    if (!emp) {
        localStorage.removeItem('tpv:current_user');
        return null;
    }
    try {
        const data = await deps.sessionKeepalive(emp.id);
        if (data.ok) {
            deps.setCurrentUser(emp);
            try {
                window.__employeeRole = emp.role;
                window.__employeeId = emp.id;
            }
            catch (_a) { }
            ;
            window.__keepaliveCleanup = deps.startKeepalive(emp.id, () => {
                deps.showToast('Sesión cerrada en otro terminal');
                deps.logout();
            });
            return emp;
        }
        else {
            localStorage.removeItem('tpv:current_user');
        }
    }
    catch (_b) {
        localStorage.removeItem('tpv:current_user');
    }
    return null;
}
