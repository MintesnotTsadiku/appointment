import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import ts from 'typescript';

// Staff dashboard (Overview and Insights): the frame owns export and shared filters;
// rate widgets own the formulas and "Unavailable" states.
const source = [
  '../src/components/analytics/WorkspaceDashboard.tsx',
  '../src/components/dashboard/widgets/metrics.tsx',
  '../src/components/dashboard/registry.ts',
].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n');

assert.match(source, /qa(=|: )["']analytics-no-show["']/);
assert.match(source, /No Show ÷.*Completed \+ No Show/);
assert.match(source, /qa(=|: )["']analytics-utilization["']/);
assert.match(source, /booked hours ÷.*available hours/);
assert.match(source, /data-qa="analytics-export"/);
assert.match(source, /appointment\.scheduler\.analytics\.export_csv/);
assert.match(source, /encodeURIComponent\(organization\)/);
assert.match(source, /download className=/);
assert.match(source, /Current-schedule estimate:/);
assert.match(source, /current\.no_show_rate\.available \? .* : "Unavailable"/);
assert.match(source, /current\.utilization\.available \? .* : "Unavailable"/);
assert.match(source, /<DashboardFilters /, 'The staff dashboard offers the shared report filters');
assert.match(source, /encodeURIComponent\(serialized\)/, 'Staff dashboard exports share displayed filters');
assert.match(source, /Provider:\$\{provider\}/, 'Independent providers report on their own business scope');
assert.match(source, /resourceUse/, 'Room and equipment use stays in the widget library');
assert.doesNotMatch(source, /client_email|client_name|appointment_id/);

// Configurable analytics home (independent providers): widget contracts and presets.
const registry = readFileSync(new URL('../src/components/analytics/widgetRegistry.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(registry, { compilerOptions: { module: ts.ModuleKind.ES2022 } }).outputText;
const { widgets, presetConfig, industries } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
assert.equal(new Set(widgets.map((row) => row.id)).size, widgets.length, 'Registry IDs must be unique');
for (const permitted of [widgets, widgets.filter((row) => !row.financial)]) {
  const all = presetConfig('all', 'home', permitted);
  assert.equal(all.widgets.length, permitted.length, 'All includes every permitted widget');
  for (const industry of industries) {
    for (const dashboard of ['home', 'insights']) {
      const config = presetConfig(industry, dashboard, permitted);
      assert.equal(config.version, 1);
      for (const placement of config.widgets) {
        const widget = permitted.find((row) => row.id === placement.id);
        assert.ok(widget, `${industry} must not add unauthorized widgets`);
        assert.ok(widget.charts.includes(placement.chart));
        assert.ok([1, 2, 3].includes(placement.span));
      }
    }
  }
}
assert.notDeepEqual(presetConfig('clinic', 'home', widgets).widgets, presetConfig('clinic', 'insights', widgets).widgets);
const ui = ['ConfigurableDashboard.tsx', 'MetricWidget.tsx', 'DashboardFilters.tsx', 'WidgetMetric.tsx']
  .map((path) => readFileSync(new URL(`../src/components/analytics/${path}`, import.meta.url), 'utf8')).join('\n');
assert.doesNotMatch(ui, /client_email|client_name/, 'Aggregate dashboard must not display contact data');
assert.match(ui, /analytics\.export_csv/);
assert.match(ui, /encodeURIComponent\(serialized\)/, 'Exports share displayed filters');
assert.match(ui, /metric\.coverage === 'unavailable'/);

console.log(`PASS: analytics rates, honest empty states, filtered aggregate export, non-PII UI contract; ${widgets.length} unique widget contracts with permission-safe presets`);
