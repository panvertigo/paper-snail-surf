// usage: node suite.js <hash+query> <prefix> <ramp indices comma> [speed] [extra js evaluated after each teleport]
const puppeteer = require('puppeteer-core');
(async () => {
  const [, , url, prefix, idxs, speed, extra] = process.argv;
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new',
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox', '--window-size=390,844'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const logs = []; page.on('console', m => { const t = m.text(); if (/error|warn|fail|GLSL|shader/i.test(t) && !/404/.test(t)) logs.push(m.type() + ': ' + t.slice(0, 300)); }); page.on('pageerror', e => logs.push('PAGEERROR: ' + String(e).slice(0, 300)));
  await page.goto('http://127.0.0.1:8124/index.html' + url, { waitUntil: 'load', timeout: 60000 });
  await new Promise(r => setTimeout(r, 4000));
  for (const i of idxs.split(',')) {
    const js = `(() => { spawnOn(${+i}); prevPos.copy(pos); lastTouched = ${+i}; setTheme(${+i}, true); const sp = ${+speed || 0}; if (sp) { const d = Math.hypot(vel.x, vel.z) || 1; vel.x *= sp / d; vel.z *= sp / d; } ${extra || ''} return [Math.round(pos.x), Math.round(pos.y), Math.round(pos.z), dayP.toFixed(2)]; })()`;
    try { console.log('ramp', i, JSON.stringify(await page.evaluate(js))); } catch (e) { console.log('eval error', String(e).slice(0, 300)); }
    await new Promise(r => setTimeout(r, 3500));
    await page.screenshot({ path: `${prefix}${i}.png` });
  }
  console.log('logs:', logs.slice(0, 10).join('\n') || '(none)');
  await browser.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
