import { test, expect } from 'playwright/test';
import { chooseSelect, stableScreenshot } from './owner-validation.mjs';

test('independent-homepage', async ({browser}, testInfo) => {
 const ownerContext=await browser.newContext({baseURL:process.env.PLAYWRIGHT_BASE_URL});
 const page=await ownerContext.newPage();
 await page.goto('/signup',{waitUntil:'networkidle'});
 const password=`Homepage acceptance ${crypto.randomUUID()}!`;
 await page.getByLabel('Full Name',{exact:true}).fill('Homepage Independent Browser');
 await page.getByLabel('Email Address',{exact:true}).fill('homepage-independent-browser@example.test');
 await page.getByLabel('Password',{exact:true}).fill(password);
 await page.getByRole('button',{name:'Create Account',exact:true}).click();
 await expect(page.locator('[data-qa="signup-success"]')).toBeVisible();
 await page.goto('/login',{waitUntil:'networkidle'});
 await page.getByLabel('Email Address',{exact:true}).fill('homepage-independent-browser@example.test');
 await page.getByLabel('Password',{exact:true}).fill(password);
 await page.getByRole('button',{name:'Sign In',exact:true}).click();
 await expect(page).toHaveURL(/\/onboarding$/);
 const marker=process.env.SOLO_QA_MARKER;
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 const original=(await(await page.request.get('/api/method/appointment.scheduler.dashboard_config.navigation')).json()).message;
 await page.goto('/onboarding',{waitUntil:'networkidle'});
 await page.getByLabel('Business structure',{exact:true}).selectOption('individual');
 await page.getByLabel('Independent business name',{exact:true}).fill(marker);
 await page.getByRole('button',{name:'Continue as independent provider',exact:true}).click();
 await expect(page).toHaveURL(/\/settings\/independent-booking$/);
 await page.getByLabel('Location name',{exact:true}).fill(`${marker} Studio`);
 await page.getByLabel('Service name',{exact:true}).fill(`${marker} Consultation`);
 for(const day of ['Saturday','Sunday'])await page.getByRole('checkbox',{name:day,exact:true}).check();
 await page.getByRole('button',{name:'Save independent offering',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('offering is saved');
 await page.getByRole('button',{name:'Publish booking',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('Booking is published');
 const bookingPath=await page.getByRole('link',{name:'Open guest booking',exact:true}).getAttribute('href');
 const guest=await page.context().browser().newContext({baseURL:process.env.PLAYWRIGHT_BASE_URL});
 try {
  const visitor=await guest.newPage();await visitor.goto(bookingPath,{waitUntil:'networkidle'});
  const day=new Date(Date.now()+86400000*2).toISOString().slice(0,10);
  await visitor.getByLabel('Appointment date',{exact:true}).fill(day);
  await visitor.getByRole('button',{name:'Open date calendar',exact:true}).click();
  await expect(visitor.locator('.rdp')).toBeVisible();
  await visitor.locator('.rdp button[aria-selected="true"]').click();
  await expect(visitor.getByLabel('Appointment date',{exact:true})).toHaveValue(day);
  await visitor.getByRole('button',{name:'Open date calendar',exact:true}).click();
  const alternate=visitor.locator('.rdp button:not([disabled]):not([aria-selected="true"])').filter({hasText:/^15$/}).first();
  await alternate.click();
  await expect(visitor.getByLabel('Appointment date',{exact:true})).not.toHaveValue(day);
  await visitor.getByLabel('Appointment date',{exact:true}).fill(day);
  await visitor.getByRole('radio').first().check();
  await visitor.getByLabel('Your name',{exact:true}).fill('Independent homepage guest');
  await visitor.getByLabel('Your email',{exact:true}).fill('homepage-solo@example.test');
  await visitor.getByRole('button',{name:'Confirm appointment',exact:true}).click();
  await expect(visitor.getByRole('status')).toContainText('Booking confirmed');
  await page.goto('/home',{waitUntil:'networkidle'});
  await expect(page.getByRole('button',{name:'Customize',exact:true})).toBeVisible();
  for(const mode of ['light','dark']) {
   for(let attempt=0;attempt<3;attempt++){const toggle=page.locator('[data-qa="topnav-theme"]');if((await toggle.getAttribute('aria-label')).startsWith(`Theme: ${mode}.`))break;await toggle.click();}
   for(const size of ['desktop','mobile']) {
    await page.setViewportSize(size==='desktop'?{width:1440,height:1000}:{width:390,height:844});
    await chooseSelect(page,'Navigation placement','Left sidebar');
    await stableScreenshot(page,{mask:[page.locator('[data-qa="analytics-freshness"]')],path:testInfo.outputPath(`independent-home-${mode}-${size}.png`),fullPage:true});
   }
  }
  await page.goto('/analytics',{waitUntil:'networkidle'});
  await expect(page.getByRole('button',{name:'Customize',exact:true})).toBeVisible();
  await page.getByText('Shared filters',{exact:false}).click();await page.getByLabel('End date',{exact:true}).fill(day);
  await expect(page.locator('[data-widget="total"]')).toContainText('1 bookings');
  await stableScreenshot(page,{mask:[page.locator('[data-qa="analytics-freshness"]')],path:testInfo.outputPath('independent-insights-booked.png'),fullPage:true});
  expect(errors).toEqual([]);
 } finally {
  await guest.close();
  await page.request.post('/api/method/appointment.scheduler.dashboard_config.save_navigation',{headers:{'X-Frappe-CSRF-Token':await page.evaluate(()=>window.frappe?.csrf_token||'')},data:original});
  await ownerContext.close();
 }
});
