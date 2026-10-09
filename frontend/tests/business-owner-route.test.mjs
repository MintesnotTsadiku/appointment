import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { strict as assert } from "node:assert";
import ts from "typescript";

let state;
const exported = {};
const source = readFileSync(new URL("../src/components/workspace/BusinessOwnerRoute.tsx", import.meta.url), "utf8");
runInNewContext(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText, {
  exports: exported,
  require: name => {
    if (name === "react/jsx-runtime") return { jsx: (type, props) => ({ type, props }) };
    if (name === "react-router-dom") return { Navigate: "redirect", Outlet: "owner-workspace" };
    if (name === "@/context/session") return { useSession: () => state };
    if (name === "@/lib/i18n") return { useTranslation: () => ({ t: key => key, language: "en" }) };
    throw new Error(`Unexpected import ${name}`);
  },
});
for (const landing of ["/reception", "/calendar"]) {
  state = { session: { authenticated: true, landing, roles: ["Organization Manager"] }, isManager: false };
  const result = exported.default();
  assert.equal(result.type, "redirect", "A global role must not grant owner UI in a staff workspace");
  assert.equal(result.props.to, landing);
}
for (const owner of ["organization-owner", "independent-owner"]) {
  state = { session: { authenticated: true, state: owner }, isManager: true };
  assert.equal(exported.default().type, "owner-workspace");
}
state = { session: { authenticated: false } };
assert.equal(exported.default().props.to, "/login");
state = { loading: true };
assert.equal(exported.default().props.role, "status");
state = { error: new Error("Session unavailable"), isManager: true };
assert.equal(exported.default().props.role, "alert", "A session failure must fail closed");
console.log("PASS: owner workspaces follow the selected business scope and fail closed for staff, guests, and session errors");
