import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockConnectionTokens = { create: vi.fn() };
const mockLocations = {
  list: vi.fn(),
  create: vi.fn(),
};

function MockStripe() {
  return { terminal: { locations: mockLocations, connectionTokens: mockConnectionTokens } };
}

vi.mock('stripe', () => ({ default: MockStripe }));

describe('terminal-connection-token API route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns 500 when Stripe is not configured', async () => {
    const OLD_KEY = process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_SECRET_KEY;

    const { POST } = await import('../app/api/stripe/terminal-connection-token/route');
    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Stripe no configurado');

    if (OLD_KEY) process.env.STRIPE_SECRET_KEY = OLD_KEY;
  });

  it('creates connection token and location', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
    mockLocations.list.mockResolvedValue({ data: [] });
    mockLocations.create.mockResolvedValue({ id: 'loc_abc' });
    mockConnectionTokens.create.mockResolvedValue({ secret: 'ct_secret_123' });

    const { POST } = await import('../app/api/stripe/terminal-connection-token/route');
    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.connectionToken).toBe('ct_secret_123');
    expect(body.locationId).toBe('loc_abc');
    expect(mockLocations.create).toHaveBeenCalledWith({
      display_name: 'La Comanda',
      address: { line1: 'Restaurante', city: 'Ciudad', country: 'ES', postal_code: '28001' },
    });
  });

  it('uses env vars for location address when provided', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
    process.env.STRIPE_LOCATION_NAME = 'Mi Restaurante';
    process.env.STRIPE_LOCATION_LINE1 = 'Calle Mayor 1';
    process.env.STRIPE_LOCATION_CITY = 'Madrid';
    process.env.STRIPE_LOCATION_COUNTRY = 'ES';
    process.env.STRIPE_LOCATION_POSTAL_CODE = '28013';

    mockLocations.list.mockResolvedValue({ data: [] });
    mockLocations.create.mockResolvedValue({ id: 'loc_def' });
    mockConnectionTokens.create.mockResolvedValue({ secret: 'ct_secret_456' });

    const { POST } = await import('../app/api/stripe/terminal-connection-token/route');
    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockLocations.create).toHaveBeenCalledWith({
      display_name: 'Mi Restaurante',
      address: { line1: 'Calle Mayor 1', city: 'Madrid', country: 'ES', postal_code: '28013' },
    });

    delete process.env.STRIPE_LOCATION_NAME;
    delete process.env.STRIPE_LOCATION_LINE1;
    delete process.env.STRIPE_LOCATION_CITY;
    delete process.env.STRIPE_LOCATION_COUNTRY;
    delete process.env.STRIPE_LOCATION_POSTAL_CODE;
  });

  it('reuses cached location on subsequent calls', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
    mockLocations.list.mockResolvedValue({ data: [] });
    mockLocations.create.mockResolvedValue({ id: 'loc_cached' });
    mockConnectionTokens.create.mockResolvedValue({ secret: 'ct_secret_789' });

    const { POST } = await import('../app/api/stripe/terminal-connection-token/route');
    const res1 = await POST();
    const body1 = await res1.json();
    expect(body1.locationId).toBe('loc_cached');
    expect(mockLocations.create).toHaveBeenCalledTimes(1);

    const res2 = await POST();
    const body2 = await res2.json();
    expect(body2.locationId).toBe('loc_cached');
    expect(mockLocations.create).toHaveBeenCalledTimes(1);
  });
});
