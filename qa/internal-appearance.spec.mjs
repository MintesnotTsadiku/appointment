import { test, expect } from 'playwright/test';
import { stableScreenshot } from './owner-validation.mjs';

const method = '/api/method/appointment.scheduler.appearance.';
async function login(page, person) {
  await page.goto('/login', {waitUntil:'networkidle'});
  await page.getByLabel('Email Address',{exact:true}).fill(person.email);
  await page.getByLabel('Password',{exact:true}).fill(person.password);
  await page.getByRole('button',{name:'Sign In',exact:true}).click();
  await expect(page).not.toHaveURL(/\/login/);
}
async function read(page) {return (await(await page.request.get(method+'load')).json()).message;}
async function choose(page, group, label) {await page.getByRole('radiogroup',{name:group,exact:true}).getByRole('radio',{name:label,exact:false}).click();}
async function save(page) {
  const response=page.waitForResponse(row=>row.url().includes(method+'save') && row.request().method()==='POST');
  await page.getByRole('button',{name:'Save appearance',exact:true}).click();
  const result=await response;expect(result.ok()).toBe(true);
  await expect(page.getByRole('status')).toContainText('saved to your account');
  return (await result.json()).message;
}
async function capture(page, info, name) {
  // Reveal sections that animate only after entering the viewport.
  const height=await page.evaluate(()=>document.documentElement.scrollHeight);
  const step=page.viewportSize().height;
  for(let offset=0;offset<height;offset+=step){
    await page.evaluate(y=>window.scrollTo(0,y),offset);
    await page.waitForTimeout(350);
  }
  await page.evaluate(()=>window.scrollTo(0,0));
  const options={fullPage:true,mask:[page.locator('[data-qa="analytics-freshness"]'),page.locator('[data-qa="walkin-card"] .text-\\[10px\\]')]};
  // Require consecutive identical frames after data and motion settle.
  let previous=await stableScreenshot(page,options);
  await expect(async()=>{
    const current=await stableScreenshot(page,options);
    const same=current.equals(previous);previous=current;expect(same).toBe(true);
  }).toPass({timeout:15000,intervals:[500,500,1000]});
  await stableScreenshot(page,{...options,path:info.outputPath('internal-'+name+'.png')});
}

test('internal-appearance', async ({browser}, info) => {
  const world=JSON.parse(process.env.HOMEPAGE_DEMO_WORLD);
  const owner=world.find(row=>row.key==='bloom');
  const provider=JSON.parse(process.env.INTERNAL_APPEARANCE_PROVIDER);
  const publicWorld=JSON.parse(process.env.SHOWCASE_QA_WORLD).bloom;
  const context=await browser.newContext({baseURL:process.env.PLAYWRIGHT_BASE_URL,reducedMotion:'reduce',viewport:{width:1440,height:1000},colorScheme:'light'});
  const page=await context.newPage();page.setDefaultTimeout(25000);
  await login(page,owner);
  const before=await read(page);
  const publicBefore=await(await page.request.get(publicWorld.root)).text();
  const navBefore=(await(await page.request.get('/api/method/appointment.scheduler.dashboard_config.navigation')).json()).message;
  await page.goto('/settings/appearance',{waitUntil:'networkidle'});
  await expect(page.getByRole('heading',{name:'Application appearance',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Reset defaults',exact:true}).click();
  const defaults=await page.locator('.internal-preview').evaluate(el=>({background:getComputedStyle(el).backgroundColor,padding:getComputedStyle(el).padding,font:getComputedStyle(el).fontFamily}));
  await capture(page,info,'desktop-default');
  await page.getByRole('radiogroup',{name:'Application palette'}).getByRole('radio',{name:'Violet',exact:true}).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radiogroup',{name:'Application palette'}).getByRole('radio',{name:'Ocean',exact:true})).toHaveAttribute('aria-checked','true');
  await choose(page,'Typography','Classic serif');
  await choose(page,'Text size','Large');
  await choose(page,'Density','Compact');
  await expect(page.getByRole('status')).toContainText('Unsaved');
  const changed=await page.locator('.internal-preview').evaluate(el=>({background:getComputedStyle(document.documentElement).getPropertyValue('--bg-primary'),padding:getComputedStyle(el).padding,font:getComputedStyle(el).fontFamily}));
  expect(changed.background.trim()).toBe('#f4f9fc');expect(changed.padding).not.toBe(defaults.padding);expect(changed.font).not.toBe(defaults.font);
  expect(await page.locator('html').evaluate(el=>getComputedStyle(el).fontSize)).toBe('18px');
  expect(await read(page)).toEqual(before);
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  await expect.poll(()=>page.getByRole('radiogroup',{name:'Application palette'}).getByRole('radio',{name:({codex:'Codex',violet:'Violet',ocean:'Ocean',forest:'Forest'})[before.palette],exact:true}).getAttribute('aria-checked')).toBe('true');
  await page.getByRole('button',{name:'Reset defaults',exact:true}).click();
  await choose(page,'Application palette','Ocean');await choose(page,'Typography','Classic serif');await choose(page,'Text size','Large');await choose(page,'Density','Compact');
  await page.route('**/api/method/appointment.scheduler.appearance.save', route=>route.abort('failed'));
  await page.getByRole('button',{name:'Save appearance',exact:true}).click();
  await expect(page.getByRole('alert').filter({hasText:'Could not save appearance'})).toBeVisible();
  expect(await read(page)).toEqual(before);
  await page.unroute('**/api/method/appointment.scheduler.appearance.save');
  await save(page);
  await expect(page.getByRole('status')).toContainText('saved to your account');
  const saved=await read(page);expect(saved).toMatchObject({palette:'ocean',typography:'serif',text_size:'large',density:'compact',mode:'system'});
  expect((await(await page.request.get('/api/method/appointment.scheduler.dashboard_config.navigation')).json()).message).toEqual(navBefore);
  await page.getByRole('button',{name:'Reset defaults',exact:true}).click();
  await save(page);
  await expect.poll(async()=>(await read(page)).palette).toBe('codex');
  await choose(page,'Application palette','Ocean');await choose(page,'Typography','Classic serif');await choose(page,'Text size','Large');await choose(page,'Density','Compact');
  await save(page);
  await expect(page.getByRole('status')).toContainText('saved to your account');
  await page.reload({waitUntil:'networkidle'});await expect(page.locator('html')).toHaveAttribute('data-internal-appearance','compact');
  await capture(page,info,'desktop-ocean-serif-compact');
  const second=await browser.newContext({baseURL:process.env.PLAYWRIGHT_BASE_URL,reducedMotion:'reduce'});const other=await second.newPage();await login(other,owner);await other.goto('/settings/appearance',{waitUntil:'networkidle'});await expect(other.locator('html')).toHaveAttribute('data-internal-text-size','large');expect(await read(other)).toEqual(saved);await second.close();
  await choose(page,'Color mode','Dark');await expect(page.locator('html')).toHaveClass(/dark/);await capture(page,info,'desktop-ocean-dark');
  await choose(page,'Color mode','Light');await expect(page.locator('html')).toHaveClass(/light/);
  await choose(page,'Color mode','System');await page.emulateMedia({colorScheme:'dark'});await expect(page.locator('html')).toHaveClass(/dark/);await page.emulateMedia({colorScheme:'light'});await expect(page.locator('html')).toHaveClass(/light/);
  await page.setViewportSize({width:390,height:844});await capture(page,info,'mobile-ocean-light');
  expect(await page.getByRole('button',{name:'Save appearance',exact:true}).evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await choose(page,'Application palette','Forest');await choose(page,'Color mode','Dark');await capture(page,info,'mobile-forest-dark');
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.setViewportSize({width:1440,height:1000});
  for (const [path,name] of [['/home','home'],['/analytics','insights'],['/reception','reception'],['/calendar','schedule'],['/settings','settings']]) {
    await page.goto(path,{waitUntil:'networkidle'});await expect(page.locator('html')).toHaveAttribute('data-internal-appearance','compact');await capture(page,info,name+'-ocean-compact');
  }
  await page.setViewportSize({width:390,height:844});
  for(const [path,name] of [['/home','home'],['/analytics','insights'],['/reception','reception'],['/calendar','schedule'],['/settings','settings']]){
    await page.goto(path,{waitUntil:'networkidle'});
    await capture(page,info,name+'-mobile-ocean-compact');
    const bounds=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:window.innerWidth,offenders:[...document.querySelectorAll('body *')].filter(el=>el.getBoundingClientRect().right>window.innerWidth+1).slice(0,8).map(el=>({tag:el.tagName,class:el.className}))}));
    expect(bounds.width, 'Overflow on '+path+': '+JSON.stringify(bounds.offenders)).toBeLessThanOrEqual(bounds.viewport);
  }
  await page.setViewportSize({width:1440,height:1000});
  const membership=(await(await page.request.get('/api/method/appointment.scheduler.membership.context')).json()).message;
  if(membership.workspaces.length>1){const target=membership.workspaces.find(row=>row.organization!==membership.selected.organization);await page.request.post('/api/method/appointment.scheduler.membership.select_workspace',{data:{organization:target.organization}});await page.reload({waitUntil:'networkidle'});expect(await read(page)).toEqual(saved);}
  expect(await(await page.request.get(publicWorld.root)).text()).toBe(publicBefore);
  await page.goto(publicWorld.root,{waitUntil:'networkidle'});await expect(page.locator('[data-pe-root]').first()).toBeVisible();await expect(page.locator('html')).not.toHaveAttribute('data-internal-appearance');expect(await page.locator('html').evaluate(el=>getComputedStyle(el).fontSize)).toBe('16px');await capture(page,info,'public-independent');
  await page.goto(publicWorld.scheduler,{waitUntil:'networkidle'});await expect(page.locator('html')).not.toHaveAttribute('data-internal-appearance');
  const restricted=await browser.newContext({baseURL:process.env.PLAYWRIGHT_BASE_URL,reducedMotion:'reduce'});const staff=await restricted.newPage();await login(staff,provider);const staffBefore=await read(staff);await staff.goto('/settings/appearance',{waitUntil:'networkidle'});await expect(staff.getByRole('heading',{name:'Application appearance',exact:true})).toBeVisible();await choose(staff,'Application palette','Forest');await save(staff);await expect(staff.getByRole('status')).toContainText('saved to your account');expect(await read(page)).toEqual(saved);expect(await read(staff)).toMatchObject({palette:'forest'});await capture(staff,info,'provider-forest');
  const rejected=await staff.request.post(method+'save',{data:{preferences:JSON.stringify({...staffBefore,css:'body{}'})}});expect(rejected.ok()).toBe(false);
  await staff.goto('/home',{waitUntil:'networkidle'});await staff.getByRole('button',{name:/sign out|log out/i}).click();await expect(staff).toHaveURL(/login/);await expect(staff.locator('html')).not.toHaveAttribute('data-internal-appearance');await login(staff,owner);await staff.goto('/settings/appearance',{waitUntil:'networkidle'});await expect(staff.getByRole('radiogroup',{name:'Application palette'}).getByRole('radio',{name:'Ocean',exact:true})).toHaveAttribute('aria-checked','true');
  await restricted.close();
  const coordinator=JSON.parse(process.env.INTERNAL_APPEARANCE_MULTI);
  const coordinated=await browser.newContext({baseURL:process.env.PLAYWRIGHT_BASE_URL,reducedMotion:'reduce'});const coordinatorPage=await coordinated.newPage();
  await login(coordinatorPage,coordinator);
  const initialCoordination=(await(await coordinatorPage.request.get('/api/method/appointment.scheduler.membership.context')).json()).message;
  if(!initialCoordination.selected){
    await coordinatorPage.goto('/workspaces',{waitUntil:'networkidle'});
    await coordinatorPage.locator('[data-qa=workspace-card]').filter({hasText:initialCoordination.workspaces[0].business_name}).getByRole('button',{name:'Open',exact:true}).click();
  }
  await coordinatorPage.goto('/settings/appearance',{waitUntil:'networkidle'});
  await choose(coordinatorPage,'Application palette','Forest');await save(coordinatorPage);
  await expect(coordinatorPage.getByRole('status')).toContainText('saved to your account');
  const coordinationAppearance=await read(coordinatorPage);
  const multiContext=(await(await coordinatorPage.request.get('/api/method/appointment.scheduler.membership.context')).json()).message;
  expect(multiContext.workspaces.length).toBeGreaterThan(1);
  for(const workspace of multiContext.workspaces){
    const current=(await(await coordinatorPage.request.get('/api/method/appointment.scheduler.membership.context')).json()).message;
    if(current.selected.organization!==workspace.organization){
      const response=coordinatorPage.waitForResponse(row=>row.url().includes('/api/method/appointment.scheduler.membership.select_workspace') && row.request().method()==='POST');
      await coordinatorPage.getByRole('combobox',{name:'Active business',exact:true}).click();
      await coordinatorPage.getByRole('option').filter({hasText:workspace.business_name}).click();
      const switched=await response;expect(switched.ok()).toBe(true);
      expect((await switched.json()).message.selected.organization).toBe(workspace.organization);
      await expect.poll(async()=>(await(await coordinatorPage.request.get('/api/method/appointment.scheduler.membership.context')).json()).message.selected.organization,{timeout:25000}).toBe(workspace.organization);
    }
    await coordinatorPage.goto('/settings/appearance',{waitUntil:'networkidle'});
    await expect(coordinatorPage.getByRole('heading',{name:'Application appearance',exact:true})).toBeVisible();
    expect(await read(coordinatorPage)).toEqual(coordinationAppearance);
    await expect(coordinatorPage.getByRole('radiogroup',{name:'Application palette'}).getByRole('radio',{name:'Forest',exact:true})).toHaveAttribute('aria-checked','true');
    await capture(coordinatorPage,info,'workspace-'+workspace.role.toLowerCase());
  }
  await coordinated.close();await context.close();
});
