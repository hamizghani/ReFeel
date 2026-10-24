import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { createServer, preview } from 'vite';
import AxeBuilder from '@axe-core/playwright';

const output = path.resolve(process.env.FAMILIAR_QA_DIR || './qa/evidence');
const production = process.env.FAMILIAR_TEST_PRODUCTION === '1';
await fs.mkdir(output, { recursive: true });
const server = production
  ? await preview({ preview: { host: '127.0.0.1', port: 0 }, logLevel: 'error' })
  : await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
if (!production) await server.listen();
const base = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
const results = [], pageErrors = [];
const filter = process.env.FAMILIAR_TEST_FILTER;
const stored = page => page.evaluate(() => JSON.parse(localStorage.getItem('familiar-v1')));
async function goto(page, route) {
  await page.goto(base + route, { waitUntil: 'networkidle' });
  await page.locator('#main h1').waitFor();
}
async function healthy(page) {
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No horizontal overflow');
}
async function touchTarget(locator) {
  const bounds = await locator.boundingBox();
  assert(bounds && bounds.width >= 44 && bounds.height >= 44, 'Purchase action is touch sized');
}
async function focused(page, selector) {
  await page.waitForFunction(selector => document.querySelector(selector) === document.activeElement, selector);
  // The route's deferred heading focus must also leave the user's control alone.
  await page.waitForTimeout(120);
  assert(await page.locator(selector).evaluate(element => element === document.activeElement), 'Keyboard focus remains on View bag after route effects settle');
}
async function check(name, width, run) {
  if (filter && !name.includes(filter)) return;
  const context = await browser.newContext({ viewport: { width, height: width < 801 ? 844 : 1000 } });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => pageErrors.push({ name, message: error.message }));
  try {
    await run(page);
    results.push({ name, width, status: 'passed' });
    console.log('PASS', name, width);
  } catch (error) {
    results.push({ name, width, status: 'failed', message: error.message });
    console.error('FAIL', name, width, error.message);
    await page.screenshot({ path: path.join(output, `failure-${width}-${results.length}.png`), fullPage: true }).catch(() => {});
  } finally {
    await context.close();
  }
}

try {
  for (const width of [320, 390, 768, 1440]) {
    await check('Catalogue and product View bag use the saved bag', width, async page => {
      await goto(page, '/shop');
      const cloud = page.locator('.product-card[data-id="cloud-poplin"]');
      assert.equal(await cloud.getAttribute('data-quantity'), '1');
      assert.match(await cloud.innerText(), /Quantity 1/);
      const add = cloud.getByRole('button', { name: 'Add Cloud Poplin Blouse to bag', exact: true });
      await touchTarget(add);
      await add.focus();
      await page.keyboard.press('Enter');
      const view = cloud.getByRole('link', { name: 'View bag', exact: true });
      await view.waitFor();
      await focused(page, '.product-card[data-id="cloud-poplin"] .card-view-bag');
      assert(await view.evaluate(element => element === document.activeElement), 'Keyboard addition keeps focus on View bag');
      assert.match(await cloud.getByRole('status').innerText(), /added to your bag/i);
      await touchTarget(view);
      assert.deepEqual((await stored(page)).bag, ['cloud-poplin']);
      assert.equal(await cloud.getByRole('button', { name: /Add .* to bag/ }).count(), 0);

      await cloud.locator('.product-name').click();
      await page.getByRole('heading', { name: 'Cloud Poplin Blouse', exact: true }).waitFor();
      const actions = page.locator(width <= 800 ? '.mobile-product-dock' : '.desktop-purchase-actions');
      await touchTarget(actions.getByRole('link', { name: 'View bag', exact: true }));
      assert.match(await page.locator('.stock-label').innerText(), /Quantity 1/);
      await actions.getByRole('link', { name: 'View bag', exact: true }).click();
      await page.locator('.commerce-checkout').waitFor();
      assert.equal(await page.locator('.commerce-checkout-item').count(), 1);
      assert.match(await page.locator('.commerce-checkout-item h2').innerText(), /Cloud Poplin Blouse/);

      await goto(page, '/listing/moss-knit');
      const mossActions = page.locator(width <= 800 ? '.mobile-product-dock' : '.desktop-purchase-actions');
      await mossActions.getByRole('button', { name: 'Add to bag', exact: true }).focus();
      await page.keyboard.press('Enter');
      const mossView = mossActions.getByRole('link', { name: 'View bag', exact: true });
      await mossView.waitFor();
      await focused(page, `${width <= 800 ? '.mobile-product-dock' : '.desktop-purchase-actions'} .product-view-bag`);
      assert(await mossView.evaluate(element => element === document.activeElement), 'Product addition keeps focus on View bag in the active purchase controls');
      assert.match(await page.locator('.product-feedback[role="status"]').innerText(), /Added to your bag/);
      await mossView.click();
      await page.locator('.commerce-checkout').waitFor();
      assert.deepEqual((await stored(page)).bag, ['cloud-poplin', 'moss-knit']);
      await page.getByRole('button', { name: 'Remove Moss Knit Cardigan from bag', exact: true }).click();
      await goto(page, '/listing/moss-knit');
      await page.locator(width <= 800 ? '.mobile-product-dock' : '.desktop-purchase-actions').getByRole('button', { name: /^Buy now/ }).click();
      await page.locator('.commerce-checkout').waitFor();
      assert.equal((await stored(page)).checkoutMode, 'buy-now');
      await goto(page, '/shop');
      await page.locator('.product-card[data-id="cloud-poplin"]').getByRole('link', { name: 'View bag', exact: true }).click();
      await page.locator('.commerce-checkout').waitFor();
      assert.equal((await stored(page)).checkoutMode, 'bag', 'View bag clears an earlier buy-now checkout');
      assert.deepEqual((await stored(page)).bag, ['cloud-poplin']);
      assert.equal(await page.locator('.commerce-checkout-item').count(), 1);
      assert.match(await page.locator('.commerce-checkout-item h2').innerText(), /Cloud Poplin Blouse/);
      await healthy(page);
    });

    await check('Real seller inventory supports add and hides a reserved piece', width, async page => {
      await goto(page, '/listing/cloud-poplin');
      const profileLink = page.getByRole('link', { name: 'Visit Maya’s wardrobe', exact: true });
      assert.equal(await profileLink.getAttribute('href'), '/seller/maya');
      await profileLink.click();
      await page.getByRole('heading', { name: 'Maya’s wardrobe', exact: true }).waitFor();
      assert.equal(await page.locator('.seller-product-grid .product-card').count(), 1);
      assert.equal(await page.locator('.seller-product-grid .product-card').getAttribute('data-id'), 'cloud-poplin');
      assert.match(await page.locator('.seller-inventory-count').innerText(), /1 piece available/);
      await healthy(page);
      await page.screenshot({ path: path.join(output, `seller-available-${width}.png`), fullPage: true });
      await page.getByRole('button', { name: 'Add Cloud Poplin Blouse to bag', exact: true }).click();
      await page.getByRole('link', { name: 'View bag', exact: true }).click();
      await page.locator('.commerce-checkout').waitFor();
      await page.getByRole('textbox', { name: 'Full name', exact: true }).fill('Demo Buyer');
      await page.getByRole('textbox', { name: 'Delivery address', exact: true }).fill('12 Example Lane, London SW1A 1AA');
      await page.getByRole('button', { name: 'Place order', exact: true }).click();
      await page.locator('.commerce-orders').waitFor();
      assert.equal((await stored(page)).availability['cloud-poplin'], 'reserved');
      assert.deepEqual((await stored(page)).bag, []);
      await goto(page, '/seller/maya');
      assert.match(await page.locator('.seller-inventory-count').innerText(), /0 pieces available/);
      await page.getByRole('heading', { name: 'No pieces available right now.', exact: true }).waitFor();
      assert.equal(await page.locator('.seller-product-grid .product-card').count(), 0);
      const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      assert.deepEqual(audit.violations.filter(issue => issue.impact === 'serious' || issue.impact === 'critical').map(issue => issue.id), []);
      await healthy(page);
      await page.screenshot({ path: path.join(output, `seller-empty-${width}.png`), fullPage: true });
      await goto(page, '/listing/cloud-poplin');
      const actions = page.locator(width <= 800 ? '.mobile-product-dock' : '.desktop-purchase-actions');
      assert(await actions.getByRole('button', { name: 'Add to bag', exact: true }).isDisabled());
      assert.equal(await actions.getByRole('link', { name: 'View bag', exact: true }).count(), 0);
    });
  }
  await fs.writeFile(path.join(output, 'shopping-results.json'), JSON.stringify({ mode: production ? 'production' : 'development', results, pageErrors }, null, 2));
  assert.deepEqual(pageErrors, [], 'No uncaught browser errors');
  assert.equal(results.filter(result => result.status === 'failed').length, 0, 'All shopping browser cases pass');
} finally {
  await browser.close();
  if (production) await new Promise((resolve, reject) => server.httpServer.close(error => error ? reject(error) : resolve()));
  else await server.close();
}
