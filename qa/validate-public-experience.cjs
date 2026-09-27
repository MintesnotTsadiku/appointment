const fs = require('fs');
const path = require('path');
const { chromium } = require('/home/minte/projects/develop-bench/apps/agent_harness/node_modules/playwright');

const baseURL = process.env.PUBLIC_EXPERIENCE_BASE_URL || 'http://127.0.0.84:44430';
const credentialsPath = process.env.PUBLIC_EXPERIENCE_CREDENTIALS;
const outputDir = path.resolve(__dirname, 'evidence/public-experience-final');

if (!credentialsPath) throw new Error('PUBLIC_EXPERIENCE_CREDENTIALS is required');
fs.mkdirSync(outputDir, { recursive: true });

async function settle(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.locator('main').first().waitFor({ state: 'visible', timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(900);
}

async function assertPublicSite(page, slug, expectedText) {
  const response = await page.goto(`${baseURL}/${slug}`, { waitUntil: 'domcontentloaded' });
  if (!response || !response.ok()) throw new Error(`${slug} returned ${response && response.status()}`);
  await settle(page);
  const body = await page.locator('body').innerText();
  if (!body.toLocaleLowerCase().includes(expectedText.toLocaleLowerCase())) {
    throw new Error(slug + ' did not render ' + expectedText);
  }
}

(async () => {
  const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
  const persona = (credentials.personas || []).find((row) => row.key === 'tena.owner') || credentials.personas?.[0];
  const password = credentials.password || credentials.administrator_password || persona?.password;
  const username = credentials.username || persona?.email || 'Administrator';
  if (!password) throw new Error('Administrator password missing from credentials file');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    recordVideo: { dir: outputDir, size: { width: 1280, height: 720 } },
  });
  const page = await context.newPage();
  const video = page.video();

  await assertPublicSite(page, 'tena-studio', 'Tena Family Clinic');
  await page.screenshot({ path: path.join(outputDir, 'tena-clinic-desktop.png'), fullPage: true });
  await page.mouse.wheel(0, 650);
  await page.waitForTimeout(1200);

  await assertPublicSite(page, 'meron-studio', 'Meron Tailoring Atelier');
  await page.screenshot({ path: path.join(outputDir, 'meron-tailoring-desktop.png'), fullPage: true });
  await page.mouse.wheel(0, 850);
  await page.waitForTimeout(1200);

  await assertPublicSite(page, 'abugida-studio', 'Abugida Language Studio');
  await page.screenshot({ path: path.join(outputDir, 'abugida-language-desktop.png'), fullPage: true });
  await page.waitForTimeout(1000);

  const login = await page.evaluate(async ({ password, username }) => {
    const body = new URLSearchParams({ usr: username, pwd: password });
    const response = await fetch('/api/method/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      credentials: 'include',
    });
    return response.status;
  }, { password, username });
  if (login !== 200) throw new Error(`Editor login failed with ${login}`);

  await page.goto(`${baseURL}/settings/public-experience`, { waitUntil: 'domcontentloaded' });
  await settle(page);
  const editorText = await page.locator('body').innerText();
  if (!editorText.toUpperCase().includes('PUBLIC EXPERIENCE')) throw new Error('Public Experience editor did not render');
  const brandSelect = page.locator('section').nth(0).locator('select').first();
  const siteSelect = page.locator('section').nth(1).locator('select').first();
  await page.waitForFunction(() => document.querySelectorAll('section select')[0]?.options.length > 1);
  const brandValue = await brandSelect.locator('option').filter({ hasText: 'Tena Family Clinic' }).getAttribute('value');
  const siteValue = await siteSelect.locator('option').filter({ hasText: 'Tena Family Clinic' }).getAttribute('value');
  if (!brandValue || !siteValue) throw new Error('Seeded Tena brand/site missing from editor');
  await brandSelect.selectOption(brandValue);
  await siteSelect.selectOption(siteValue);
  await page.locator('[data-page="public-experience-editor"]').waitFor({ state: 'visible' });
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(outputDir, 'guided-brand-editor-desktop.png'), fullPage: true });
  await page.waitForTimeout(1600);

  await page.close();
  await context.close();
  if (video) {
    const generated = await video.path();
    const destination = path.join(outputDir, 'public-experience-validation-tour.webm');
    if (fs.existsSync(destination)) fs.unlinkSync(destination);
    fs.renameSync(generated, destination);
  }

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const mobilePage = await mobile.newPage();
  await assertPublicSite(mobilePage, 'bloom-studio', 'Bole Bloom Hair Studio');
  await mobilePage.screenshot({ path: path.join(outputDir, 'bloom-salon-mobile.png'), fullPage: true });
  await mobile.close();
  await browser.close();

  console.log(JSON.stringify({ ok: true, outputDir }));
})().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
