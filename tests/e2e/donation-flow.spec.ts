import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';

const email = process.env.ADMIN_EMAIL!;
const password = process.env.ADMIN_PASSWORD!;

/** Title of the seeded one-off campaign the note keyword `kori` matches. */
const KORI_CAMPAIGN = "Kori'nin ameliyatı";

/** Clicks the submit button of the one form that contains `marker`. */
function submitFormWith(page: Page, marker: string): Promise<void> {
  return page.locator('form').filter({ has: page.locator(marker) }).locator('button[type=submit]').click();
}

test('admin enters a Kori donation and it shows on the public ledger and campaign page', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/giris/);
  await page.fill('input[name=email]', email);
  await page.fill('input[name=password]', password);
  // Submits are scoped to their own form: the protected admin layout puts a logout button
  // (also button[type=submit]) in the nav of every page below.
  await submitFormWith(page, 'input[name=password]');
  await expect(page).toHaveURL(/\/admin$/);

  await page.goto('/admin/islemler/yeni');
  const stamp = String(Date.now()).slice(-6);
  // The raw bank note is admin-only; the masked display name is the public identity, so the
  // assertions below follow the masked value rather than the note.
  const rawNote = `Kori e2e ${stamp}`;
  const donor = `K*** ${stamp}`;
  await page.selectOption('select[name=direction]', 'in');
  await page.fill('input[name=amount]', '250,00');
  await page.fill('input[name=occurredAt]', '2026-09-16');
  await page.fill('input[name=rawNote]', rawNote);
  await page.fill('input[name=displayName]', donor);
  await page.setInputFiles('input[name=receipt]', path.join(__dirname, 'fixtures/receipt.pdf'));
  await page.check('input[name=redactionConfirmed]');
  await submitFormWith(page, 'input[name=amount]');
  await expect(page).toHaveURL(/\/admin\/islemler\/[0-9a-f-]{36}$/);

  // the note keyword should have suggested the Kori campaign; publish that allocation
  const campaignSelect = page.locator('select[name="line.0.campaignId"]');
  const koriId = await campaignSelect.locator('option').filter({ hasText: KORI_CAMPAIGN }).getAttribute('value');
  expect(koriId).toMatch(/^[0-9a-f-]{36}$/);
  await expect(campaignSelect).toHaveValue(koriId!);
  await page.check('input[name=publish]');
  await submitFormWith(page, 'input[name=lineCount]');
  await expect(page.getByText('Kaydedildi.')).toBeVisible();

  await page.goto('/defter');
  await expect(page.getByText(donor).first()).toBeVisible();
  await expect(page.getByText(rawNote)).toHaveCount(0);
  await page.goto('/kampanyalar/kori-ameliyat');
  await expect(page.getByText(donor).first()).toBeVisible();
  await expect(page.getByText(rawNote)).toHaveCount(0);
  await page.goto('/en/kampanyalar/kori-ameliyat');
  await expect(page.getByText('Raised')).toBeVisible();
});
