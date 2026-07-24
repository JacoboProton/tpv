export function createMockRbacAuth() {
  return {
    authorized: true,
    employee: { id: 'e1', name: 'Test Admin', role: 'admin', tenantId: 'default' },
    error: undefined,
    status: undefined,
  };
}
