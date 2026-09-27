import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import ts from 'typescript';
const source=readFileSync(new URL('../src/components/analytics/widgetRegistry.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ES2022}}).outputText;
const {widgets,presetConfig,industries}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
assert.equal(new Set(widgets.map(row=>row.id)).size,widgets.length,'Registry IDs must be unique');
for(const permitted of [widgets,widgets.filter(row=>!row.financial)]){
 const all=presetConfig('all','home',permitted);
 assert.equal(all.widgets.length,permitted.length,'All includes every permitted widget');
 for(const industry of industries){
  for(const dashboard of ['home','insights']){
   const config=presetConfig(industry,dashboard,permitted);
   assert.equal(config.version,1);
   for(const placement of config.widgets){
    const widget=permitted.find(row=>row.id===placement.id);
    assert.ok(widget,`${industry} must not add unauthorized widgets`);
    assert.ok(widget.charts.includes(placement.chart));
    assert.ok([1,2,3].includes(placement.span));
   }
  }
 }
}
assert.notDeepEqual(presetConfig('clinic','home',widgets).widgets,presetConfig('clinic','insights',widgets).widgets);
const ui=['ConfigurableDashboard.tsx','MetricWidget.tsx','DashboardFilters.tsx','WidgetMetric.tsx'].map(path=>readFileSync(new URL(`../src/components/analytics/${path}`,import.meta.url),'utf8')).join('\n');
assert.doesNotMatch(ui,/client_email|client_name/,'Aggregate dashboard must not display contact data');
assert.match(ui,/analytics\.export_csv/);
assert.match(ui,/encodeURIComponent\(serialized\)/,'Exports share displayed filters');
assert.match(ui,/metric\.coverage === 'unavailable'/);
console.log(`PASS: ${widgets.length} unique widget contracts, permission-safe industry presets, complete All, separate dashboards and shared exports`);
