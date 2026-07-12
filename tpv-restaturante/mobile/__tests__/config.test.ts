import { describe, it, expect, vi } from 'vitest';

vi.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        apiUrl: 'https://test.example.com',
        stripePk: 'pk_test_abc123',
        stripeSimulated: true,
      },
    },
  },
}));

const { API_URL, STRIPE_PK, STRIPE_SIMULATED, TPV_API_KEY } = await import('../lib/config');

describe('config', () => {
  it('reads API_URL from expo-constants extra', () => {
    expect(API_URL).toBe('https://test.example.com');
  });

  it('reads STRIPE_PK from extra', () => {
    expect(STRIPE_PK).toBe('pk_test_abc123');
  });

  it('reads STRIPE_SIMULATED as boolean', () => {
    expect(STRIPE_SIMULATED).toBe(true);
  });

  it('TPV_API_KEY falls back to empty string', () => {
    expect(TPV_API_KEY).toBe('');
  });
});
