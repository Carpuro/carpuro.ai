// Screenshot an external URL. Usage: node .tooling/shot-url.mjs <url> <outfile> [width]
import { chromium } from 'playwright';

const url = process.argv[2];
const out = process.argv[3] || 'url-shot.png';
const width = parseInt(process.argv[4] || '1440', 10);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1.5 });
try {
  await page.goto(url, { waitUntil: 'load', timeout: 45000 });
} catch (e) {
  console.log('goto warning:', e.message);
}
const wait = parseInt(process.argv[5] || '4000', 10);
const scrollPx = parseInt(process.argv[6] || '0', 10);
await page.waitForTimeout(wait); // let animations / lazy content settle
if (scrollPx) { await page.evaluate((y) => window.scrollTo(0, y), scrollPx); await page.waitForTimeout(2500); }
await page.screenshot({ path: `.tooling/${out}` }); // viewport only
await browser.close();
console.log(`saved .tooling/${out}`);
