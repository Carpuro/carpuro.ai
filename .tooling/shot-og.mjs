// Dev-only: render the OG card HTML to public/og.png at 1200x630.
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(resolve('.tooling/og-card.html')).href, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.screenshot({ path: 'public/og.png' });
await browser.close();
console.log('saved public/og.png');
