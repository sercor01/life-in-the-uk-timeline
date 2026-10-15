import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { SKIP_CHROME, clickByText, launchBrowser, startPreview, wait } from "./helpers.mjs";

const PORT = 4317;
let server;
let browser;

// ---------------------------------------------------------------- lifecycle
before(async () => {
  server = await startPreview(PORT);
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
/** The preview URL for a path on the served build. */
const link = (path) => `http://127.0.0.1:${PORT}${path}`;

async function open(width = 1280, height = 860, path = "/") {
  const page = await browser.newPage();
  await page.setViewport({
    width,
    height,
    deviceScaleFactor: 1,
    isMobile: width < 700,
    hasTouch: width < 700,
  });
  await page.goto(link(path), { waitUntil: "networkidle0" });
  await wait(300);
  return page;
}

/** Run a test body with a fresh page, or skip it if there is no browser. */
async function withPage(t, fn, width, height, path) {
  if (!browser) return t.skip(SKIP_CHROME);
  const page = await open(width, height, path);
  try {
    await fn(page);
  } finally {
    await page.close();
  }
}

/** Run a test body against a shared link, as if the visitor had opened one. */
const withDeepLink = (t, path, fn) => withPage(t, fn, 1280, 860, path);

/** The label of the tab the switcher is marking as current. */
const currentTab = (page) =>
  page.$eval('.tabs button[aria-current="true"]', (el) => el.textContent);

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
    assert.equal(stats.legends, 10, "expected 10 category filters");
  }));

test("axis tick labels are fully visible at the edges", (t) =>
  withPage(t, async (page) => {
    const clipped = await page.evaluate(() => {
      const tl = document.querySelector(".timeline").getBoundingClientRect();
      return [...document.querySelectorAll(".tick-label")]
        .map((el) => {
          const r = el.getBoundingClientRect();
          return {
            text: el.textContent,
            left: +(r.left - tl.left).toFixed(1),
            right: +(r.right - tl.left).toFixed(1),
            width: Math.round(tl.width),
          };
        })
        .filter((t) => t.left < -0.5 || t.right > t.width + 0.5);
    });
    assert.equal(clipped.length, 0, `clipped tick labels: ${JSON.stringify(clipped)}`);
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

test("a modifier click on a legend chip isolates one category", (t) =>
  withPage(t, async (page) => {
    const isolate = (category) =>
      page.evaluate((id) => {
        const el = document.querySelector(`.legend__item[data-category="${id}"]`);
        if (!el) throw new Error(`no chip for ${id}`);
        el.dispatchEvent(new MouseEvent("click", { bubbles: true, metaKey: true }));
      }, category);

    await isolate("sport");
    await wait(200);

    const pressed = await page.$$eval(".legend__item", (els) =>
      els
        .filter((e) => e.getAttribute("aria-pressed") === "true")
        .map((e) => e.getAttribute("data-category")),
    );
    assert.deepEqual(pressed, ["sport"], "expected only the isolated category on");

    // The timeline is filtered too, not just the chips.
    const tickColours = await page.$$eval(".overview__tick", (els) => [
      ...new Set(els.map((e) => e.style.background)),
    ]);
    assert.deepEqual(tickColours, ["var(--c-sport)"]);

    // Isolating again restores every category.
    await isolate("sport");
    await wait(200);
    const restored = await page.$$eval(
      ".legend__item",
      (els) => els.filter((e) => e.getAttribute("aria-pressed") === "true").length,
    );
    assert.equal(restored, 10, "expected every category back on");
  }));

test("hovering a legend chip dims the other categories", (t) =>
  withPage(t, async (page) => {
    await page.hover('.legend__item[data-category="war"]');
    await wait(150);

    const lit = await page.evaluate(() => ({
      markers: document.querySelectorAll(".marker").length,
      muted: document.querySelectorAll(".marker--muted").length,
      mutedTicks: [...document.querySelectorAll(".overview__tick")].filter(
        (e) => e.style.background === "var(--faint)",
      ).length,
    }));
    assert.ok(lit.markers > 0, "expected markers on the timeline");
    assert.ok(lit.muted > 0, "expected the other categories dimmed");
    assert.ok(lit.muted < lit.markers, "expected the hovered category left lit");
    assert.ok(lit.mutedTicks > 0, "expected dimmed ticks in the overview");

    await page.mouse.move(4, 4);
    await wait(150);
    const after = await page.evaluate(
      () => document.querySelectorAll(".marker--muted").length,
    );
    assert.equal(after, 0, "expected the dimming to clear when the pointer leaves");
  }));

test("list mode groups events by era", (t) =>
  withPage(t, async (page) => {
    await clickByText(page, ".mode-toggle button", "List");
    await wait(200);
    const groups = await page.$$eval(".list__year", (els) =>
      els.map((e) => e.textContent),
    );
    const cards = await page.$$eval(".card", (els) => els.length);
    assert.equal(groups.length, 8, "expected one group per era");
    assert.equal(groups[0], "Prehistory");
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

/*
 * The empty panel is an invitation to open something, so it belongs on the tab
 * where you pick from what you can see. On the annual tab it is advice about
 * another tab — the tab *is* a list of dates — and the population tab has
 * nothing to select at all, so the sidebar would sit there permanently empty
 * and take the width with it.
 */
test("the empty panel only appears where it means something", (t) =>
  withPage(t, async (page) => {
    const aside = () =>
      page.evaluate(() => {
        const el = document.querySelector(".detail");
        return {
          empty: el.classList.contains("detail--empty"),
          shown: getComputedStyle(el).display !== "none",
          width: Math.round(el.getBoundingClientRect().width),
        };
      });

    let panel = await aside();
    assert.ok(panel.empty && panel.shown, "the timeline should invite a pick");
    assert.ok(panel.width > 0, "and give the invitation some room");

    for (const [tab, reason] of [
      ["Annual dates", "the tab is already a list of dates"],
      ["Population", "nothing there can be selected"],
      ["Map", "the map wants the room"],
    ]) {
      await clickByText(page, ".tabs button", tab);
      if (tab === "Map") await page.waitForSelector(".map__region", { timeout: 5000 });
      await wait(300);
      panel = await aside();
      assert.equal(panel.shown, false, `expected no empty panel on ${tab} — ${reason}`);
      assert.equal(panel.width, 0, `${tab} should get its width back`);
    }

    // A panel that is showing something does still appear on those tabs.
    await clickByText(page, ".tabs button", "Annual dates");
    await wait(300);
    await page.click(".annual");
    await wait(300);
    const chosen = await page.evaluate(() => {
      const el = document.querySelector(".detail");
      return {
        empty: el.classList.contains("detail--empty"),
        shown: getComputedStyle(el).display !== "none",
        title: el.querySelector("h2")?.textContent ?? "",
      };
    });
    assert.equal(chosen.empty, false);
    assert.equal(chosen.shown, true, "the chosen date's panel belongs on the annual tab");
    assert.ok(chosen.title.length > 0, "expected the date's panel to open");
  }));

test("population figures search, open and link to the tab", (t) =>
  withPage(t, async (page) => {
    await page.type(".search input", "67 million");
    await wait(250);
    const results = await page.$$eval(".search__item b", (els) =>
      els.map((e) => e.textContent),
    );
    assert.deepEqual(results, ["Population: just over 67 million"]);

    // Picking a result focuses it on the timeline and opens the detail panel.
    await page.click(".search__item");
    await wait(300);
    const panel = await page.evaluate(() => ({
      title: document.querySelector(".detail h2")?.textContent ?? "",
      date: document.querySelector(".detail__date")?.textContent ?? "",
      cta: document.querySelector(".detail__cta")?.textContent ?? "",
    }));
    assert.match(panel.title, /Population/);
    assert.equal(panel.date, "2021");
    assert.match(panel.cta, /population chart/i);

    const onTimeline = await page.$$eval(".marker", (els) =>
      els.some((e) => e.textContent.includes("67 million")),
    );
    assert.ok(onTimeline, "expected the focused figure on the timeline");

    // The marker drops the "Population:" prefix so the figure is not cut off.
    const label = await page.$eval(
      '.marker[aria-pressed="true"] .marker__title',
      (el) => ({
        text: el.textContent,
        truncated: el.scrollWidth > el.clientWidth + 1,
      }),
    );
    assert.equal(label.text, "Just over 67 million");
    assert.equal(label.truncated, false, "the figure must not be ellipsised");

    await page.click(".detail__cta");
    await wait(250);
    const activeTab = await page.$eval(
      '.tabs button[aria-current="true"]',
      (el) => el.textContent,
    );
    assert.equal(activeTab, "Population");
  }));

test("population tab shows the handbook population table", (t) =>
  withPage(t, async (page) => {
    await clickByText(page, ".tabs button", "Population");
    await wait(200);
    const values = await page.$$eval(".milestone__value", (els) =>
      els.map((e) => e.textContent),
    );
    assert.equal(values.length, 11, "expected every handbook year");
    assert.equal(values[0], "Just over 4 million");
    assert.equal(values.at(-1), "Just over 67 million");
    const nations = await page.$$eval(".nations__item", (els) => els.length);
    assert.equal(nations, 4, "expected the four nations");
    const chartW = await page.$eval(".pop-chart svg", (el) =>
      el.getBoundingClientRect().width,
    );
    assert.ok(chartW > 0, "expected the chart to render");

    // The final point is labelled too, using the number without the "just over".
    const anchors = await page.$$eval(".pop-chart__anchor", (els) =>
      els.map((e) => e.textContent),
    );
    assert.deepEqual(anchors, ["8m", "20m", "40m", "50m", "67m"]);
  }));

test("switching tabs keeps the panel each tab was showing", (t) =>
  withPage(t, async (page) => {
    await page.click(".marker");
    await wait(250);
    const opened = await page.$eval(".detail h2", (el) => el.textContent);
    assert.ok(opened.length > 0, "expected the detail panel to open after picking a marker");

    // Re-picking the active tab is a no-op and leaves the panel open.
    await clickByText(page, ".tabs button", "Timeline");
    await wait(200);
    assert.equal(await page.$eval(".detail h2", (el) => el.textContent), opened);

    // Another tab has no panel of its own, and the empty one is not shown
    // there — but nothing is thrown away.
    await clickByText(page, ".tabs button", "Population");
    await wait(250);
    const elsewhere = await page.evaluate(() => {
      const panel = document.querySelector(".detail");
      return {
        display: getComputedStyle(panel).display,
        width: Math.round(panel.getBoundingClientRect().width),
        panel: document.querySelector(".detail h2")?.textContent ?? "",
      };
    });
    assert.equal(elsewhere.display, "none", "expected no panel on the population tab");
    assert.equal(elsewhere.width, 0, "a panel that is not shown should take no room");
    assert.equal(elsewhere.panel, "Pick a date", "…though the invitation is still there for the timeline");

    // Coming back restores it, marker and all.
    await clickByText(page, ".tabs button", "Timeline");
    await wait(300);
    const restored = await page.evaluate(() => ({
      title: document.querySelector(".detail h2")?.textContent ?? "",
      pressed: document.querySelector(".marker[aria-pressed='true']")?.textContent ?? "",
      params: location.search,
    }));
    assert.equal(restored.title, opened, "the event should still be open");
    assert.ok(restored.pressed.length > 0, "expected the marker still marked as selected");
    assert.match(restored.params, /(^|[?&])sel=event:/, "and the URL should still name it");
  }));

test("population tab fits a phone without overflow", (t) =>
  withPage(
    t,
    async (page) => {
      await clickByText(page, ".tabs button", "Population");
      await wait(200);
      const layout = await page.evaluate(() => ({
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
        milestones: document.querySelectorAll(".milestone").length,
        chart: !!document.querySelector(".pop-chart svg"),
      }));
      assert.ok(layout.scrollW <= layout.clientW + 1, "no horizontal overflow");
      assert.equal(layout.milestones, 11);
      assert.ok(layout.chart, "expected the chart on a phone");
    },
    390,
    844,
  ));

/**
 * Type into the search box the way React sees it. `page.type` appends, so this
 * is how a test replaces the query instead of adding to it.
 */
async function search(page, text) {
  await page.evaluate((value) => {
    const input = document.querySelector(".search input");
    const set = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    ).set;
    set.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, text);
  await wait(250);
}

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

// ------------------------------------------------------- bugs that once shipped
// Each of these pins a regression; keep them with the fix.

test("the page ships a strict Content-Security-Policy", (t) =>
  withPage(t, async (page) => {
    const policy = await page.$eval(
      'meta[http-equiv="Content-Security-Policy"]',
      (el) => el.content,
    );
    // No inline scripts and no eval exist, so 'self' alone has to be enough.
    for (const directive of [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self'",
      "img-src 'self' data:",
      "object-src 'none'",
      "base-uri 'none'",
    ]) {
      assert.ok(
        policy.includes(directive),
        `missing ${directive} in: ${policy}`,
      );
    }
    // Ignored in a meta tag, and it logs a console error, so it must not be there.
    assert.ok(!policy.includes("frame-ancestors"), "frame-ancestors is ignored in a meta CSP");

    // Record violations inside the page: the browser fires
    // securitypolicyviolation on the document, it is not a CDP page event.
    await page.evaluate(() => {
      window.__csp = [];
      document.addEventListener("securitypolicyviolation", (e) => {
        window.__csp.push(`${e.effectiveDirective}: ${e.blockedURI}`);
      });
    });

    // Exercise the screens that a policy could break: React sets inline styles
    // on the detail panel, and the favicon is a data: URI.
    await page.click(".marker");
    await wait(250);
    await clickByText(page, ".tabs button", "Population");
    await wait(250);
    await clickByText(page, ".tabs button", "Timeline");
    await wait(250);
    // The map arrives as a separate, lazily imported chunk. Loading it is a
    // same-origin script fetch, which `script-src 'self'` must allow.
    await clickByText(page, ".tabs button", "Map");
    await page.waitForSelector(".map__region", { timeout: 5000 });
    await wait(250);

    assert.deepEqual(
      await page.evaluate(() => window.__csp),
      [],
      "the policy must not block anything the app does",
    );
  }));

test("a hidden category is not searchable", (t) =>
  withPage(t, async (page) => {
    await clickByText(page, ".legend__item", "Sport");
    await wait(200);

    // Every event whose title mentions the Olympics is a sport event, so with
    // Sport hidden there should be nothing to pick and no ghost selection.
    await search(page, "Olympics");
    assert.equal(
      await page.$$eval(".search__item", (e) => e.length),
      0,
      "expected no results while the category is hidden",
    );
    assert.match(
      await page.$eval(".search__empty", (el) => el.textContent),
      /No dates match/,
    );

    // A category that is still on keeps searching normally.
    await search(page, "Magna");
    assert.deepEqual(
      await page.$$eval(".search__item b", (els) => els.map((e) => e.textContent)),
      ["Magna Carta"],
    );
  }));

test("the detail panel can be dismissed on desktop", (t) =>
  withPage(t, async (page) => {
    await page.click(".marker");
    await wait(250);
    assert.ok(
      await page.$eval(".detail__close", (el) => getComputedStyle(el).display !== "none"),
      "expected a visible close button on desktop",
    );
    assert.equal(
      await page.$eval(".detail", (el) => getComputedStyle(el).position),
      "relative",
      "expected the panel to be a positioning context",
    );
    // Read the rects as plain values: a DOMRect does not survive serialisation.
    const geom = await page.evaluate(() => {
      const btn = document.querySelector(".detail__close").getBoundingClientRect();
      const panel = document.querySelector(".detail").getBoundingClientRect();
      const title = document.querySelector(".detail h2").getBoundingClientRect();
      return {
        btn: { top: btn.top, right: btn.right, bottom: btn.bottom },
        panel: { top: panel.top, right: panel.right },
        title: { top: title.top, right: title.right },
      };
    });
    assert.ok(
      geom.btn.top >= geom.panel.top - 1 && geom.btn.right <= geom.panel.right + 1,
      "expected the close button inside the panel",
    );
    assert.ok(
      !(geom.title.top < geom.btn.bottom && geom.title.right > geom.btn.right - 32),
      "expected the close button not to cover the heading",
    );

    await page.click(".detail__close");
    await wait(250);
    assert.ok(await page.$(".detail--empty"), "expected the empty state back");
    assert.equal(
      await page.$eval(".detail h2", (el) => el.textContent),
      "Pick a date",
    );
  }));

test("Tabbing out of the search box does not drop focus", (t) =>
  withPage(t, async (page) => {
    await page.type(".search input", "magna");
    await wait(250);
    assert.equal(await page.$$eval(".search__item", (e) => e.length), 1);

    await page.keyboard.press("Tab");
    await wait(400); // longer than the old 150ms close delay

    const focus = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        isBody: el === document.body,
        tag: el?.tagName ?? "",
        focusable: el?.tabIndex >= 0 || ["BUTTON", "INPUT", "A"].includes(el?.tagName),
        listStillOpen: document.querySelector(".search__pop")?.hasAttribute("hidden") === false,
      };
    });
    assert.equal(focus.isBody, false, "focus must not fall back to the document body");
    assert.ok(focus.focusable, `expected a focusable element, got "${focus.tag}"`);
  }));

test("arrow keys move the search cursor and Enter picks it", (t) =>
  withPage(t, async (page) => {
    await page.type(".search input", "London");
    await wait(250);
    // Expect the results from the data, not a hardcoded count: the query also
    // matches "Great Fire of London".
    const options = await page.$$eval('[role="option"]', (els) =>
      els.map((el) => ({ id: el.id, label: el.querySelector("b").textContent })),
    );
    assert.ok(options.length >= 2, "expected at least two results");
    assert.deepEqual(
      await page.$$eval('[role="option"]', (els) =>
        els.map((el) => el.getAttribute("role")),
      ),
      options.map(() => "option"),
    );

    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await wait(150);

    const cursor = await page.evaluate(() => {
      const input = document.querySelector(".search input");
      const marked = [...document.querySelectorAll('[role="option"]')].filter(
        (o) => o.getAttribute("aria-selected") === "true",
      );
      return {
        expanded: input.getAttribute("aria-expanded"),
        activedescendant: input.getAttribute("aria-activedescendant"),
        selected: marked.map((o) => o.querySelector("b").textContent),
      };
    });
    assert.equal(cursor.expanded, "true");
    assert.deepEqual(cursor.selected, [options[1].label]);
    assert.equal(cursor.activedescendant, options[1].id);

    await page.keyboard.press("Enter");
    await wait(300);
    assert.equal(
      await page.$eval(".detail h2", (el) => el.textContent),
      options[1].label,
    );
  }));

// ------------------------------------------------------------------- the map
/** Open the map tab and wait for the lazily-loaded coastline. */
async function openMap(page) {
  await clickByText(page, ".tabs button", "Map");
  await page.waitForSelector(".map__region", { timeout: 5000 });
  await wait(300);
}

/** Click a place card in the map's list by its exact title. */
function clickPlaceCard(page, title) {
  return page.evaluate((t) => {
    const card = [...document.querySelectorAll(".place-card")].find(
      (c) => c.querySelector(".place-card__title")?.textContent === t,
    );
    if (!card) throw new Error(`no place card titled "${t}"`);
    card.click();
  }, title);
}

const mapStats = (page) =>
  page.evaluate(() => ({
    pins: document.querySelectorAll(".pin:not(.pin--cluster)").length,
    clusters: document.querySelectorAll(".pin--cluster").length,
    cards: document.querySelectorAll(".place-card").length,
    nations: [...document.querySelectorAll(".map-list__nation")].map((n) => n.textContent),
  }));

/** The map's current view, read back from the SVG: { x, y, w, h } in map units. */
const mapView = (page) =>
  page.evaluate(() => {
    const [x, y, w, h] = (document.querySelector(".map__svg")?.getAttribute("viewBox") ?? "")
      .split(" ")
      .map(Number);
    return { x, y, w, h, cx: x + w / 2, cy: y + h / 2 };
  });

/**
 * How many places are currently folded into a cluster *on screen*. Splitting
 * one cluster into two smaller ones does not change the pin count, but it does
 * reduce this — so this, not the pin count, is the measure of progress.
 */
const hiddenPlaces = (page) =>
  page.$$eval(".pin--cluster", (els) =>
    els.reduce((n, el) => n + (Number(el.textContent) || 1) - 1, 0),
  );

test("map tab draws the coastline, pins and a list of every place", (t) =>
  withPage(t, async (page) => {
    await openMap(page);
    const stats = await mapStats(page);

    assert.equal(
      await page.$$eval(".map__region", (els) => els.length),
      5,
      "expected England, Scotland, Wales, Northern Ireland and context Ireland",
    );
    // Every place is reachable on the map and in the list, even when pins are
    // merged into clusters: 38 places, so at least 38 markers-or-list rows.
    assert.ok(stats.cards > 30, `expected the full place list, got ${stats.cards}`);
    assert.ok(stats.pins + stats.clusters >= 10, "expected pins on the map");
    assert.deepEqual(stats.nations, [
      "England",
      "Scotland",
      "Wales",
      "Northern Ireland",
    ]);
  }));

test("choosing a pin opens that place's panel", (t) =>
  withPage(t, async (page) => {
    await openMap(page);
    // Read a pin's accessible name first, so the test does not depend on which
    // places happen to be clustered at this zoom.
    const chosen = await page.evaluate(() => {
      const pin = document.querySelector(".pin:not(.pin--cluster)");
      if (!pin) throw new Error("no lone pin on the map");
      const label = pin.getAttribute("aria-label");
      pin.click();
      return label;
    });
    await wait(250);

    const panel = await page.evaluate(() => ({
      label: document.querySelector(".detail")?.getAttribute("aria-label"),
      title: document.querySelector(".detail h2")?.textContent ?? "",
      hasRef: !!document.querySelector(".ref-card"),
      note: document.querySelector(".detail__note")?.textContent ?? "",
    }));
    assert.equal(panel.label, "Place details");
    assert.ok(panel.title.length > 0, "expected a place title");
    assert.ok(
      chosen.includes(panel.title),
      `"${panel.title}" should come from the pin's name "${chosen}"`,
    );
    assert.ok(
      panel.hasRef || /handbook/i.test(panel.note),
      "a place must show either its exam reference or the handbook note",
    );

    // And the panel carries the right "where" line and reference for a known
    // place, whichever way it was reached.
    await clickPlaceCard(page, "Stonehenge");
    await wait(250);
    const stonehenge = await page.evaluate(() => ({
      where: document.querySelector(".detail__date")?.textContent ?? "",
      ref: document.querySelector(".ref-card")?.textContent ?? "",
    }));
    assert.equal(stonehenge.where, "Wiltshire");
    assert.match(stonehenge.ref, /Wiltshire/);
  }));

test("a handbook place says so instead of showing a reference", (t) =>
  withPage(t, async (page) => {
    await openMap(page);
    await clickPlaceCard(page, "Loch Ness");
    await wait(250);

    const panel = await page.evaluate(() => ({
      title: document.querySelector(".detail h2")?.textContent ?? "",
      hasRef: !!document.querySelector(".ref-card"),
      note: document.querySelector(".detail__note")?.textContent ?? "",
    }));
    assert.equal(panel.title, "Loch Ness");
    assert.equal(panel.hasRef, false, "Loch Ness has no exam reference");
    assert.match(panel.note, /handbook/i);
  }));

test("a place links back to its event on the timeline", (t) =>
  withPage(t, async (page) => {
    await openMap(page);
    await clickPlaceCard(page, "Bannockburn");
    await wait(250);

    const cta = await page.$eval(".detail__cta", (el) => el.textContent ?? "");
    assert.match(cta, /timeline/i);
    await page.click(".detail__cta");
    await wait(300);

    const after = await page.evaluate(() => ({
      tab: document.querySelector('.tabs button[aria-current="true"]')?.textContent,
      title: document.querySelector(".detail h2")?.textContent ?? "",
    }));
    assert.equal(after.tab, "Timeline", "the cross-link should switch tabs");
    assert.match(after.title, /Bannockburn/);
  }));

test("an event links through to its place on the map", (t) =>
  withPage(t, async (page) => {
    // Pick the Hadrian's Wall event on the timeline, the "other direction" of
    // the place cross-link.
    await page.type(".search input", "Hadrian");
    await wait(250);
    await page.click(".search__item");
    await wait(300);

    assert.equal(
      await page.$eval('.tabs button[aria-current="true"]', (el) => el.textContent),
      "Timeline",
    );
    const cta = await page.$eval(".detail__cta", (el) => el.textContent ?? "");
    assert.match(cta, /Hadrian's Wall on the map/i, `unexpected CTA: "${cta}"`);

    await page.click(".detail__cta");
    await page.waitForSelector(".map__region", { timeout: 5000 });
    await wait(350);

    const onMap = await page.evaluate(() => ({
      tab: document.querySelector('.tabs button[aria-current="true"]')?.textContent,
      panel: document.querySelector(".detail")?.getAttribute("aria-label"),
      title: document.querySelector(".detail h2")?.textContent ?? "",
      pin: document.querySelector('.pin[data-place="hadrians-wall"]')?.getAttribute("aria-pressed"),
    }));
    assert.equal(onMap.tab, "Map");
    assert.equal(onMap.panel, "Place details");
    assert.equal(onMap.title, "Hadrian's Wall");
    assert.equal(onMap.pin, "true", "the place should be selected on the map");
  }));

test("an event with two places on the map offers both", (t) =>
  withPage(t, async (page) => {
    // The Norman Conquest is the site of both the Tower of London and Hastings
    // (the battle), so the panel must offer each rather than pick one.
    await page.type(".search input", "Norman Conquest");
    await wait(250);
    await page.click(".search__item");
    await wait(300);

    const ctas = await page.$$eval(".detail__cta", (els) =>
      els.map((el) => el.textContent ?? ""),
    );
    assert.equal(ctas.length, 2, `expected two map links, got ${JSON.stringify(ctas)}`);
    assert.ok(ctas.some((c) => /Tower of London on the map/.test(c)), ctas.join(" | "));
    assert.ok(ctas.some((c) => /Hastings on the map/.test(c)), ctas.join(" | "));
  }));

test("an event with no place on the map shows no map link", (t) =>
  withPage(t, async (page) => {
    // The Great Exhibition has no linked place, so the section must not appear.
    await page.type(".search input", "Great Exhibition");
    await wait(250);
    await page.click(".search__item");
    await wait(300);

    const ctas = await page.$$eval(".detail__cta", (els) =>
      els.map((el) => el.textContent ?? ""),
    );
    assert.equal(
      ctas.filter((c) => /on the map/i.test(c)).length,
      0,
      `expected no map link, got ${JSON.stringify(ctas)}`,
    );
  }));

// The bug this pins down: the search box doubles as a live filter, so a query
// left in it silently filtered every view. Arriving on the map through a
// cross-link showed one pin, Reset only resets the zoom, and going back to the
// timeline still showed one marker — with nothing on screen to explain it.
test("cross-linking does not leave a stale search filter behind", (t) =>
  withPage(t, async (page) => {
    await page.type(".search input", "Hadrian");
    await wait(300);
    // While typing, the box does filter: only Hadrian's Wall is on the timeline.
    const typed = await page.$$eval(".marker", (els) => els.length);
    assert.equal(typed, 1, "expected the live filter to narrow the timeline");

    // Select it by clicking the marker, *not* the search result, so the text
    // stays in the box — that is the path that used to strand the user.
    await page.click(".marker");
    await wait(250);
    assert.equal(await page.$eval(".search input", (el) => el.value), "Hadrian");

    await page.click(".detail__cta");
    await page.waitForSelector(".map__region", { timeout: 5000 });
    await wait(400);

    const onMap = await page.evaluate(() => ({
      query: document.querySelector(".search input").value,
      cards: document.querySelectorAll(".place-card").length,
      count: document.querySelector(".map-list__count")?.textContent ?? "",
      places: document.querySelectorAll(".map-minimap__dot").length,
    }));
    assert.equal(onMap.query, "", "the search text should not survive the jump");
    assert.ok(onMap.cards > 30, `expected every place, got ${onMap.cards}`);
    assert.match(onMap.count, /38 places/);
    assert.equal(onMap.places, onMap.cards, "the inset should show them all too");

    // And the pinch case the user described: Reset then back to the timeline.
    await clickByText(page, ".tl-btn", "Reset");
    await wait(300);
    assert.ok(
      (await page.$$eval(".place-card", (els) => els.length)) > 30,
      "Reset should leave the map showing everything",
    );

    await clickByText(page, ".tabs button", "Timeline");
    await wait(300);
    assert.ok(
      (await page.$$eval(".marker", (els) => els.length)) > 1,
      "the timeline should not still be filtered to one event",
    );
  }));

test("clicking a cluster zooms in and breaks it apart", (t) =>
  withPage(t, async (page) => {
    await openMap(page);
    const before = { hidden: await hiddenPlaces(page), ...(await mapView(page)) };
    assert.ok(before.hidden > 0, "expected clusters at full view");

    await page.click(".pin--cluster");
    await wait(300);
    const after = { hidden: await hiddenPlaces(page), ...(await mapView(page)) };

    assert.ok(after.w < before.w, `expected to zoom in (${before.w} → ${after.w})`);
    assert.ok(
      after.hidden < before.hidden,
      `expected the cluster to split or spread (${before.hidden} → ${after.hidden} places hidden)`,
    );
  }));

/*
 * The bug this pins down: two places can be closer together than the deepest
 * zoom can separate (Big Ben and Westminster Abbey are 300m apart), so a
 * cluster click used to be a silent no-op. Whatever is on screen must open up,
 * and every click has to make progress towards that.
 */
for (const viewport of [
  { name: "desktop", width: 1280, height: 860 },
  { name: "phone", width: 390, height: 844 },
]) {
  test(`every cluster on screen opens up on ${viewport.name}`, (t) =>
    withPage(
      t,
      async (page) => {
        await openMap(page);
        let hidden = await hiddenPlaces(page);
        assert.ok(hidden > 0, "expected clusters to open at full view");

        for (let click = 0; click < 30 && hidden > 0; click++) {
          const clicked = await page.evaluate(() => {
            const cluster = document.querySelector(".pin--cluster");
            if (!cluster) return false;
            cluster.click();
            return true;
          });
          if (!clicked) break;
          await wait(220);
          const now = await hiddenPlaces(page);
          assert.ok(
            now < hidden,
            `click ${click + 1} revealed nothing: ${now} places still hidden in clusters`,
          );
          hidden = now;
        }

        assert.equal(hidden, 0, `${hidden} places were left stuck inside a cluster`);
        assert.equal(
          await page.$$eval(".pin--cluster", (els) => els.length),
          0,
          "no cluster should be left unopened on screen",
        );
      },
      viewport.width,
      viewport.height,
    ));
}

test("every place can be shown on its own", (t) =>
  withPage(t, async (page) => {
    await openMap(page);
    const titles = await page.$$eval(".place-card__title", (els) =>
      els.map((el) => el.textContent ?? ""),
    );
    assert.ok(titles.length > 30, "expected the full place list");

    for (const title of titles) {
      await clickPlaceCard(page, title);
      await wait(120);
      const state = await page.evaluate(() => {
        const pin = document.querySelector(".pin[aria-pressed='true']");
        if (!pin) return null;
        const map = document.querySelector(".map").getBoundingClientRect();
        const r = pin.getBoundingClientRect();
        return {
          place: pin.getAttribute("data-place"),
          label: pin.getAttribute("aria-label"),
          insideX: r.left >= map.left - 1 && r.right <= map.right + 1,
          insideY: r.top >= map.top - 1 && r.bottom <= map.bottom + 1,
        };
      });
      assert.ok(state, `"${title}" should be drawn as its own clickable pin`);
      assert.ok(
        state.label?.startsWith(title),
        `expected the pin for "${title}", got "${state.label}"`,
      );
      assert.ok(
        state.insideX && state.insideY,
        `the pin for "${title}" should be inside the map frame`,
      );
    }
  }));

test("choosing a place from the list brings it into view", (t) =>
  withPage(t, async (page) => {
    await openMap(page);
    // Start zoomed into London, so Skara Brae is well off screen.
    const box = await page.$eval(".map", (el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width * 0.55, y: r.top + r.height * 0.6 };
    });
    await page.mouse.move(box.x, box.y);
    for (let i = 0; i < 5; i++) {
      await page.mouse.wheel({ deltaY: -120 });
      await wait(40);
    }
    await wait(300);
    const before = await mapView(page);

    await clickPlaceCard(page, "Skara Brae");
    await wait(350);
    const after = await mapView(page);

    assert.ok(after.w < before.w, `expected to zoom in (${before.w} → ${after.w})`);
    assert.notEqual(Math.round(after.cy), Math.round(before.cy), "expected the map to move");

    const pin = await page.evaluate(() => {
      const el = document.querySelector('.pin[data-place="skara-brae"]');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const map = document.querySelector(".map").getBoundingClientRect();
      return {
        pressed: el.getAttribute("aria-pressed"),
        x: (r.left + r.width / 2 - map.left) / map.width,
        y: (r.top + r.height / 2 - map.top) / map.height,
      };
    });
    assert.ok(pin, "the chosen place should be drawn as its own pin, not swallowed by a cluster");
    assert.equal(pin.pressed, "true");
    assert.ok(pin.x > 0.2 && pin.x < 0.8, `expected it centred, got x=${pin.x.toFixed(2)}`);
    assert.ok(pin.y > 0.2 && pin.y < 0.8, `expected it centred, got y=${pin.y.toFixed(2)}`);
  }));

test("a place too close to separate is still shown on its own", (t) =>
  withPage(t, async (page) => {
    await openMap(page);
    // Big Ben and Westminster Abbey are 300m apart: no zoom can pull them
    // apart, so the group has to be spread out around its true position.
    await clickPlaceCard(page, "Big Ben & the Houses of Parliament");
    await wait(350);

    const shown = await page.evaluate(() => {
      const el = document.querySelector('.pin[data-place="big-ben"]');
      if (!el) return null;
      return {
        fanned: el.hasAttribute("data-fanned"),
        pressed: el.getAttribute("aria-pressed"),
        leaders: document.querySelectorAll(".map__link").length,
      };
    });
    assert.ok(shown, "Big Ben should be individually clickable, not hidden in a cluster");
    assert.equal(shown.pressed, "true");
    assert.ok(shown.fanned, "expected it to be spread out from its neighbours");
    assert.ok(shown.leaders > 0, "expected a leader line back to the real position");
  }));

test("the minimap shows the view and moves the map", (t) =>
  withPage(t, async (page) => {
    await openMap(page);

    const fit = await page.evaluate(() => {
      const view = (document.querySelector(".map__svg")?.getAttribute("viewBox") ?? "")
        .split(" ")
        .map((n) => Math.round(Number(n)));
      const rect = document.querySelector(".map-minimap__window");
      return {
        view,
        rect: ["x", "y", "width", "height"].map((a) => Math.round(Number(rect.getAttribute(a)))),
        dots: document.querySelectorAll(".map-minimap__dot").length,
        cards: document.querySelectorAll(".place-card").length,
      };
    });
    // The indicator is the visible area, mapped into the inset. At full view it
    // is bigger than the country, so it is clipped to the inset — hence the
    // sizes are compared only once zoomed, below.
    assert.ok(
      Math.abs(fit.rect[0] - fit.view[0]) <= 1 && Math.abs(fit.rect[2] - fit.view[2]) <= 1,
      `the inset window should match the view (${JSON.stringify(fit)})`,
    );
    assert.equal(fit.dots, fit.cards, "every place should have a speck on the inset");

    // Zoom in, and the window rectangle shrinks with the view.
    const box = await page.$eval(".map", (el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width * 0.55, y: r.top + r.height * 0.6 };
    });
    await page.mouse.move(box.x, box.y);
    for (let i = 0; i < 4; i++) {
      await page.mouse.wheel({ deltaY: -120 });
      await wait(40);
    }
    await wait(300);
    const zoomed = await mapView(page);
    const rectWidth = await page.$eval(".map-minimap__window", (el) =>
      Number(el.getAttribute("width")),
    );
    assert.ok(zoomed.w < fit.view[2], "expected to be zoomed in");
    assert.ok(
      Math.abs(rectWidth - zoomed.w) < 0.5,
      `inset window ${rectWidth} should track the view ${zoomed.w}`,
    );

    // Dragging the inset pans the map, without panning through to the map.
    const mini = await page.$eval(".map-minimap", (el) => {
      const r = el.getBoundingClientRect();
      return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: r.width, h: r.height };
    });
    await page.mouse.move(mini.cx, mini.cy);
    await page.mouse.down();
    await page.mouse.move(mini.cx + mini.w * 0.35, mini.cy, { steps: 6 });
    await page.mouse.up();
    await wait(300);

    const dragged = await mapView(page);
    assert.ok(
      dragged.cx > zoomed.cx + 1,
      `expected the map to move right, ${zoomed.cx.toFixed(0)} → ${dragged.cx.toFixed(0)}`,
    );
    assert.equal(dragged.w, zoomed.w, "dragging the inset must not change the zoom");

    // Deep zoom: the true rectangle is a couple of pixels across, so the inset
    // draws it at a minimum size — still centred exactly on the view.
    await clickPlaceCard(page, "Big Ben & the Houses of Parliament");
    await wait(350);
    const deep = await page.evaluate(() => {
      const rect = document.querySelector(".map-minimap__window");
      const mini = document.querySelector(".map-minimap").getBoundingClientRect();
      const [vx, vy, vw, vh] = (document.querySelector(".map__svg")?.getAttribute("viewBox") ?? "")
        .split(" ")
        .map(Number);
      const scale = mini.width / 628; // MAP_WIDTH
      return {
        drawnW: Number(rect.getAttribute("width")),
        drawnH: Number(rect.getAttribute("height")),
        drawnWpx: Number(rect.getAttribute("width")) * scale,
        drawnHpx: Number(rect.getAttribute("height")) * scale,
        centreErr: {
          x: Math.abs(Number(rect.getAttribute("x")) + Number(rect.getAttribute("width")) / 2 - (vx + vw / 2)),
          y: Math.abs(Number(rect.getAttribute("y")) + Number(rect.getAttribute("height")) / 2 - (vy + vh / 2)),
        },
        viewW: vw,
      };
    });
    assert.ok(deep.viewW < deep.drawnW, "expected the deep view to be floored in size");
    assert.ok(
      deep.drawnWpx >= 14 && deep.drawnHpx >= 14,
      `the indicator must stay visible when zoomed in (${deep.drawnWpx.toFixed(1)}×${deep.drawnHpx.toFixed(1)}px)`,
    );
    assert.ok(
      deep.centreErr.x < 0.5 && deep.centreErr.y < 0.5,
      `the indicator must stay centred on the view (${JSON.stringify(deep.centreErr)})`,
    );
  }));

test("the legend filters the map pins and the place list", (t) =>
  withPage(t, async (page) => {
    await openMap(page);
    const before = await mapStats(page);

    await clickByText(page, ".legend__item", "Landscape & nature");
    await wait(300);

    const after = await mapStats(page);
    assert.ok(after.cards < before.cards, "expected fewer places");
    assert.ok(after.pins + after.clusters < before.pins + before.clusters, "expected fewer pins");
    assert.equal(
      await page.$$eval(".place-card__chip", (els) =>
        els.filter((e) => e.textContent === "Landscape & nature").length,
      ),
      0,
      "no landscape place should survive the filter",
    );
  }));

test("searching a place opens it on the map", (t) =>
  withPage(t, async (page) => {
    // "Loch Ness" is a place with no same-named event, so the result is
    // unambiguously the map entry.
    await page.type(".search input", "Loch Ness");
    await wait(250);
    const results = await page.$$eval(".search__item", (els) =>
      els.map((e) => ({
        label: e.querySelector("b")?.textContent,
        // The first span is the category dot; the meta line is the last one.
        meta: e.querySelector("span:last-child")?.textContent ?? "",
      })),
    );
    assert.deepEqual(results.map((r) => r.label), ["Loch Ness"]);
    assert.match(results[0].meta, /^Place · /);

    await page.click(".search__item");
    await page.waitForSelector(".map__region", { timeout: 5000 });
    await wait(300);

    assert.equal(
      await page.$eval('.tabs button[aria-current="true"]', (el) => el.textContent),
      "Map",
    );
    assert.equal(
      await page.$eval(".detail h2", (el) => el.textContent),
      "Loch Ness",
    );
    // Whichever marker it is drawn as (pin or part of a cluster), the list
    // always carries it and shows it as the current selection.
    assert.ok(
      await page.$eval(".place-card[aria-pressed='true'] .place-card__title", (el) =>
        el.textContent === "Loch Ness",
      ),
      "the chosen place should be marked as pressed in the list",
    );
  }));

test("the map fits a phone: full-width, no overflow, sheet opens", (t) =>
  withPage(
    t,
    async (page) => {
      await openMap(page);
      const layout = await page.evaluate(() => {
        const map = document.querySelector(".map").getBoundingClientRect();
        const list = document.querySelector(".map-list").getBoundingClientRect();
        return {
          overflow:
            document.documentElement.scrollWidth - document.documentElement.clientWidth,
          mapWidth: Math.round(map.width),
          mapHeight: Math.round(map.height),
          stacked: list.top >= map.bottom - 1,
          viewport: window.innerWidth,
        };
      });
      assert.equal(layout.overflow, 0, "the map must not cause horizontal overflow");
      assert.ok(
        layout.mapWidth >= layout.viewport - 2,
        `expected a full-width map, got ${layout.mapWidth} of ${layout.viewport}`,
      );
      // The map keeps the country's own shape, so it is taller than it is wide.
      assert.ok(layout.mapHeight > layout.mapWidth, "expected the map's own aspect ratio");
      assert.ok(layout.stacked, "expected the place list below the map on a phone");

      await clickPlaceCard(page, "Belfast");
      await wait(300);
      const sheet = await page.evaluate(() => {
        const el = document.querySelector(".detail");
        const detail = el.getBoundingClientRect();
        return {
          title: el.querySelector("h2")?.textContent,
          position: getComputedStyle(el).position,
          fullWidth: Math.round(detail.width) >= window.innerWidth - 2,
        };
      });
      assert.equal(sheet.title, "Belfast");
      // Below 880px the panel is an absolutely-positioned, full-width sheet.
      assert.equal(sheet.position, "absolute");
      assert.ok(sheet.fullWidth, "expected the sheet to span the viewport");
    },
    390,
    844,
  ));

test("the view switcher uses aria-current rather than a tablist", (t) =>
  withPage(t, async (page) => {
    // Halving the ARIA tabs pattern makes it wrong, not accessible: the panels
    // are not tabpanels and there is no roving tabindex.
    assert.equal(await page.$('[role="tablist"]'), null, "expected no tablist");
    assert.equal(await page.$('[role="tab"]'), null, "expected no tab roles");

    await clickByText(page, ".tabs button", "Population");
    await wait(250);
    const state = await page.evaluate(() => {
      const current = document.querySelector('.tabs button[aria-current="true"]');
      const others = [...document.querySelectorAll(".tabs button")].filter(
        (b) => b !== current,
      );
      return {
        current: current?.textContent,
        othersMarked: others.some((b) => b.hasAttribute("aria-current")),
        othersStyled: others.some(
          (b) => getComputedStyle(b).boxShadow !== "none",
        ),
      };
    });
    assert.equal(state.current, "Population");
    assert.equal(state.othersMarked, false, "only the active tab may be marked");
    assert.equal(state.othersStyled, false, "inactive tabs must not look selected");
  }));

// -------------------------------------------------------- links and history
// The URL is the app's shareable half, and Back has to undo a journey rather
// than a wheel notch. These pin the two halves of that promise.

/*
 * Once you are on the map, wandering from point to point must not turn into a
 * trail of Back presses: one press has to leave the map, not walk back through
 * every pin looked at on the way.
 */
test("browsing points on the map is still one step back to the timeline", (t) =>
  withPage(t, async (page) => {
    await page.type(".search input", "Hadrian");
    await wait(250);
    await page.click(".search__item");
    await wait(350);
    await clickByText(page, ".detail__cta", "on the map");
    await page.waitForSelector(".map__region", { timeout: 5000 });
    await wait(450);
    assert.equal(
      await page.$eval(".detail h2", (el) => el.textContent),
      "Hadrian's Wall",
    );

    // Somewhere else entirely, chosen from the place list.
    await clickPlaceCard(page, "Stonehenge");
    await wait(450);
    assert.equal(await page.$eval(".detail h2", (el) => el.textContent), "Stonehenge");
    assert.match(await page.evaluate(() => location.search), /sel=place(:|%3A)stonehenge/);

    // One Back leaves the map — it does not land on Hadrian's Wall again.
    await page.goBack();
    await wait(500);
    const after = await page.evaluate(() => ({
      tab: document.querySelector('.tabs button[aria-current="true"]')?.textContent,
      panel: document.querySelector(".detail h2")?.textContent ?? "",
    }));
    assert.equal(after.tab, "Timeline", "Back should leave the map altogether");
    assert.equal(after.panel, "Hadrian's Wall built");

    // Forward comes back to the point that was actually being looked at.
    await page.goForward();
    await wait(550);
    const forward = await page.evaluate(() => ({
      tab: document.querySelector('.tabs button[aria-current="true"]')?.textContent,
      panel: document.querySelector(".detail h2")?.textContent ?? "",
      sel: new URLSearchParams(location.search).get("sel"),
    }));
    assert.equal(forward.tab, "Map");
    assert.equal(forward.panel, "Stonehenge");
    assert.equal(forward.sel, "place:stonehenge");
  }));

/*
 * The two views point at each other, so picking a point on the map picks its
 * date on the timeline too. Looking at a place must not leave the timeline
 * behind on whatever was open before.
 */
test("picking a point on the map moves the timeline to the event there", (t) =>
  withPage(t, async (page) => {
    await page.type(".search input", "Norman Conquest");
    await wait(250);
    await page.click(".search__item");
    await wait(400);
    assert.equal(
      await page.$eval(".detail h2", (el) => el.textContent),
      "Norman Conquest",
    );

    // Following the event's *own* place keeps the event: the Tower of London
    // points straight back at the Norman Conquest.
    await clickByText(page, ".detail__cta", "on the map");
    await page.waitForSelector(".map__region", { timeout: 5000 });
    await wait(450);
    assert.equal(
      await page.$eval(".detail h2", (el) => el.textContent),
      "Tower of London",
    );
    await clickByText(page, ".tabs button", "Timeline");
    await wait(400);
    assert.equal(
      await page.$eval(".detail h2", (el) => el.textContent),
      "Norman Conquest",
    );

    // Looking at St Paul's instead *does* move the timeline on, to the event
    // that happened there.
    await clickByText(page, ".tabs button", "Map");
    await page.waitForSelector(".map__region", { timeout: 5000 });
    await wait(450);
    await clickPlaceCard(page, "St Paul's Cathedral");
    await wait(450);
    assert.equal(
      await page.$eval(".detail h2", (el) => el.textContent),
      "St Paul's Cathedral",
    );

    await clickByText(page, ".tabs button", "Timeline");
    await wait(400);
    const onTimeline = await page.evaluate(() => ({
      panel: document.querySelector(".detail h2")?.textContent ?? "",
      sel: new URLSearchParams(location.search).get("sel"),
    }));
    assert.equal(onTimeline.panel, "Great Fire of London");
    assert.equal(onTimeline.sel, "event:great-fire");

    // And the map still holds its own point, for the way back.
    await clickByText(page, ".tabs button", "Map");
    await page.waitForSelector(".map__region", { timeout: 5000 });
    await wait(450);
    const onMap = await page.evaluate(() => ({
      panel: document.querySelector(".detail h2")?.textContent ?? "",
      pin: document.querySelector(".pin[aria-pressed='true']")?.getAttribute("data-place"),
      sel: new URLSearchParams(location.search).get("sel"),
    }));
    assert.equal(onMap.panel, "St Paul's Cathedral");
    assert.equal(onMap.pin, "st-pauls-cathedral");
    assert.equal(onMap.sel, "place:st-pauls-cathedral");

    // A place the timeline has nothing to say about leaves it alone, rather
    // than clearing or disturbing what was open.
    await clickPlaceCard(page, "Loch Ness");
    await wait(450);
    await clickByText(page, ".tabs button", "Timeline");
    await wait(400);
    assert.equal(
      await page.$eval(".detail h2", (el) => el.textContent),
      "Great Fire of London",
      "a place with no event of its own should not disturb the timeline",
    );
  }));

/** Click the list-mode card for an event by its exact title. */
const clickEventCard = (page, title) =>
  page.evaluate((t) => {
    const card = [...document.querySelectorAll(".card")].find(
      (c) => c.querySelector(".card__title")?.textContent === t,
    );
    if (!card) throw new Error(`no event card titled "${t}"`);
    card.click();
  }, title);

/*
 * The journey that used to lose the thread: read an event in the list, follow it
 * to its place on the map, then come back to the list. Coming back must not have
 * forgotten the event — and the map must keep both its rectangle and the panel
 * it had, or the round trip is a one-way trip.
 */
test("a round trip through the map keeps both tabs' panels", (t) =>
  withPage(t, async (page) => {
    await clickByText(page, ".mode-toggle button", "List");
    await wait(250);
    await clickEventCard(page, "Great Fire of London");
    await wait(300);
    assert.equal(
      await page.$eval(".detail h2", (el) => el.textContent),
      "Great Fire of London",
    );

    // The event's panel links to its place, which is in London and so needs the
    // map to zoom in: the rectangle is part of the journey.
    await clickByText(page, ".detail__cta", "on the map");
    await page.waitForSelector(".map__region", { timeout: 5000 });
    await wait(450);
    const onMap = await page.evaluate(() => ({
      panel: document.querySelector(".detail h2")?.textContent ?? "",
      rect: new URLSearchParams(location.search).get("m"),
    }));
    assert.equal(onMap.panel, "St Paul's Cathedral");
    assert.ok(onMap.rect, "expected the focus to record where the map was looking");

    await clickByText(page, ".tabs button", "Timeline");
    await wait(400);
    const onList = await page.evaluate(() => ({
      list: !!document.querySelector(".list__year"),
      panel: document.querySelector(".detail h2")?.textContent ?? "",
      card:
        document.querySelector(".card[aria-pressed='true'] .card__title")?.textContent ?? "",
      params: location.search,
    }));
    assert.ok(onList.list, "expected to be back in the list");
    assert.equal(onList.panel, "Great Fire of London", "the event should still be open");
    assert.equal(onList.card, "Great Fire of London", "and still marked in the list");
    assert.match(onList.params, /(^|[?&])sel=event:great-fire(&|$)/);

    // And the map remembers its side too, down to the rectangle.
    await clickByText(page, ".tabs button", "Map");
    await page.waitForSelector(".map__region", { timeout: 5000 });
    await wait(450);
    const backOnMap = await page.evaluate(() => ({
      panel: document.querySelector(".detail h2")?.textContent ?? "",
      pin: document.querySelector(".pin[aria-pressed='true']")?.getAttribute("data-place"),
      rect: new URLSearchParams(location.search).get("m"),
    }));
    assert.equal(backOnMap.panel, "St Paul's Cathedral");
    assert.equal(backOnMap.pin, "st-pauls-cathedral");
    assert.equal(backOnMap.rect, onMap.rect, "the map should be where it was left");
  }));


test("a shared link restores the tab, the filters and the open panel", (t) =>
  withDeepLink(t, "/?tab=map&sel=place:stonehenge&off=sport", async (page) => {
    await page.waitForSelector(".map__region", { timeout: 5000 });
    await wait(400);

    const state = await page.evaluate(() => ({
      tab: document.querySelector('.tabs button[aria-current="true"]')?.textContent,
      title: document.querySelector(".detail h2")?.textContent ?? "",
      pin: document
        .querySelector('.pin[data-place="stonehenge"]')
        ?.getAttribute("aria-pressed"),
      hidden: [...document.querySelectorAll(".legend__item")]
        .filter((el) => el.getAttribute("aria-pressed") === "false")
        .map((el) => el.getAttribute("data-category")),
      params: location.search,
    }));

    assert.equal(state.tab, "Map");
    assert.equal(state.title, "Stonehenge");
    assert.equal(state.pin, "true", "expected the deep-linked place to be selected");
    assert.deepEqual(state.hidden, ["sport"]);
    // The URL carries the state, so it must not have lost what it was read from.
    assert.match(state.params, /(^|[?&])tab=map(&|$)/);
    assert.match(state.params, /(^|[?&])sel=place(:|%3A)stonehenge(&|$)/);
    assert.match(state.params, /(^|[?&])off=sport(&|$)/);
  }));

test("a shared link restores an event, a date and the timeline window", (t) =>
  withPage(t, async (page) => {
    // A named event lands on the timeline with its panel open, at the zoom a
    // real visit would have given it.
    await page.goto(link("/?sel=event:magna-carta"), { waitUntil: "networkidle0" });
    await wait(400);
    assert.equal(await currentTab(page), "Timeline");
    assert.equal(
      await page.$eval(".detail h2", (el) => el.textContent),
      "Magna Carta",
    );

    // An annual date lands on the calendar tab and hydrates from the data.
    await page.goto(link("/?tab=calendar&sel=annual:ann-christmas"), {
      waitUntil: "networkidle0",
    });
    await wait(400);
    assert.equal(await currentTab(page), "Annual dates");
    assert.equal(await page.$eval(".detail h2", (el) => el.textContent), "Christmas Day");

    // A year window is readable in the link and restored as itself.
    await page.goto(link("/?y=1500,1600&off=sport,arts&q=tudor"), {
      waitUntil: "networkidle0",
    });
    await wait(400);
    const zoomed = await page.evaluate(() => ({
      search: document.querySelector(".search input").value,
      hidden: [...document.querySelectorAll(".legend__item")]
        .filter((el) => el.getAttribute("aria-pressed") === "false")
        .map((el) => el.getAttribute("data-category"))
        .sort(),
      params: location.search,
    }));
    const window1500 = await overviewWindow(page);
    assert.equal(zoomed.search, "tudor", "the search box should return as it was");
    assert.deepEqual(zoomed.hidden, ["arts", "sport"]);
    assert.match(zoomed.params, /(^|[?&])y=1500(,|%2C)1600(&|$)/);
    // 1500–1600 is 4.25% of the axis, so a window of that order is the proof
    // that the years — not just the tab — came back.
    assert.ok(
      window1500.width > 1 && window1500.width < 12,
      `expected a four-decade window, got ${window1500.width}%`,
    );
  }));

test("Back and Forward move between tabs and each keeps its view", (t) =>
  withPage(t, async (page) => {
    const box = await (await page.$(".timeline")).boundingBox();
    await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.5);
    for (let i = 0; i < 5; i++) {
      await page.mouse.wheel({ deltaY: -120 });
      await wait(40);
    }
    await wait(250);
    const zoomed = await overviewWindow(page);
    assert.ok(zoomed.width < 99, `expected the wheel to zoom in (${zoomed.width}%)`);

    await clickByText(page, ".tabs button", "Annual dates");
    await wait(300);
    assert.equal(await currentTab(page), "Annual dates");

    await page.goBack();
    await wait(400);
    assert.equal(await currentTab(page), "Timeline", "Back should restore the tab");
    const restored = await overviewWindow(page);
    assert.ok(
      Math.abs(restored.width - zoomed.width) < 1,
      `the timeline should come back where it was left (${zoomed.width}% -> ${restored.width}%)`,
    );

    await page.goForward();
    await wait(400);
    assert.equal(await currentTab(page), "Annual dates", "Forward should go back to it");
  }));

test("zooming, panning and typing overwrite the entry, not the history", (t) =>
  withPage(t, async (page) => {
    const before = await page.evaluate(() => history.length);

    // Re-picking the same marker is not a second journey: the URL it would
    // write is the one already in the bar, so nothing is written at all.
    await page.click(".marker");
    await wait(250);
    const opened = await page.evaluate(() => history.length);
    assert.equal(opened, before + 1, "opening a panel is one Back");
    await page.click(".marker");
    await wait(250);
    assert.equal(await page.evaluate(() => history.length), opened);

    const box = await (await page.$(".timeline")).boundingBox();
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    for (let i = 0; i < 6; i++) {
      await page.mouse.wheel({ deltaY: -120 });
      await wait(30);
    }
    await search(page, "magna");
    await wait(250);

    assert.equal(
      await page.evaluate(() => history.length),
      opened,
      "a stream of view changes must not become a pile of Back presses",
    );

    // A discrete journey still gets its own entry, so Back can undo it.
    await clickByText(page, ".tabs button", "Annual dates");
    await wait(300);
    assert.equal(await page.evaluate(() => history.length), opened + 1);
  }));

test("junk in a URL falls back to the defaults and is tidied away", (t) =>
  withDeepLink(
    t,
    "/?tab=nope&mode=nope&y=abc&m=1,2&sel=event:nope&off=nope&q=%20",
    async (page) => {
      await wait(400);
      const state = await page.evaluate(() => ({
        tab: document.querySelector('.tabs button[aria-current="true"]')?.textContent,
        empty: !!document.querySelector(".detail--empty"),
        list: !!document.querySelector(".list__year"),
        hidden: document.querySelectorAll('.legend__item[aria-pressed="false"]').length,
        params: location.search,
      }));
      assert.equal(state.tab, "Timeline");
      assert.ok(state.empty, "an unknown id must not open a panel");
      assert.equal(state.list, false, "an unknown mode must mean the graph");
      assert.equal(state.hidden, 0, "an unknown category must stay visible");
      assert.equal(state.params, "", "the tidied link should be bare again");
    },
  ));

test("the copy link button copies this exact view", (t) =>
  withPage(t, async (page) => {
    // Stand in for the clipboard so the test reads what would have been copied.
    await page.evaluate(() => {
      window.__copied = null;
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async (text) => {
            window.__copied = text;
          },
        },
      });
    });

    await page.click(".marker");
    await wait(300);
    await page.click(".detail__share-button");
    await wait(200);

    const result = await page.evaluate(() => ({
      copied: window.__copied,
      href: location.href,
      status: document.querySelector(".detail__share-status")?.textContent ?? "",
    }));
    assert.match(result.copied ?? "", /(^|[?&])sel=event:/, "the link should name the event");
    assert.equal(result.copied, result.href, "the address bar already is the link");
    assert.equal(result.status, "Link copied");
  }));

