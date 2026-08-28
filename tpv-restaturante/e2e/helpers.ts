import { Page, expect } from '@playwright/test';

// Para los tests de login: flujo completo de autenticación vía UI.
export async function loginAsAdmin(page: Page) {
  await page.goto('/', { timeout: 20000 });
  await expect(page.getByText('LA COMANDA')).toBeVisible({ timeout: 15000 });
  await page.getByText('ENTRADA').click();
  await expect(page.getByText('Selecciona tu usuario')).toBeVisible({ timeout: 8000 });
  await page.getByRole('button', { name: /Administrador/ }).first().click();
  await expect(page.getByText('Introduce tu PIN de 4 dígitos')).toBeVisible({ timeout: 8000 });
  for (const d of ['1', '2', '3', '4']) {
    await page.getByRole('button', { name: d, exact: true }).click();
  }
  await expect(page.getByText('SALÓN')).toBeVisible({ timeout: 30000 });
  await expect(page.getByText('Mesa 1')).toBeVisible({ timeout: 10000 });
}
