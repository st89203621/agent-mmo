import puppeteer from 'puppeteer-core';
import { resolve } from 'path';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.BASE_URL || 'http://192.168.72.253:3000';
const USER = process.env.DEMO_USER || 'a';
const PASS = process.env.DEMO_PASS || 'a';
const OUT_DIR = resolve('screenshots');

const VP_PHONE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: false };
const UA_MOBILE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

async function waitReact(page, ms = 1000) {
  await page.waitForFunction(
    () => {
      const root = document.getElementById('root');
      return root && root.children.length > 0 && root.innerText.trim().length > 5;
    },
    { timeout: 8000 }
  ).catch(() => {});
  await new Promise(r => setTimeout(r, ms));
}

async function shoot(page, file, full = true) {
  await page.screenshot({ path: `${OUT_DIR}/${file}`, fullPage: full });
  console.log(`  -> ${file}${full ? ' (full)' : ''}`);
}

async function clickByText(page, text, selector = 'button, a, [role="tab"], [role="button"]') {
  return await page.evaluate((label, sel) => {
    const norm = s => (s || '').replace(/\s+/g, '');
    const target = norm(label);
    const all = Array.from(document.querySelectorAll(sel));
    const found = all.find(el => norm(el.textContent || '').includes(target));
    if (found) { found.click(); return true; }
    return false;
  }, text, selector);
}

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--disable-gpu', '--hide-scrollbars', '--no-sandbox'],
});

try {
  const page = await browser.newPage();
  await page.setViewport(VP_PHONE);
  await page.setUserAgent(UA_MOBILE);

  console.log(`>> ${BASE}`);
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await waitReact(page);

  // 登录
  console.log(`>> login as ${USER}`);
  const inputs = await page.$$('input');
  if (inputs.length >= 2) {
    await inputs[0].type(USER);
    await inputs[1].type(PASS);
    await new Promise(r => setTimeout(r, 200));
    await clickByText(page, '进入江湖');
    await new Promise(r => setTimeout(r, 3500));
    await waitReact(page, 1500);
  }
  await shoot(page, 'A1-after-login.png');

  // 如果还在 char-select，点"创建"或者已有角色卡片
  const stillCharSelect = await page.evaluate(() => {
    return (document.body.innerText || '').includes('角色选择') || (document.body.innerText || '').includes('CHOOSE YOUR PATH');
  });
  if (stillCharSelect) {
    console.log('  in char-select, try to enter existing character');
    // 已有角色应该有"进入"按钮；新角色走"创建今世之身"
    const entered = await clickByText(page, '进 入') || await clickByText(page, '进入') || await clickByText(page, '继续');
    if (!entered) {
      console.log('  no existing character, falling back to create...');
      await clickByText(page, '创建今世之身');
    }
    await new Promise(r => setTimeout(r, 2500));
    await waitReact(page, 1500);
    await shoot(page, 'A2-after-char.png');
  }

  // 底部 5 Tab
  const tabs = ['首页', '主城', '家园', '背包', '我的'];
  for (const tab of tabs) {
    console.log(`>> tab: ${tab}`);
    const ok = await clickByText(page, tab);
    if (ok) {
      await new Promise(r => setTimeout(r, 1500));
      await shoot(page, `B-tab-${tab}.png`);
    } else {
      console.log(`  ! ${tab} not clickable`);
    }
  }

  // 子页面（在不同 Tab 下尝试点击常见入口）
  console.log('>> attempting subpages...');
  // 回到主城
  await clickByText(page, '主城');
  await new Promise(r => setTimeout(r, 1500));

  const subpages = ['拍卖', '集市', '神匠', '家产', '砸蛋', '商城', '邮件'];
  for (const sub of subpages) {
    const ok = await clickByText(page, sub);
    if (ok) {
      await new Promise(r => setTimeout(r, 1500));
      await shoot(page, `C-sub-${sub}.png`);
      // 返回主城
      await clickByText(page, '主城');
      await new Promise(r => setTimeout(r, 800));
    }
  }

  // 我的 Tab 下的子页面
  await clickByText(page, '我的');
  await new Promise(r => setTimeout(r, 1500));
  const meSubs = ['缘分', '成就', '任务', '宠物', '记忆', '轮回'];
  for (const sub of meSubs) {
    const ok = await clickByText(page, sub);
    if (ok) {
      await new Promise(r => setTimeout(r, 1500));
      await shoot(page, `D-me-${sub}.png`);
      await clickByText(page, '我的');
      await new Promise(r => setTimeout(r, 800));
    }
  }

  console.log('>> done');
} catch (e) {
  console.error('FATAL:', e.message);
} finally {
  await browser.close();
}
