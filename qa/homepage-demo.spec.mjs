import { test, expect } from 'playwright/test';
import { chooseSelect, stableScreenshot } from './owner-validation.mjs';

test('seeded-homepage', async ({ browser }, testInfo) => {
 const world=JSON.parse(process.env.HOMEPAGE_DEMO_WORLD);
 for(const business of world){
  const context=await browser.newContext({baseURL:process.env.PLAYWRIGHT_BASE_URL});
  const page=await context.newPage();
  await page.goto('/login',{waitUntil:'networkidle'});
  await page.getByLabel('Email Address',{exact:true}).fill(business.email);
  await page.getByLabel('Password',{exact:true}).fill(business.password);
  await page.getByRole('button',{name:'Sign In',exact:true}).click();
  await expect(page).not.toHaveURL(/\/login/);
  await page.goto('/home',{waitUntil:'networkidle'});
  await expect(page.locator('[data-qa="business-overview-heading"]')).toContainText(business.name);
  await expect(page.getByRole('region',{name:'Business summary'})).toBeVisible();
  await expect(page.locator('[data-widget="catalog_value"]')).not.toContainText('Unavailable');
  for(const mode of ['light','dark']){
   for(let attempt=0;attempt<3;attempt++){const toggle=page.locator('[data-qa="topnav-theme"]');if((await toggle.getAttribute('aria-label')).startsWith(`Theme: ${mode}.`))break;await toggle.click();}
   for(const size of ['desktop','mobile']){
    await page.setViewportSize(size==='desktop'?{width:1536,height:1024}:{width:390,height:844});
    await chooseSelect(page,'Navigation placement','Left sidebar');
    const expand=page.getByRole('button',{name:'Expand sidebar',exact:true});if(size==='desktop'&&await expand.isVisible())await expand.click();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
    await stableScreenshot(page,{mask:[page.locator('[data-qa="analytics-freshness"]')],path:testInfo.outputPath(`demo-${business.key}-${size}-${mode}.png`),fullPage:true});
   }
  }
  await page.goto('/analytics',{waitUntil:'networkidle'});
  await expect(page.locator('[data-widget="agreed_value"]')).not.toContainText('Unavailable');
  await stableScreenshot(page,{mask:[page.locator('[data-qa="analytics-freshness"]')],path:testInfo.outputPath(`demo-${business.key}-insights.png`),fullPage:true});
  await context.close();
 }
});
