import { test, expect } from 'playwright/test';
import { chooseSelect, stableScreenshot } from './owner-validation.mjs';

test('template-appearance', async ({ browser }, testInfo) => {
 const world = JSON.parse(process.env.HOMEPAGE_DEMO_WORLD);
 const sites = JSON.parse(process.env.TEMPLATE_APPEARANCE_WORLD);
 for (const business of world) {
  const context = await browser.newContext({baseURL:process.env.PLAYWRIGHT_BASE_URL});
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  await page.goto('/login',{waitUntil:'networkidle'});
  await page.getByLabel('Email Address',{exact:true}).fill(business.email);
  await page.getByLabel('Password',{exact:true}).fill(business.password);
  await page.getByRole('button',{name:'Sign In',exact:true}).click();
  await expect(page).not.toHaveURL(/\/login/);
  await page.goto('/settings/website',{waitUntil:'networkidle'});
  const original = (await (await page.request.get('/api/method/appointment.public_experience.api.website_setup_context')).json()).message;
  const site = original.sites.find(row => row.site === sites[business.key].site);
  const publicBefore = await (await page.request.get(sites[business.key].root)).text();
  let sampleBackground;
  await expect(page.getByRole('radiogroup',{name:'Color palette',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:`Resume ${site.title}`,exact:true})).toHaveCount(0);
  await expect(page.getByRole('radiogroup',{name:'Color palette',exact:true})).toBeVisible();
  const palettes = page.getByRole('radiogroup',{name:'Color palette',exact:true});
  const fonts = page.getByRole('radiogroup',{name:'Font pairing',exact:true});
  const frameBefore=page.frameLocator('iframe[title="Website design preview"]');
  await expect(frameBefore.locator('[data-pe-root]')).toBeVisible();
  const originalColor=await frameBefore.locator('[data-pe-root]').evaluate(element=>getComputedStyle(element).getPropertyValue('--pe-color-primary'));
  const actionSelector='header .selam-pill, header .bloom-button, header .meron-button,  .abugida-hero .abugida-button, header .tena-button';
  const actionBefore=await frameBefore.locator(actionSelector).first().evaluate(element=>getComputedStyle(element).backgroundColor);

  await palettes.getByRole('radio').first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(palettes.getByRole('radio').nth(1)).toHaveAttribute('aria-checked','true');
  await expect.poll(async()=>page.frameLocator('iframe[title="Website design preview"]').locator('[data-pe-root]').evaluate(element=>getComputedStyle(element).getPropertyValue('--pe-color-primary'))).not.toBe(originalColor);
  await expect.poll(async()=>page.frameLocator('iframe[title="Website design preview"]').locator(actionSelector).first().evaluate(element=>getComputedStyle(element).backgroundColor)).not.toBe(actionBefore);
  const beforeSave=(await(await page.request.get('/api/method/appointment.public_experience.api.website_setup_context')).json()).message.sites.find(row=>row.site===site.site);
  expect(beforeSave.draftVersion).toBe(site.draftVersion);
  expect(beforeSave.brandInputs).toEqual(site.brandInputs);

  await fonts.getByRole('radio').nth(1).click();
  await expect(page.locator('.appearance-preview')).toContainText('Unsaved choices');
  await page.evaluate(()=>window.scrollTo(0,0));
  await stableScreenshot(page,{path:testInfo.outputPath(`${business.key}-unsaved-palette.png`),fullPage:true});
  const rejected=await page.request.post('/api/method/appointment.public_experience.api.preview_website_setup',{data:{site:site.site,expected_version:site.draftVersion,brand_inputs:{paletteChoice:'not-approved'}}});
  expect(rejected.ok()).toBe(false);
  const unsafe=await page.request.post('/api/method/appointment.public_experience.api.preview_website_setup',{data:{site:site.site,expected_version:site.draftVersion,brand_inputs:{rawCss:'body{}'}}});
  expect(unsafe.ok()).toBe(false);

  await page.getByRole('button',{name:'Reset palette & fonts',exact:true}).click();
  await expect(palettes.getByRole('radio').first()).toHaveAttribute('aria-checked','true');
  await page.getByRole('button',{name:'Undo reset',exact:true}).click();
  await expect(palettes.getByRole('radio').nth(1)).toHaveAttribute('aria-checked','true');
  await page.getByRole('button',{name:'Save & preview',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('draft is saved');
  await expect(page.getByRole('region',{name:'Website live preview'})).toBeVisible();
  const saved=(await(await page.request.get('/api/method/appointment.public_experience.api.website_setup_context')).json()).message.sites.find(row=>row.site===site.site);
  expect(saved.brandInputs.paletteChoice).toBe('soft');expect(saved.brandInputs.fontChoice).toBe('alternate');
  expect(saved.sections).toEqual(site.sections);expect(saved.identityAssets).toEqual(site.identityAssets);
  const bad=await page.request.post('/api/method/appointment.public_experience.api.save_website_setup',{data:{site:site.site,expected_version:saved.draftVersion,step:'brand',brand_inputs:{paletteChoice:'not-approved',fontChoice:'alternate'}}});
  expect(bad.ok()).toBe(false);expect(await bad.text()).toContain('approved template appearance option');
  const unchanged=(await(await page.request.get('/api/method/appointment.public_experience.api.website_setup_context')).json()).message.sites.find(row=>row.site===site.site);
  expect(unchanged.draftVersion).toBe(saved.draftVersion);
  const foreign=Object.values(sites).find(row=>row.site!==site.site);
  const denied=await page.request.post('/api/method/appointment.public_experience.api.save_website_setup',{data:{site:foreign.site,expected_version:1,step:'brand',brand_inputs:{paletteChoice:'paper'}}});
  expect(denied.ok()).toBe(false);
  const deniedPreview=await page.request.post('/api/method/appointment.public_experience.api.preview_website_setup',{data:{site:foreign.site,expected_version:1,brand_inputs:{paletteChoice:'paper'}}});
  expect(deniedPreview.ok()).toBe(false);


  expect(await(await page.request.get(sites[business.key].root)).text()).toBe(publicBefore);
  await chooseSelect(page.getByRole('region',{name:'Website live preview'}),'Surface','Booking handoff');
  await expect(page.getByRole('region',{name:'Website live preview'})).toBeVisible();
  await chooseSelect(page.getByRole('region',{name:'Website live preview'}),'Surface','Landing page');
  const preview = page.getByRole('region',{name:'Website live preview'});
  await preview.getByRole('button',{name:'Preview mobile',exact:true}).click();
  await chooseSelect(preview,'Surface','Booking handoff');
  await expect(preview.getByRole('button',{name:'Preview desktop',exact:true})).toBeVisible();
  await chooseSelect(preview,'Surface','Landing page');
  await preview.getByRole('button',{name:'Preview desktop',exact:true}).click();
  for (const mode of ['light','dark']) {
   const currentAppearance=(await(await page.request.get('/api/method/appointment.scheduler.appearance.load')).json()).message;
   expect((await page.request.post('/api/method/appointment.scheduler.appearance.save',{data:{preferences:JSON.stringify({...currentAppearance,mode})}})).ok()).toBe(true);
   await page.reload({waitUntil:'networkidle'});
   await expect(page.locator('html')).toHaveClass(new RegExp(mode));
   await expect(palettes).toBeVisible();
   await expect(palettes.getByRole('radio').nth(1)).toHaveAttribute('aria-checked','true');
   for (const size of ['desktop','mobile']) {
    await page.setViewportSize(size==='desktop'?{width:1536,height:1024}:{width:390,height:844});
    const sample = palettes.locator('.palette-sample').nth(1);
    const background = await sample.evaluate(element=>getComputedStyle(element).backgroundColor);
    if(sampleBackground) expect(background).toBe(sampleBackground);else sampleBackground=background;
    if(size==='desktop') {
     const preview=page.getByRole('region',{name:'Website live preview'});
     const frame=preview.frameLocator('iframe[title="Website design preview"]');
     const logo=frame.locator('.pe-brand-logo').first();
     if(await logo.count()) expect((await logo.boundingBox()).height).toBeLessThan(60);
     await preview.getByRole('button',{name:'Fullscreen preview',exact:true}).click();
     await expect(page.getByRole('dialog',{name:'Website live preview'})).toBeVisible();
     if (business.key === 'tena') {
      const fullscreenFrame = page.getByRole('dialog',{name:'Website live preview'}).frameLocator('iframe[title="Website design preview"]');
      const backgrounds = await fullscreenFrame.locator('.tena-nav>.tena-button, .tena-hero .tena-button').evaluateAll(elements=>elements.map(element=>getComputedStyle(element).backgroundColor));
      expect(backgrounds).toHaveLength(2);
      expect(backgrounds[1]).toBe(backgrounds[0]);
      expect(backgrounds[1]).not.toBe('rgba(0, 0, 0, 0)');
     }
     if (business.key === 'meron') {
      const fullscreenFrame = page.getByRole('dialog',{name:'Website live preview'}).frameLocator('iframe[title="Website design preview"]');
      const copy = await fullscreenFrame.locator('.meron-hero>div>p:not(.meron-label)').boundingBox();
      const detail = await fullscreenFrame.locator('.meron-hero figure>img:nth-child(2)').boundingBox();
      expect(copy.x + copy.width).toBeLessThanOrEqual(detail.x);
     }
     await stableScreenshot(page,{path:testInfo.outputPath(`${business.key}-${mode}-desktop-fullscreen.png`),fullPage:false});
     await page.keyboard.press('Escape');
     await expect(page.getByRole('dialog',{name:'Website live preview'})).not.toBeVisible();
    }
    await page.evaluate(()=>window.scrollTo(0,0));
    await stableScreenshot(page,{path:testInfo.outputPath(`${business.key}-${mode}-${size}.png`),fullPage:true});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
    if(size==='mobile') {
     await page.getByRole('button',{name:'Open preview',exact:true}).click();
     await expect(page.locator('.appearance-preview')).toBeVisible();
     const frame=page.frameLocator('iframe[title="Website design preview"]');
     await expect(frame.locator('[data-pe-root]')).toBeVisible();
     const heading=frame.locator('h1').first();
     expect(await heading.evaluate(element=>getComputedStyle(element).fontFamily)).toMatch(/Warm Vitality Display|Crafted Editorial Body|Quiet Trust Body/);
     await stableScreenshot(page,{path:testInfo.outputPath(`${business.key}-${mode}-mobile-preview.png`),fullPage:false});
     await page.keyboard.press('Escape');
     await expect(page.locator('.appearance-preview')).not.toBeVisible();
     await expect(page.getByRole('button',{name:'Open preview',exact:true})).toBeFocused();
    }
   }
  }
  await context.close();
 }
});
