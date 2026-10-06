// Browser-console snippet: extract a YouTube playlist into a data/*.json course file.
//
// Usage:
//   1. Open the playlist on YouTube - any page whose URL has a `list=` param works
//      (youtube.com/playlist?list=... or a /watch page opened from the playlist).
//   2. If the playlist has more than ~100 videos, scroll to the bottom until no new
//      rows load (entries are lazy-rendered; the snippet only sees what is in the DOM).
//   3. Paste this whole file into the devtools console and run it. The finished course
//      JSON lands on the clipboard; the console logs how many videos were captured.
//   4. Paste into data/<slug>.json - the FILENAME becomes the course slug.
//      Fill in `name`, `category`, `desc`.
//
// Notes:
//   - Playlist entries are identified by their href carrying `list=<this playlist>` and
//     an `index=` param; recommended/related videos (same yt-lockup-view-model markup)
//     lack these and are skipped. Sorting by `index` restores true playlist order,
//     independent of DOM order.
//   - Handles both the new lockup markup and the older ytd-playlist-video-renderer.
//   - Emits one lecture per video with a single part (the flat-playlist pattern, cf.
//     mit-linear-algebra.json). For multi-part courses (cf. mit-intro-probability.json),
//     regroup the parts by hand afterwards.
//   - Check titles afterwards for uploader inconsistencies (numbering, typos) and
//     optionally strip a repeated course-name prefix.

const LIST = new URL(location.href).searchParams.get("list");
const pad = n => String(n).padStart(2, "0");
const byId = new Map();

for (const a of document.querySelectorAll(
  "a.ytLockupMetadataViewModelTitle, ytd-playlist-video-renderer a#video-title"
)) {
  const u = new URL(a.href, location.origin);
  const videoId = u.searchParams.get("v");
  const idx = Number(u.searchParams.get("index"));
  if (!videoId || u.searchParams.get("list") !== LIST || !Number.isFinite(idx)) continue;
  const title = (a.closest("h3")?.getAttribute("title") ?? a.textContent).trim();
  if (!byId.has(videoId)) byId.set(videoId, { idx, title, videoId });
}

const lectures = [...byId.values()]
  .sort((x, y) => x.idx - y.idx)
  .map((r, i) => ({
    id: `L${pad(i + 1)}`,
    title: r.title,
    parts: [{ id: `L${pad(i + 1)}.1`, title: r.title, videoId: r.videoId }],
  }));

copy(JSON.stringify({
  name: "REPLACE course name",
  category: "REPLACE category (one of Math, CS, Writing, Fin)",
  desc: "REPLACE description",
  lectures,
}, null, 2));
console.log(`${lectures.length} videos captured from playlist ${LIST}, JSON copied to clipboard`);
