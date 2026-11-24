// usage: node shot.js <url-hash-and-query> <out.png> [js to run before the shot] [wait ms]
const puppeteer = require('puppeteer-core');
(async () => {
  const [, , url, out, pre, waitMs] = process.argv;
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new',
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--window-size=390,844'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1.5, isMobile: true, hasTouch: true });
  const logs = []; page.on('console', m => { const t = m.text(); if (/error|warn|fail|GLSL|shader|three/i.test(t)) logs.push(m.type() + ': ' + t.slice(0, 400)); }); page.on('pageerror', e => logs.push('PAGEERROR: ' + String(e).slice(0, 400)));
  await page.goto('http://127.0.0.1:8124/index.html' + url, { waitUntil: 'load', timeout: 60000 });
  await new Promise(r => setTimeout(r, 4000));
  if (pre) { try { const r = await page.evaluate(pre); if (r !== undefined) console.log('pre ->', JSON.stringify(r).slice(0, 600)); } catch (e) { console.log('pre error', String(e).slice(0, 300)); } }
  await new Promise(r => setTimeout(r, +waitMs || 2500));
  await page.screenshot({ path: out });
  console.log('logs:', logs.slice(0, 12).join('\n') || '(none)');
  await browser.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
