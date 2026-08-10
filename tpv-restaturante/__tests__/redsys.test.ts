import { describe, it, expect, beforeEach } from 'vitest';
import {
  createMerchantSignature,
  createNotificationSignature,
  decodeMerchantParameters,
  encodeMerchantParameters,
  isAuthorizedResponse,
  verifyNotificationSignature,
} from '../lib/redsys';

const SECRET = 'Mk9m98IfEblqP5pskV2UFFmJhgPEX27h';

const REQUEST_PARAMS: Record<string, string> = {
  DS_MERCHANT_AMOUNT: '145',
  DS_MERCHANT_ORDER: '1444649019',
  DS_MERCHANT_MERCHANTCODE: '999008881',
  DS_MERCHANT_CURRENCY: '978',
  DS_MERCHANT_TRANSACTIONTYPE: '0',
  DS_MERCHANT_TERMINAL: '1',
  DS_MERCHANT_MERCHANTURL: 'https://tpv.local/api/redsys/callback',
};

// Golden vectors from node-redsys-api v1 (canonical Node port), verified byte-for-byte
const GOLDEN_MP_REQUEST =
  'eyJEU19NRVJDSEFOVF9BTU9VTlQiOiIxNDUiLCJEU19NRVJDSEFOVF9PUkRFUiI6IjE0NDQ2NDkwMTkiLCJEU19NRVJDSEFOVF9NRVJDSEFOVENPREUiOiI5OTkwMDg4ODEiLCJEU19NRVJDSEFOVF9DVVJSRU5DWSI6Ijk3OCIsIkRTX01FUkNIQU5UX1RSQU5TQUNUSU9OVFlQRSI6IjAiLCJEU19NRVJDSEFOVF9URVJNSU5BTCI6IjEiLCJEU19NRVJDSEFOVF9NRVJDSEFOVFVSTCI6Imh0dHBzOi8vdHB2LmxvY2FsL2FwaS9yZWRzeXMvY2FsbGJhY2sifQ==';
const GOLDEN_SIG_REQUEST = 'DVgmV17nSDs+BPdg1ijPuf3kl6VrO5+CbnTEV1fqnU4=';

const GOLDEN_MP_NOTIF =
  'eyJEc19BbW91bnQiOiIxNDUiLCJEc19PcmRlciI6IjE0NDQ2NDkwMTkiLCJEc19NZXJjaGFudENvZGUiOiI5OTkwMDg4ODEiLCJEc19DdXJyZW5jeSI6Ijk3OCIsIkRzX1RyYW5zYWN0aW9uVHlwZSI6IjAiLCJEc19UZXJtaW5hbCI6IjEiLCJEc19SZXNwb25zZSI6IjAwMDAifQ==';
const GOLDEN_SIG_NOTIF =
  '4QK5HIPE4HD8NtOWOoWOGS3mR2IAAXQJAb41kTIBXys';

describe('lib/redsys — request signature', () => {
  it('codifica MerchantParameters como base64(JSON) sin saltos de línea', () => {
    const mp = encodeMerchantParameters(REQUEST_PARAMS);
    expect(mp).toBe(GOLDEN_MP_REQUEST);
    expect(mp).not.toMatch(/\s/);
  });

  it('genera la firma de petición idéntica al vector dorado', () => {
    const sig = createMerchantSignature(SECRET, REQUEST_PARAMS);
    expect(sig).toBe(GOLDEN_SIG_REQUEST);
  });

  it('es determinista', () => {
    expect(createMerchantSignature(SECRET, REQUEST_PARAMS))
      .toBe(createMerchantSignature(SECRET, REQUEST_PARAMS));
  });

  it('lanza error si falta DS_MERCHANT_ORDER', () => {
    const withoutOrder = { ...REQUEST_PARAMS };
    delete withoutOrder.DS_MERCHANT_ORDER;
    expect(() => createMerchantSignature(SECRET, withoutOrder)).toThrow('DS_MERCHANT_ORDER');
  });

  it('varía con el pedido (clave de operación por pedido)', () => {
    const otraFirma = createMerchantSignature(SECRET, { ...REQUEST_PARAMS, DS_MERCHANT_ORDER: '1444649020' });
    expect(otraFirma).not.toBe(GOLDEN_SIG_REQUEST);
  });
});

describe('lib/redsys — notificación (respuesta del TPV)', () => {
  it('decodifica MerchantParameters de la notificación', () => {
    const decoded = decodeMerchantParameters(GOLDEN_MP_NOTIF);
    expect(decoded.Ds_Response).toBe('0000');
    expect(decoded.Ds_Order).toBe('1444649019');
    expect(decoded.Ds_Amount).toBe('145');
  });

  it('recalcula la firma de notificación contra el vector dorado', () => {
    const sig = createNotificationSignature(SECRET, GOLDEN_MP_NOTIF);
    const norm = (s: string) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    expect(norm(sig).toString('hex')).toBe(norm(GOLDEN_SIG_NOTIF).toString('hex'));
  });

  it('verifica una notificación válida', () => {
    expect(verifyNotificationSignature(SECRET, GOLDEN_MP_NOTIF, GOLDEN_SIG_NOTIF)).toBe(true);
  });

  it('rechaza firma manipulada', () => {
    const tampered = { ...decodeMerchantParameters(GOLDEN_MP_NOTIF), Ds_Response: '9180' };
    const mp = encodeMerchantParameters(tampered);
    expect(verifyNotificationSignature(SECRET, mp, GOLDEN_SIG_NOTIF)).toBe(false);
  });

  it('rechaza importe manipulado aunque la firma de orden coincida', () => {
    const tampered = { ...decodeMerchantParameters(GOLDEN_MP_NOTIF), Ds_Amount: '9999' };
    const mp = encodeMerchantParameters(tampered);
    expect(verifyNotificationSignature(SECRET, mp, GOLDEN_SIG_NOTIF)).toBe(false);
  });

  it('rechaza clave incorrecta', () => {
    expect(verifyNotificationSignature('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', GOLDEN_MP_NOTIF, GOLDEN_SIG_NOTIF)).toBe(false);
  });

  it('rechaza base64 basura sin lanzar excepción', () => {
    expect(verifyNotificationSignature(SECRET, 'no-es-base64', GOLDEN_SIG_NOTIF)).toBe(false);
  });
});

describe('lib/redsys — códigos de respuesta', () => {
  const notif = (response: string) => ({ ...decodeMerchantParameters(GOLDEN_MP_NOTIF), Ds_Response: response });

  it('acepta 0000 (autorizada)', () => {
    expect(isAuthorizedResponse(notif('0000'))).toBe(true);
  });

  it('acepta códigos 0000-0099', () => {
    expect(isAuthorizedResponse(notif('0099'))).toBe(true);
  });

  it('rechaza denegada (101)', () => {
    expect(isAuthorizedResponse(notif('0101'))).toBe(false);
  });

  it('rechaza no-numérico', () => {
    expect(isAuthorizedResponse(notif('NAN'))).toBe(false);
  });
});

describe('lib/redsys — sanity', () => {
  beforeEach(() => {
    // no-op: kept for clarity that each test recomputes signatures independently
  });

  it('round-trip encode/decode preserva valores con URL-encoding', () => {
    const params = { ...REQUEST_PARAMS, DS_MERCHANT_MERCHANTURL: 'https://a.com/x?y=1&z=2' };
    const decoded = decodeMerchantParameters(encodeMerchantParameters(params));
    expect(decoded.DS_MERCHANT_MERCHANTURL).toBe('https://a.com/x?y=1&z=2');
  });
});