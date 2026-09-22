import fs from 'node:fs';
import vm from 'node:vm';
import { strict as assert } from 'node:assert';
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
for (const preference of [null, 'system', 'dark', 'light']) for (const systemDark of [true, false]) {
  let applied;
  const style = {};
  vm.runInNewContext(script, { localStorage: { getItem: () => preference }, matchMedia: () => ({ matches: systemDark }), document: { documentElement: { classList: { add: value => { applied = value; } }, style } } });
  const expected = preference === 'dark' || ((!preference || preference === 'system') && systemDark) ? 'dark' : 'light';
  assert.equal(applied, expected);
  assert.equal(style.colorScheme, expected);
}
console.log('PASS: first-paint System, Light and Dark choices across both system preferences');

// Exercise the provider's media-query subscription and explicit override.
const { default: ts } = await import('typescript');
const source = fs.readFileSync(new URL('../src/components/theme-provider/index.tsx', import.meta.url), 'utf8');
const state = [];
let cursor = 0;
let effects = [];
let cleanups = [];
let saved = 'system';
let dark = false;
const listeners = new Set();
const classes = new Set();
const root = { classList: { add: c => classes.add(c), remove: (...cs) => cs.forEach(c => classes.delete(c)) }, style: {} };
const storage = { getItem: () => saved, setItem: (_, value) => { saved = value; } };
const media = { get matches() { return dark; }, addEventListener: (_, fn) => listeners.add(fn), removeEventListener: (_, fn) => listeners.delete(fn) };
const exports = {};
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } }).outputText, {
  exports, localStorage: storage, window: { matchMedia: () => media, document: { documentElement: root } },
  require: name => {
    if (name === 'react') return { createContext: () => ({ Provider: 'provider' }), useState: initial => { const index = cursor++; if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial; return [state[index], value => { state[index] = value; }]; }, useEffect: fn => effects.push(fn), useMemo: fn => fn(), useContext: () => null };
    if (name === 'react/jsx-runtime') return { jsx: (_, props) => props };
    if (name === './useThemeColors') return { useThemeColors: () => ({ colors: null, isLoading: false }), defaultThemeColors: {}, applyThemeColors: () => {} };
    throw new Error(`Unexpected import ${name}`);
  },
});
function render() {
  cleanups.forEach(fn => fn?.()); effects = []; cursor = 0;
  const result = exports.ThemeProvider({ children: null });
  cleanups = effects.map(fn => fn());
  return result.value;
}
let context = render();
assert(classes.has('light'));
dark = true; listeners.forEach(fn => fn({ matches: true }));
assert(classes.has('dark'), 'System preference changes must update the page');
context.setTheme('light'); context = render();
assert.equal(saved, 'light'); assert(classes.has('light')); assert.equal(listeners.size, 0);
dark = false;
context.setTheme('system'); render();
assert(classes.has('light')); assert.equal(listeners.size, 1);
cleanups.forEach(fn => fn?.()); assert.equal(listeners.size, 0);
console.log('PASS: live system changes, persisted override and listener cleanup');
