import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import path from "node:path";
import { strict as assert } from "node:assert";
import ts from "typescript";

let policy;
const source = readFileSync(new URL("../vite.config.ts", import.meta.url), "utf8");
runInNewContext(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText, {
  exports: {}, process: { env: {}, cwd: () => "/frontend" }, __dirname: "/frontend",
  require: name => {
    if (name === "path") return path;
    if (name === "@vitejs/plugin-react") return () => ({});
    if (name === "vite") return { loadEnv: () => ({}), defineConfig: callback => callback({ mode: "test" }) };
    if (name === "vite-plugin-pwa") return { VitePWA: options => { policy = options.workbox; return {}; } };
    throw new Error(`Unexpected import ${name}`);
  },
});
function handler(pathname, mode = "cors") {
  const url = new URL(pathname, "https://appointment.example.test");
  const request = { mode };
  return policy.runtimeCaching.find(route => typeof route.urlPattern === "function"
    ? route.urlPattern({ request, url }) : route.urlPattern.test(url.href))?.handler;
}
for (const route of ["/settings/website", "/calendar", "/newsletter/confirm/opaque", "/team/invitation/opaque", "/tenant/blog"]) {
  assert.equal(handler(route, "navigate"), "NetworkOnly", `${route} must not persist session boot or tokens`);
}
for (const route of ["/api/method/appointment.content.api.get_article_draft", "/api/method/appointment.content.newsletter.api.workspace", "/api/method/frappe.client.get", "/api/method/appointment.scheduler.booking.slots"]) {
  assert.equal(handler(route), "NetworkOnly", `${route} must never reuse another session's data`);
}
assert.equal(policy.navigateFallback, null);
assert(policy.globIgnores.includes("index.html"));
assert.equal(handler("/assets/appointment/frontend/assets/entry.js"), "CacheFirst");
console.log("PASS: private HTML, consent tokens, drafts, and API responses cannot enter PWA caches");
