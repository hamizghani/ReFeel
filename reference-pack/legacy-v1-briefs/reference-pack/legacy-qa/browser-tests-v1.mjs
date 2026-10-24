import { createServer, preview } from "vite";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const production = process.env.FAMILIAR_TEST_PRODUCTION === "1";
const server = production
  ? await preview({
      preview: { host: "127.0.0.1", port: 0 },
      logLevel: "error",
    })
  : await createServer({
      server: { host: "127.0.0.1", port: 0 },
      logLevel: "error",
    });
if (!production) await server.listen();
const addr = server.httpServer.address();
const base = `http://127.0.0.1:${addr.port}`;
const browser = await chromium.launch({
  headless: true,
  args: [
    "--no-sandbox",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-webgl",
  ],
});
const reports = [];
const errors = [];
await fs.mkdir("qa/evidence", { recursive: true });
async function test(name, fn, options = {}) {
  const context = await browser.newContext({
    viewport: { width: 1366, height: 900 },
    ...options,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  page.on("pageerror", (e) => errors.push({ test: name, message: e.message }));
  try {
    await fn(page, context);
    reports.push({ name, status: "passed" });
    console.log("PASS", name);
  } catch (e) {
    reports.push({ name, status: "failed", message: e.message });
    console.log("FAIL", name, e.message);
    await page
      .screenshot({
        path: `qa/evidence/failure-${reports.length}.png`,
        fullPage: true,
      })
      .catch(() => {});
  }
  await context.close();
}
const goto = (p, path) => p.goto(base + path, { waitUntil: "networkidle" });
const state = (p) =>
  p.evaluate(() => JSON.parse(localStorage.getItem("familiar-v1")));
async function screenshot(p, name) {
  await p.evaluate(() => document.activeElement?.blur());
  await p.screenshot({
    path: `qa/evidence/${name}.png`,
    fullPage: !["/shop", "/saved"].includes(new URL(p.url()).pathname),
  });
}
async function noOverflow(p) {
  assert(
    await p.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
    "Horizontal overflow",
  );
}
await test("Gateway role choices and editorial desktop", async (p) => {
  await goto(p, "/");
  for (const text of [
    "Shop Familiar",
    "Sell with Familiar Evidence",
    "Explore both",
  ])
    await p.getByRole("link", { name: text, exact: true }).waitFor();
  await noOverflow(p);
  await screenshot(p, "gateway-desktop");
});
await test("Marketplace exact counts and inert Coming soon", async (p) => {
  await goto(p, "/shop");
  assert.equal(await p.getByTestId("active-card").count(), 12);
  assert.equal(await p.getByTestId("coming-soon-card").count(), 50);
  assert.equal(
    await p.getByTestId("coming-soon-card").locator("a,button,input").count(),
    0,
  );
  const before = await state(p);
  await p.getByTestId("coming-soon-card").first().click();
  assert.equal(new URL(p.url()).pathname, "/shop");
  assert.deepEqual(await state(p), before);
  await screenshot(p, "shop-desktop");
});
await test("Search, size filtering and persisted saved listing", async (p) => {
  await goto(p, "/shop");
  await p.getByRole("searchbox").fill("cloud");
  assert.equal(await p.getByTestId("active-card").count(), 1);
  await p.getByRole("button", { name: /^Save Cloud/ }).click();
  await p.reload();
  assert.equal((await state(p)).saved.length, 1);
  assert.equal(await p.getByTestId("active-card").count(), 1);
  await goto(p, "/saved");
  assert.equal(await p.getByTestId("active-card").count(), 1);
  await p.getByRole("button", { name: /^Unsave Cloud/ }).click();
  await p.getByRole("heading", { name: "Keep a little collection." }).waitFor();
  await goto(p, "/shop");
  await p.getByRole("button", { name: "Filters", exact: true }).click();
  await p.getByLabel("Size", { exact: true }).selectOption("S");
  const ids = await p
    .getByTestId("active-card")
    .evaluateAll((es) => es.map((e) => e.dataset.id));
  assert(ids.includes("petal-tee"));
  assert(!ids.includes("moss-knit"));
});
await test("Every active listing offers comparison and real source files", async (p) => {
  await goto(p, "/shop");
  const ids = await p
    .getByTestId("active-card")
    .evaluateAll((es) => es.map((e) => e.dataset.id));
  for (const id of ids) {
    await goto(p, `/listing/${id}?webgl=off`);
    await p
      .getByRole("link", { name: "Compare with something I own", exact: false })
      .waitFor();
    await goto(p, `/listing/${id}/evidence`);
    const imgs = await p.locator(".source-image img").evaluateAll((es) =>
      es.map((e) => ({
        loaded: e.complete && e.naturalWidth > 0,
        src: e.getAttribute("src"),
      })),
    );
    assert(
      imgs.every((i) => i.loaded),
      id + " source missing",
    );
  }
});
await test("Source evidence state, marker and unknowns", async (p) => {
  await goto(p, "/listing/cloud-poplin/evidence");
  await p.getByRole("button", { name: "Surface", exact: true }).click();
  await p.getByText("Awaiting seller review").waitFor();
  assert.equal(await p.locator(".source-marker").count(), 1);
  await p.getByRole("button", { name: "Hide marker", exact: true }).click();
  assert.equal(await p.locator(".source-marker").count(), 0);
  for (const text of [
    "Odor",
    "Hygiene",
    "Authenticity",
    "Exact softness",
    "Hidden damage",
    "Laboratory mechanics",
  ])
    await p.getByText(text, { exact: true }).waitFor();
  await screenshot(p, "evidence-desktop");
});
await test("Three Match results, reference rename/delete/restore", async (p) => {
  await goto(p, "/match?webgl=off");
  assert.equal(await p.getByTestId("match-result").count(), 3);
  await p.getByText("Manage this reference", { exact: true }).click();
  await p.getByLabel("Reference name").fill("My favorite blue blouse");
  await p.getByRole("button", { name: "Save name", exact: true }).click();
  await p.reload();
  await p
    .getByRole("heading", { name: "My favorite blue blouse", exact: true })
    .first()
    .waitFor();
  await p.getByText("Manage this reference", { exact: true }).click();
  await p
    .getByRole("button", { name: "Remove private reference", exact: true })
    .click();
  await p
    .getByRole("button", { name: "Remove reference", exact: true })
    .click();
  assert.equal(await p.getByTestId("match-result").count(), 0);
  assert.equal((await state(p)).selectedReference, "");
  await p.getByRole("button", { name: "Restore prepared reference" }).click();
  assert.equal(await p.getByTestId("match-result").count(), 3);
});
await test("Four real GLBs, one canvas, controls and modes", async (p) => {
  for (const id of ["cloud-poplin", "moss-knit", "airloom-linen"]) {
    await goto(p, `/listing/${id}`);
    await p.locator('[data-render-state="ready"]').waitFor({ timeout: 20000 });
    assert.equal(await p.locator("canvas").count(), 1);
    await p.getByRole("button", { name: "Drape", exact: true }).click();
    assert.equal(
      await p.getByTestId("garment-viewer").getAttribute("data-mode"),
      "drape",
    );
    await p.getByRole("button", { name: "Surface", exact: true }).click();
    assert.equal(
      await p.getByTestId("garment-viewer").getAttribute("data-mode"),
      "surface",
    );
    await screenshot(p, id + "-3d");
  }
  await goto(p, "/listing/cloud-poplin/compare");
  await p.locator('[data-render-state="ready"]').waitFor({ timeout: 20000 });
  assert.equal(await p.locator("canvas").count(), 1);
  assert.equal(await p.getByTestId("reference-viewport").count(), 1);
  assert.equal(await p.getByTestId("listing-viewport").count(), 1);
  await screenshot(p, "comparison-desktop");
  await goto(p, "/shop");
  assert.equal(await p.locator("canvas").count(), 0);
});
await test("WebGL and failed asset fallback", async (p, ctx) => {
  await goto(p, "/listing/cloud-poplin?webgl=off");
  await p.locator('[data-render-state="fallback"]').waitFor();
  assert.equal(await p.locator("canvas").count(), 0);
  await p.getByRole("button", { name: "Add to bag", exact: true }).waitFor();
  await ctx.route("**/models/*.glb", (r) => r.abort());
  await goto(p, "/listing/moss-knit");
  await p
    .locator('[data-render-state="error"],[data-render-state="fallback"]')
    .waitFor({ timeout: 20000 });
  await screenshot(p, "webgl-fallback");
});
await test("Seller six stages, review correction, unsure, publish persistence", async (p) => {
  await goto(p, "/sell/publish");
  await p.getByRole("heading", { name: "A few checks come first." }).waitFor();
  await goto(p, "/sell/capture?webgl=off");
  await p
    .getByRole("button", { name: "Start garment checks", exact: true })
    .click();
  assert.equal((await state(p)).captureStage, 1);
  await p
    .getByRole("button", { name: "View a capture issue", exact: false })
    .click();
  assert(
    await p
      .getByRole("button", { name: "Save check & continue", exact: false })
      .isDisabled(),
  );
  await p.getByRole("button", { name: "Try again", exact: true }).click();
  for (let i = 1; i < 5; i++) {
    assert.equal((await state(p)).captureStage, i);
    await p
      .getByRole("button", { name: "Save check & continue", exact: false })
      .click();
  }
  await screenshot(p, "seller-capture-wear");
  await p
    .getByRole("button", { name: "Finish & review", exact: false })
    .click();
  await p.getByRole("group", { name: "Drape review decision" }).waitFor();
  const group = (property) =>
    p.getByRole("group", { name: `${property} review decision` });
  await group("Drape")
    .getByRole("button", { name: "Confirm", exact: true })
    .click();
  await group("Movement")
    .getByRole("button", { name: "Unsure", exact: true })
    .click();
  await group("Stretch")
    .getByRole("button", { name: "Unsure", exact: true })
    .click();
  await group("Surface")
    .getByRole("button", { name: "Correct", exact: true })
    .click();
  await p
    .getByLabel("What should a buyer know?")
    .fill("Small cuff mark, with intact visible stitching.");
  await p.getByRole("button", { name: "Save correction", exact: true }).click();
  await screenshot(p, "seller-review");
  await p
    .getByRole("link", { name: "Preview & publish", exact: false })
    .click();
  await p
    .getByRole("button", { name: "Publish listing", exact: false })
    .click();
  assert((await state(p)).published);
  await goto(p, "/listing/cloud-poplin/evidence");
  await p.getByRole("button", { name: "Surface", exact: true }).click();
  await p
    .getByText("Small cuff mark, with intact visible stitching.", {
      exact: true,
    })
    .waitFor();
  await p.reload();
  await p.getByRole("button", { name: "Movement", exact: true }).click();
  await p.getByText("Seller is unsure", { exact: true }).waitFor();
});
await test("Seller retake clears stale relevant decisions", async (p) => {
  await goto(p, "/sell/capture?webgl=off");
  await p
    .getByRole("button", { name: "Start garment checks", exact: true })
    .click();
  for (let i = 1; i < 5; i++)
    await p
      .getByRole("button", { name: "Save check & continue", exact: false })
      .click();
  await p
    .getByRole("button", { name: "Finish & review", exact: false })
    .click();
  await p
    .getByRole("group", { name: "Surface review decision" })
    .getByRole("button", { name: "Confirm", exact: true })
    .click();
  await p
    .getByRole("group", { name: "Surface review decision" })
    .getByRole("button", { name: "Retake", exact: true })
    .click();
  assert.equal((await state(p)).captureStage, 3);
  assert.equal(
    (await state(p)).decisions.Surface?.status ?? "unreviewed",
    "unreviewed",
  );
  assert.equal((await state(p)).published, false);
});
await test("Checkout decline, reservation, persistence and order cancellation", async (p) => {
  await goto(p, "/listing/cloud-poplin?webgl=off");
  await p.getByRole("button", { name: "Buy now", exact: false }).click();
  await p.getByLabel("Full name").fill("Jamie Example");
  await p.getByLabel("Delivery address").fill("12 Garden Road");
  await p.getByText("Explore payment outcomes", { exact: true }).click();
  await p.getByLabel("Declined payment", { exact: false }).check();
  await p
    .getByRole("button", { name: "Try declined payment", exact: false })
    .click();
  assert.equal((await state(p)).orders.length, 0);
  assert.equal((await state(p)).buyNowId, "cloud-poplin");
  await p.getByLabel("Successful payment", { exact: false }).check();
  await p.getByRole("button", { name: "Place order", exact: false }).click();
  await p.waitForURL("**/orders");
  const order = (await state(p)).orders[0];
  assert.equal(order.total, 37);
  assert.equal((await state(p)).availability["cloud-poplin"], "reserved");
  await p.reload();
  assert.equal((await state(p)).orders[0].id, order.id);
  await screenshot(p, "orders-desktop");
  await p.getByText("Explore order updates", { exact: true }).click();
  await p.getByRole("button", { name: "Cancel order", exact: true }).click();
  assert.equal((await state(p)).availability["cloud-poplin"], "active");
});
await test(
  "Mobile and reduced-motion layouts",
  async (p) => {
    for (const path of [
      "/",
      "/shop",
      "/listing/cloud-poplin?webgl=off",
      "/listing/cloud-poplin/compare?webgl=off",
      "/sell/capture?webgl=off",
      "/checkout",
      "/orders",
      "/about",
    ]) {
      await goto(p, path);
      await noOverflow(p);
    }
    await goto(p, "/shop");
    await screenshot(p, "shop-mobile");
    await goto(p, "/listing/cloud-poplin/compare?webgl=off");
    const a = await p.getByTestId("reference-viewport").boundingBox(),
      b = await p.getByTestId("listing-viewport").boundingBox();
    assert(a && b && a.y < b.y);
    await screenshot(p, "comparison-mobile");
    await goto(p, "/");
    await screenshot(p, "gateway-mobile");
  },
  { viewport: { width: 390, height: 844 }, reducedMotion: "reduce" },
);
await test(
  "Narrow mobile landscape no overflow",
  async (p) => {
    for (const path of [
      "/shop",
      "/match?webgl=off",
      "/sell/capture?webgl=off",
    ]) {
      await goto(p, path);
      await noOverflow(p);
    }
  },
  { viewport: { width: 320, height: 568 } },
);
await test("Corrupted local state and 404 recover", async (p) => {
  await goto(p, "/");
  await p.evaluate(() =>
    localStorage.setItem("familiar-v1", '{"orders":[null],"saved":42}'),
  );
  await p.reload();
  await p.getByRole("link", { name: "Shop Familiar", exact: true }).waitFor();
  await goto(p, "/listing/coming-soon-01");
  await p
    .getByRole("link", { name: "Back to the edit", exact: false })
    .waitFor();
  await goto(p, "/about");
  await p
    .getByRole("button", { name: "Reset local demo", exact: true })
    .click();
  await p.getByRole("button", { name: "Reset demo", exact: true }).click();
  assert.equal(new URL(p.url()).pathname, "/");
});
await test("Revised discovery, source recovery and private route guards", async (p, ctx) => {
  await goto(p, "/shop");
  await p.getByRole("searchbox").fill("blue shirt size M");
  assert.equal(await p.getByTestId("active-card").count(), 1);
  await p.getByRole("searchbox").fill("no-such-piece");
  await p
    .getByRole("link", { name: "Browse all pieces", exact: false })
    .click();
  assert.equal(await p.getByTestId("active-card").count(), 12);
  await p.getByLabel("Sort pieces").selectOption("Price: low to high");
  const prices = await p.locator(".product-info>strong").allTextContents();
  assert.equal(prices[0], "$18.00");
  await goto(p, "/listing/my-blue-blouse");
  assert.equal(
    await p.getByRole("button", { name: "Add to bag", exact: true }).count(),
    0,
  );
  await p
    .getByRole("link", { name: "Back to the edit", exact: false })
    .waitFor();
  await goto(p, "/listing/cloud-poplin/compare?webgl=off");
  await p.getByLabel("What matters most?").selectOption("Surface");
  await p.reload();
  assert.equal(
    await p.getByLabel("What matters most?").inputValue(),
    "Surface",
  );
  await p
    .locator(".property-panel")
    .filter({ has: p.getByRole("heading", { name: "Surface", exact: true }) })
    .getByRole("link", { name: "View this source", exact: false })
    .click();
  await p.getByRole("button", { name: "Surface", exact: true }).waitFor();
  assert.equal(
    await p
      .getByRole("button", { name: "Surface", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );
  await p
    .getByRole("button", { name: "Zoom source frame in", exact: true })
    .click();
  assert(
    (await p.locator(".source-zoom").getAttribute("style")).includes("1.25"),
  );
  await ctx.route("**/evidence/*.svg", (r) => r.abort());
  await p.reload();
  await p
    .getByRole("heading", {
      name: "The capture frame could not load.",
      exact: true,
    })
    .waitFor();
  await p
    .getByText("Source unavailable on this visit.", { exact: false })
    .waitFor();
  await ctx.unroute("**/evidence/*.svg");
  await p
    .getByRole("button", { name: "Retry source frame", exact: true })
    .click();
  await p.locator(".source-zoom img").waitFor();
  assert(
    await p
      .locator(".source-zoom img")
      .evaluate((e) => e.complete && e.naturalWidth > 0),
  );
});
await test("Buy now preserves another piece in the bag", async (p) => {
  await goto(p, "/listing/moss-knit?webgl=off");
  await p.getByRole("button", { name: "Add to bag", exact: true }).click();
  await goto(p, "/listing/cloud-poplin?webgl=off");
  await p.getByRole("button", { name: "Buy now", exact: false }).click();
  await p.locator(".bag-item").first().waitFor();
  assert.equal(await p.locator(".bag-item").count(), 1);
  assert.equal((await state(p)).bag[0], "moss-knit");
  await p.getByLabel("Full name", { exact: true }).fill("Jamie Example");
  await p
    .getByLabel("Delivery address", { exact: true })
    .fill("12 Garden Road, New York 10001");
  await p.getByRole("button", { name: "Place order", exact: false }).click();
  await p.waitForURL("**/orders");
  assert.deepEqual((await state(p)).orders[0].items, ["cloud-poplin"]);
  assert.deepEqual((await state(p)).bag, ["moss-knit"]);
});
await test("Persistent source conversation and report", async (p) => {
  await goto(p, "/listing/cloud-poplin?webgl=off");
  await p
    .getByLabel("Question about Cloud Poplin Blouse", { exact: false })
    .fill("What can the surface show?");
  await p
    .getByRole("button", { name: "Ask about this piece", exact: false })
    .click();
  await p.getByRole("log").waitFor();
  await p
    .getByRole("button", { name: "Report this reply", exact: false })
    .click();
  await p
    .getByRole("button", { name: "Save conversation report", exact: false })
    .click();
  await p
    .getByText("Report recorded on this device:", { exact: false })
    .waitFor();
  await p.reload();
  await p
    .getByRole("log")
    .getByText("What can the surface show?", { exact: false })
    .waitFor();
});
await test("Private reference processing and incomplete recovery", async (p) => {
  await goto(p, "/match?webgl=off");
  await p.getByText("Replace prepared reference", { exact: true }).click();
  const region = p.getByRole("region", {
    name: "Prepared reference replacement",
  });
  await region.getByRole("combobox").selectOption("missing-movement");
  await region
    .getByRole("button", { name: "Begin reference replacement", exact: false })
    .click();
  assert.equal(await p.getByTestId("match-result").count(), 0);
  for (let i = 0; i < 3; i++)
    await p
      .getByRole("button", { name: "Next reference check", exact: false })
      .click();
  await p
    .getByRole("button", { name: "Finish reference replacement", exact: false })
    .click();
  await p
    .getByRole("heading", {
      name: "Movement coverage is missing.",
      exact: true,
    })
    .waitFor();
  await p.reload();
  assert.equal(await p.getByTestId("match-result").count(), 0);
  await p
    .getByRole("button", {
      name: "Keep original prepared reference",
      exact: true,
    })
    .click();
  assert.equal(await p.getByTestId("match-result").count(), 3);
});
await test("Distinct durable moderation gate and appeal recovery", async (p) => {
  await goto(p, "/sell");
  await p
    .getByText("Seller support and moderation history", { exact: true })
    .click();
  await p
    .getByRole("button", { name: "Explore a held listing", exact: true })
    .click();
  await goto(p, "/sell/publish");
  await p
    .getByRole("heading", { name: "Publication is on hold.", exact: true })
    .waitFor();
  assert.equal(
    await p
      .getByRole("button", { name: "Publish listing", exact: false })
      .count(),
    0,
  );
  await p
    .getByLabel("Appeal or correction explanation", { exact: false })
    .fill("Removed the unsupported softness claim; visible source only.");
  await p
    .getByRole("button", { name: "Submit prepared appeal", exact: false })
    .click();
  await p.reload();
  await p
    .getByText("Your prepared appeal is awaiting review.", { exact: false })
    .waitFor();
  await p
    .getByRole("button", { name: "Read prepared review decision", exact: true })
    .click();
  await p
    .getByRole("heading", { name: "A few checks come first.", exact: true })
    .waitFor();
  await goto(p, "/sell");
  await p
    .getByText("Seller support and moderation history", { exact: true })
    .click();
  await p
    .getByText("Hold cleared by prepared review", { exact: true })
    .waitFor();
});
await test("Local privacy export, consent and prepared signout", async (p) => {
  await goto(p, "/about");
  const downloaded = p.waitForEvent("download");
  await p
    .getByRole("button", { name: "Export local data", exact: true })
    .click();
  const download = await downloaded;
  assert.equal(download.suggestedFilename(), "familiar-local-data.json");
  await p
    .getByRole("button", { name: "Remove reference consent", exact: true })
    .click();
  await p
    .getByRole("button", { name: "Remove reference consent now", exact: true })
    .click();
  assert.equal((await state(p)).referenceAvailable, false);
  await p
    .getByRole("button", { name: "Sign out of prepared session", exact: true })
    .click();
  await p.waitForURL(base + "/");
  await p.getByRole("link", { name: "Shop Familiar", exact: true }).waitFor();
});
await test("Listing pause/remove/resume and immutable receipts", async (p) => {
  await goto(p, "/sell");
  await p.getByText("Listing availability", { exact: true }).click();
  await p.getByRole("button", { name: "Pause listing", exact: true }).click();
  await goto(p, "/listing/cloud-poplin?webgl=off");
  assert(
    await p.getByRole("button", { name: "Paused", exact: true }).isDisabled(),
  );
  await goto(p, "/sell");
  await p.getByText("Listing availability", { exact: true }).click();
  await p
    .getByRole("button", {
      name: "Remove listing from marketplace",
      exact: true,
    })
    .click();
  await goto(p, "/shop");
  assert.equal(await p.getByTestId("active-card").count(), 11);
  await goto(p, "/listing/cloud-poplin");
  await p
    .getByRole("link", { name: "Back to the edit", exact: false })
    .waitFor();
  await goto(p, "/sell");
  await p.getByText("Listing availability", { exact: true }).click();
  await p.getByRole("button", { name: "Restore listing", exact: true }).click();
  await goto(p, "/shop");
  assert.equal(await p.getByTestId("active-card").count(), 12);
});
await test("Four-property arrival feedback and skip recovery", async (p) => {
  await goto(p, "/listing/cloud-poplin?webgl=off");
  await p.getByRole("button", { name: "Buy now", exact: false }).click();
  await p.getByLabel("Full name", { exact: true }).fill("Jamie Example");
  await p
    .getByLabel("Delivery address", { exact: true })
    .fill("12 Garden Road, New York 10001");
  await p.getByRole("button", { name: "Place order", exact: false }).click();
  await p.waitForURL("**/orders");
  await p.getByText("Explore order updates", { exact: true }).click();
  for (let i = 0; i < 4; i++)
    await p.getByRole("button", { name: /^Mark / }).click();
  await p
    .getByText("Compare four properties after arrival", { exact: true })
    .click();
  await p.getByRole("button", { name: "Skip for now", exact: true }).click();
  await p
    .getByRole("button", { name: "Return to property feedback", exact: true })
    .click();
  for (const prop of ["Drape", "Movement", "Stretch", "Surface"]) {
    const group = p.getByRole("group", { name: prop, exact: true });
    await group
      .getByLabel("Expected before arrival", { exact: false })
      .fill(
        "The description gave visible source context, with unknown physical feel.",
      );
    await group.getByRole("combobox").selectOption("not-observed");
  }
  await p
    .getByRole("button", { name: "Save property feedback", exact: false })
    .click();
  await p
    .getByText("Your four-property reflection is saved.", { exact: true })
    .waitFor();
  await p.reload();
  await p
    .getByText("Compare four properties after arrival", { exact: true })
    .click();
  await p
    .getByText("Your four-property reflection is saved.", { exact: true })
    .waitFor();
});
await test("Accessibility primary views", async (p) => {
  const result = [];
  for (const path of [
    "/",
    "/shop",
    "/listing/cloud-poplin?webgl=off",
    "/listing/cloud-poplin/evidence",
    "/match?webgl=off",
    "/sell",
    "/sell/capture?webgl=off",
    "/checkout",
    "/about",
  ]) {
    await goto(p, path);
    const scan = await new AxeBuilder({ page: p })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    result.push({
      path,
      violations: scan.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    });
  }
  await fs.writeFile(
    "qa/evidence/accessibility.json",
    JSON.stringify(result, null, 2),
  );
  const serious = result.flatMap((r) =>
    r.violations
      .filter((v) => v.impact === "critical" || v.impact === "serious")
      .map((v) => ({ path: r.path, ...v })),
  );
  assert.equal(serious.length, 0, JSON.stringify(serious).slice(0, 2500));
});
await browser.close();
if (production)
  await new Promise((resolve) => server.httpServer.close(resolve));
else await server.close();
const result = {
  date: new Date().toISOString(),
  production,
  browser: "Chromium 141 / Playwright 1.56.1",
  reports,
  pageErrors: errors,
};
await fs.writeFile(
  "qa/evidence/browser-results.json",
  JSON.stringify(result, null, 2),
);
console.log(
  JSON.stringify({
    passed: reports.filter((r) => r.status === "passed").length,
    failed: reports.filter((r) => r.status === "failed").length,
    pageErrors: errors.length,
  }),
);
if (reports.some((r) => r.status === "failed") || errors.length)
  process.exitCode = 1;
