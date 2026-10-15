# Life in the UK · date timeline

An interactive web app that shows every date worth memorising for the *Life in
the UK* test on a zoomable timeline — and every place worth knowing on an
interactive map — with the exam references one tap away.

## Run it

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check and build to dist/
npm run preview  # preview the production build
npm test             # build, then run the smoke + contrast + axe + Lighthouse suites
npm run lighthouse   # just the Lighthouse budgets (writes reports/)

# maintenance helpers (not part of the build)
node scripts/build-outline.mjs    # regenerate the map coastline from Natural Earth
node scripts/validate-places.mjs  # check every place's examRefs and event links
```

## What it does

- **Historical timeline** of dated events from the Stone Age to the 2020s.
- **Zoom & pan** with the scroll wheel, trackpad, pinch, drag, double-click, the
  `+` / `−` buttons, or the arrow keys. A minimap at the bottom lets you jump
  anywhere.
- **Readable without clicking**: every marker shows its year and a short title,
  hovering reveals the event's summary, and labels stack into lanes so they
  never overlap.
- **A piecewise time scale** so that the huge stretch of prehistory is
  compressed and the busy last thousand years get room to breathe.
- **Range bars** for things that lasted a while (wars, reigns, booms).
- **Annual dates tab** for the dates that repeat every year (saint days,
  Christmas, Hogmanay, Halloween…) plus movable feasts like Easter and Lent.
- **Map tab**: an interactive map of the United Kingdom with every place the
  exam asks about — Stonehenge, the Tower of London, Hadrian's Wall, the Giant's
  Causeway, Snowdon and the four capitals. Pins are coloured by category, group
  into clusters where they overlap (London above all), and zoom with the same
  gestures as the timeline. A cluster always opens up: if zooming cannot pull
  its places apart — Big Ben and Westminster Abbey are 300 metres apart — they
  are spread out around their true position with leader lines instead. A minimap
  in the corner shows the whole country and where you are looking. Choosing a
  place centres it and zooms to suit, and a place's panel links to the historical
  event there while an event's panel links back to the place. Every place is also
  listed below the map, grouped by nation, so the map is never the only way in.
- **Population tab** for the handbook's population table: a growth chart, the
  figures in words, and how the total is spread across the four nations.
- **Detail panel** with the summary, the original exam reference text and the
  correct answers.
- **Colour per category** with a legend that doubles as a filter: click a chip
  to toggle it, Cmd/Ctrl-click (or Shift-click) to show only that category, and
  hover a chip to highlight it across the timeline and the minimap. A search
  box jumps straight to a date.
- **Works on phones, tablets and desktops**: the detail panel becomes a bottom
  sheet, and a list view is available for small screens.
- **Light and dark themes** that follow your system setting. Both palettes are
  audited for WCAG AA contrast (4.5:1 for text, 3:1 for graphics).
- **Accessible**: visible keyboard focus, no colour-only state, and reduced
  motion is respected.

## Where the data lives

- `data/exams.json` — your quiz questions (the source of the references).
- `src/data/events.ts` — the curated historical events. Each entry has a year
  (negative for BC), an optional end year, a title, a summary, a category, an
  importance (3 = always shown, 1 = only when zoomed in), and links back to the
  quiz questions it came from.
- `src/data/annual.ts` — the dates that repeat every year.
- `src/data/places.ts` — the places on the map: real coordinates, a nation, a
  category, a summary, an importance (3 = always labelled), any exam references
  and an optional link to the historical event at that place. The detail panel
  uses those links in both directions, so the map and the timeline can hand you
  to each other.
- `src/data/ukOutline.ts` — the committed coastline, generated (not hand-edited)
  by `scripts/build-outline.mjs` from the public-domain Natural Earth data set.
- `src/data/population.ts` — the handbook's population table, the growth steps
  and the four-nation shares. Each figure also becomes a `handbook` event on the
  timeline so the numbers live in one place.
- `src/data/categories.ts` — the categories (colours live in `src/index.css` as
  CSS variables so light and dark themes can each be accessible).

To add an event, append to `src/data/events.ts`. To point at a question, use
`examRefs: [{ set: 3, id: 19 }]`. To add a place to the map, append to
`src/data/places.ts` and run `node scripts/validate-places.mjs` — a bad
reference or event link fails silently in the UI otherwise.

## Quality checks

`npm test` gates the build on four headless-browser suites:

- **Smoke** (`tests/smoke.test.mjs`) — timeline renders, zoom, pan, search,
  filters, list mode, the annual and population tabs, the map (pins, clustering,
  spreading a tight group out, the minimap, the place list, and both cross-links
  between the map and the timeline) and a phone viewport.
- **Contrast** (`tests/contrast.test.mjs`) — the design tokens meet WCAG AA in
  both themes (text ≥ 4.5:1, graphics ≥ 3:1), including text over the era bands.
- **axe** (`tests/axe.test.mjs`) — axe-core audits every rendered screen/state in
  both themes and at desktop and phone sizes for WCAG A/AA violations.
- **Lighthouse** (`tests/lighthouse.test.mjs`) — mobile and desktop budgets,
  **in both light and dark themes**: performance ≥ 0.9, accessibility = 1,
  best-practices and SEO ≥ 0.95, plus LCP, CLS and TBT limits. Reports land in
  `reports/`.

## Security posture

`index.html` carries a strict `<meta http-equiv="Content-Security-Policy">` and
a `Referrer-Policy` meta, because GitHub Pages cannot set response headers. The
build has no inline scripts and no `eval`, so `script-src 'self'` is enough;
`img-src` allows `data:` only for the inline SVG favicon. `frame-ancestors` is
deliberately omitted — it is ignored in a meta CSP and only logs a console
error. A smoke test asserts the policy is present and that nothing it would
block actually happens.

Note that the test harness loads axe-core by evaluating its source through CDP
rather than `addScriptTag`: an injected `<script>` tag is an inline script,
which this CSP blocks, and `addScriptTag` fails silently when that happens.

## CI

Two workflows, plus Dependabot for weekly dependency and action updates:

- **`ci.yml`** runs on every pull request, and `deploy.yml` calls it on every
  push to `main`, so a deploy cannot happen without it. It has two parallel
  jobs: `verify` (typecheck, build, `npm audit --omit=dev` — a hard gate on what
  actually ships) and `suites` (a full `npm test`). The dev-only advisories in
  vite, puppeteer-core and lighthouse are reported but non-blocking until the
  majors are upgraded; flip `continue-on-error` to `false` at that point.
- **`deploy.yml`** builds with `PAGES_BASE` and publishes to GitHub Pages, and
  now `needs` the CI job.

Chrome is resolved up front in the `suites` job so a runner without it fails
loudly instead of silently skipping every test.

## Data notes

Most events are drawn from your `exams.json`. A handful are filled in from the
official handbook where the quizzes skip a date (these carry a dashed border and
an `hb` badge, and are marked `source: "handbook"`). Map places work the same
way: a `handbook` place shows the handbook note instead of an exam reference.

A few places in the source data disagree with themselves. The timeline states
the value the reference text gives and does not try to hide the conflict:

- **Small claims limit (Scotland & Northern Ireland)** — the reference says
  £3,000 in one place and the marked answer is £5,000 in another.
- **Northern Ireland Assembly size** — one set says 108 members, another says 90.
