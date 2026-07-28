import { test, expect } from '@playwright/test';

test('la página carga y muestra menú principal', async ({ page }) => {
  await page.goto('/', { timeout: 15000 });
  await expect(page.getByText('LA COMANDA')).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('ENTRADA')).toBeVisible({ timeout: 5000 });
});

test('flujo de login completo: ENTRADA → seleccionar empleado → PIN', async ({ page }) => {
  await page.goto('/', { timeout: 15000 });
  const entrada = page.getByText('ENTRADA');
  await expect(entrada).toBeVisible({ timeout: 10000 });
  await entrada.click();
  await expect(page.getByText('Selecciona tu usuario')).toBeVisible({ timeout: 5000 });
  await page.getByRole('button', { name: /Administrador/ }).first().click();
  await expect(page.getByText('Introduce tu PIN de 4 dígitos')).toBeVisible({ timeout: 5000 });
});
