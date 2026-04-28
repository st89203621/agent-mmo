// 单页面快速截图工具：登录后跳到指定页 PageId 截图
import puppeteer from 'puppeteer-core';
import { resolve } from 'path';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.BASE_URL || 'http://192.168.72.253:3000';
const USER = process.env.DEMO_USER || 'a';
const PASS = process.env.DEMO_PASS || 'a';
const OUT_DIR = resolve('screenshots');

const VP_PHONE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: false };
const UA_MOBILE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

const targets = process.argv.slice(2);
if (!targets.length) { console.error('usage: node screenshot-page.mjs <pageLabel> [<pageLabel> ...]'); process.exit(1); }

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--disable-gpu', '--hide-scrollbars', '--no-sandbox'],
});

async function clickByText(page, text, sel = 'button, a, [role="tab"], [role="button"]') {
  return await page.evaluate((label, s) => {
    const norm = x => (x || '').replace(/\s+/g, '');
    const target = norm(label);
    const found = Array.from(document.querySelectorAll(s)).find(el => norm(el.textContent || '').includes(target));
    if (found) { found.click(); return true; }
    return false;
  }, text, sel);
}

try {
  const page = await browser.newPage();
  await page.setViewport(VP_PHONE);
  await page.setUserAgent(UA_MOBILE);

  await page.goto(BASE + '/', { waitUntil: 'load', timeout: 45000 });
  await new Promise(r => setTimeout(r, 2500));
  const inputs = await page.$$('input');
  if (inputs.length >= 2) {
    await inputs[0].type(USER);
    await inputs[1].type(PASS);
    await clickByText(page, '进入江湖');
    await new Promise(r => setTimeout(r, 3500));
  }
  // 进入角色（如果在 char-select）
  const inSelect = await page.evaluate(() => /角色选择|CHOOSE YOUR PATH/.test(document.body.innerText || ''));
  if (inSelect) {
    await clickByText(page, '进 入') || await clickByText(page, '进入');
    await new Promise(r => setTimeout(r, 2500));
  }

  for (const t of targets) {
    console.log(`>> click: ${t}`);
    const ok = await clickByText(page, t);
    if (!ok) { console.log(`  ! ${t} not found`); continue; }
    await new Promise(r => setTimeout(r, 1800));
    const fname = `R1-${t}.png`;
    await page.screenshot({ path: `${OUT_DIR}/${fname}`, fullPage: true });
    console.log(`  -> ${fname}`);
  }
} finally {
  await browser.close();
}
