import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test.describe('Flujo crítico de negocio', () => {

  test('login completo con PIN y vista salón con mesas', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.getByRole('button', { name: 'Usar' }).first()).toBeVisible({ timeout: 5000 });
  });

  test('abrir comanda de mesa y ver buscador de productos', async ({ page }) => {
    await loginAsAdmin(page);

    const usarBtn = page.getByRole('button', { name: 'Usar' }).first();
    await usarBtn.click();
    await expect(page.getByPlaceholder('Buscar productos (/)')).toBeVisible({ timeout: 8000 });
  });

  test('cobro completo con verificación Verifactu vía API', async ({ page }) => {
    // ── 1. Login ──
    await loginAsAdmin(page);
    // Aceptar el diálogo nativo de advertencia al confirmar un cobro con
    // artículos sin enviar a cocina.
    page.on('dialog', (d) => d.accept());

    // ── 2. Abrir mesa ──
    await page.getByRole('button', { name: 'Usar' }).first().click();
    await expect(page.getByPlaceholder('Buscar productos (/)')).toBeVisible({ timeout: 8000 });

    // ── 3. Añadir producto ──
    await page.getByPlaceholder('Buscar productos (/)').fill('Patatas Bravas');
    await page.waitForTimeout(500);
    const productBtn = page.getByRole('button', { name: /Patatas Bravas/ }).first();
    await expect(productBtn).toBeVisible({ timeout: 3000 });
    await productBtn.click();

    // Verificar que el producto aparece en el pedido del drawer de comanda
    await expect(page.getByText('Patatas Bravas', { exact: false }).first()).toBeVisible({ timeout: 3000 });

    // ── 4. Abrir cobro ──
    await page.getByRole('button', { name: 'Cobrar' }).click();
    await expect(page.getByText(/Queda:/)).toBeVisible({ timeout: 3000 });

    // ── 5. Pagar con efectivo ──
    await page.getByRole('button', { name: 'Efectivo' }).click();
    await expect(page.getByText('Importe cubierto')).toBeVisible({ timeout: 3000 });
    await page.getByRole('button', { name: 'Confirmar cobro' }).click();

    // ── 6. El modal de pago se cierra (venta completada) ──
    await expect(page.getByRole('button', { name: 'Confirmar cobro' })).not.toBeVisible({ timeout: 10000 });

    // El drawer de comanda permanece abierto; cerrarlo (Escape) para volver al salón
    await page.keyboard.press('Escape');
    await expect(page.getByPlaceholder('Buscar productos (/)')).not.toBeVisible({ timeout: 8000 });
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
    await loginAsAdmin(page);
    page.on('dialog', (d) => d.accept());

    // ── 2. Abrir mesa y añadir producto ──
    await page.getByRole('button', { name: 'Usar' }).first().click();
    await expect(page.getByPlaceholder('Buscar productos (/)')).toBeVisible({ timeout: 8000 });
    await page.getByPlaceholder('Buscar productos (/)').fill('Patatas Bravas');
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Patatas Bravas/ }).first().click();
    await expect(page.getByText('Patatas Bravas', { exact: false }).first()).toBeVisible({ timeout: 3000 });

    // ── 3. Cobrar ──
    await page.getByRole('button', { name: 'Cobrar' }).click();
    await page.getByRole('button', { name: 'Efectivo', exact: true }).click();
    await expect(page.getByText('Importe cubierto')).toBeVisible({ timeout: 3000 });
    await page.getByRole('button', { name: 'Confirmar cobro' }).click();
    await expect(page.getByRole('button', { name: 'Confirmar cobro' })).not.toBeVisible({ timeout: 8000 });

    // Cerrar el drawer de comanda antes de navegar
    await page.keyboard.press('Escape');
    await expect(page.getByPlaceholder('Buscar productos (/)')).not.toBeVisible({ timeout: 8000 });

    // ── 4. Navegar a Informes → Verifactu desde la sidebar ──
    const informesBtn = page.getByRole('button', { name: 'Informes' });
    await expect(informesBtn).toBeVisible({ timeout: 5000 });
    await informesBtn.click();

    // ── 5. Click en la pestaña Verifactu ──
    const verifactuTab = page.getByRole('button', { name: 'Verifactu' });
    await expect(verifactuTab).toBeVisible({ timeout: 10000 });
    await verifactuTab.click();

    // ── 6. Verificar que el panel Verifactu se renderiza ──
    // No se depende de que exista un registro concreto: la generación real
    // depende del backend (Fiskaly real o simulado). Verificamos el panel.
    await expect(page.getByRole('heading', { name: 'VERIFACTU' })).toBeVisible({ timeout: 5000 });
  });

});
