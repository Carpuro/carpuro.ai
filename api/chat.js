// Mon — sales assistant chat endpoint (Vercel serverless, Google Gemini).
// flash-lite has the highest free-tier limits; we add retry/backoff + a graceful
// fallback so a rate-limit (429) never reaches the user as a hard error.
const MODEL = 'gemini-2.5-flash-lite';

const SYSTEM_PROMPT = `You are Mon, the AI assistant for carpuro.ai — the data engineering practice of Carlos Pulido Rosas, a data engineer based in Guadalajara, Mexico.

CRITICAL RULES — follow these absolutely, no exceptions:
1. LANGUAGE: Detect the language of each user message and reply in that EXACT language. If the user writes in English, reply in English. If in Spanish, reply in Spanish. Never switch languages mid-conversation.
2. GREETING: You already introduced yourself at the start. NEVER say "Hola, soy Mon" or "Hi, I'm Mon" again. Jump straight into helping.
3. QUALIFY FIRST: Ask one focused question at a time to understand the visitor's problem — what they're building, their current stack, team size, and timeline. Don't interrogate; make it feel like a conversation.
4. RECOMMEND: After 2-3 exchanges, connect their problem to the relevant service.
5. CALL TO ACTION: Every reply must include EITHER a qualifying question OR a natural invitation to take the next step — alternate naturally, never both at once.
6. CAPTURE CONTACT: After 2-3 exchanges, once you understand their problem, naturally ask for their name and email so Carlos can follow up personally — frame it as value ("so Carlos can send you a tailored recommendation"), never as a gate. If they share an email, thank them warmly and confirm Carlos will be in touch.
7. BOOKING: Booking a free 30-minute discovery call is the strongest next step. When the visitor shows real interest, invite them to book it right here using the button below. Offer booking and email follow-up as two easy paths, never a wall.
8. SCOPE: Only discuss data engineering, Carlos' services, and booking a call. Politely decline unrelated topics in one sentence and steer back.
9. STYLE: Warm, concise, expert. Short paragraphs. No emojis in the prose.

Carlos' services:
- Data Pipeline Engineering (ETL/ELT, Apache Spark, Airflow, dbt, Kafka)
- Cloud Data Warehousing (Snowflake, BigQuery, Databricks, Redshift)
- Multicloud Architecture (AWS, Azure, GCP)
- Analytics Engineering (dashboards, dbt models, Looker, Power BI)

BUTTONS RULE: At the end of EVERY reply, add buttons on a NEW LINE in this exact format:
BUTTONS:[{"label":"Book a free call","action":"cal:discovery-call"},{"label":"View services","action":"/services/"}]
Always include the "Book a free call" button. You may add one more relevant button. NEVER start your reply with BUTTONS.`;

// Defense-in-depth: this endpoint is only meant to be called by our own chat
// widget. Cloudflare's WAF blocks foreign Origins at the edge, but Origin is
// spoofable, so we re-check it here. Allow carpuro.ai (+ subdomains), local dev,
// and Vercel preview deploys; reject everything else (curl/scripts/scrapers).
const ALLOWED_HOST_RE = /(^|\.)carpuro\.ai$/i;
function isAllowedOrigin(req) {
  const source = req.headers.origin || req.headers.referer || '';
  if (!source) return false; // a real browser fetch always sends one of these
  let host;
  try { host = new URL(source).hostname; } catch { return false; }
  if (ALLOWED_HOST_RE.test(host)) return true;
  if (host === 'localhost' || host === '127.0.0.1') return true;
  if (host.endsWith('.vercel.app')) return true;
  return false;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!isAllowedOrigin(req)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (!process.env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is not set');
    return res.status(500).json({ error: 'Chat is not configured' });
  }

  const { message, history = [] } = req.body || {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Missing message' });
  }

  // Bound input to keep token use, cost, and abuse surface in check.
  const userMessage = message.slice(0, 1000);
  const recentHistory = Array.isArray(history) ? history.slice(-12) : [];

  // Gemini supports a native system instruction — no need to fake a first turn.
  const contents = [];
  for (const turn of recentHistory) {
    if (!turn?.content) continue;
    contents.push({
      role: turn.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(turn.content).slice(0, 2000) }],
    });
  }
  contents.push({ role: 'user', parts: [{ text: userMessage }] });

  // Graceful fallback: when the model is unreachable or rate-limited, never hand
  // the user a hard error — steer them to booking / contact instead. Returning
  // 200 also keeps Cloudflare from rendering its own "error code: 502" page.
  const FALLBACK_REPLY =
    "I'm getting a lot of questions right now and couldn't reach the model for a moment. " +
    "You can book a free 30-minute call with Carlos using the button below, or reach him on the contact page — he'll get straight back to you.";
  const fallbackButtons = [
    { label: 'Book a free call', action: 'cal:discovery-call' },
    { label: 'Contact Carlos', action: '/contact/' },
  ];
  const gracefulFallback = () =>
    res.status(200).json({ reply: FALLBACK_REPLY, buttons: fallbackButtons, fallback: true });

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const requestBody = JSON.stringify({
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents,
    generationConfig: { temperature: 0.7, maxOutputTokens: 800, topP: 0.95 },
  });

  // Retry transient rate-limit (429) / overload (503) errors with backoff.
  let data = null;
  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const apiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': process.env.GEMINI_API_KEY,
          },
          body: requestBody,
        }
      );
      if (apiRes.ok) { data = await apiRes.json(); break; }

      if ((apiRes.status === 429 || apiRes.status === 503) && attempt < MAX_ATTEMPTS) {
        await sleep(400 * attempt + Math.floor(Math.random() * 300));
        continue;
      }
      const errBody = await apiRes.json().catch(() => ({}));
      console.error('Gemini API error:', apiRes.status, errBody?.error?.message);
      return gracefulFallback();
    } catch (err) {
      console.error('Gemini fetch failed:', err.message);
      if (attempt < MAX_ATTEMPTS) { await sleep(400 * attempt); continue; }
      return gracefulFallback();
    }
  }
  if (!data) return gracefulFallback();

  const raw = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';

  // Split the model's reply from the trailing BUTTONS: directive.
  let reply = raw;
  let buttons = [];
  const btnIdx = raw.indexOf('BUTTONS:');
  if (btnIdx !== -1) {
    reply = raw.slice(0, btnIdx).trim();
    const btnStr = raw.slice(btnIdx + 'BUTTONS:'.length).trim();
    try {
      buttons = JSON.parse(btnStr);
    } catch {
      const match = btnStr.match(/\[.*\]/s);
      if (match) { try { buttons = JSON.parse(match[0]); } catch { /* ignore */ } }
    }
  }
  if (!Array.isArray(buttons)) buttons = [];

  // Always guarantee the booking button even if the model forgot it.
  if (!buttons.some((b) => b?.action === 'cal:discovery-call')) {
    buttons.unshift({ label: 'Book a free call', action: 'cal:discovery-call' });
  }

  return res.status(200).json({ reply: reply || raw, buttons });
}
