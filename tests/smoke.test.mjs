import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { preview } from "vite";
import { launchBrowser, wait } from "./helpers.mjs";

const PORT = 4317;
let server;
let browser;

const SKIP_CHROME =
  "No Chrome/Chromium found. Install one or set CHROME_PATH to its executable.";

// ---------------------------------------------------------------- lifecycle
before(async () => {
  server = await preview({
    preview: { port: PORT, strictPort: true, host: "127.0.0.1" },
    logLevel: "silent",
  });
  try {
    browser = await launchBrowser();
  } catch {
    browser = null; // tests will skip with a clear message
  }
});

after(async () => {
  await browser?.close();
  await server?.close();
});

// ---------------------------------------------------------------- utilities
async function open(width = 1280, height = 860) {
  const page = await browser.newPage();
  await page.setViewport({
    width,
    height,
    deviceScaleFactor: 1,
    isMobile: width < 700,
    hasTouch: width < 700,
  });
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "networkidle0" });
  await wait(300);
  return page;
}

/** Run a test body with a fresh page, or skip it if there is no browser. */
async function withPage(t, fn, width, height) {
  if (!browser) return t.skip(SKIP_CHROME);
  const page = await open(width, height);
  try {
    await fn(page);
  } finally {
    await page.close();
  }
}

const clickByText = (page, selector, text) =>
  page.evaluate(
    (sel, label) => {
      const el = [...document.querySelectorAll(sel)].find((n) =>
        n.textContent.includes(label),
      );
      if (!el) throw new Error(`No "${label}" in ${sel}`);
      el.click();
    },
    selector,
    text,
  );

const overviewWindow = (page) =>
  page.$eval(".overview__window", (el) => ({
    left: parseFloat(el.style.left),
    width: parseFloat(el.style.width),
  }));

// -------------------------------------------------------------------- tests
test("renders the timeline with events and an overview", (t) =>
  withPage(t, async (page) => {
    const stats = await page.evaluate(() => ({
      brand: document.querySelector(".brand")?.textContent ?? "",
      markers: document.querySelectorAll(".marker").length,
      ticks: document.querySelectorAll(".overview__tick").length,
      legends: document.querySelectorAll(".legend__item").length,
    }));
    assert.match(stats.brand, /Life in the UK/);
    assert.ok(stats.markers > 0, "expected visible event markers");
    assert.ok(stats.ticks > 40, "expected an overview tick per event");
    assert.equal(stats.legends, 8, "expected 8 category filters");
  }));

test("zooming in narrows the view window", (t) =>
  withPage(t, async (page) => {
    const before = await overviewWindow(page);
    const box = await (await page.$(".timeline")).boundingBox();
    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.5);
    for (let i = 0; i < 6; i++) {
      await page.mouse.wheel({ deltaY: -120 });
      await wait(40);
    }
    await wait(200);
    const after = await overviewWindow(page);
    assert.ok(
      after.width < before.width - 0.1,
      `expected a narrower window (${before.width} -> ${after.width})`,
    );
  }));

test("panning moves the view window", (t) =>
  withPage(t, async (page) => {
    const box = await (await page.$(".timeline")).boundingBox();
    const cx = box.x + box.width * 0.5;
    const cy = box.y + box.height * 0.5;
    await page.mouse.move(cx, cy);
    for (let i = 0; i < 5; i++) await page.mouse.wheel({ deltaY: -120 });
    await wait(150);
    const before = await overviewWindow(page);
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx - 250, cy, { steps: 10 });
    await page.mouse.up();
    await wait(150);
    const after = await overviewWindow(page);
    assert.ok(
      Math.abs(after.left - before.left) > 1,
      `expected the window to move (${before.left} -> ${after.left})`,
    );
  }));

test("search finds an event and opens its exam reference", (t) =>
  withPage(t, async (page) => {
    await page.type(".search input", "magna");
    await wait(250);
    const results = await page.$$eval(".search__item b", (els) =>
      els.map((e) => e.textContent),
    );
    assert.deepEqual(results, ["Magna Carta"]);

    await page.click(".search__item");
    await wait(300);
    const detail = await page.evaluate(() => ({
      title: document.querySelector(".detail h2")?.textContent,
      hasRef: !!document.querySelector(".ref-card"),
    }));
    assert.equal(detail.title, "Magna Carta");
    assert.ok(detail.hasRef, "expected an exam reference card");
  }));

test("hiding a category removes its events", (t) =>
  withPage(t, async (page) => {
    const before = await page.$$eval(".overview__tick", (e) => e.length);
    await clickByText(page, ".legend__item", "Sport");
    await wait(200);
    const after = await page.$$eval(".overview__tick", (e) => e.length);
    assert.ok(after < before, `expected fewer ticks (${before} -> ${after})`);
  }));

test("list mode groups events by era", (t) =>
  withPage(t, async (page) => {
    await clickByText(page, ".mode-toggle button", "List");
    await wait(200);
    const groups = await page.$$eval(".list__year", (els) =>
      els.map((e) => e.textContent),
    );
    const cards = await page.$$eval(".card", (els) => els.length);
    assert.equal(groups.length, 5);
    assert.ok(cards > 0, "expected event cards");
  }));

test("annual tab lists the year and opens a detail sheet", (t) =>
  withPage(t, async (page) => {
    await clickByText(page, ".tabs button", "Annual dates");
    await wait(200);
    const months = await page.$$eval(".month", (els) => els.length);
    assert.equal(months, 13, "12 months plus the movable-dates card");

    await page.click(".annual");
    await wait(200);
    const detail = await page.evaluate(() => ({
      title: document.querySelector(".detail h2")?.textContent ?? "",
      date: document.querySelector(".detail__date")?.textContent ?? "",
      hasRef: !!document.querySelector(".ref-card"),
    }));
    assert.ok(detail.title.length > 0, "expected an annual event title");
    assert.match(detail.date, /every year|Movable/);
    assert.ok(detail.hasRef, "expected an exam reference");
  }));

test("phone layout does not overflow and the sheet opens", (t) =>
  withPage(
    t,
    async (page) => {
      const layout = await page.evaluate(() => ({
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
        markers: document.querySelectorAll(".marker").length,
      }));
      assert.ok(layout.scrollW <= layout.clientW + 1, "no horizontal overflow");
      assert.ok(layout.markers > 0, "expected markers on a phone");

      await page.click(".marker");
      await wait(250);
      const title = await page.evaluate(
        () => document.querySelector(".detail h2")?.textContent ?? "",
      );
      assert.ok(title.length > 0, "expected the bottom sheet to open");
    },
    390,
    844,
  ));
