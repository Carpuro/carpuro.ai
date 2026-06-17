// Dev-only screenshot helper (not deployed). Usage:
//   node .tooling/shot.mjs <path> <outfile> [width]
// Example: node .tooling/shot.mjs / before-home.png 1440
import { chromium } from 'playwright';

const route = process.argv[2] || '/';
const out = process.argv[3] || 'shot.png';
const width = parseInt(process.argv[4] || '1440', 10);
const port = process.env.SHOT_PORT || '4321';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 2 });
await page.goto(`http://localhost:${port}${route}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
await page.screenshot({ path: `.tooling/${out}`, fullPage: true });
await browser.close();
console.log(`saved .tooling/${out}`);
