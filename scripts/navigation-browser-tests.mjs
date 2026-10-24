import { createServer, preview } from 'vite';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const production = process.env.FAMILIAR_TEST_PRODUCTION === '1';
const server = production ? await preview({ preview: { host: '127.0.0.1', port: 0 }, logLevel: 'error' }) : await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
if (!production) await server.listen();
const base = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
const results = [], pageErrors = [];
async function check(name, run, viewport = { width: 1280, height: 650 }) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(error.message));
  try { await run(page); results.push({ name, status: 'passed' }); console.log('PASS', name); }
  catch (error) { results.push({ name, status: 'failed', message: error.message }); console.log('FAIL', name, error.message); }
  await context.close();
}
await check('Recording Next preserves the current viewport and keyboard action', async page => {
  await page.goto(base + '/sell/capture', { waitUntil: 'networkidle' });
  const next = page.getByRole('button', { name: 'Next', exact: true });
  await next.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => scrollY);
  assert(before > 50, 'The reproduction starts scrolled down');
  await next.click();
  await page.getByRole('heading', { name: 'Back view', exact: true }).waitFor();
  const after = await page.evaluate(() => scrollY);
  assert(Math.abs(after - before) < 5, `Step changed scroll from ${before} to ${after}`);
  assert(await next.evaluate(element => element === document.activeElement), 'Next retains keyboard focus');
});
await check('Back restores catalogue filters and the previous scroll position', async page => {
  await page.goto(base + '/shop?sort=Price%3A+high+to+low', { waitUntil: 'networkidle' });
  const item = page.getByTestId('active-card').filter({ hasText: 'Petal Cotton Tee' });
  await item.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => scrollY);
  assert(before > 100);
  await item.getByRole('link', { name: 'View Petal Cotton Tee', exact: true }).click();
  await page.getByRole('heading', { name: 'Petal Cotton Tee', exact: true }).waitFor();
  await page.goBack();
  await page.getByTestId('active-card').first().waitFor();
  await page.waitForTimeout(200);
  assert.equal(await page.getByRole('combobox', { name: 'Sort pieces', exact: true }).inputValue(), 'Price: high to low');
  const after = await page.evaluate(() => scrollY);
  assert(Math.abs(after - before) < 5, `Back changed scroll from ${before} to ${after}`);
});
await check('Short phone keeps the recording primary action above the safe area', async page => {
  await page.goto(base + '/sell/capture', { waitUntil: 'networkidle' });
  const next = page.getByRole('button', { name: 'Next', exact: true });
  for (let step = 0; step < 5; step++) {
    const bounds = await next.boundingBox();
    assert(bounds && bounds.y >= 0 && bounds.y + bounds.height <= 568, 'Next is visible');
    await next.click();
  }
  assert(await page.getByRole('button', { name: 'Review listing', exact: true }).isVisible());
}, { width: 320, height: 568 });
await fs.mkdir('qa/evidence', { recursive: true });
await fs.writeFile('qa/evidence/navigation-browser-results.json', JSON.stringify({ mode: production ? 'production' : 'development', results, pageErrors }, null, 2));
await browser.close();
await server.close();
if (results.some(result => result.status === 'failed') || pageErrors.length) process.exitCode = 1;
