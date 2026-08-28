# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: full-flow.spec.ts >> Flujo completo: mesa → pedido → cobro → Verifactu >> flujo completo con propina y factura
- Location: e2e\full-flow.spec.ts:77:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('SALÓN')
Expected: visible
Timeout: 30000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 30000ms
  - waiting for getByText('SALÓN')

```

```yaml
- alert
- heading "LA COMANDA" [level=1]
- paragraph: TPV Profesional
- paragraph: Administrador
- paragraph: Introduce tu PIN de 4 dígitos
- button "1"
- button "2"
- button "3"
- button "4"
- button "5"
- button "6"
- button "7"
- button "8"
- button "9"
- button "Atrás"
- button "0"
- button
- img "QR App Móvil"
- text: Descargar App
```

# Test source

```ts
  1  | import { Page, expect } from '@playwright/test';
  2  | 
  3  | // Para los tests de login: flujo completo de autenticación vía UI.
  4  | export async function loginAsAdmin(page: Page) {
  5  |   await page.goto('/', { timeout: 20000 });
  6  |   await expect(page.getByText('LA COMANDA')).toBeVisible({ timeout: 15000 });
  7  |   await page.getByText('ENTRADA').click();
  8  |   await expect(page.getByText('Selecciona tu usuario')).toBeVisible({ timeout: 8000 });
  9  |   await page.getByRole('button', { name: /Administrador/ }).first().click();
  10 |   await expect(page.getByText('Introduce tu PIN de 4 dígitos')).toBeVisible({ timeout: 8000 });
  11 |   for (const d of ['1', '2', '3', '4']) {
  12 |     await page.getByRole('button', { name: d, exact: true }).click();
  13 |   }
> 14 |   await expect(page.getByText('SALÓN')).toBeVisible({ timeout: 30000 });
     |                                         ^ Error: expect(locator).toBeVisible() failed
  15 |   await expect(page.getByText('Mesa 1')).toBeVisible({ timeout: 10000 });
  16 | }
  17 | 
```