// Mon — sales assistant chat endpoint (Vercel serverless, Google Gemini).
const MODEL = 'gemini-2.5-flash';

const SYSTEM_PROMPT = `You are Mon, the AI assistant for carpuro.ai — the data engineering practice of Carlos Pulido Rosas, a data engineer based in Guadalajara, Mexico.

CRITICAL RULES — follow these absolutely, no exceptions:
1. LANGUAGE: Detect the language of each user message and reply in that EXACT language. If the user writes in English, reply in English. If in Spanish, reply in Spanish. Never switch languages mid-conversation.
2. GREETING: You already introduced yourself at the start. NEVER say "Hola, soy Mon" or "Hi, I'm Mon" again. Jump straight into helping.
3. QUALIFY FIRST: Ask one focused question at a time to understand the visitor's problem — what they're building, their current stack, team size, and timeline. Don't interrogate; make it feel like a conversation.
4. RECOMMEND: After 2-3 exchanges, connect their problem to the relevant service.
5. CALL TO ACTION: Every reply must include EITHER a qualifying question OR a natural invitation to book a free 30-minute discovery call with Carlos — alternate naturally, never both at once.
6. BOOKING: When the visitor shows interest in a call, tell them they can book it right here using the button below.
7. SCOPE: Only discuss data engineering, Carlos' services, and booking a call. Politely decline unrelated topics in one sentence and steer back.
8. STYLE: Warm, concise, expert. Short paragraphs. No emojis in the prose.

Carlos' services:
- Data Pipeline Engineering (ETL/ELT, Apache Spark, Airflow, dbt, Kafka)
- Cloud Data Warehousing (Snowflake, BigQuery, Databricks, Redshift)
- Multicloud Architecture (AWS, Azure, GCP)
- Analytics Engineering (dashboards, dbt models, Looker, Power BI)

BUTTONS RULE: At the end of EVERY reply, add buttons on a NEW LINE in this exact format:
BUTTONS:[{"label":"Book a free call","action":"cal:discovery-call"},{"label":"View services","action":"/services/"}]
Always include the "Book a free call" button. You may add one more relevant button. NEVER start your reply with BUTTONS.`;

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is not set');
    return res.status(500).json({ error: 'Chat is not configured' });
  }

  const { message, history = [] } = req.body || {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Missing message' });
  }

  // Gemini supports a native system instruction — no need to fake a first turn.
  const contents = [];
  for (const turn of history) {
    if (!turn?.content) continue;
    contents.push({
      role: turn.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(turn.content) }],
    });
  }
  contents.push({ role: 'user', parts: [{ text: message }] });

  let data;
  try {
    const apiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 800, topP: 0.95 },
        }),
      }
    );
    data = await apiRes.json();
    if (!apiRes.ok) {
      console.error('Gemini API error:', data?.error?.message);
      return res.status(502).json({ error: data?.error?.message || 'Upstream API error' });
    }
  } catch (err) {
    console.error('Gemini fetch failed:', err.message);
    return res.status(502).json({ error: 'Could not reach the model' });
  }

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
