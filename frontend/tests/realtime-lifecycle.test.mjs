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
