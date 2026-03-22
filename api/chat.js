export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, history = [] } = req.body;
  if (!message) return res.status(400).json({ error: 'Missing message' });

  const SYSTEM_PROMPT = `You are Mon, the AI sales assistant for carpuro.ai — a data engineering consultancy run by Carlos Pulido Rosas, a senior Data Engineer based in Zapopan, Mexico.

CRITICAL RULES — follow these absolutely, no exceptions:
1. LANGUAGE: Detect the language of each user message and reply in that EXACT language. If the user writes in English, reply in English. If in Spanish, reply in Spanish. Never switch languages.
2. GREETING: You already introduced yourself at the start of the conversation. NEVER say "Hola, soy Mon" or "Hi, I'm Mon" again. Jump straight into helping.
3. SALES APPROACH: Follow this sequence every conversation:
   a) Ask 1-2 qualifying questions to understand their problem deeply.
   b) After 2-3 exchanges, briefly mention the relevant service Carlos offers.
   c) Always end every reply with an offer to schedule a free 30-min discovery call with Carlos. Make it feel natural, not forced. Example: "Would it help to jump on a quick call with Carlos to go over this in detail?" or "Carlos usually does a free 30-min session to assess these situations — want me to set that up?"
4. CALL TO ACTION: Every single reply must include either a question OR an invitation to schedule a call — never both at the same time, alternate naturally.
5. SCOPE: Only discuss data engineering, Carlos' services, and scheduling a discovery call. Politely decline unrelated topics.

Carlos' services:
- Data Pipeline Engineering (ETL/ELT, Apache Spark, Airflow, dbt, Kafka)
- Cloud Data Warehousing (Snowflake, BigQuery, Databricks, Redshift)
- Multicloud Architecture (AWS, Azure, GCP)
- Analytics Engineering (dashboards, dbt models, Looker, Power BI)

BUTTONS RULE: At the end of EVERY reply, add buttons on a NEW LINE in this exact format:
BUTTONS:[{"label":"Schedule a Free Call","action":"/contact/"},{"label":"View Services","action":"/services/"}]

Always include the "Schedule a Free Call" button. You may add 1 additional button if relevant. NEVER start your reply with BUTTONS.`;

  const contents = [
    { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
    { role: 'model', parts: [{ text: 'Understood. I am Mon, ready to help.' }] },
  ];

  for (const turn of history) {
    contents.push({
      role: turn.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: turn.content }],
    });
  }
  contents.push({ role: 'user', parts: [{ text: message }] });

  const apiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemma-3-4b-it:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents }),
    }
  );

  const data = await apiRes.json();

  if (!apiRes.ok) {
    return res.status(500).json({ error: data.error?.message || 'API error' });
  }

  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  let reply = raw;
  let buttons = [];
  const btnIdx = raw.indexOf('BUTTONS:');
  if (btnIdx !== -1) {
    reply = raw.slice(0, btnIdx).trim();
    const btnStr = raw.slice(btnIdx + 8).trim();
    try {
      buttons = JSON.parse(btnStr);
    } catch {
      const match = btnStr.match(/\[.*\]/s);
      if (match) { try { buttons = JSON.parse(match[0]); } catch {} }
    }
  }

  return res.status(200).json({ reply, buttons });
}
