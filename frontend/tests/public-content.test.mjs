import fs from "node:fs";
import vm from "node:vm";
import { strict as assert } from "node:assert";
import ts from "typescript";
function load(file) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { exports });
  return exports;
}
const routes = load("src/public-experience/routes.ts");
for (const route of ["/studio/blog", "/studio/blog/a-story", "/studio/gallery", "/studio/gallery/our-team"]) {
  assert.equal(routes.isPublicExperiencePath(route), true, route);
  assert.equal(routes.publicRootFromPath(route), "/studio");
}
for (const route of ["/studio/blog/a/b", "/studio/gallery/..", "/api/blog", "/studio/unknown/a", "/studio/blog/%2e%2e"]) {
  assert.equal(routes.isPublicExperiencePath(route), false, route);
}
const content = load("src/public-experience/contentContract.ts");
for (const url of ["javascript:alert(1)", "//foreign.test/x", "/\\foreign.test", "data:image/png,abc", "/files/../private/secret", "/private/files/image.jpg"]) {
  assert.equal(content.safeContentMedia(url), undefined, url);
}
assert.equal(content.safeContentMedia("/files/photo.jpg"), "/files/photo.jpg");
assert.equal(content.safeContentLink("javascript:alert(1)"), undefined);
assert.equal(content.safeContentLink("https://example.com"), "https://example.com");
assert.equal(content.videoLink({ videoProvider: "youtube", videoId: "dQw4w9WgXcQ" }), "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
assert.equal(content.videoLink({ videoProvider: "youtube", videoId: "invalid/id" }), undefined);
assert.equal(content.videoLink({ videoProvider: "unknown", videoId: "123" }), undefined);
for (const template of ["selam", "bloom", "meron", "abugida", "tena"]) {
  const dir = `src/public-experience/templates/${template}`;
  for (const file of fs.readdirSync(dir).filter((file) => file.endsWith(".tsx"))) {
    const source = fs.readFileSync(`${dir}/${file}`, "utf8");
    assert.equal(/from ["']\.\.\/(selam|bloom|meron|abugida|tena)\//.test(source), false);
    assert.equal(source.includes("dangerouslySetInnerHTML"), false);
  }
}
console.log("PASS: content paths, safe media/video contracts, independent template boundaries");
