import { test, expect } from 'playwright/test';
import { chooseSelect, stableScreenshot } from './owner-validation.mjs';
test('homepage-matrix',async({page},testInfo)=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 const marker=process.env.WEBSITE_QA_MARKER;
 await page.goto('/onboarding',{waitUntil:'networkidle'});
 await page.getByLabel('Business name',{exact:true}).fill(marker);
 await page.getByLabel('Location name',{exact:true}).fill(`${marker} Main`);
 await page.getByLabel('First service name',{exact:true}).fill(`${marker} Consultation`);
 await page.getByLabel('Saturday',{exact:true}).check();
 await page.getByLabel('Sunday',{exact:true}).check();
 await page.getByRole('button',{name:'Create business',exact:true}).click();
 await expect(page).toHaveURL(/\/home/);
 const session=await(await page.request.get('/api/method/appointment.scheduler.membership.context')).json();
 const business=session.message.selected.organization;
 const offerings=await(await page.request.get('/api/method/appointment.scheduler.workspace.overview')).json();
 const summary=offerings.message.find(row=>row.organization===business);
 const offering=(await(await page.request.get(`/api/resource/EventType/${encodeURIComponent(summary.offering)}`)).json()).data;
 const csrfHeaders={'X-Frappe-CSRF-Token':await page.evaluate(()=>window.frappe?.csrf_token||'')};
 const today=new Date(Date.now()+86400000).toLocaleDateString('en-CA',{timeZone:'Africa/Addis_Ababa'});
 for(const [index,time] of ['09:00','10:00','11:00'].entries()){
   const booking=await page.request.post('/api/method/appointment.scheduler.api.desk.create_desk_appointment',{headers:csrfHeaders,data:{client_name:`Acceptance Customer ${index+1}`,client_phone:'+251911000001',client_email:`homepage-${index}@example.test`,service_name:offering.service,provider_name:offering.provider,location_name:offering.location,appointment_date:today,start_time:time}});
   expect(booking.ok(),(await booking.text()).slice(0,2000)).toBeTruthy();
 }
 await page.reload({waitUntil:'networkidle'});
 await page.getByText('Shared filters',{exact:false}).click();
 await page.getByLabel('End date',{exact:true}).fill(today);
 await page.getByText('Shared filters',{exact:false}).click();
 // Read the selected workspace from the authenticated UI rather than inventing a business ID.
 await expect(page.getByRole('button',{name:'Customize',exact:true})).toBeVisible({timeout:20000});
 const navOriginal=await (await page.request.get('/api/method/appointment.scheduler.dashboard_config.navigation')).json();
 const select=page.locator('[data-qa="workspace-switcher"]');
 const organization=business;
 let configOriginal=null;
 if(organization)configOriginal=await(await page.request.get(`/api/method/appointment.scheduler.dashboard_config.load?organization=${encodeURIComponent(organization)}&dashboard=home`)).json();
 try{
  for(const mode of ['light','dark']){
   for(let attempt=0;attempt<3;attempt++){const toggle=page.locator('[data-qa="topnav-theme"]');if((await toggle.getAttribute('aria-label')).startsWith(`Theme: ${mode}.`))break;await toggle.click();}
   await expect(page.locator('html')).toHaveClass(new RegExp(mode));
   for(const size of ['desktop','mobile']){
    await page.setViewportSize(size==='desktop'?{width:1440,height:1000}:{width:390,height:844});
    for(const placement of ['top','sidebar']){
     await chooseSelect(page,'Navigation placement',placement==='sidebar'?'Left sidebar':'Top navigation');
     await expect(page.locator('html')).toHaveAttribute('data-workspace-navigation',placement);
     await stableScreenshot(page,{mask:[page.locator('[data-qa="analytics-freshness"]')],path:testInfo.outputPath(`homepage-${size}-${mode}-${placement}.png`),fullPage:true});
     if(placement==='sidebar'&&size==='desktop'){
      await page.getByRole('button',{name:'Collapse sidebar',exact:true}).click();
      await expect(page.getByRole('navigation',{name:'Sidebar navigation'}).getByRole('link',{name:'Overview'})).toBeVisible();
      await stableScreenshot(page,{mask:[page.locator('[data-qa="analytics-freshness"]')],path:testInfo.outputPath(`homepage-${size}-${mode}-collapsed.png`),fullPage:true});
      await page.getByRole('button',{name:'Expand sidebar',exact:true}).click();
     }
     if(size==='mobile'){
      await page.getByRole('button',{name:'Open navigation drawer'}).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).not.toBeVisible();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
     }
    }
   }
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.getByRole('button',{name:'Appearance',exact:true}).click();
  await page.getByRole('dialog').getByLabel('Color mode',{exact:true}).click();
  await page.getByRole('option',{name:'Light',exact:true}).click();
  await expect(page.locator('html')).toHaveClass(/light/);
  await stableScreenshot(page,{path:testInfo.outputPath('workspace-appearance.png'),fullPage:true});
  await page.keyboard.press('Escape');
  await page.getByText('Shared filters',{exact:false}).click();
  await page.getByRole('button',{name:'Choose Start date',exact:true}).click();
  await expect(page.locator('.rdp')).toBeVisible();
  await stableScreenshot(page,{path:testInfo.outputPath('workspace-date-picker.png'),fullPage:true});
  await page.keyboard.press('Escape');
  await page.getByText('Shared filters',{exact:false}).click();
  await page.getByRole('button',{name:'Browse widgets',exact:true}).click();
  await expect(page.getByRole('textbox',{name:'Search',exact:true})).toBeVisible();
  await page.getByRole('dialog').getByRole('checkbox',{name:'Bookings',exact:true}).check();
  await expect(page.getByRole('dialog').getByRole('button',{name:/No-show rate/})).not.toBeVisible();
  await page.getByRole('dialog').getByRole('checkbox',{name:'Bookings',exact:true}).uncheck();
  await stableScreenshot(page,{path:testInfo.outputPath('workspace-widget-library.png'),fullPage:true});
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Customize',exact:true}).click();
  for(const preset of ['clinic','freelancer','consultant','hairstylist','organization','reception','all']){
   await chooseSelect(page,'Industry preset',preset==='all'?'All permitted widgets':preset);
   await page.getByRole('button',{name:'Replace with preset'}).click();
   await stableScreenshot(page,{mask:[page.locator('[data-qa="analytics-freshness"]')],path:testInfo.outputPath(`homepage-preset-${preset}.png`),fullPage:true});
  }
  await chooseSelect(page,'Industry preset','general');await page.getByRole('button',{name:'Replace with preset'}).click();
  await chooseSelect(page,"Size of Today's agenda",'3');
  await chooseSelect(page,'Chart for Booking activity','line');
  await chooseSelect(page,'Local date basis for Booking activity','creation');
  await page.getByRole('button',{name:'Move Unique customers earlier'}).click();
  await page.getByRole('button',{name:'Remove All bookings',exact:true}).click();
  await page.getByRole('button',{name:'Remove No-show rate',exact:true}).click();
  await page.getByRole('button',{name:'Add widget',exact:true}).click();
  await page.getByRole('textbox',{name:'Search',exact:true}).fill('No-show');
  await page.getByRole('button',{name:/No-show rate/}).click();
  await page.setViewportSize({width:390,height:844});
  const moveTarget=await page.getByRole('button',{name:'Move Unique customers earlier'}).boundingBox();
  expect(moveTarget.width).toBeGreaterThanOrEqual(44);expect(moveTarget.height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await stableScreenshot(page,{mask:[page.locator('[data-qa="analytics-freshness"]')],path:testInfo.outputPath('homepage-mobile-customization.png'),fullPage:true});
  await page.setViewportSize({width:1440,height:1000});
  await page.getByRole('button',{name:'Save',exact:true}).click();
  await expect(page.getByText('Dashboard saved.',{exact:true})).toBeVisible();
  await page.reload({waitUntil:'networkidle'});await expect(page.locator('[data-widget="no_show_rate"]')).toBeVisible();
  await expect(page.locator('[data-widget="booking_trend"] circle').first()).toBeVisible();
  await page.locator('[data-widget="booking_trend"] circle').first().focus();
  await expect(page.locator('[data-widget="booking_trend"] [role="tooltip"]')).toBeVisible();
  await page.locator('[data-widget="booking_trend"]').getByText('View data',{exact:true}).click();
  await expect(page.locator('[data-widget="booking_trend"] table')).toBeVisible();
  await expect(page.locator('[data-widget="utilization"]')).toContainText(/Partial coverage|Partial data/);
  await expect(page.locator('[data-widget="no_show_rate"]')).toContainText('Unavailable');
  await page.getByText('Shared filters',{exact:false}).click();
  await page.getByLabel('Start date',{exact:true}).fill('2000-01-01');await page.getByLabel('End date',{exact:true}).fill('2000-01-07');
  await expect(page.locator('[data-widget="booking_trend"]')).toContainText('0 bookings');
  await stableScreenshot(page,{mask:[page.locator('[data-qa="analytics-freshness"]')],path:testInfo.outputPath('homepage-empty.png'),fullPage:true});
  await page.locator('[data-widget="booking_trend"]').getByRole('button',{name:'View matching bookings',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('0 matching bookings');
  await page.keyboard.press('Escape');
  const csv=await page.request.get(await page.locator('[data-qa="analytics-export"]').getAttribute('href'));
  expect(csv.ok()).toBeTruthy();expect(await csv.text()).toContain('2000-01-01 to 2000-01-07');
  await page.getByRole('button',{name:'Clear filters'}).click();
  await page.locator('[data-widget="agenda"]').getByRole('link',{name:'Open related records'}).click();
  await expect(page).toHaveURL(/\/reception/);
  await page.goto('/analytics',{waitUntil:'networkidle'});await expect(page.getByRole('button',{name:'Customize',exact:true})).toBeVisible();
  await stableScreenshot(page,{mask:[page.locator('[data-qa="analytics-freshness"]')],path:testInfo.outputPath('insights-dashboard.png'),fullPage:true});
  for(const route of ['/reception','/settings','/settings/website']){
   await page.goto(route,{waitUntil:'networkidle'});await expect(page.locator('body')).not.toContainText('Internal Server Error');
   if(route==='/reception') {
    await page.locator('[data-qa="reception-next-booking"]').click();
    await expect(page.locator('[data-qa="appointment-card"]').first()).toBeVisible();
    for(const stage of ['Arrival','Check in','Start service','End service']) {
     await page.locator('[data-qa="appointment-card"]').first().click();
     await page.getByRole('dialog').getByRole('button',{name:stage,exact:true}).click();
     await expect(page.getByRole('dialog')).not.toBeVisible();
    }
    await page.getByRole('button',{name:'All Locations',exact:true}).click();
    await page.getByRole('button',{name:`${marker} Main`,exact:true}).click();
    await page.getByLabel('Reception state',{exact:true}).selectOption('Open');
    await expect(page.getByLabel('Reception state',{exact:true})).toHaveValue('Open');
   }
   await stableScreenshot(page,{mask:[page.locator('[data-qa="analytics-freshness"]')],path:testInfo.outputPath(`regression-${route.split('/').pop()}.png`),fullPage:true});
  }
  await page.goto('/settings/team',{waitUntil:'networkidle'});
  const invitations=page.getByRole('region',{name:'Staff invitations'});
  await invitations.getByLabel('Name',{exact:true}).fill('Homepage receptionist');
  const staffEmail=`${marker.toLowerCase()}-staff@example.test`;
  await invitations.getByLabel('Email',{exact:true}).fill(staffEmail);
  await invitations.getByRole('button',{name:'Confirm local invitation',exact:true}).click();
  const link=invitations.getByRole('link',{name:'Open local invitation',exact:true});
  await expect(link).toBeVisible();
  const staffContext=await page.context().browser().newContext({baseURL:process.env.PLAYWRIGHT_BASE_URL});
  const staff=await staffContext.newPage();
  try {
   const password=`Homepage staff ${crypto.randomUUID()}!`;
   await staff.goto(new URL(await link.getAttribute('href'),page.url()).href,{waitUntil:'networkidle'});
   await staff.getByLabel('New account password',{exact:true}).fill(password);
   await staff.getByRole('button',{name:'Accept invitation',exact:true}).click();
   await expect(staff.getByRole('status')).toContainText('Your account is ready');
   await page.getByLabel('Account email',{exact:true}).fill(staffEmail);
   await page.getByRole('checkbox',{name:`${marker} Main`,exact:true}).check();
   await page.getByRole('button',{name:'Assign',exact:true}).click();
   await expect(page.getByRole('status')).toContainText('assigned as Receptionist');
   await staff.goto('/login',{waitUntil:'networkidle'});
   await staff.getByLabel('Email Address',{exact:true}).fill(staffEmail);await staff.getByLabel('Password',{exact:true}).fill(password);
   await staff.getByRole('button',{name:'Sign In',exact:true}).click();await expect(staff).toHaveURL(/\/reception/);
   await staff.goto('/home',{waitUntil:'networkidle'});await expect(staff.getByRole('button',{name:'Customize',exact:true})).toBeVisible();
   await staff.getByRole('button',{name:'Customize',exact:true}).click();await chooseSelect(staff,'Industry preset','reception');await staff.getByRole('button',{name:'Replace with preset'}).click();await staff.getByRole('button',{name:'Save',exact:true}).click();
   await expect(staff.locator('[data-widget="agreed_value"]')).toHaveCount(0);
   await expect(staff.getByRole('navigation',{name:'Sidebar navigation'}).getByRole('link',{name:'Settings',exact:true})).toHaveCount(0);
   const report=(await(await staff.request.get(`/api/method/appointment.scheduler.analytics.overview?organization=${encodeURIComponent(business)}`)).json()).message;
   expect(report.role).toBe('Receptionist');expect(report.metrics).not.toHaveProperty('agreed_value');
   await stableScreenshot(staff,{mask:[staff.locator('[data-qa="analytics-freshness"]')],path:testInfo.outputPath('receptionist-home-permissions.png'),fullPage:true});
  } finally {await staffContext.close();}
  await page.goto('/onboarding',{waitUntil:'networkidle'});
  await page.getByLabel('Business name',{exact:true}).fill(`${marker} Workbook`);
  await page.getByLabel('Location name',{exact:true}).fill(`${marker} Branch`);
  await page.getByLabel('First service name',{exact:true}).fill(`${marker} Second service`);
  const creationResponse=page.waitForResponse(response=>response.url().includes('appointment.scheduler.workspace.create')&&response.request().method()==='POST');
  await page.getByRole('button',{name:'Create business',exact:true}).click();
  expect((await creationResponse).ok()).toBeTruthy();
  await page.goto('/workspaces',{waitUntil:'networkidle'});
  await page.locator('[data-qa="workspace-card"]').filter({has:page.getByRole('heading',{name:`${marker} Workbook`,exact:true})}).getByRole('button',{name:'Open'}).click();
  await expect(page).toHaveURL(/\/home/);
  await expect(page.locator('[data-widget="total"]')).toContainText('0 bookings');
  await page.locator('[data-qa="workspace-switcher"]').click();
  await page.locator(`[role="option"][data-value="${business}"]`).click();
  await expect(page.locator('[data-qa="business-overview-heading"]')).toContainText(marker);
  await expect(page.locator('[data-widget="no_show_rate"]')).toBeVisible();
  await stableScreenshot(page,{mask:[page.locator('[data-qa="analytics-freshness"]')],path:testInfo.outputPath('workspace-switch-restored.png'),fullPage:true});
  expect(errors).toEqual([]);
 }finally{
  testInfo.setTimeout(testInfo.timeout+30000);
  await page.request.post('/api/method/appointment.scheduler.dashboard_config.save_navigation',{headers:csrfHeaders,data:navOriginal.message});
  if(organization&&configOriginal?.message)await page.request.post('/api/method/appointment.scheduler.dashboard_config.save',{headers:csrfHeaders,data:{organization,dashboard:'home',config:JSON.stringify(configOriginal.message)}});
 }
});
