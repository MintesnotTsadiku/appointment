/**
 * Bloom v2 booking buttons keep WCAG AA text contrast on any published accent, light and dark.
 * Run with `npm run test:dom`.
 */
import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import vm from 'node:vm';
import ts from 'typescript';

const exports = {};
const source = readFileSync(new URL('../src/public-experience/templates/bloom-v2/ink.ts', import.meta.url), 'utf8');
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports });
const { accentInk, contrastRatio, withAccentInk, BLOOM_DESIGN_INK, AA_TEXT } = exports;

assert.ok(Math.abs(contrastRatio('#000000', '#ffffff') - 21) < 0.01);

const palettes = JSON.parse(readFileSync(new URL('../../appointment/public_experience/manifest/design/palettes/bloom-hair.v1.json', import.meta.url), 'utf8')).semantic;
const v2 = JSON.parse(readFileSync(new URL('../../appointment/public_experience/manifest/design/palettes/bloom-hair.v2.json', import.meta.url), 'utf8')).semantic;
for (const [name, palette] of [['v1', palettes], ['v2', v2]]) {
  for (const mode of ['light', 'dark']) {
    const tokens = palette[mode];
    const style = withAccentInk({ '--pe-color-accent': tokens.accent, '--pe-color-on-primary': tokens.onPrimary, '--pe-color-text': tokens.text, '--pe-color-canvas': tokens.canvas });
    const ratio = contrastRatio(tokens.accent, style['--bl-gold-ink']);
    assert.ok(ratio >= AA_TEXT, `${name} ${mode}: button text is ${ratio.toFixed(2)}:1 on ${tokens.accent}`);
  }
}

// The marigold design keeps its own ink; a deep red accent (Bloom Studio, light) gets a light label.
assert.equal(accentInk('#f5a524', ['#ffffff']), BLOOM_DESIGN_INK);
assert.equal(accentInk('#a20a23', ['#ffffff', '#4a171d']), '#ffffff');
assert.equal(accentInk(undefined, ['#ffffff']), BLOOM_DESIGN_INK);
// Bloom v3 keeps its own copy of the rule (packages share no code) and writes --b3-gold-ink.
const v3exports = {};
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../src/public-experience/templates/bloom-v3/ink.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports: v3exports });
for (const mode of ['light', 'dark']) {
  const tokens = v2[mode];
  const style = v3exports.withAccentInk({ '--pe-color-accent': tokens.accent, '--pe-color-on-primary': tokens.onPrimary, '--pe-color-text': tokens.text, '--pe-color-canvas': tokens.canvas });
  assert.ok(contrastRatio(tokens.accent, style['--b3-gold-ink']) >= AA_TEXT, `v3 ${mode}: button text keeps AA`);
}
console.log('PASS: Bloom v2 and v3 booking buttons meet 4.5:1 on light and dark accents');

// /book: "Back to site" stays on one line; phones show the short label and keep the full one as the link's name.
const bloomV3 = (file) => readFileSync(new URL(`../src/public-experience/templates/bloom-v3/${file}`, import.meta.url), 'utf8');
assert.match(bloomV3('BloomTemplate.tsx'), /className="b3-link b3-back" href=\{publicRoot\} aria-label=\{chrome\.t\("backToSite"\)\}/);
assert.match(bloomV3('bloom.css'), /\.b3-back \{ flex: none; white-space: nowrap; \}/);
assert.match(bloomV3('bloom.css'), /@media \(max-width: 760px\) \{[^@]*\.b3-back-full \{ display: none; \}\s*\.b3-back-short \{ display: inline; \}/);
for (const locale of ['en', 'am']) {
  const catalog = JSON.parse(readFileSync(new URL(`../src/lib/i18n/translations/${locale}.json`, import.meta.url), 'utf8'));
  assert.ok(catalog.publicSite.backToSiteShort, `${locale}: short "Back to site"`);
  assert.ok(catalog.publicSite.backToSite.toLowerCase().includes(catalog.publicSite.backToSiteShort.toLowerCase()), `${locale}: the visible label is part of the link's name`);
}
console.log('PASS: Bloom v3 "Back to site" stays on one line on phones');
