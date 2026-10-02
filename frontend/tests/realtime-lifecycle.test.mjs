/**
 * Realtime lifecycle regression guard.
 *
 * `frappe-react-sdk@1.11.0` creates its Socket.IO client during render with no
 * cleanup, so React StrictMode's development remount leaks a second engine.io
 * connection. The app owns its socket in `RealtimeProvider` instead of disabling
 * StrictMode. This test asserts the invariants that keep that true.
 *
 * Run with `npm run test:dom` (or `npm run test:realtime`).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const read = (rel) => readFileSync(resolve(root, rel), "utf8");

const failures = [];
const check = (label, condition) => {
  if (!condition) failures.push(label);
};

const main = read("src/main.tsx");
check("main.tsx must wrap the app in <StrictMode>", main.includes("<StrictMode>"));
check(
  "main.tsx must not branch on VITE_DISABLE_STRICT_MODE",
  !main.includes("VITE_DISABLE_STRICT_MODE"),
);

const app = read("src/app.tsx");
check("app.tsx must disable the SDK socket", /enableSocket=\{false\}/.test(app));
check("app.tsx must render <RealtimeProvider>", app.includes("<RealtimeProvider>"));

const provider = read("src/components/realtime/RealtimeProvider.tsx");
check(
  "RealtimeProvider must not open a socket on guest public surfaces",
  provider.includes("isGuestSurface(window.location.pathname)") && provider.includes('pathname.startsWith("/schedule/")'),
);
check(
  "RealtimeProvider must build the socket with socket.io-client",
  provider.includes('from "socket.io-client"'),
);
check(
  "RealtimeProvider must use a module-level singleton + consumer count",
  /let singleton/.test(provider) && /let consumers/.test(provider),
);
check(
  "RealtimeProvider must acquire in an effect",
  /useEffect\(\(\) => \{[\s\S]*acquireRealtimeSocket\(\)/.test(provider),
);
check(
  "RealtimeProvider must release (and disconnect) on cleanup",
  /return \(\) => \{[\s\S]*releaseRealtimeSocket\(\)/.test(provider),
);

const worktree = read("../.frappe-worktree.json");
check(
  ".frappe-worktree.json must not disable StrictMode",
  !worktree.includes("VITE_DISABLE_STRICT_MODE"),
);

if (failures.length > 0) {
  console.error("Realtime lifecycle guard failed:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log("OK: realtime lifecycle invariants hold");

// Exercise the actual effect cleanup/remount rather than just checking source.
const { default: ts } = await import("typescript");
const { runInNewContext } = await import("node:vm");
const { strict: assert } = await import("node:assert");
let effect;
const win = { location: { protocol: "http:", hostname: "localhost", port: "5173", pathname: "/home" } };
let created = 0;
let disconnected = 0;
const microtasks = [];
const exports = {};
const compiled = ts.transpileModule(
  provider.replaceAll("import.meta.env", "({})"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } },
).outputText;
runInNewContext(compiled, {
  exports,
  window: win,
  queueMicrotask: (callback) => microtasks.push(callback),
  require: (name) => {
    if (name === "react") return {
      createContext: () => ({ Provider: {} }),
      useState: () => [null, () => {}],
      useEffect: (callback) => { effect = callback; },
    };
    if (name === "react/jsx-runtime") return { jsx: () => null };
    if (name === "@/lib/utils") return { getSiteName: () => "test.localhost" };
    if (name === "@/public-experience/routes") return { isPublicExperiencePath: (path) => path === "/tena-studio" };
    if (name === "socket.io-client") return { io: () => {
      created++;
      return { disconnect: () => { disconnected++; } };
    } };
    throw new Error(`Unexpected import: ${name}`);
  },
});
exports.RealtimeProvider({ children: null });
const firstCleanup = effect();
firstCleanup();
const finalCleanup = effect();
while (microtasks.length) microtasks.shift()();
assert.equal(created, 1, "StrictMode remount must reuse the in-flight connection");
assert.equal(disconnected, 0, "StrictMode cleanup must not abort the handshake");
finalCleanup();
while (microtasks.length) microtasks.shift()();
assert.equal(disconnected, 1, "Last real unmount must close the connection");
for (const guestPath of ["/tena-studio", "/schedule/org/tena-studio"]) {
  win.location.pathname = guestPath;
  assert.equal(effect(), undefined, `${guestPath} must not open a socket`);
}
assert.equal(created, 1, "guest public surfaces never create a connection");
console.log("OK: StrictMode remount reuses one socket, real unmount closes it, guest pages open none");
