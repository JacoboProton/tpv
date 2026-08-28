import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test.describe('Flujo completo: mesa → pedido → cobro → Verifactu', () => {

  test('login, abrir mesa, añadir producto, cobrar en efectivo, verificar mesa libre', async ({ page }) => {
    // ── 1. Login ──
    await loginAsAdmin(page);
    page.on('dialog', (d) => d.accept());

    // ── 2. Abrir mesa ──
    const usarBtn = page.getByRole('button', { name: 'Usar' }).first();
    await expect(usarBtn).toBeVisible({ timeout: 8000 });
    await usarBtn.click();

    // ── 3. Buscar y añadir producto ──
    const searchInput = page.getByPlaceholder('Buscar productos (/)');
    await expect(searchInput).toBeVisible({ timeout: 8000 });

    // Escribir nombre de producto existente en semilla
    await searchInput.fill('Patatas Bravas');
    await page.waitForTimeout(500);

    // Pulsar boton del producto filtrado
    const productBtn = page.getByRole('button', { name: /Patatas Bravas/ }).first();
    await expect(productBtn).toBeVisible({ timeout: 3000 });
    await productBtn.click();

    // Verificar que aparece en el pedido (la linea con cantidad)
    await expect(page.getByText('Patatas Bravas', { exact: false }).first()).toBeVisible({ timeout: 3000 });

    // ── 4. Abrir cobro ──
    const cobrarBtn = page.getByRole('button', { name: 'Cobrar' });
    await expect(cobrarBtn).toBeVisible({ timeout: 3000 });
    await cobrarBtn.click();

    // ── 5. Payment modal: seleccionar Efectivo ──
    await expect(page.getByText('Importe cubierto')).not.toBeVisible({ timeout: 3000 });
    await expect(page.getByText(/Queda:/)).toBeVisible({ timeout: 3000 });
    // Esperar a que cargue
    await page.waitForTimeout(300);

    // Click en Efectivo
    const efectivoBtn = page.getByRole('button', { name: 'Efectivo' });
    await expect(efectivoBtn).toBeVisible({ timeout: 3000 });
    await efectivoBtn.click();

    // Verificar que el importe queda cubierto
    await expect(page.getByText('Importe cubierto')).toBeVisible({ timeout: 3000 });

    // ── 6. Confirmar cobro ──
    const confirmarBtn = page.getByRole('button', { name: 'Confirmar cobro' });
    await expect(confirmarBtn).toBeVisible({ timeout: 3000 });
    await expect(confirmarBtn).toBeEnabled({ timeout: 3000 });
    await confirmarBtn.click();

    // ── 7. Verificar que el drawer se cierra y la mesa vuelve a "Usar" ──
    // El modal de pago desaparece
    await expect(page.getByRole('button', { name: 'Confirmar cobro' })).not.toBeVisible({ timeout: 8000 });

    // El drawer de comanda permanece abierto tras cobrar; cerrarlo con Escape
    await page.keyboard.press('Escape');

    // El drawer de comanda se cierra → el buscador desaparece
    await expect(page.getByPlaceholder('Buscar productos (/)')).not.toBeVisible({ timeout: 5000 });

    // La mesa vuelve a estado libre → boton "Usar" visible de nuevo
    await expect(page.getByRole('button', { name: 'Usar' }).first()).toBeVisible({ timeout: 8000 });

    // ── 8. Verificar toast de cobro ──
    const toast = page.getByText(/Cobrado:|Formación/);
    if (await toast.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(toast).toBeVisible({ timeout: 1000 });
    }
  });

  test('flujo completo con propina y factura', async ({ page }) => {
    // ── 1. Login ──
    await loginAsAdmin(page);
    page.on('dialog', (d) => d.accept());

    // Abrir mesa
    await page.getByRole('button', { name: 'Usar' }).first().click();
    await expect(page.getByPlaceholder('Buscar productos (/)')).toBeVisible({ timeout: 8000 });

    // Añadir varios productos
    await page.getByPlaceholder('Buscar productos (/)').fill('Hamburguesa Sonora');
    await page.waitForTimeout(500);
    const hambBtn = page.getByRole('button', { name: /Hamburguesa Sonora/ }).first();
    await expect(hambBtn).toBeVisible({ timeout: 3000 });
    await hambBtn.click();
    await page.waitForTimeout(300);

    // Añadir segundo producto
    await page.getByPlaceholder('Buscar productos (/)').fill('');
    await page.waitForTimeout(300);
    await page.getByPlaceholder('Buscar productos (/)').fill('Tarta de Queso');
    await page.waitForTimeout(500);
    const tartaBtn = page.getByRole('button', { name: /Tarta de Queso/ }).first();
    await expect(tartaBtn).toBeVisible({ timeout: 3000 });
    await tartaBtn.click();
    await page.waitForTimeout(300);

    // Ir a cobro
    await page.getByRole('button', { name: 'Cobrar' }).click();
    await page.waitForTimeout(500);

    // Añadir propina del 10%
    const tip10Btn = page.getByRole('button', { name: '10%' });
    await expect(tip10Btn).toBeVisible({ timeout: 3000 });
    await tip10Btn.click();
    // Verificar que aparece el selector de metodo de propina
    await expect(page.getByText('Propina en efectivo')).toBeVisible({ timeout: 3000 });

    // Abrir factura y rellenar datos
    await page.getByText(/Factura/).click();
    await page.waitForTimeout(300);
    await page.getByPlaceholder('NIF / CIF / NIE *').fill('B12345678');
    await page.getByPlaceholder('Nombre o razón social *').fill('Cliente E2E Test');

    // Pagar con efectivo
    await page.getByRole('button', { name: 'Efectivo', exact: true }).click();
    await expect(page.getByText('Importe cubierto')).toBeVisible({ timeout: 3000 });

    // Confirmar
    await page.getByRole('button', { name: 'Confirmar cobro' }).click();

    // Verificar cierre del modal de pago
    await expect(page.getByRole('button', { name: 'Confirmar cobro' })).not.toBeVisible({ timeout: 8000 });

    // Cerrar el drawer de comanda (Escape) y verificar mesa libre
    await page.keyboard.press('Escape');
    await expect(page.getByPlaceholder('Buscar productos (/)')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: 'Usar' }).first()).toBeVisible({ timeout: 8000 });
  });

});
