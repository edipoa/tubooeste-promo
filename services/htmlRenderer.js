'use strict';

let browser = null;

async function getBrowser() {
  if (browser && browser.isConnected()) return browser;
  const puppeteer = require('puppeteer');
  browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--font-render-hinting=none',
    ],
  });
  browser.on('disconnected', () => { browser = null; });
  return browser;
}

async function renderHtmlToPng(html) {
  const b = await getBrowser();
  const page = await b.newPage();
  try {
    await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    // extra wait for web fonts / images
    await page.evaluate(() => new Promise(r => setTimeout(r, 600)));
    const buf = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1080, height: 1920 } });
    return buf;
  } finally {
    await page.close();
  }
}

module.exports = { renderHtmlToPng };
