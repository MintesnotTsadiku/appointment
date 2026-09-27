import {test,expect} from 'playwright/test';
import {stableScreenshot} from './owner-validation.mjs';
const appearance='/api/method/appointment.scheduler.appearance.';
const account='/api/method/appointment.scheduler.account.';
async function login(page,person){
 await page.goto('/login',{waitUntil:'networkidle'});
 await page.getByLabel('Email Address',{exact:true}).fill(person.email);
 await page.getByLabel('Password',{exact:true}).fill(person.password);
 await page.getByRole('button',{name:'Sign In',exact:true}).click();
 await expect(page).not.toHaveURL(/\/login/);
}
async function read(page,method){return(await(await page.request.get(method)).json()).message;}
async function mode(page,value){
 const current=await read(page,appearance+'load');
 expect((await page.request.post(appearance+'save',{data:{preferences:JSON.stringify({...current,palette:'codex',mode:value})}})).ok()).toBe(true);
 await page.reload({waitUntil:'networkidle'});await expect(page.locator('html')).toHaveClass(new RegExp(value));
}
async function capture(page,info,name){
 await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));await page.waitForTimeout(500);await page.evaluate(()=>window.scrollTo(0,0));
 await stableScreenshot(page,{path:info.outputPath('codex-'+name+'.png'),fullPage:true,mask:[page.locator('[data-qa="analytics-freshness"]')]});
}
async function contained(page){expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}

test('codex-shell',async({browser},info)=>{
 const owner=JSON.parse(process.env.HOMEPAGE_DEMO_WORLD).find(row=>row.key==='bloom');
 const provider=JSON.parse(process.env.INTERNAL_APPEARANCE_PROVIDER);
 const context=await browser.newContext({baseURL:process.env.PLAYWRIGHT_BASE_URL,viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 const page=await context.newPage();page.setDefaultTimeout(25000);await login(page,owner);
 await page.goto('/settings/appearance',{waitUntil:'networkidle'});await page.getByRole('button',{name:'Reset defaults',exact:true}).click();
 await expect(page.getByRole('radio',{name:'Codex',exact:true})).toHaveAttribute('aria-checked','true');
 if(await page.getByRole('button',{name:'Save appearance',exact:true}).isEnabled()){
  const response=page.waitForResponse(row=>row.url().includes(appearance+'save')&&row.request().method()==='POST');
  await page.getByRole('button',{name:'Save appearance',exact:true}).click();expect((await response).ok()).toBe(true);
 }
 expect((await page.request.post('/api/method/appointment.scheduler.dashboard_config.save_navigation',{data:{placement:'sidebar',collapsed:false}})).ok()).toBe(true);
 await page.goto('/settings',{waitUntil:'networkidle'});await mode(page,'light');
 await expect(page.locator('html')).toHaveAttribute('data-workspace-navigation','sidebar');
 await expect(page.getByRole('navigation',{name:'Sidebar navigation',exact:true})).toBeVisible();
 await expect(page.getByRole('navigation',{name:'Top navigation',exact:true})).toHaveCount(0);
 expect(await page.locator('html').evaluate(el=>getComputedStyle(el).getPropertyValue('--bg-primary').trim())).toBe('#ffffff');
 await capture(page,info,'settings-light');await mode(page,'dark');
 expect(await page.locator('html').evaluate(el=>getComputedStyle(el).getPropertyValue('--bg-primary').trim())).toBe('#181818');
 await capture(page,info,'settings-dark');
 await page.getByRole('button',{name:'Open account menu',exact:true}).filter({visible:true}).click();await expect(page.getByRole('link',{name:'Your profile',exact:true})).toBeVisible();
 await capture(page,info,'account-menu-dark');await page.getByRole('link',{name:'Your profile',exact:true}).click();
 await expect(page.getByLabel('First name',{exact:true})).not.toHaveValue('');const original=await read(page,account+'load');
 await page.getByLabel('Phone number',{exact:true}).fill('+251911123456');await page.getByRole('button',{name:'Cancel',exact:true}).click();await expect(page.getByLabel('Phone number',{exact:true})).toHaveValue(original.mobile_no);
 await page.getByLabel('Phone number',{exact:true}).fill('+251911123456');await page.getByRole('button',{name:'Save profile',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Profile saved.');
 await page.reload({waitUntil:'networkidle'});await expect(page.getByLabel('Phone number',{exact:true})).toHaveValue('+251911123456');await mode(page,'light');await capture(page,info,'profile-light');
 expect((await page.request.post(account+'save',{data:{details:JSON.stringify({first_name:'Test',last_name:'',mobile_no:'',user:provider.email})}})).ok()).toBe(false);
 const second=await browser.newContext({baseURL:process.env.PLAYWRIGHT_BASE_URL});const other=await second.newPage();await login(other,provider);const staff=await read(other,account+'load');expect(staff.email).toBe(provider.email);expect(staff.mobile_no).not.toBe('+251911123456');
 await other.goto('/settings/profile',{waitUntil:'networkidle'});await expect(other.getByRole('heading',{name:'Your profile',exact:true})).toBeVisible();await second.close();
 await page.goto('/home',{waitUntil:'networkidle'});await capture(page,info,'home-light');await mode(page,'dark');await capture(page,info,'home-dark');
 await page.getByRole('button',{name:'Collapse sidebar',exact:true}).click();await expect(page.locator('html')).toHaveAttribute('data-workspace-collapsed','true');await contained(page);await capture(page,info,'sidebar-collapsed-dark');
 await page.getByRole('button',{name:'Expand sidebar',exact:true}).click();await page.setViewportSize({width:390,height:844});await page.goto('/settings/profile',{waitUntil:'networkidle'});await contained(page);await capture(page,info,'profile-mobile-dark');
 await page.getByRole('button',{name:'Open navigation drawer',exact:true}).click();await expect(page.getByRole('navigation',{name:'Mobile navigation',exact:true})).toBeVisible();await capture(page,info,'mobile-navigation-dark');
 await page.keyboard.press('Escape');await expect(page.getByRole('navigation',{name:'Mobile navigation',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Open account menu',exact:true}).filter({visible:true}).click();await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page).toHaveURL(/\/login/);
 await expect(page.locator('html')).not.toHaveAttribute('data-workspace-navigation');await expect(page.locator('html')).not.toHaveAttribute('data-internal-palette');await context.close();
});
