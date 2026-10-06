// openmluni - a local player for full university lecture series on YouTube.
// Single-file server, zero dependencies, loopback by default.
//
//   node server.js                         -> http://127.0.0.1:4400
//   PORT=5000 node server.js
//   STATE_DIR=~/notes/openmluni node server.js
//
// Serves index.html and the course catalog in ./data (one JSON per course; the
// filename is the course slug). Your own state - progress.json and
// bookmarks.json - lives in STATE_DIR, default ~/.local/share/openmluni, so the
// catalog can be updated without touching it.
//
// progress.json shape: { "<course-slug>": { "watched": { "<partId>": true },
//   "current": "<partId>", "pos": { "<partId>": { "t": 0, "d": 0 } } }, "_last": "<course-slug>" }
// bookmarks.json: a list of course slugs, the Home view's shelf.
//
// HOST defaults to 127.0.0.1 and should stay there: there is no login. To reach
// it from another device, put it behind something that authenticates (a VPN such
// as Tailscale), not on 0.0.0.0.

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PORT = Number(process.env.PORT) || 4400;
const HOST = process.env.HOST || "127.0.0.1";
const DATA_DIR = path.join(__dirname, "data");
const os = require("node:os");
const STATE_DIR = (process.env.STATE_DIR || path.join(os.homedir(), ".local", "share", "openmluni")).replace(/^~(?=\/|$)/, os.homedir());
fs.mkdirSync(STATE_DIR, { recursive: true });
const PROGRESS_FILE = path.join(STATE_DIR, "progress.json");
const BOOKMARKS_FILE = path.join(STATE_DIR, "bookmarks.json");
const SLUG_RE = /^[a-z0-9-]+$/;

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

// Atomic write: a crash mid-write can never truncate the real file.
function writeJson(file, value) {
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2) + "\n");
  fs.renameSync(tmp, file);
}

function writeProgress(progress) {
  writeJson(PROGRESS_FILE, progress);
}

function readBookmarks() {
  const list = readJson(BOOKMARKS_FILE, []);
  return Array.isArray(list) ? list.filter((s) => typeof s === "string" && SLUG_RE.test(s)) : [];
}

function listCourses() {
  return fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => {
      const course = readJson(path.join(DATA_DIR, f), null);
      if (!course) return null;
      const parts = course.lectures.reduce((n, l) => n + l.parts.length, 0);
      return {
        slug: f.replace(/\.json$/, ""),
        name: course.name,
        category: course.category,
        desc: course.desc,
        lectures: course.lectures.length,
        parts,
      };
    })
    .filter(Boolean);
}

function send(res, status, body, type) {
  res.writeHead(status, { "Content-Type": type || "application/json; charset=utf-8" });
  res.end(type ? body : JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  const { pathname } = new URL(req.url, "http://localhost");

  if (req.method === "GET" && (pathname === "/" || pathname === "/index.html")) {
    return send(res, 200, fs.readFileSync(path.join(__dirname, "index.html")), "text/html; charset=utf-8");
  }

  if (req.method === "GET" && pathname === "/api/courses") {
    return send(res, 200, listCourses());
  }

  const detail = pathname.match(/^\/api\/courses\/([^/]+)$/);
  if (req.method === "GET" && detail) {
    const slug = detail[1];
    if (!SLUG_RE.test(slug)) return send(res, 400, { error: "bad slug" });
    const course = readJson(path.join(DATA_DIR, slug + ".json"), null);
    return course ? send(res, 200, course) : send(res, 404, { error: "not found" });
  }

  if (req.method === "GET" && pathname === "/api/progress") {
    return send(res, 200, readJson(PROGRESS_FILE, {}));
  }

  // One course at a time, and only the parts the body names, merged into what is on
  // disk. Body is a patch: { watched: { id: true|false }, current?, pos: { id: {t,d}|null } }.
  // One device writing course A must not roll back course B, and a stale tab on the
  // SAME course must not roll back another device's ticks either, so only the parts
  // the patch names are touched. A full entry from an old page still parses as a
  // patch, and can then only add ticks, never remove them.
  const one = pathname.match(/^\/api\/progress\/([^/]+)$/);
  if (req.method === "POST" && one) {
    const slug = one[1];
    if (!SLUG_RE.test(slug)) return send(res, 400, { error: "bad slug" });
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const patch = JSON.parse(body);
        if (typeof patch !== "object" || patch === null || Array.isArray(patch)) throw new Error("not an object");
        const progress = readJson(PROGRESS_FILE, {});
        const entry = progress[slug] || { watched: {}, current: null, pos: {} };
        entry.watched = entry.watched || {};
        entry.pos = entry.pos || {};
        for (const [id, on] of Object.entries(patch.watched || {})) on ? (entry.watched[id] = true) : delete entry.watched[id];
        for (const [id, at] of Object.entries(patch.pos || {})) at ? (entry.pos[id] = at) : delete entry.pos[id];
        if ("current" in patch) entry.current = patch.current;
        progress[slug] = entry;
        progress._last = slug;
        writeProgress(progress);
        send(res, 200, entry);
      } catch (err) {
        send(res, 400, { error: String(err.message || err) });
      }
    });
    return;
  }

  if (req.method === "GET" && pathname === "/api/bookmarks") {
    return send(res, 200, readBookmarks());
  }

  // One slug at a time, for the same reason as progress: a client holds the list from
  // page load, and a stale one posting the whole list would undo every bookmark made
  // on the other device since. Returns the list as it now stands on disk.
  const mark = pathname.match(/^\/api\/bookmark\/([^/]+)$/);
  if (req.method === "POST" && mark) {
    const slug = mark[1];
    if (!SLUG_RE.test(slug)) return send(res, 400, { error: "bad slug" });
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { on } = JSON.parse(body);
        if (typeof on !== "boolean") throw new Error("on must be a boolean");
        let list = readBookmarks();
        if (on && !list.includes(slug)) list.push(slug);
        if (!on) list = list.filter((s) => s !== slug);
        writeJson(BOOKMARKS_FILE, list);
        send(res, 200, list);
      } catch (err) {
        send(res, 400, { error: String(err.message || err) });
      }
    });
    return;
  }

  // Whole-object replace. The UI no longer uses this - it is the scripting and
  // restore path, and it is destructive by definition.
  if (req.method === "POST" && pathname === "/api/progress") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const progress = JSON.parse(body);
        if (typeof progress !== "object" || progress === null || Array.isArray(progress)) throw new Error("not an object");
        writeProgress(progress);
        send(res, 200, { ok: true });
      } catch (err) {
        send(res, 400, { error: String(err.message || err) });
      }
    });
    return;
  }

  send(res, 404, { error: "not found" });
});

server.listen(PORT, HOST, () => {
  console.log(`openmluni -> http://${HOST}:${PORT} (${listCourses().length} courses, state: ${STATE_DIR})`);
  if (HOST !== "127.0.0.1") {
    console.log("  bound beyond loopback: no auth, trusted networks only");
  }
});
