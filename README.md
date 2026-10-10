# Life in the UK · date timeline

An interactive web app that shows every date worth memorising for the *Life in
the UK* test on a zoomable timeline, with the exam references one tap away.

## Run it

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check and build to dist/
npm run preview  # preview the production build
```

## What it does

- **Historical timeline** of dated events from the Stone Age to 2012.
- **Zoom & pan** with the scroll wheel, trackpad, pinch, drag, double-click, the
  `+` / `−` buttons, or the arrow keys. A minimap at the bottom lets you jump
  anywhere.
- **Readable without clicking**: every marker shows its year and a short title,
  and labels stack into lanes so they never overlap.
- **A piecewise time scale** so that the huge stretch of prehistory is
  compressed and the busy last thousand years get room to breathe.
- **Range bars** for things that lasted a while (wars, reigns, booms).
- **Annual dates tab** for the dates that repeat every year (saint days,
  Christmas, Hogmanay, Halloween…) plus movable feasts like Easter and Lent.
- **Detail panel** with the summary, the original exam reference text and the
  correct answers, plus links back to the exact question.
- **Colour per category** with a legend that doubles as a filter, and a search
  box that jumps straight to a date.
- **Works on phones, tablets and desktops**: the detail panel becomes a bottom
  sheet, and a list view is available for small screens.

## Where the data lives

- `data/exams.json` — your quiz questions (the source of the references).
- `src/data/events.ts` — the curated historical events. Each entry has a year
  (negative for BC), an optional end year, a title, a summary, a category, an
  importance (3 = always shown, 1 = only when zoomed in), and links back to the
  quiz questions it came from.
- `src/data/annual.ts` — the dates that repeat every year.
- `src/data/categories.ts` — the categories and their colours.

To add an event, append to `src/data/events.ts`. To point at a question, use
`examRefs: [{ set: 3, id: 19 }]`.

## Data notes

Most events are drawn from your `exams.json`. A handful are filled in from the
official handbook where the quizzes skip a date (these carry a dashed border and
an `hb` badge, and are marked `source: "handbook"`).

A few places in the source data disagree with themselves. The timeline states
the value the reference text gives and does not try to hide the conflict:

- **Small claims limit (Scotland & Northern Ireland)** — the reference says
  £3,000 in one place and the marked answer is £5,000 in another.
- **Northern Ireland Assembly size** — one set says 108 members, another says 90.
