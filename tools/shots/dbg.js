// usage: node dbg.js <hash+query> <pre js> <post js> [out.png]  (pre runs, then 3 s, then post runs and its result is printed)
const puppeteer = require('puppeteer-core');
(async () => {
  const [, , url, pre, post, out] = process.argv;
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox', '--window-size=390,844'] });
  const page = await browser.newPage(); await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const logs = []; page.on('console', m => { const t = m.text(); if (!/404/.test(t) && /error|warn|GLSL|shader/i.test(t)) logs.push(t.slice(0, 500)); });
  await page.goto('http://127.0.0.1:8124/index.html' + url, { waitUntil: 'load', timeout: 60000 }); await new Promise(r => setTimeout(r, 3500));
  if (pre) { try { await page.evaluate(pre); } catch (e) { console.log('pre err', String(e).slice(0, 300)); } }
  await new Promise(r => setTimeout(r, 3000));
  if (post) { try { console.log(JSON.stringify(await page.evaluate(post)).slice(0, 1500)); } catch (e) { console.log('post err', String(e).slice(0, 300)); } }
  if (out) await page.screenshot({ path: out });
  console.log('logs:', logs.join('\n') || '(none)'); await browser.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
