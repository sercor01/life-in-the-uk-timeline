# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project

A static, client-side web app that plots every date to memorise for the
*Life in the UK* test on a zoomable timeline. There is no backend; the app
bundles `data/exams.json` and renders it.

## Commands

```bash
npm install
npm run dev        # dev server (Vite)
npm run build      # tsc --noEmit && vite build
npm run preview    # serve the production build
npm run typecheck  # tsc --noEmit
npm test           # build, then run the headless browser smoke tests
```

Always run `npm run typecheck` (or `npm run build`) after changes. The repo is
strict TypeScript (`noUnusedLocals`, `noUnusedParameters`), so unused imports or
variables fail the build.

## Layout

```
data/exams.json          # source quiz data (do not edit unless asked)
src/
  App.tsx                # top-level state: tab, view, selection, filters, query
  types.ts               # TimelineEvent, AnnualEvent, Category, Selection, ExamRef
  data/
    events.ts            # curated historical events (the main content)
    annual.ts            # dates that repeat every year
    categories.ts        # categories + colours
    exams.ts             # loads exams.json and resolves ExamRef -> question
  lib/
    scale.ts             # piecewise time scale (year <-> normalised 0..1)
    lanes.ts             # label layout into non-overlapping lanes + date fmt
  components/
    Timeline.tsx         # SVG timeline, zoom/pan gestures, ticks, markers
    Overview.tsx         # draggable minimap
    DetailPanel.tsx      # side panel / mobile bottom sheet
    EventListView.tsx    # accessible list fallback
    CalendarView.tsx     # annual dates tab
    Legend.tsx           # category filter
    SearchBar.tsx        # search + jump
  index.css              # all styles (single stylesheet, CSS variables)
tests/
  helpers.mjs            # Chrome detection + browser launch
  smoke.test.mjs         # node:test + puppeteer-core smoke suite
```

## Data model

- `TimelineEvent.year` is the start year; negative is BC. Optional `endYear`
  makes a range bar. `displayDate` overrides the printed date (e.g. `"1930s"`).
- `importance`: `3` always visible, `2` medium zoom, `1` only when zoomed in.
- `examRefs: [{ set, id }]` point at `data/exams.json`; the detail panel hydrates
  the reference text from them. Keep these valid — a mismatch silently shows no
  reference. Validate with a quick script if you add many.
- `source: "exam"` (from the quizzes) or `"handbook"` (gap-fillers). Handbook
  events render with a dashed border and an `hb` badge.
- `AnnualEvent` has `month`/`day` and an optional `movable` for feasts without a
  fixed date.
- Categories live in one place (`categories.ts`); colours are referenced by id
  everywhere else. Add a category there and it flows through the legend, search
  and both views.

## How the timeline works

- `lib/scale.ts` maps a year to a normalised `0..1` position through weighted
  segments, so prehistory is compressed and recent centuries get room. Zoom/pan
  operate on a `ViewWindow { n0, n1 }` in normalised space, never on pixels.
- `lib/lanes.ts` greedily assigns visible events to horizontal lanes by
  importance, dropping the least important when lanes run out.
- `Timeline.tsx` measures its container with a `ResizeObserver`, derives
  `axisY` and `laneCount` from the height, and renders the axis/ticks/range
  bars/stems in SVG plus HTML labels on top. A `useLayoutEffect` re-clamps
  labels to the viewport using their real measured width.
- Wheel is registered with a non-passive listener (`useEffect`) so it can
  `preventDefault`; pointer events handle drag and pinch. Pointer capture is set
  on the container (not a child) so it survives re-renders mid-drag.

## Conventions

- Plain CSS in `src/index.css` using the variables in `:root`. No CSS framework.
- No state library; `App.tsx` holds state and passes props down.
- Keep components presentational and the data/logic in `data/` and `lib/`.
- Mobile is first-class: the detail panel becomes an overlay bottom sheet below
  `880px`, and interactions must work with touch.

## Testing

There is a committed smoke suite in `tests/`, run with `npm test`. It builds
the app, starts `vite preview` on a fixed port (`4317`), and drives the system
Chrome with `puppeteer-core` + Node's `node:test`. It covers rendering, zoom,
pan, search, category filtering, list mode, the annual tab and a phone viewport
(no horizontal overflow, bottom sheet opens).

To extend it, add a `test(...)` using the `withPage(t, async (page) => { ... })`
helper, which opens a fresh page (or skips cleanly if no browser is found).

Because `puppeteer-core` ships no browser, the suite detects Chrome from common
install paths. Override with `CHROME_PATH=/path/to/chrome`, or it falls back to
Puppeteer's installed-Chrome channel. If none is found the tests skip rather
than fail.

`ResizeObserver` drives the timeline layout, so assert on the rendered DOM or a
screenshot rather than assuming.

## Gotchas

- Chrome headless clamps the viewport to a minimum 500px wide; set a mobile
  viewport through the DevTools protocol (e.g. `page.setViewport`) instead of
  `--window-size` when testing phone layouts.
- `data/exams.json` contains some internal contradictions (small-claims limit,
  NI Assembly size). The app reproduces the reference text; do not "fix" the
  data silently.
