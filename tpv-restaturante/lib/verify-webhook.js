import { createHmac } from 'node:crypto';

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function verifyWebhookSignature(rawBody, signature, secretEnvVar, encoding = 'base64') {
  const secret = process.env[secretEnvVar];
  if (!secret) {
    console.warn(`[webhook] ${secretEnvVar} no configurado — saltando verificación`);
    return true;
  }
  if (!signature) {
    console.warn('[webhook] Falta header de firma');
    return false;
  }

  const hmac = createHmac('sha256', secret);
  hmac.update(rawBody);
  const expected = hmac.digest(encoding);

  if (!timingSafeEqual(signature, expected)) {
    console.warn('[webhook] Firma inválida');
    return false;
  }

  return true;
}
