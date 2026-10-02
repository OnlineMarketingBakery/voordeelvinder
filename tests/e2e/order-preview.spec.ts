// The results and ordering screens (Figma Screens 2–6, ADR 0013) on placeholder data: from the
// results through the three order steps to the thank-you page. Nothing is sent anywhere.
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('results → order → thank you, with validation on each step', async ({ page }) => {
  await page.goto('/vergelijken/energie/resultaten');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Jouw resultaten');
  await expect(page.getByText(/^Voorbeeld:/)).toBeVisible();
  const offers = page.locator('main ol > li');
  await expect(offers).toHaveCount(5);

  // A filter narrows the list and shows a chip that removes it again.
  await page.locator('label', { hasText: 'Dynamisch' }).first().click();
  await expect(offers).toHaveCount(1);
  await page.getByRole('button', { name: /Filter Tarieftype: Dynamisch verwijderen/ }).click();
  await expect(offers).toHaveCount(5);

  await offers.first().getByRole('button', { name: 'Kies dit contract' }).click();
  await expect(page).toHaveURL(/\/bestellen\/gegevens\/?\?aanbod=a-vast-1$/);
  await expect(page.locator('aside')).toContainText('Leverancier A Vast 1 jaar');

  // An empty step stops on the first error.
  await page.getByRole('button', { name: 'Word klant' }).click();
  await expect(page.locator('#bestel-salutation-fout')).toBeVisible();

  await page.locator('label', { hasText: 'Dhr.' }).click();
  await page.locator('#bestel-voornaam').fill('Test');
  await page.locator('#bestel-achternaam').fill('Persoon');
  await page.locator('#bestel-geboortedatum').fill('18/11/2000');
  await page.locator('#bestel-email').fill('test.persoon@example.be');
  await page.locator('#bestel-telefoon').fill('0475 00 00 00');
  await page.locator('label', { hasText: 'Rijwoning' }).click();
  await page.locator('#bestel-postcode').fill('9000');
  await page.locator('#bestel-straat').fill('Teststraat');
  await page.locator('#bestel-nummer').fill('1');
  await page
    .locator('label', { hasText: 'Ik verander van leverancier op mijn huidige adres' })
    .click();
  await page.locator('#bestel-iban').fill('BE69 5390 0754 7034');
  await page.locator('#bestel-voorwaarden').check();
  await page.getByRole('button', { name: 'Word klant' }).click();
  await expect(page.locator('#bestel-iban-fout')).toBeVisible();
  await page.locator('#bestel-iban').fill('BE68 5390 0754 7034');
  await page.getByRole('button', { name: 'Word klant' }).click();

  await expect(page).toHaveURL(/\/bestellen\/aansluiting\/?$/);
  await page.locator('#bestel-knowsEan').getByText('Nee').click();
  await page.locator('#bestel-leverancier').selectOption('luminus');
  await page.locator('#bestel-knowsGasEan').getByText('Ja').click();
  await page.locator('#bestel-gasean').fill('541448820000000001');
  await page.getByRole('button', { name: 'Controleer je gegevens' }).click();

  await expect(page).toHaveURL(/\/bestellen\/controle\/?$/);
  await expect(page.locator('main')).toContainText('Dhr. Test Persoon');
  await expect(page.locator('main')).toContainText('Teststraat 1, 9000');
  await expect(page.locator('main')).toContainText('541448820000000001');
  await page.getByRole('button', { name: 'Bevestig je bestelling' }).click();

  await expect(page).toHaveURL(/\/bestellen\/bedankt\/?$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Bedankt voor je bestelling');
  await expect(page.locator('main')).toContainText(/Bestelling ontvangen · VV-\d{6}/);
  await expect(page.locator('main')).toContainText('Test Persoon');
});

test('the results route answers 404 for products without results', async ({ request }) => {
  expect((await request.get('/vergelijken/zonnepanelen/resultaten')).status()).toBe(404);
  expect((await request.get('/vergelijken/thuisbatterij/resultaten')).status()).toBe(404);
  expect((await request.get('/vergelijken/water/resultaten')).status()).toBe(404);
});

test('the screens have no serious accessibility violations and are not indexed', async ({
  page,
}) => {
  for (const path of [
    '/vergelijken/energie/resultaten',
    '/bestellen/gegevens',
    '/bestellen/aansluiting',
    '/bestellen/controle',
    '/bestellen/bedankt',
  ]) {
    await page.goto(path);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(serious, `${path}: ${JSON.stringify(serious.map((v) => v.id))}`).toEqual([]);
  }
});
