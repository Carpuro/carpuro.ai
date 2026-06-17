// Dev-only: screenshot the home page with the chat widget opened.
import { chromium } from 'playwright';
const port = process.env.SHOT_PORT || '4321';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' });
await page.click('#chat-btn');
await page.waitForTimeout(800);
await page.screenshot({ path: '.tooling/chat-open.png' });
await browser.close();
console.log('saved .tooling/chat-open.png');
