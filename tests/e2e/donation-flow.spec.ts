import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
import { formatKurus, parseTlToKurus } from '@/lib/money';

const email = process.env.ADMIN_EMAIL!;
const password = process.env.ADMIN_PASSWORD!;

/** Title of the seeded one-off campaign the note keyword `kori` matches. */
const KORI_CAMPAIGN = "Kori'nin ameliyatı";
const KORI_PATH = '/kampanyalar/kori-ameliyat';
const DONATION_KURUS = 25_000; // 250,00 TL

/** Clicks the submit button of the one form that contains `marker`. */
function submitFormWith(page: Page, marker: string): Promise<void> {
  return page.locator('form').filter({ has: page.locator(marker) }).locator('button[type=submit]').click();
}

/** Reads the campaign's raised figure back into kurus, so the assertion is on a number. */
async function readRaisedKurus(page: Page): Promise<number> {
  const text = await page.getByTestId('raised').innerText();
  return parseTlToKurus(text.replace(/[\s₺]/g, ''));
}

test('admin enters a Kori donation and it shows on the public ledger and campaign page', async ({ page, request }) => {
  await page.goto(KORI_PATH);
  const raisedBefore = await readRaisedKurus(page);

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

  // the ledger row carries the masked name and a link to the now-public receipt
  await page.goto('/defter');
  await expect(page.getByText(donor).first()).toBeVisible();
  await expect(page.getByText(rawNote)).toHaveCount(0);
  const receiptHref = await page.locator('tr').filter({ hasText: donor }).locator('a[href^="/dosya/"]').getAttribute('href');
  expect(receiptHref).toMatch(/^\/dosya\/[0-9a-f-]{36}$/);
  // `request` carries no session cookie, so this proves the gated route serves a published,
  // redaction-confirmed receipt to the public and not just to the signed-in admin.
  const receipt = await request.get(receiptHref!);
  expect(receipt.status()).toBe(200);
  expect(receipt.headers()['content-type']).toContain('application/pdf');

  // the campaign bar reflects the donation
  await page.goto(KORI_PATH);
  await expect(page.getByTestId('raised')).toHaveText(formatKurus(raisedBefore + DONATION_KURUS, 'tr'));
  await expect(page.getByText(donor).first()).toBeVisible();
  await expect(page.getByText(rawNote)).toHaveCount(0);
  await page.goto(`/en${KORI_PATH}`);
  await expect(page.getByText('Raised')).toBeVisible();
  await expect(page.getByTestId('raised')).toHaveText(formatKurus(raisedBefore + DONATION_KURUS, 'en'));
});
