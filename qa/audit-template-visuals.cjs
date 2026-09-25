const fs = require("fs");
const path = require("path");
const { chromium } = require("/home/minte/projects/develop-bench/apps/agent_harness/node_modules/playwright");

const baseURL = process.env.PUBLIC_EXPERIENCE_BASE_URL || "http://127.0.0.84:44430";
const targets = [
  ["selam", "selam-studio"],
  ["abugida", "abugida-studio"],
];

async function auditPage(page, key, slug, viewport) {
  await page.goto(`${baseURL}/${slug}`, { waitUntil: "networkidle" });
  await page.locator("[data-pe-root]").waitFor({ state: "visible" });
  const contrast = await page.evaluate(() => {
    const parse = (value) => {
      const channels = value.match(/[\d.]+/g)?.map(Number) || [];
      return channels.length >= 3 ? channels.slice(0, 3) : null;
    };
    const luminance = (channels) => {
      const linear = channels.map((channel) => {
        const value = channel / 255;
        return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
    };
    const ratio = (foreground, background) => {
      const light = Math.max(luminance(foreground), luminance(background));
      const dark = Math.min(luminance(foreground), luminance(background));
      return (light + 0.05) / (dark + 0.05);
    };
    const backgroundFor = (element) => {
      let candidate = element;
      while (candidate) {
        const value = getComputedStyle(candidate).backgroundColor;
        if (value && value !== "rgba(0, 0, 0, 0)") return value;
        candidate = candidate.parentElement;
      }
      return "rgb(255, 255, 255)";
    };
    const elements = [...document.querySelectorAll("body *")].filter((element) => {
      if (!(element instanceof HTMLElement) || !element.offsetParent) return false;
      return [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
    });
    return elements.flatMap((element) => {
      const style = getComputedStyle(element);
      const foreground = parse(style.color);
      const backgroundValue = backgroundFor(element);
      const background = parse(backgroundValue);
      if (!foreground || !background) return [];
      const measured = ratio(foreground, background);
      const fontSize = Number.parseFloat(style.fontSize);
      const fontWeight = Number.parseInt(style.fontWeight, 10) || 400;
      const large = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
      const threshold = large ? 3 : 4.5;
      if (measured >= threshold) return [];
      return [{
        selector: `${element.tagName.toLowerCase()}.${[...element.classList].join(".")}`,
        text: element.textContent.trim().replace(/\s+/g, " ").slice(0, 90),
        foreground: style.color,
        background: backgroundValue,
        ratio: Number(measured.toFixed(2)),
        threshold,
        fontSize,
      }];
    });
  });
  const icons = await page.locator([
    ".selam-mark",
    ".selam-photo > span",
    ".selam-first article > b",
    ".selam-belong article > b",
    ".abugida-nav > a:first-child b",
    ".abugida-method article > b",
    ".abugida-questions summary span",
  ].join(",")).evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      selector: `${element.tagName.toLowerCase()}.${[...element.classList].join(".")}`,
      text: element.textContent.trim(),
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      lineHeight: style.lineHeight,
      display: style.display,
    };
  }));
  return { key, viewport, contrast, icons };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  for (const viewport of [{ name: "desktop", width: 1440, height: 900 }, { name: "mobile", width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport });
    for (const [key, slug] of targets) {
      const page = await context.newPage();
      results.push(await auditPage(page, key, slug, viewport.name));
      await page.close();
    }
    await context.close();
  }
  const reportPath = process.env.PUBLIC_EXPERIENCE_AUDIT_PATH || path.resolve(__dirname, "evidence/public-experience-polish-v2/visual-audit.json");
  fs.writeFileSync(reportPath, JSON.stringify({ baseURL, results }, null, 2));
  await browser.close();
  console.log(JSON.stringify(results, null, 2));
})().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
