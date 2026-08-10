import { createCipheriv, createHmac, timingSafeEqual } from 'crypto';

export const REDSYS_SIGNATURE_VERSION = 'HMAC_SHA256_V1';
export const REDSYS_TEST_URL = 'https://sis-t.redsys.es:25443/sis/realizarPago';
export const REDSYS_PROD_URL = 'https://sis.redsys.es/sis/realizarPago';
export const REDSYS_CURRENCY_EUR = '978';
export const REDSYS_TRANSACTION_TYPE_AUTHORIZATION = '0';

const ZERO_IV = Buffer.alloc(8, 0);

function zeroPadTo8(value: string): Buffer {
  const buf = Buffer.from(value, 'utf8');
  const pad = Buffer.alloc((8 - (buf.length % 8)) % 8, 0);
  return Buffer.concat([buf, pad]);
}

function encryptOrderKey(orderId: string, secretKeyB64: string): Buffer {
  const key = Buffer.from(secretKeyB64, 'base64');
  if (key.length !== 24) {
    throw new Error('redsys: la clave de comercio debe codificar 24 bytes (3DES)');
  }
  const cipher = createCipheriv('des-ede3-cbc', key, ZERO_IV);
  cipher.setAutoPadding(false);
  const encrypted = Buffer.concat([cipher.update(zeroPadTo8(orderId)), cipher.final()]);
  return encrypted;
}

export function encodeMerchantParameters(params: Record<string, string | number>): string {
  return Buffer.from(JSON.stringify(params)).toString('base64');
}

export function decodeMerchantParameters(encoded: string): Record<string, string> {
  const json = Buffer.from(encoded, 'base64').toString('utf8');
  const parsed = JSON.parse(json) as Record<string, string>;
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(parsed)) {
    result[decodeURIComponent(k)] = decodeURIComponent(String(v));
  }
  return result;
}

export function createMerchantSignature(
  secretKeyB64: string,
  params: Record<string, string | number>,
): string {
  const merchantParameters = encodeMerchantParameters(params);
  const orderId = String(params.DS_MERCHANT_ORDER ?? params.Ds_Merchant_Order ?? '');
  if (!orderId) {
    throw new Error('redsys: falta DS_MERCHANT_ORDER');
  }
  const orderKey = encryptOrderKey(orderId, secretKeyB64);
  return createHmac('sha256', orderKey).update(merchantParameters).digest('base64');
}

export function createNotificationSignature(
  secretKeyB64: string,
  merchantParametersB64: string,
): string {
  const decoded = decodeMerchantParameters(merchantParametersB64);
  const orderId = decoded.Ds_Order ?? decoded.DS_ORDER ?? '';
  if (!orderId) {
    throw new Error('redsys: falta Ds_Order en la notificación');
  }
  const orderKey = encryptOrderKey(orderId, secretKeyB64);
  return createHmac('sha256', orderKey).update(merchantParametersB64).digest('base64');
}

function normalizeBase64(sig: string): Buffer {
  return Buffer.from(sig.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

export function verifyNotificationSignature(
  secretKeyB64: string,
  merchantParametersB64: string,
  receivedSignature: string,
): boolean {
  try {
    const expected = normalizeBase64(createNotificationSignature(secretKeyB64, merchantParametersB64));
    const received = normalizeBase64(receivedSignature);
    if (expected.length !== received.length) return false;
    return timingSafeEqual(expected, received);
  } catch {
    return false;
  }
}

export function isAuthorizedResponse(decoded: Record<string, string>): boolean {
  const code = Number(decoded.Ds_Response ?? decoded.DS_RESPONSE);
  return Number.isInteger(code) && code >= 0 && code < 100;
}