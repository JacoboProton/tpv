import { test, expect } from '@playwright/test';

test.describe('Flujo crítico de negocio', () => {

  test('login completo con PIN y vista salón con mesas', async ({ page }) => {
    await page.goto('/', { timeout: 15000 });
    await page.getByText('ENTRADA').click();
    await page.getByText('Administrador').first().click();
    for (const d of ['1', '2', '3', '4']) {
      await page.getByRole('button', { name: d, exact: true }).click();
    }
    await expect(page.getByText('SALÓN')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Mesa 1')).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: 'Usar' }).first()).toBeVisible({ timeout: 5000 });
  });

  test('abrir comanda de mesa y ver buscador de productos', async ({ page }) => {
    await page.goto('/', { timeout: 15000 });
    await page.getByText('ENTRADA').click();
    await page.getByText('Administrador').first().click();
    for (const d of ['1', '2', '3', '4']) {
      await page.getByRole('button', { name: d, exact: true }).click();
    }
    await expect(page.getByText('SALÓN')).toBeVisible({ timeout: 8000 });

    const usarBtn = page.getByRole('button', { name: 'Usar' }).first();
    await expect(usarBtn).toBeVisible({ timeout: 8000 });
    await usarBtn.click();
    await expect(page.getByPlaceholder('Buscar productos (/)')).toBeVisible({ timeout: 8000 });
  });

});
