import fs from 'node:fs';
import vm from 'node:vm';
import { strict as assert } from 'node:assert';
import ts from 'typescript';
const script=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8').match(/<script\b[^>]*>([\s\S]*?)<\/script>/)[1];
function rootElement(){const classes=new Set();return {classes,dataset:{},classList:{add:c=>classes.add(c),remove:(...cs)=>cs.forEach(c=>classes.delete(c))},style:{setProperty(key,value){this[key]=value;},removeProperty(key){delete this[key];}}};}
const defaults={version:1,palette:'codex',mode:'system',typography:'system',text_size:'standard',density:'comfortable'};
for(const preference of [null,'system','dark','light']) for(const systemDark of [true,false]) {
 const root=rootElement();
 vm.runInNewContext(script,{localStorage:{getItem:()=>preference},location:{pathname:'/login'},matchMedia:()=>({matches:systemDark}),document:{cookie:'',documentElement:root}});
 assert(root.classes.has(preference==='dark'||((!preference||preference==='system')&&systemDark)?'dark':'light'));
}
for(const path of ['/home','/settings/appearance','/sites/bloom','/schedule/org/bloom']) {
 const root=rootElement();const cached={...defaults,palette:'ocean',mode:'dark',typography:'serif',text_size:'large',density:'compact'};
 vm.runInNewContext(script,{localStorage:{getItem:key=>key==='vite-ui-theme'?'light':JSON.stringify(cached)},location:{pathname:path},matchMedia:()=>({matches:false}),document:{cookie:'user_id=owner%40example.test',documentElement:root}});
 const internal=path==='/home'||path==='/settings/appearance';
 assert.equal(root.dataset.internalAppearance,internal?'compact':undefined);assert(root.classes.has(internal?'dark':'light'));
}
console.log('PASS: identity-scoped first paint and public route independence');
const root=rootElement();const listeners=new Set();const cache=new Map();let dark=false;let session={authenticated:true,user:'owner@example.test'};let data={message:{...defaults}};let fail=false;let posted;
const environment={document:{documentElement:root,cookie:'user_id=owner%40example.test'},window:{document:{documentElement:root},matchMedia:()=>({get matches(){return dark;},addEventListener:(_,fn)=>listeners.add(fn),removeEventListener:(_,fn)=>listeners.delete(fn)})},localStorage:{getItem:key=>cache.get(key)||null,setItem:(key,value)=>cache.set(key,value)}};
function load(path,require){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require,...environment});return exports;}
const slots=[];let cursor=0;let pending=[];
const hooks={createContext:()=>({Provider:'provider'}),useContext:()=>null,useState(initial){const i=cursor++;if(!slots[i])slots[i]={value:typeof initial==='function'?initial():initial};return [slots[i].value,value=>{slots[i].value=typeof value==='function'?value(slots[i].value):value;}];},useRef(initial){const i=cursor++;return slots[i]||(slots[i]={current:initial});},useMemo(fn,deps){const i=cursor++;if(!slots[i]||deps.some((d,j)=>d!==slots[i].deps[j]))slots[i]={value:fn(),deps};return slots[i].value;},useEffect(fn,deps){const i=cursor++;if(!slots[i]||deps.some((d,j)=>d!==slots[i].deps[j]))pending.push(()=>{slots[i]?.cleanup?.();slots[i]={deps,cleanup:fn()};});}};
hooks.useLayoutEffect=hooks.useEffect;
const colors=load('../src/components/theme-provider/useThemeColors.ts',()=>({}));
const appearance=load('../src/components/theme-provider/appearance.ts',name=>name==='./useThemeColors'?colors:{});
assert.equal(appearance.appearanceDefaults.palette,'codex');
assert.equal(appearance.appearanceColors(defaults,'light').light.background.primary,'#ffffff');
assert.equal(appearance.appearanceColors(defaults,'dark').dark.background.primary,'#181818');
assert.equal(appearance.palettes.length,4);
const provider=load('../src/components/theme-provider/index.tsx',name=>{
 if(name==='react')return hooks;
 if(name==='react/jsx-runtime')return {jsx:(_,props)=>props};
 if(name==='./useThemeColors')return colors;
 if(name==='./appearance')return appearance;
 if(name==='./internal-appearance.css')return {};
 if(name==='@/context/session')return {useSession:()=>({session,loading:false})};
 if(name==='frappe-react-sdk')return {useFrappeGetCall:()=>({data,error:null,isLoading:false,mutate:async value=>{data=value;}}),useFrappePostCall:()=>({call:async value=>{if(fail)throw Error('offline');posted=JSON.parse(value.preferences);return {message:posted};}})};
 throw Error('Unexpected import '+name);
});
function render(path='/settings/appearance'){cursor=0;pending=[];const result=provider.ThemeProvider({children:null,pathname:path}).value;pending.forEach(fn=>fn());return result;}
render();let value=render();assert.equal(value.theme,'system');
dark=true;listeners.forEach(fn=>fn());value=render();assert.equal(value.resolvedTheme,'dark');
value.previewAppearance({...defaults,palette:'forest',density:'compact'});value=render();assert.equal(value.colors.light.background.primary,'#f4faf6');assert.equal(root.dataset.internalAppearance,'compact');
value.cancelAppearance();value=render();assert.equal(value.appearance.palette,'codex');
value.previewAppearance({...defaults,palette:'ocean',mode:'light'});value=render();await value.saveAppearance();render();value=render();assert.equal(posted.palette,'ocean');assert.equal(value.savedAppearance.palette,'ocean');assert.equal(value.resolvedTheme,'light');
value.previewAppearance({...value.appearance,density:'compact'});value=render();fail=true;await assert.rejects(value.saveAppearance());value=render();assert(value.appearanceError);assert.equal(value.savedAppearance.density,'comfortable');assert.equal(value.appearance.density,'compact');fail=false;
value.cancelAppearance();render();session={authenticated:true,user:'provider@example.test'};data={message:{...defaults,palette:'forest'}};render();value=render();assert.equal(value.appearance.palette,'forest');
session=null;data=undefined;render('/login');value=render('/login');assert.equal(root.dataset.internalAppearance,undefined);assert.equal(value.colors,colors.defaultThemeColors);
console.log('PASS: live System changes, preview/cancel/save, save errors, identity changes and logout');
