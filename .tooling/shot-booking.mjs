// Dev-only: verify the in-chat Cal.com booking modal against production.
import { chromium } from 'playwright';
const base = process.env.SITE || 'https://www.carpuro.ai';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
await page.goto(base + '/', { waitUntil: 'networkidle' });
await page.click('#chat-btn');
await page.waitForTimeout(600);
// Trigger a bot reply (quick button) so the "Book a free call" button appears.
await page.click('.chat-quick[data-msg*="projects"]');
await page.waitForSelector('.chat-bot-btns .chat-quick', { timeout: 30000 });
await page.waitForTimeout(800);
// Click the booking button (first bot button is "Book a free call").
const bookBtn = page.locator('.chat-bot-btns .chat-quick', { hasText: /book/i }).first();
await bookBtn.click();
// Wait for the Cal.com modal iframe to load.
await page.waitForSelector('iframe[src*="cal.com"], cal-modal-box, [data-cal-namespace]', { timeout: 30000 }).catch(() => {});
await page.waitForTimeout(4000);
await page.screenshot({ path: '.tooling/booking-modal.png' });
await browser.close();
console.log('saved .tooling/booking-modal.png');
