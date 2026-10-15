/**
 * The in-app pages of this tab's history, by history index. Both routers (the website app and the full app)
 * record each location, so a page can tell what the previous in-app page was and go back to it with the
 * browser's own history (the booking header's Back button).
 *
 * The router keeps its index in `history.state.idx`. A fresh document starts again at 0: the pages before it
 * belong to another document, so they are not in the trail.
 */

const STORAGE_KEY = "app-history-trail";
const LIMIT = 60;

/** Index → path (pathname and search). */
type Trail = Record<string, string>;

let memory: Trail = {};

function read(): Trail {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) memory = JSON.parse(saved) as Trail;
  } catch {
    // Storage blocked or malformed: the copy in memory is enough for this document.
  }
  return memory;
}

function write(trail: Trail) {
  memory = trail;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(trail));
  } catch {
    // Storage blocked: keep the copy in memory.
  }
}

/** The router's index of the current history entry, or null outside a router. */
export function historyIndex(): number | null {
  const idx = (typeof window === "undefined" ? null : (window.history.state as { idx?: unknown } | null)?.idx);
  return typeof idx === "number" ? idx : null;
}

/**
 * The next trail after a visit. A push drops the entries after it (the browser drops them too). The first
 * entry of a document (`fresh`) starts a new trail.
 */
export function nextTrail(trail: Trail, idx: number, path: string, action: string, fresh: boolean): Trail {
  const next: Trail = {};
  if (!fresh) {
    for (const [key, value] of Object.entries(trail)) {
      const index = Number(key);
      if (action === "PUSH" && index >= idx) continue;
      if (index > idx - LIMIT) next[key] = value;
    }
  }
  next[String(idx)] = path;
  return next;
}

/** Record the router's current location (call it for the first location and after each navigation). */
export function recordLocation(location: { pathname: string; search: string; key: string }, action: string) {
  const idx = historyIndex();
  if (idx === null) return;
  write(nextTrail(read(), idx, `${location.pathname}${location.search}`, action, location.key === "default" && idx === 0));
}

/** The path at a history index of this document, when it is known. */
export function trailPath(idx: number): string | null {
  return idx < 0 ? null : read()[String(idx)] ?? null;
}
