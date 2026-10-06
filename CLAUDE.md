# CLAUDE.md

openmluni: a local player for full university lecture series on YouTube.
README.md is usage; this file is how to work on it.

## Hard constraints

- Zero dependencies, no build step. The server uses only `node:*` built-ins;
  the UI is one vanilla-JS/CSS/HTML file. Do not introduce npm packages,
  bundlers or frameworks. The ONE external script is YouTube's iframe_api,
  loaded by index.html: a plain `<iframe>` is opaque to the page, so it is the
  only way to read playback position. Do not add a second one.
- Loopback by default, and no auth, ever. `HOST` defaults to 127.0.0.1. Do
  not add auth or CORS machinery, and do not default to 0.0.0.0.
- The server makes no outbound request. Thumbnails and the player are loaded
  by the browser.
- All copy (UI text, comments, docs) is plain ASCII: no em/en dashes, curly
  quotes or ellipsis characters. Use - and ...

## Catalog and state are separate

    data/       the catalog: one JSON per course, shipped with the repo
    STATE_DIR   the user's own files: progress.json, bookmarks.json
                (env var, default ~/.local/share/openmluni)

Nothing in the repo writes to `data/`, and nothing the user does writes
outside `STATE_DIR`. That is what lets a `git pull` update the catalog without
touching anyone's progress. Keep it that way.

## Files

- `server.js` - HTTP API + static serving, single file. Routes:
  - `GET /` -> index.html (read per request, so an edit shows on reload)
  - `GET /api/courses` -> summaries (slug, name, category, desc, lecture and
    part counts)
  - `GET /api/courses/<slug>` -> full course JSON (slug `^[a-z0-9-]+$`)
  - `GET /api/progress` -> progress.json (`{}` if missing)
  - `POST /api/progress/<slug>` -> applies a PATCH to ONE course entry:
    `{ watched: { id: true|false }, current?, pos: { id: {t,d}|null } }`;
    only the parts named are touched (false/null deletes). Returns the entry
    as it now stands. Atomic tmp-file + rename.
  - `GET /api/bookmarks` -> bookmarks.json, a list of slugs (`[]` if missing)
  - `POST /api/bookmark/<slug>` with `{"on": true|false}` -> adds or removes
    ONE slug, merged into what is on disk; returns the list.
  - `POST /api/progress` -> replaces the WHOLE progress object. Not used by
    the UI; it is the scripting and restore path, destructive by definition.
- `index.html` - the entire UI: tokens, markup and script in one file.
- `extract-playlist-course.js` - browser-console snippet that turns a YouTube
  playlist page into a course JSON on the clipboard. Never run under node.

## Two devices, one state

Several clients (two tabs, a phone) can share one server. Every write is
per course and per part, merged server-side: the UI posts only what the tab
changed since its last write. Never post a whole document from a client that
may be stale - a tab holding an old copy would roll back another device's
ticks. Only `current` is last-write-wins. The page re-reads `/api/progress` on
`visibilitychange` (skipped while a video plays), so switching devices shows
the other one's progress.

## Data model

- `data/<slug>.json` - the FILENAME is the slug used everywhere (API paths,
  progress keys). Shape:
  `{ name, category, desc, lectures: [{ id, title, parts: [{ id, title, videoId }] }] }`
  Some files also carry `kind: "course"`, which nothing reads.
- `category` is one of CS, Math, Fin, Writing; `CAT_ORDER` in index.html sets
  the sidebar order, and an unlisted category sorts after them alphabetically.
- Ids: lectures `L01`, `L02`, ... with parts `L01.1`, `L01.2`, ...; extras
  (interviews) use another prefix, e.g. `I01`/`I01.1`. Flat files have one part
  per lecture, which makes `renderParts` hide the lecture headers and label
  each row with the lecture title. Part ids must be unique within a course.
- **Part ids are the progress keys.** Renaming a course file or changing part
  ids (re-extracting a playlist does that) orphans the user's progress and
  bookmarks for it, silently - the UI just renders no tick. Avoid it for a
  course already in the catalog; if unavoidable, say so in the release notes.
- `progress.json`:
  `{ "<slug>": { watched: { "<partId>": true }, current: "<partId>", pos: { "<partId>": { t, d } } }, "_last": "<slug>" }`
  `pos` is the resume point (`t` seconds watched, `d` duration), kept only
  while a part is part-way through: under 5s or within 30s of the end it is
  deleted. `_last` is written but not read.
- `bookmarks.json` - `["<slug>", ...]`. A slug whose file is gone is kept and
  simply not shown.
- **Embedding.** Some uploaders disable embedding (oEmbed answers 401), so the
  player shows "Video unavailable". Stanford Online does this for most of
  CS229, XCS224U and CS336; those stay in the catalog as trackers - watch on
  YouTube, tick parts off here. Check a new course with oEmbed
  (`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=<id>`)
  per course, not per channel: Stanford's ISLR course embeds fine.

## UI

- **Palette** - `--bg/--fg/--muted/--rule/--accent/--panel` plus a
  prefers-color-scheme dark block. `--accent` is a strong NEUTRAL, not a hue:
  state is carried by weight and surface, never tint. Do not add a colour.
- **Type** - Roboto, falling back to the system sans. No webfont request.
- **Icons** - inline stroke SVGs built by `svg()` into the `ICON` map: 24x24
  viewBox, `fill=none`, `stroke=currentColor`, width 1.8, round caps. Glyphs
  are vendored verbatim (Lucide, Bootstrap Icons), never hand-drawn. Add to
  that map rather than pulling in an icon package. The icon span inside
  `.field` must stay `display: flex`, or the svg rides high on the baseline.
- **Sidebar** - grouped by category; above it a search field (substring over
  name plus category, not persisted, Escape clears), the funnel filters (In
  progress, Bookmarked) and the category pills (All plus one per category,
  each with its count). Pills, search and filters combine.
- **Home** - the landing view: the bookmarked courses as a grid, each card
  the thumbnail of the part the course reopens at, a thin bar for the resume
  point inside that video, the course name and "N% Completed".
- **Address** - `#/<slug>` is a course, no hash is Home; reload and
  back/forward work. A hash so the server only ever serves `/`.
- **Player size** - the `#grip` corner handle outside the video (YouTube's
  fullscreen button is in that corner); 16:9 is locked, the drag sets width.
- **Phone** - below 700px (`NARROW`) the sidebar is a drawer closed by picking
  a course, tapping the dimmed `#scrim` or Escape; body height is `100dvh`.
- **Deliberately absent** - no "Open on YouTube" link, no "Mark watched, next"
  button, no course description under the title. Do not add them back.

Per-browser preferences live in localStorage, never in the state files:
`courses.playerWidth`, `courses.nav`, `courses.onlyProgress`,
`courses.onlyMarked`, `courses.cat`, `courses.sideWidth`.

## Verifying changes

There are no tests. Run against a scratch state directory, never your real one:

    STATE_DIR=/tmp/omu-test node server.js     # -> http://127.0.0.1:4400

Check the startup line (course count, state dir), then click through: the
list renders, a video plays, a tick survives a reload, the sidebar toggle and
the filters work. For the merge rule, POST a tick and then a stale body:

    curl -X POST localhost:4400/api/progress/<slug-a> -d '{"watched":{"L01.1":true}}'
    curl -X POST localhost:4400/api/progress/<slug-a> -d '{"watched":{},"current":null,"pos":{}}'
    curl -X POST localhost:4400/api/progress/<slug-b> -d '{"watched":{},"current":null,"pos":{}}'

The tick must survive both. For resume: play past a minute, switch part and
back; it should resume a few seconds before where you stopped.
