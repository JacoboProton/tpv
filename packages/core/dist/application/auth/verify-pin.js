"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyEmployeePin = verifyEmployeePin;
const crypto_1 = require("@/lib/crypto");
const API_KEY = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_TPV_API_KEY) || '';
async function verifyEmployeePin(pin) {
    try {
        const r = await fetch('/api/employees', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-tpv-key': API_KEY },
            body: JSON.stringify({ action: 'verify', pin, pinHash: await (0, crypto_1.sha256)(pin) }),
        });
        if (!r.ok)
            return null;
        return r.json();
    }
    catch (_a) {
        return null;
    }
}
