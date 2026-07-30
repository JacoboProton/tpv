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

  test('cobro completo con verificación Verifactu vía API', async ({ page }) => {
    // ── 1. Login ──
    await page.goto('/', { timeout: 15000 });
    await expect(page.getByText('LA COMANDA')).toBeVisible({ timeout: 10000 });
    await page.getByText('ENTRADA').click();
    await page.getByText('Administrador').first().click();
    for (const d of ['1', '2', '3', '4']) {
      await page.getByRole('button', { name: d, exact: true }).click();
    }
    await expect(page.getByText('SALÓN')).toBeVisible({ timeout: 8000 });

    // ── 2. Abrir mesa ──
    await page.getByRole('button', { name: 'Usar' }).first().click();
    await expect(page.getByPlaceholder('Buscar productos (/)')).toBeVisible({ timeout: 8000 });

    // ── 3. Añadir producto ──
    await page.getByPlaceholder('Buscar productos (/)').fill('Patatas Bravas');
    await page.waitForTimeout(500);
    const productBtn = page.getByRole('button', { name: /Patatas Bravas/ }).first();
    await expect(productBtn).toBeVisible({ timeout: 3000 });
    await productBtn.click();
    await expect(page.getByText('Patatas Bravas')).toBeVisible({ timeout: 3000 });

    // ── 4. Abrir cobro ──
    await page.getByRole('button', { name: 'Cobrar' }).click();
    await expect(page.getByText(/Queda:/)).toBeVisible({ timeout: 3000 });

    // ── 5. Pagar con efectivo ──
    await page.getByRole('button', { name: 'Efectivo' }).click();
    await expect(page.getByText('Importe cubierto')).toBeVisible({ timeout: 3000 });
    await page.getByRole('button', { name: 'Confirmar cobro' }).click();

    // ── 6. Esperar a que el drawer se cierre (venta completada) ──
    await expect(page.getByPlaceholder('Buscar productos (/)')).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Usar' }).first()).toBeVisible({ timeout: 8000 });

    // ── 7. Verificar Verifactu vía API desde el contexto del navegador ──
    await page.waitForTimeout(2000);
    const vfData = await page.evaluate(async () => {
      const res = await fetch('/api/verifactu');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    });
    expect(vfData.length).toBeGreaterThanOrEqual(1);
    const lastRegistro = vfData[vfData.length - 1];
    expect(lastRegistro).toHaveProperty('saleId');
    expect(lastRegistro).toHaveProperty('numSerie');
    expect(lastRegistro).toHaveProperty('estado');
    expect(['registrado', 'simulado']).toContain(lastRegistro.estado);
    expect(lastRegistro).toHaveProperty('huella');
  });

  test('cobro completo con verificación Verifactu en UI', async ({ page }) => {
    // ── 1. Login ──
    await page.goto('/', { timeout: 15000 });
    await page.getByText('ENTRADA').click();
    await page.getByText('Administrador').first().click();
    for (const d of ['1', '2', '3', '4']) {
      await page.getByRole('button', { name: d, exact: true }).click();
    }
    await expect(page.getByText('SALÓN')).toBeVisible({ timeout: 8000 });

    // ── 2. Abrir mesa y añadir producto ──
    await page.getByRole('button', { name: 'Usar' }).first().click();
    await expect(page.getByPlaceholder('Buscar productos (/)')).toBeVisible({ timeout: 8000 });
    await page.getByPlaceholder('Buscar productos (/)').fill('Patatas Bravas');
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Patatas Bravas/ }).first().click();
    await expect(page.getByText('Patatas Bravas')).toBeVisible({ timeout: 3000 });

    // ── 3. Cobrar ──
    await page.getByRole('button', { name: 'Cobrar' }).click();
    await page.getByRole('button', { name: 'Efectivo' }).click();
    await expect(page.getByText('Importe cubierto')).toBeVisible({ timeout: 3000 });
    await page.getByRole('button', { name: 'Confirmar cobro' }).click();
    await expect(page.getByRole('button', { name: 'Usar' }).first()).toBeVisible({ timeout: 10000 });

    // ── 4. Navegar a Informes → Verifactu desde la sidebar ──
    await page.getByText('Informes').first().click();

    // Esperar a que cargue el panel de Verifactu
    await page.waitForTimeout(1500);

    // ── 5. Click en la pestaña Verifactu ──
    const verifactuTab = page.getByRole('button', { name: 'Verifactu' });
    await expect(verifactuTab).toBeVisible({ timeout: 5000 });
    await verifactuTab.click();

    // ── 6. Verificar que se muestra al menos un registro ──
    await page.waitForTimeout(1000);
    const numSerie = await page.getByText(/VERI-/).first();
    await expect(numSerie).toBeVisible({ timeout: 5000 });
  });

});
