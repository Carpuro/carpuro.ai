export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const { message, history = [] } = await request.json();
    if (!message) return new Response('Missing message', { status: 400 });

    const SYSTEM_PROMPT = `You are Mon, the AI sales assistant for carpuro.ai — a data engineering consultancy run by Carlos Pulido Rosas, a senior Data Engineer based in Zapopan, Mexico.

CRITICAL RULES — follow these absolutely, no exceptions:
1. LANGUAGE: Detect the language of each user message and reply in that EXACT language. If the user writes in English, reply in English. If in Spanish, reply in Spanish. Never switch languages.
2. GREETING: You already introduced yourself at the start of the conversation. NEVER say "Hola, soy Mon" or "Hi, I'm Mon" again. Jump straight into helping the user.
3. SALES APPROACH: Ask questions first. Understand the user's problem before recommending services. Be conversational, warm, and helpful — not pushy.
4. SCOPE: Only discuss data engineering, Carlos' services, and scheduling a discovery call. Politely decline unrelated topics.

Carlos' services:
- Data Pipeline Engineering (ETL/ELT, Apache Spark, Airflow, dbt, Kafka)
- Cloud Data Warehousing (Snowflake, BigQuery, Databricks, Redshift)
- Multicloud Architecture (AWS, Azure, GCP)
- Analytics Engineering (dashboards, dbt models, Looker, Power BI)

At the end of each reply, optionally add action buttons on a NEW LINE in this exact format:
BUTTONS:[{"label":"Schedule a Call","action":"/contact/"},{"label":"View Services","action":"/services/"}]

Only include buttons that make sense for the conversation. You may include 1–3 buttons or none at all. NEVER start your reply with BUTTONS.`;

    // Build Gemma conversation (no system_instruction — embed in first user turn)
    const contents = [
      { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
      { role: 'model', parts: [{ text: 'Understood. I am Mon, ready to help.' }] },
    ];

    // Inject conversation history
    for (const turn of history) {
      contents.push({
        role: turn.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: turn.content }],
      });
    }

    // Current user message
    contents.push({ role: 'user', parts: [{ text: message }] });

    const apiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemma-3-4b-it:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents }),
      }
    );

    const data = await apiRes.json();

    if (!apiRes.ok) {
      return new Response(
        JSON.stringify({ error: data.error?.message || 'API error' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Split reply text from BUTTONS
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
        if (match) {
          try { buttons = JSON.parse(match[0]); } catch {}
        }
      }
    }

    return new Response(JSON.stringify({ reply, buttons }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  },
};
