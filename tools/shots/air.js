const puppeteer = require('puppeteer-core');
(async () => {
  const [, , url, out, pre] = process.argv;
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox', '--window-size=390,844'] });
  const page = await browser.newPage(); await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto('http://127.0.0.1:8124/index.html' + url, { waitUntil: 'load', timeout: 60000 }); await new Promise(r => setTimeout(r, 4000));
  await page.evaluate(pre); await new Promise(r => setTimeout(r, 1500)); await page.screenshot({ path: out }); await browser.close();
})();
