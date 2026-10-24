import { createServer, preview } from 'vite';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const production = process.env.FAMILIAR_TEST_PRODUCTION === '1';
const filter = process.env.FAMILIAR_TEST_FILTER;
const output = path.resolve(process.env.FAMILIAR_QA_DIR || '../familiar-v3-check');
await fs.mkdir(output, { recursive: true });
const server = production
  ? await preview({ preview: { host: '127.0.0.1', port: 0 }, logLevel: 'error' })
  : await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
if (!production) await server.listen();
const base = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
const results = [], errors = [], accessibility = [], motion = [];
const state = p => p.evaluate(() => JSON.parse(localStorage.getItem('familiar-v1')));
const goto = async (p, route) => { await p.goto(base + route, { waitUntil: 'networkidle' }); await p.locator('#main h1').waitFor(); };
async function healthy(p) {
  assert(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No horizontal overflow');
  const broken = await p.locator('#main img').evaluateAll(es => es.filter(e => e.getBoundingClientRect().width > 0 && e.complete && !e.naturalWidth).map(e => e.src));
  assert.deepEqual(broken, [], 'No broken visible photos');
}
async function ready(p, count = 1) {
  await p.waitForFunction(count => document.querySelectorAll('.animated-garment[data-garment-ready="true"]').length === count, count);
}
async function check(name, fn, width = 390, options = {}) {
  if (filter && !name.includes(filter)) return;
  const context = await browser.newContext({ viewport: { width, height: width < 700 ? 844 : 1000 }, ...options });
  const p = await context.newPage(); p.setDefaultTimeout(18000);
  p.on('pageerror', e => errors.push({ test: name, message: e.message }));
  try { await fn(p, context); results.push({ name, status: 'passed' }); console.log('PASS', name); }
  catch (e) { results.push({ name, status: 'failed', message: e.message }); console.log('FAIL', name, e.message); await p.screenshot({ path: path.join(output, `failure-${results.length}.png`), fullPage: true }).catch(() => {}); }
  await context.close();
}
async function scan(p, width, route) {
  const r = await new AxeBuilder({ page: p }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  const violations = r.violations.filter(x => x.impact === 'serious' || x.impact === 'critical').map(x => ({ id: x.id, impact: x.impact, nodes: x.nodes.map(n => n.target) }));
  accessibility.push({ width, route, violations }); assert.deepEqual(violations, [], `Accessibility ${route}`);
}

for (const width of [320, 390, 768, 1440]) {
  await check(`Marketplace and visible seller entry · ${width}`, async p => {
    await goto(p, '/shop'); assert.equal(await p.getByTestId('active-card').count(), 12);
    assert.equal(await p.getByTestId('active-card').first().getAttribute('data-id'), 'cloud-poplin');
    assert.equal(await p.getByTestId('coming-soon-card').count(), 50);
    assert.equal(await p.getByTestId('coming-soon-card').locator('a,button,input').count(), 0);
    const sell = p.locator('.header-sell'); const b = await sell.boundingBox();
    assert(b && b.y >= 0 && b.y + b.height <= p.viewportSize().height && b.height >= 44, 'Sell entry visible and touch sized');
    await p.getByTestId('active-card').first().getByRole('link', { name: /Explore Cloud Poplin Blouse in motion/ }).waitFor();
    await healthy(p); await p.screenshot({ path: path.join(output, `shop-${width}.png`) });
    await sell.click(); await p.locator('.studio-dashboard').waitFor();
  }, width);
  await check(`Product motion and original photos · ${width}`, async p => {
    await goto(p, '/listing/cloud-poplin'); await ready(p);
    assert.equal(await p.locator('canvas').count(), 1);
    await p.getByRole('heading', { name: 'Garment measurements', exact: true }).waitFor();
    await p.screenshot({ path: path.join(output, `product-motion-${width}.png`), fullPage: true });
    await p.getByRole('button', { name: 'Original photos', exact: true }).click();
    assert.equal(await p.locator('canvas').count(), 0, 'Motion renderer is released when switching to photos');
    const gallery = p.locator('.photo-gallery'); const thumbs = gallery.locator('.gallery-thumbnails button');
    assert(await thumbs.count() > 1); await thumbs.nth(1).click(); assert.equal(await thumbs.nth(1).getAttribute('aria-pressed'), 'true');
    await gallery.locator('.gallery-open').click(); await p.getByRole('dialog', { name: /Original Cloud/ }).waitFor();
    await p.getByRole('button', { name: 'Zoom in', exact: true }).click(); await p.getByRole('button', { name: 'Close photo', exact: true }).click();
    assert(await gallery.locator('.gallery-open').evaluate(e => document.activeElement === e), 'Photo focus restored');
    await p.getByRole('button', { name: 'Explore garment', exact: true }).click(); await ready(p); await healthy(p);
  }, width);
  await check(`Relative feel and synchronized pair · ${width}`, async p => {
    await goto(p, '/listing/cloud-poplin/compare'); await ready(p, 2);
    assert.equal(await p.locator('.feel-relative-grid article').count(), 4);
    assert.equal(await p.locator('.feel-measure-row').count(), 4);
    assert.match(await p.locator('.feel-heading h1').innerText(), /blue blouse/i);
    await p.getByRole('button', { name: 'Pull & release', exact: true }).click();
    for (const viewer of await p.locator('.animated-garment').all()) { await viewer.scrollIntoViewIfNeeded(); await p.waitForTimeout(450); assert(+(await viewer.getAttribute('data-physics-steps')) > 0, 'Each visible cloth solver runs'); }
    assert.deepEqual(await p.locator('.animated-garment').evaluateAll(es => es.map(e => e.dataset.step)), ['4', '4']);
    await p.waitForFunction(() => document.querySelector('.feel-motion-actions > button:last-child')?.textContent === 'Replay examples', null, { timeout: 12000 });
    await p.locator('.feel-paired').scrollIntoViewIfNeeded();
    const clippedControls = await p.locator('.feel-paired .animated-garment').evaluateAll(es => es.flatMap(e => {
      const frame=e.getBoundingClientRect();
      return [...e.querySelectorAll('.garment-controls button')].filter(b=>{const r=b.getBoundingClientRect();return r.width>0&&(r.left<frame.left||r.right>frame.right||r.width<43||r.height<43);}).map(b=>b.getAttribute('aria-label'));
    }));
    assert.deepEqual(clippedControls,[], 'Every visible model control fits its own card and stays touch sized');
    if (width < 700) {
      const bounds = await p.locator('.feel-paired canvas').evaluateAll(es => es.map(e => { const b=e.getBoundingClientRect(); return {x:b.x,y:b.y,width:b.width,height:b.height,bottom:b.bottom}; }));
      assert(bounds.every(b => b.y>=0 && b.bottom <= p.viewportSize().height), 'Both animation canvases fit together');
      assert(bounds[0].x < bounds[1].x && Math.abs(bounds[0].y-bounds[1].y)<5, 'Mobile models are side by side');
      await p.getByRole('button', { name: /Explore My blue blouse in a larger view/ }).click();
      const modal=p.getByRole('dialog',{name:/larger animated example/}); await modal.waitFor();
      await p.waitForFunction(()=>document.querySelector('.feel-model-modal .animated-garment')?.dataset.garmentReady==='true');
      await modal.getByRole('button',{name:'Rotate garment right',exact:true}).click();
      await modal.getByRole('button',{name:'Zoom garment in',exact:true}).click();
      await p.keyboard.press('Escape'); assert.equal(await modal.count(),0); assert(await p.getByRole('button',{name:/Explore My blue blouse in a larger view/}).evaluate(e=>document.activeElement===e),'Larger-view focus returns to its opener');
    }
    await healthy(p); await p.screenshot({ path: path.join(output, `comparison-motion-${width}.png`), fullPage: true });
    await p.getByRole('button', { name: 'Actual photos', exact: true }).click();
    assert.equal(await p.locator('canvas').count(), 0); assert.equal(await p.locator('.feel-photo').count(), 2);
    await p.locator('.feel-photo').first().click(); await p.getByRole('dialog').waitFor(); await p.keyboard.press('Escape'); await healthy(p);
    await scan(p, width, '/listing/cloud-poplin/compare');
  }, width);
}

await check('Actual cloth deformation, manual exploration and frame timing', async p => {
  await goto(p, '/listing/cloud-poplin'); await ready(p);
  const root = p.locator('.animated-garment');
  await p.getByRole('button', { name: 'Gentle pull', exact: true }).click();
  await p.waitForFunction(() => +document.querySelector('.animated-garment').dataset.physicsSteps >= 35);
  const snapshots = [];
  for (let i = 0; i < 4; i++) {
    snapshots.push(await root.evaluate(e => ({ steps: +e.dataset.physicsSteps, displacement: +e.dataset.maxDisplacement, strain: +e.dataset.physicsStrain, energy: +e.dataset.physicsEnergy, yaw: +e.dataset.garmentYaw })));
    await root.screenshot({ path: path.join(output, `pull-frame-${i}.png`) });
    await p.waitForTimeout(220);
  }
  assert(snapshots.every(x => Object.values(x).every(Number.isFinite)), 'Finite motion telemetry');
  assert(snapshots.some(x => x.displacement > .001), 'Garment vertices actually deform');
  assert(snapshots.at(-1).steps > snapshots[0].steps, 'Solver evolves over time');
  const unique = new Set(); for (let i = 0; i < 4; i++) unique.add((await fs.readFile(path.join(output, `pull-frame-${i}.png`))).toString('base64'));
  assert(unique.size > 1, 'Rendered frames change');
  if (await p.getByRole('button', { name: 'Pause', exact: true }).count()) await p.getByRole('button', { name: 'Pause', exact: true }).click();
  const yaw = +(await root.getAttribute('data-camera-azimuth'));
  await p.getByRole('button', { name: 'Rotate garment right', exact: true }).click(); await p.waitForTimeout(650);
  const manualYaw = +(await root.getAttribute('data-camera-azimuth')); assert(Math.abs(manualYaw - yaw) > .1, 'Rotation changes actual camera orientation');
  const distance = +(await root.getAttribute('data-camera-distance'));
  await p.getByRole('button', { name: 'Zoom garment in', exact: true }).click(); await p.waitForTimeout(650);
  assert(+(await root.getAttribute('data-camera-distance')) < distance - .01, 'Zoom changes actual camera distance');
  await p.getByRole('button', { name: 'Reset view', exact: true }).click(); await p.waitForTimeout(350);
  const frameTimes = await p.evaluate(() => new Promise(resolve => { const samples = []; let last = performance.now(); function tick(now) { samples.push(now - last); last = now; if (samples.length < 45) requestAnimationFrame(tick); else resolve(samples.slice(1)); } requestAnimationFrame(tick); }));
  const sorted = [...frameTimes].sort((a, b) => a - b);
  motion.push({ environment: 'Headless Chromium using software WebGL, not a physical phone', snapshots, manualRotationRadians: Math.abs(manualYaw-yaw), frameMs: { median: sorted[Math.floor(sorted.length / 2)], p95: sorted[Math.floor(sorted.length * .95)], max: sorted.at(-1) } });
  await healthy(p);
});
await check('Six-second held instruction, immediate Next and short-screen controls', async p => {
  await goto(p, '/sell/capture'); await ready(p);
  const next = p.getByRole('button', { name: 'Next', exact: true }); assert(await next.isEnabled());
  const b = await next.boundingBox(); assert(b && b.y >= 0 && b.y + b.height <= 568, 'Next dock visible on a short phone');
  await next.click(); assert.equal((await state(p)).captureStage, 1);
  await p.getByRole('button', { name: 'Replay', exact: true }).click();
  await p.waitForFunction(() => document.querySelector('.recording-next-row strong')?.textContent === '00:06', null, { timeout: 13000 });
  assert.equal((await state(p)).captureStage, 1, 'Six seconds does not auto advance');
  const yaw = +(await p.locator('.animated-garment').getAttribute('data-garment-yaw'));
  await p.waitForTimeout(450); assert(Math.abs(+(await p.locator('.animated-garment').getAttribute('data-garment-yaw')) - yaw) < .03, 'Held final pose stays stable');
  await next.click(); assert.equal((await state(p)).captureStage, 2);
  await p.reload({ waitUntil: 'networkidle' }); assert.equal((await state(p)).captureStage, 2); await healthy(p);
  await p.screenshot({ path: path.join(output, 'recording-short-phone.png') });
}, 320, { viewport: { width: 320, height: 568 } });
await check('Reduced-motion poses retain manual controls and Next', async p => {
  await goto(p, '/sell/capture'); await ready(p);
  await p.waitForFunction(() => +document.querySelector('.animated-garment').dataset.physicsSteps > 0);
  await p.waitForTimeout(500);
  const before = await p.locator('.animated-garment').getAttribute('data-physics-steps'); await p.waitForTimeout(400);
  assert.equal(await p.locator('.animated-garment').getAttribute('data-physics-steps'), before, 'Reduced motion does not continuously simulate');
  await p.getByRole('button', { name: 'Rotate garment right', exact: true }).click();
  await p.getByRole('button', { name: 'Next', exact: true }).click(); assert.equal((await state(p)).captureStage, 1); await healthy(p);
}, 390, { reducedMotion: 'reduce' });
await check('Missing model falls back to original photos', async p => {
  await p.route('**/models/cloud-animated.glb', route => route.abort());
  await goto(p, '/listing/cloud-poplin'); await p.locator('.showcase-notice').waitFor(); await p.locator('.photo-gallery').waitFor();
  assert.equal(await p.locator('canvas').count(), 0); await healthy(p);
});
await check('Missing original photo offers retry and recovers', async p => {
  let blocked=true;
  await p.route('**/photos/cloud-poplin-front.webp', route=>blocked?route.abort():route.continue());
  await goto(p,'/listing/cloud-poplin');
  await p.getByRole('button',{name:'Original photos',exact:true}).click();
  await p.locator('.gallery-main').getByText('Photo unavailable',{exact:true}).waitFor();
  blocked=false;await p.locator('.gallery-main').getByRole('button',{name:'Try again',exact:true}).click();
  await p.waitForFunction(()=>document.querySelector('.gallery-main img')?.naturalWidth>0);await healthy(p);
});
await check('Non-modeled garments retain photos and no fake model', async p => {
  await goto(p, '/listing/moss-knit'); assert.equal(await p.locator('canvas').count(), 0); await p.locator('.photo-gallery').waitFor();
  await goto(p, '/reference/capture?new=1'); await p.getByRole('combobox', { name: /Choose a prepared garment/ }).selectOption('petal-tee');
  await p.getByRole('button', { name: 'Start guided recording', exact: true }).click(); assert.equal(await p.locator('canvas').count(), 0);
  for (let i = 0; i < 6; i++) await p.getByRole('button', { name: i === 5 ? 'Save familiar piece' : 'Next', exact: true }).click();
  const s = await state(p); const ref = s.privateReferences.find(x => x.id === s.selectedReference); assert(ref.ready); assert.equal(ref.templateId, 'petal-tee'); await healthy(p);
});
await check('Editing familiar feel affects comparison and persists', async p => {
  await goto(p, '/listing/cloud-poplin/compare'); await p.locator('.feel-comparison-setup > summary').click(); await p.locator('.feel-description-editor summary').click();
  await p.getByRole('combobox', { name: 'Softness', exact: true }).selectOption('unknown');
  await p.getByRole('button', { name: 'Save feel description', exact: true }).click();
  const softness = p.locator('.feel-relative-summary .feel-relative-card').filter({ has: p.getByRole('heading', { name: 'Softness', exact: true }) });
  assert.match(await softness.innerText(), /Not described for both/);
  await p.reload({ waitUntil: 'networkidle' }); assert.match(await softness.innerText(), /Not described for both/);
  await p.locator('.feel-comparison-setup > summary').click(); await p.locator('.feel-description-editor summary').click(); await p.getByRole('combobox', { name: 'Softness', exact: true }).selectOption('very-soft');
  await p.getByRole('button', { name: 'Save feel description', exact: true }).click(); assert.match(await softness.innerText(), /less soft/i); await healthy(p);
});
await check('Ordinary search, filters, saves and Search by feel handoff', async p => {
  await goto(p, '/shop'); await p.getByRole('searchbox', { name: 'Search clothes' }).fill('ivory blouse under $40 size M');
  assert.equal(await p.getByTestId('active-card').count(), 1); await p.getByRole('button', { name: 'Save Cloud Poplin Blouse', exact: true }).click();
  await p.reload({ waitUntil: 'networkidle' }); assert((await state(p)).saved.includes('cloud-poplin')); assert.equal(await p.getByTestId('active-card').count(), 1);
  await p.getByRole('link', { name: 'Search by feel', exact: true }).first().click();
  assert.equal(await p.locator('#feel-query').inputValue(), 'ivory blouse under $40 size M');
  await p.locator('#feel-query').fill('soft size M'); await p.reload({ waitUntil: 'networkidle' }); assert.equal(await p.locator('#feel-query').inputValue(), 'soft size M'); await healthy(p);
});
await check('Source views return to the comparison without losing readiness', async p => {
  await goto(p, '/listing/cloud-poplin/compare'); await p.locator('.feel-technical-details summary').click();
  await p.getByRole('link', { name: 'Review your surface example', exact: true }).click();
  assert.equal(new URL(p.url()).searchParams.get('step'), '5'); await p.getByRole('heading', { name: 'Show the fabric and any wear', exact: true }).waitFor();
  let s = await state(p); assert(s.privateReferences.find(x => x.id === s.selectedReference).ready, 'Inspecting sources preserves reference readiness');
  await p.getByRole('link', { name: 'Return to comparison', exact: true }).first().click();
  await p.locator('.feel-direct .feel-heading h1').waitFor();
  await p.locator('.feel-technical-details summary').click();
  await p.getByRole('link', { name: 'See Cloud Poplin Blouse surface photographs', exact: true }).click();
  assert.equal(new URL(p.url()).searchParams.get('property'), 'surface');
  await p.getByRole('button', { name: 'How it hangs', exact: true }).click();
  assert(new URL(p.url()).searchParams.has('return'));
  await p.getByRole('link', { name: 'Return to comparison', exact: true }).click();
  await p.locator('.feel-direct .feel-heading h1').waitFor(); await healthy(p);
}, 390);

for (const width of [390, 1440]) await check(`Primary route accessibility · ${width}`, async p => {
  for (const route of ['/shop', '/listing/cloud-poplin', '/match', '/wardrobe', '/sell', '/sell/capture', '/orders', '/account', '/about']) {
    await goto(p, route); if (await p.locator('.animated-garment').count()) await ready(p, await p.locator('.animated-garment').count());
    await scan(p, width, route); await healthy(p);
  }
}, width, { reducedMotion: 'reduce' });
await check('Bag, candidate-only Buy now, decline recovery and stable receipts', async p => {
  await goto(p, '/listing/moss-knit'); await p.getByRole('button', { name: 'Add to bag', exact: true }).filter({ visible: true }).first().click();
  await goto(p, '/listing/cloud-poplin'); await p.getByRole('button', { name: /Buy now/ }).filter({ visible: true }).first().click();
  await p.getByRole('button', { name: 'Place order', exact: false }).click(); await p.getByText('Enter your full name.').waitFor();
  await p.getByLabel('Full name', { exact: true }).fill('Jamie Test'); await p.getByLabel('Delivery address', { exact: true }).fill('12 Example Street, Sample City 12345');
  await p.locator('summary').filter({ hasText: 'Explore payment outcomes' }).click(); await p.getByLabel('Declined payment', { exact: false }).check();
  await p.getByRole('button', { name: 'Try declined payment', exact: false }).click(); await p.getByText('Your payment was declined.', { exact: true }).waitFor();
  assert.equal(await p.getByLabel('Full name', { exact: true }).inputValue(), 'Jamie Test'); assert.equal((await state(p)).availability['cloud-poplin'], 'active');
  await p.getByLabel('Successful payment', { exact: false }).check(); await p.getByRole('button', { name: 'Place order', exact: false }).click();
  await p.getByRole('heading', { name: /Your good find is reserved/ }).waitFor(); const s = await state(p);
  assert.deepEqual(s.bag, ['moss-knit']); assert.equal(s.availability['cloud-poplin'], 'reserved'); assert.equal(s.orders[0].total, 37); await healthy(p);
});
await fs.writeFile(path.join(output, 'browser-results.json'), JSON.stringify({ mode: production ? 'production' : 'development', results, pageErrors: errors, accessibility, motion, limits: ['Headless Chromium with software WebGL and simulated phone viewports', 'No physical-device performance or Safari/Firefox acceptance', 'Prepared garment mechanics, not calibrated textile properties', 'Local-only prototype, no actual camera recording or live commerce'] }, null, 2));
await browser.close(); if (server.close) await server.close(); else if (server.httpServer.listening) await new Promise(resolve => server.httpServer.close(resolve));
const failed = results.filter(x => x.status !== 'passed');
console.log(JSON.stringify({ passed: results.length - failed.length, failed: failed.length, pageErrors: errors.length, accessibilityScans: accessibility.length }));
if (failed.length || errors.length) process.exitCode = 1;
