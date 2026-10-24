import { createServer, preview } from 'vite';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const production = process.env.FAMILIAR_TEST_PRODUCTION === '1';
const output = path.resolve(process.env.FAMILIAR_QA_DIR || 'qa/evidence');
await fs.mkdir(output, { recursive: true });
const server = production
  ? await preview({ preview: { host: '127.0.0.1', port: 0 }, logLevel: 'error' })
  : await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
if (!production) await server.listen();
const base = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
const results = [], pageErrors = [];

async function check(name, width, run) {
  const context = await browser.newContext({ viewport: { width, height: width < 700 ? 844 : 1000 } });
  const page = await context.newPage();
  page.setDefaultTimeout(18000);
  page.on('pageerror', error => pageErrors.push({ test: name, message: error.message }));
  try {
    const evidence = await run(page);
    results.push({ name, width, status: 'passed', ...evidence });
    console.log('PASS', name);
  } catch (error) {
    results.push({ name, width, status: 'failed', message: error.message });
    console.log('FAIL', name, error.message);
    await page.screenshot({ path: path.join(output, `match-failure-${results.length}.png`), fullPage: true }).catch(() => {});
  } finally {
    await context.close();
  }
}

async function noOverflow(page) {
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No horizontal overflow');
}

async function originalPhotoPair(page) {
  assert.equal(await page.locator('canvas').count(), 0, 'Photo view releases both animated renderers');
  const photos = page.locator('.feel-photo');
  assert.equal(await photos.count(), 2, 'Both garments retain original photos');
  const views = await photos.evaluateAll(elements => elements.map(element => {
    const bounds = element.getBoundingClientRect();
    return { x: bounds.x, y: bounds.y, width: bounds.width, cardWidth: element.parentElement.getBoundingClientRect().width, src: element.querySelector('img').getAttribute('src') };
  }));
  assert(views.every(view => view.width / view.cardWidth > .75), 'Original photos use the available card width');
  assert(views.every(view => view.src.startsWith('/photos/')), 'Original comparison photos never use edited catalogue covers');
  assert(views[0].x < views[1].x && Math.abs(views[0].y - views[1].y) < 5, 'Both garment photos remain side by side');
  await noOverflow(page);
}

try {
  for (const width of [320, 390, 1440]) {
    await check(`Match disclosures, sources and buying · ${width}`, width, async page => {
      await page.goto(`${base}/listing/cloud-poplin/compare`, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => document.querySelectorAll('.animated-garment[data-garment-ready="true"]').length === 2);
      assert.equal(await page.locator('.feel-relative-summary').count(), 1, 'One comparison verdict');
      assert.equal(await page.locator('.feel-relative-grid article').count(), 4, 'Four short differences');
      assert.deepEqual(await page.locator('.feel-more-details > details').evaluateAll(elements => elements.map(element => element.open)), [false, false, false, false, false], 'All five detail sections start collapsed');
      for (const selector of ['.feel-measurements', '.feel-material-comparison', '.feel-explanation-grid', '.feel-condition-content', '.feel-technical-details .feel-fabric-section']) {
        assert.equal(await page.locator(selector).isVisible(), false, `${selector} is available on demand`);
      }
      assert.match(await page.locator('.feel-condition-disclosure > summary').innerText(), /seller describes light wear at the right cuff/i, 'The condition issue stays visible before expansion');
      const decision = page.locator('.feel-decision-compact');
      assert.match(await decision.innerText(), /\$32\.00/);
      assert.match(await decision.innerText(), /\$5\.00 delivery · \$37\.00 total/);
      assert(await decision.getByRole('button', { name: 'Buy now', exact: true }).isVisible(), 'Buy stays outside collapsed details');
      await noOverflow(page);

      for (const details of await page.locator('.feel-more-details > details').all()) await details.locator(':scope > summary').click();
      assert.equal(await page.locator('.feel-measure-row').count(), 4, 'All four centimetre comparisons remain available');
      assert.equal(await page.locator('.feel-explanation-grid dd small').count(), 8, 'Each garment description retains its own attribution');
      assert.match(await page.locator('.feel-condition-content').innerText(), /light wear at the right cuff/i);
      assert.match(await page.locator('.feel-material-comparison').innerText(), /not recorded/);
      assert.match(await page.locator('.feel-explanation-grid').innerText(), /not a measured fabric result/);
      assert.match(await page.locator('.feel-condition-source img').getAttribute('src'), /^\/photos\//, 'Condition thumbnail remains an original photo');
      assert.equal(await page.locator('.feel-property-grid article').count(), 4, 'Supporting views retain all four evidence properties');
      await noOverflow(page);

      await page.getByRole('button', { name: 'Actual photos', exact: true }).click();
      await originalPhotoPair(page);
      await page.getByRole('button', { name: 'Save this find', exact: true }).click();
      assert.equal(await page.getByRole('button', { name: 'Unsave this find', exact: true }).getAttribute('aria-pressed'), 'true', 'Saving works from the compact purchase row');
      await decision.getByRole('button', { name: 'Buy now', exact: true }).click();
      await page.waitForURL('**/checkout');
      return { closedSections: 5, differences: 4, sourceAttributions: 8, conditionIssueVisible: true, originalPhotos: true, photoPairSideBySide: true, save: true, buy: true, overflow: false };
    });
  }

  await check('Unknown softness and keyboard condition access · 390', 390, async page => {
    await page.goto(`${base}/listing/moss-knit/compare`, { waitUntil: 'networkidle' });
    const softness = page.locator('.feel-relative-grid article').filter({ has: page.getByRole('heading', { name: 'Softness', exact: true }) });
    assert.match(await softness.innerText(), /Not described for both/, 'An unknown quality is not inferred');
    await originalPhotoPair(page);
    await page.locator('.feel-condition-disclosure > summary').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('.feel-condition-disclosure').getAttribute('open'), '', 'Condition disclosure opens with the keyboard');
    assert(await page.locator('.feel-condition-source').isVisible(), 'Condition photographs remain reachable');
    await page.locator('.feel-more-details > details').filter({ has: page.locator('summary').filter({ hasText: 'Descriptions & explanations' }) }).locator(':scope > summary').click();
    const explanation = page.locator('.feel-explanation-grid article').filter({ has: page.getByRole('heading', { name: 'Softness', exact: true }) });
    assert.match(await explanation.innerText(), /Description missing/, 'Missing attribution is retained');
    assert.match(await explanation.innerText(), /Photographs and animated examples do not verify it/, 'Softness evidence limit is retained');
    await noOverflow(page);
    return { unknownSoftness: true, missingAttribution: true, keyboardDisclosure: true, conditionViewsReachable: true, originalPhotos: true, photoPairSideBySide: true, overflow: false };
  });
} finally {
  await browser.close();
  await server.close();
}

const report = { mode: production ? 'production' : 'development', results, pageErrors, passed: results.filter(result => result.status === 'passed').length, failed: results.filter(result => result.status === 'failed').length };
await fs.writeFile(path.join(output, 'match-disclosure-results.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ passed: report.passed, failed: report.failed, pageErrors: pageErrors.length }));
if (report.failed || pageErrors.length) process.exitCode = 1;
