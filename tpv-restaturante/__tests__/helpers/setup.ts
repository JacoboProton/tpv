import { vi, beforeEach } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  process.env.TPV_API_KEY = 'test-api-key';
  process.env.NEXT_PUBLIC_TPV_API_KEY = 'test-api-key';
  process.env.DATABASE_URL = 'postgres://mock:mock@localhost:5432/mock';
});
