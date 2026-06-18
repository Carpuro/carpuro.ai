// Mon Chat Widget — shared across all pages
(function () {
  // ── Load Cal.com embed script ────────────────────────────────
  (function (C, A, L) {
    let p = function (a, ar) { a.q.push(ar); };
    let d = C.document;
    C.Cal = C.Cal || function () {
      let cal = C.Cal; let ar = arguments;
      if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement("script")).src = A; cal.loaded = true; }
      if (ar[0] === L) { const api = function () { p(api, arguments); }; const namespace = ar[1]; api.q = api.q || []; typeof namespace === "string" ? (cal.ns[namespace] = api) && p(api, ar) : p(cal, ar); return; }
      p(cal, ar);
    };
  })(window, "https://app.cal.com/embed/embed.js", "init");
  Cal("init", { origin: "https://cal.com" });
  Cal("ui", { styles: { branding: { brandColor: "#2563eb" } }, hideEventTypeDetails: false, layout: "month_view" });

  const CAL_LINK = "carpuro/discovery-call";

  // ── Session helpers ──────────────────────────────────────────
  // Perpetual conversation: the session id lives in localStorage so it survives
  // reloads, tab close, and future visits on this browser/device. The DB
  // (Supabase) is the source of truth for the messages themselves; we rehydrate
  // from it on return. The conversation only resets when the visitor explicitly
  // ends it (the ✕ button). Returning visitors continue the same thread.
  const STORE = window.localStorage;

  function newSessionId() {
    const id = crypto.randomUUID();
    STORE.setItem('chatSessionId', id);
    STORE.setItem('chatHistory', '[]');
    STORE.setItem('chatWelcomed', '0');
    STORE.setItem('chatSessionStatus', 'active');
    STORE.setItem('chatLastActivity', Date.now().toString());
    STORE.removeItem('chatLeadEmail'); // fresh conversation can capture a new lead
    return id;
  }

  function getSessionId() {
    // Reuse the existing conversation unless the visitor explicitly closed it.
    if (!STORE.getItem('chatSessionId') || STORE.getItem('chatSessionStatus') === 'closed') {
      return newSessionId();
    }
    STORE.setItem('chatSessionStatus', 'active'); // re-open if it had been parked
    return STORE.getItem('chatSessionId');
  }

  function touchActivity() {
    STORE.setItem('chatLastActivity', Date.now().toString());
  }

  // ── Inject CSS ───────────────────────────────────────────────
  // Tracks the site's light theme (tokens.css): warm off-white surfaces,
  // near-black text, single electric-blue accent, IBM Plex type.
  const style = document.createElement('style');
  style.textContent = `
    :root {
      --cw-accent: #2563eb; --cw-accent-hover: #1d4ed8;
      --cw-accent-soft: #eef3ff; --cw-accent-ring: rgba(37,99,235,0.18);
      --cw-bg: #ffffff; --cw-bg-alt: #f4f4f2;
      --cw-text: #16161a; --cw-muted: #55555f; --cw-subtle: #8a8a93;
      --cw-border: #e6e6e3;
      --cw-font: 'IBM Plex Sans', system-ui, sans-serif;
    }
    #chat-btn {
      position: fixed; bottom: 1.8rem; right: 1.8rem; z-index: 1000;
      width: 54px; height: 54px; border-radius: 50%;
      background: var(--cw-accent); color: #fff;
      border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 6px 24px var(--cw-accent-ring);
      transition: transform 0.2s, box-shadow 0.2s, background 0.2s;
    }
    #chat-btn:hover { transform: translateY(-2px); background: var(--cw-accent-hover); box-shadow: 0 10px 32px rgba(37,99,235,0.32); }
    #chat-btn svg { width: 24px; height: 24px; }
    #chat-box {
      position: fixed; bottom: 5.5rem; right: 1.8rem; z-index: 1000;
      width: min(370px, calc(100vw - 2rem));
      background: var(--cw-bg); border: 1px solid var(--cw-border);
      border-radius: 16px; display: flex; flex-direction: column;
      overflow: hidden; box-shadow: 0 16px 48px rgba(22,22,26,0.16);
      transform: scale(0.92) translateY(12px); opacity: 0;
      pointer-events: none;
      transition: transform 0.22s cubic-bezier(.34,1.4,.64,1), opacity 0.18s;
    }
    #chat-box.open { transform: scale(1) translateY(0); opacity: 1; pointer-events: all; }
    #chat-header {
      padding: 0.85rem 1.1rem;
      background: var(--cw-accent-soft);
      border-bottom: 1px solid var(--cw-border);
      display: flex; align-items: center; gap: 0.65rem;
    }
    .chat-avatar {
      width: 32px; height: 32px; border-radius: 50%;
      background: var(--cw-accent); color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.9rem; font-weight: 700; flex-shrink: 0;
      font-family: var(--cw-font);
    }
    .chat-header-info { display: flex; flex-direction: column; gap: 1px; flex: 1; }
    .chat-header-info strong { font-size: 0.85rem; font-weight: 600; color: var(--cw-text); font-family: var(--cw-font); }
    .chat-header-info small { font-size: 0.7rem; color: var(--cw-subtle); font-family: var(--cw-font); }
    .chat-status { display: flex; align-items: center; gap: 4px; }
    .chat-status-dot { width: 6px; height: 6px; border-radius: 50%; background: #16a34a; animation: pulse-dot 2s infinite; }
    @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.4} }
    #chat-close-btn {
      background: none; border: none; color: var(--cw-subtle); cursor: pointer;
      font-size: 1.1rem; line-height: 1; padding: 0.2rem 0.3rem;
      border-radius: 6px; transition: color 0.2s, background 0.2s;
      margin-left: auto; flex-shrink: 0;
    }
    #chat-close-btn:hover { color: var(--cw-text); background: rgba(22,22,26,0.06); }
    #chat-messages {
      flex: 1; overflow-y: auto; padding: 1rem;
      display: flex; flex-direction: column; gap: 0.7rem;
      max-height: 320px; min-height: 200px;
    }
    #chat-messages::-webkit-scrollbar { width: 4px; }
    #chat-messages::-webkit-scrollbar-thumb { background: var(--cw-border); border-radius: 4px; }
    .chat-msg {
      max-width: 88%; padding: 0.55rem 0.85rem;
      border-radius: 12px; font-size: 0.82rem; line-height: 1.55;
      font-family: var(--cw-font);
    }
    .chat-msg.bot { background: var(--cw-bg-alt); color: var(--cw-text); align-self: flex-start; border-bottom-left-radius: 4px; }
    .chat-msg.user { background: var(--cw-accent); color: #fff; align-self: flex-end; border-bottom-right-radius: 4px; }
    .chat-msg.typing { color: var(--cw-subtle); font-style: italic; }
    .chat-msg.system { color: var(--cw-subtle); font-size: 0.75rem; font-style: italic; align-self: center; background: none; padding: 0.2rem 0; }
    #chat-menu { display: flex; flex-wrap: wrap; gap: 0.4rem; padding: 0 1rem 0.75rem; }
    .chat-quick {
      background: var(--cw-accent-soft); border: 1px solid var(--cw-accent-ring);
      border-radius: 20px; color: var(--cw-accent-hover); font-size: 0.75rem;
      padding: 0.3rem 0.7rem; cursor: pointer;
      transition: background 0.18s, color 0.18s; font-family: var(--cw-font);
    }
    .chat-quick:hover { background: #dde8ff; color: var(--cw-accent-hover); }
    #chat-form {
      display: flex; gap: 0.5rem; padding: 0.75rem;
      border-top: 1px solid var(--cw-border);
    }
    #chat-input {
      flex: 1; background: var(--cw-bg);
      border: 1px solid var(--cw-border); border-radius: 8px;
      padding: 0.5rem 0.75rem; color: var(--cw-text);
      font-size: 0.82rem; font-family: var(--cw-font);
      outline: none; transition: border-color 0.2s, box-shadow 0.2s;
    }
    #chat-input:focus { border-color: var(--cw-accent); box-shadow: 0 0 0 3px var(--cw-accent-ring); }
    #chat-input::placeholder { color: var(--cw-subtle); }
    #chat-send {
      background: var(--cw-accent);
      border: none; border-radius: 8px; color: #fff;
      padding: 0.5rem 0.85rem; font-size: 0.85rem;
      cursor: pointer; transition: background 0.2s;
    }
    #chat-send:hover { background: var(--cw-accent-hover); }
    #chat-send:disabled { opacity: 0.4; cursor: not-allowed; }
    .chat-bot-btns { display: flex; flex-wrap: wrap; gap: 0.4rem; align-self: flex-start; max-width: 100%; }
  `;
  document.head.appendChild(style);

  // ── Inject HTML ──────────────────────────────────────────────
  document.body.insertAdjacentHTML('beforeend', `
    <button id="chat-btn" aria-label="Chat with Mon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
    </button>
    <div id="chat-box">
      <div id="chat-header">
        <div class="chat-avatar">M</div>
        <div class="chat-header-info">
          <strong>Mon</strong>
          <div class="chat-status">
            <div class="chat-status-dot"></div>
            <small>Carlos' AI assistant · online</small>
          </div>
        </div>
        <button id="chat-close-btn" title="End conversation">✕</button>
      </div>
      <div id="chat-messages"></div>
      <div id="chat-menu">
        <button class="chat-quick" data-msg="What's Carlos' tech stack?">Tech stack</button>
        <button class="chat-quick" data-msg="Tell me about Carlos' projects">Projects</button>
        <button class="chat-quick" data-msg="What services does Carlos offer?">Services</button>
        <button class="chat-quick" data-msg="How can I contact Carlos?">Contact</button>
      </div>
      <form id="chat-form">
        <input id="chat-input" type="text" placeholder="Ask Mon something..." autocomplete="off" maxlength="300" />
        <button id="chat-send" type="submit">→</button>
      </form>
    </div>
  `);

  // ── State ────────────────────────────────────────────────────
  // Resume the perpetual conversation (localStorage cache; DB is source of truth)
  let chatSessionId = getSessionId();
  let chatHistory   = JSON.parse(STORE.getItem('chatHistory') || '[]');
  let welcomed      = STORE.getItem('chatWelcomed') === '1';
  let rehydrated    = false;

  function saveHistory() {
    STORE.setItem('chatHistory', JSON.stringify(chatHistory));
  }

  // Pull the conversation back from the DB if the local cache was cleared but the
  // session id survived (or to reconcile across tabs). DB is the source of truth.
  async function rehydrateFromDb() {
    if (rehydrated || chatHistory.length > 0) return;
    rehydrated = true;
    try {
      const res = await fetch('/api/chat-history?sessionId=' + encodeURIComponent(chatSessionId));
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.messages) && data.messages.length > 0) {
        chatHistory = data.messages;
        saveHistory();
        welcomed = true;
        STORE.setItem('chatWelcomed', '1');
      }
    } catch { /* non-blocking — fall back to a fresh welcome */ }
  }

  // ── DOM refs ─────────────────────────────────────────────────
  const chatBtn      = document.getElementById('chat-btn');
  const chatBox      = document.getElementById('chat-box');
  const chatCloseBtn = document.getElementById('chat-close-btn');
  const chatForm     = document.getElementById('chat-form');
  const chatInput    = document.getElementById('chat-input');
  const chatSend     = document.getElementById('chat-send');
  const messages     = document.getElementById('chat-messages');
  const chatMenu     = document.getElementById('chat-menu');

  // ── Session lifecycle ────────────────────────────────────────
  async function closeSession(status = 'closed') {
    STORE.setItem('chatSessionStatus', status);
    try {
      // Use sendBeacon for reliability on page unload
      const payload = JSON.stringify({ sessionId: chatSessionId, status });
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/session-close', new Blob([payload], { type: 'application/json' }));
      } else {
        await fetch('/api/session-close', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        });
      }
    } catch { /* non-blocking */ }
  }

  // Perpetual model: we no longer auto-expire the conversation. Just record
  // activity so the DB's updated_at reflects engagement. (Name kept so existing
  // call sites don't need to change.)
  function resetInactivityTimer() {
    touchActivity();
  }

  function startNewConversation() {
    chatSessionId = newSessionId();
    chatHistory   = [];
    welcomed      = false;
    messages.innerHTML = '';
    chatInput.disabled = false;
    chatSend.disabled  = false;
    chatMenu.style.display = '';
    showWelcome();
    resetInactivityTimer();
  }

  // ── Helpers ──────────────────────────────────────────────────
  async function logMessage(role, content) {
    try {
      await fetch('/api/chat-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: chatSessionId, role, content, page: location.pathname }),
      });
    } catch { /* non-blocking */ }
  }

  // When the visitor hands over an email mid-chat, capture it as a chat-sourced
  // lead so a chatter who never books still becomes a follow-up-able lead.
  const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]{2,}/;
  function maybeCaptureLead(text) {
    const m = text.match(EMAIL_RE);
    if (!m) return;
    const email = m[0].replace(/[.,;:]+$/, '');
    if (STORE.getItem('chatLeadEmail') === email) return; // already sent this one
    STORE.setItem('chatLeadEmail', email);
    let name = null;
    const nm = text.match(/\b(?:i'?m|i am|this is|my name is|soy|me llamo)\s+([A-Za-zÁ-úÀ-ÿ]+(?:\s+[A-Za-zÁ-úÀ-ÿ]+)?)/i);
    if (nm) name = nm[1];
    fetch('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: chatSessionId, email, name, notes: bookingNotes() }),
    }).catch(() => { /* non-blocking */ });
  }

  function addMsg(text, role) {
    const el = document.createElement('div');
    el.className = `chat-msg ${role}`;
    const safe = text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
    el.innerHTML = safe;
    messages.appendChild(el);
    messages.scrollTop = messages.scrollHeight;
    return el;
  }

  function addButtons(buttons) {
    if (!buttons || buttons.length === 0) return;
    messages.querySelectorAll('.chat-bot-btns').forEach(el => el.remove());
    const wrap = document.createElement('div');
    wrap.className = 'chat-bot-btns';
    buttons.forEach(btn => {
      const b = document.createElement('button');
      b.className = 'chat-quick';
      b.textContent = btn.label;
      if (btn.action.startsWith('msg:')) {
        b.addEventListener('click', () => sendMessage(btn.action.slice(4)));
      } else if (btn.action.startsWith('cal:')) {
        b.addEventListener('click', () => openBooking());
      } else {
        b.addEventListener('click', () => window.location.href = btn.action);
      }
      wrap.appendChild(b);
    });
    messages.appendChild(wrap);
    messages.scrollTop = messages.scrollHeight;
  }

  function restoreHistory() {
    chatHistory.forEach(turn => addMsg(turn.content, turn.role === 'assistant' ? 'bot' : 'user'));
  }

  // ── Booking (Cal.com modal, opened inside the chat) ──────────
  let bookingListenerReady = false;

  function bookingNotes() {
    return chatHistory
      .filter(t => t.role === 'user' && !String(t.content).startsWith('['))
      .map(t => t.content)
      .slice(-5)
      .join(' | ');
  }

  function registerBookingListener() {
    if (bookingListenerReady) return;
    bookingListenerReady = true;
    const onBooked = async (e) => {
      const d = (e && e.detail && e.detail.data) || {};
      const r = d.responses || (d.booking && d.booking.responses) || {};
      const name = (r.name && (r.name.value || r.name)) || d.name || null;
      const email = (r.email && (r.email.value || r.email)) || d.email || null;
      const when = d.date || (d.booking && d.booking.startTime) || null;
      addMsg("You're booked — talk soon. I've shared your chat context with Carlos.", 'bot');
      try {
        await fetch('/api/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: chatSessionId, name, email, notes: bookingNotes(), when }),
        });
      } catch { /* non-blocking */ }
    };
    try { window.Cal('on', { action: 'bookingSuccessful', callback: onBooked }); } catch {}
    try { window.Cal('on', { action: 'bookingSuccessfulV2', callback: onBooked }); } catch {}
  }

  function openBooking() {
    registerBookingListener();
    logMessage('user', '[Opened booking]');
    try {
      window.Cal('modal', {
        calLink: CAL_LINK,
        config: { layout: 'month_view', theme: 'light', notes: bookingNotes() },
      });
    } catch {
      // Fallback: hand off to the contact form with the conversation context.
      const params = new URLSearchParams({ session: chatSessionId });
      const n = bookingNotes();
      if (n) params.set('notes', n);
      window.location.href = '/contact/?' + params.toString();
    }
  }

  function showWelcome() {
    if (welcomed) return;
    welcomed = true;
    STORE.setItem('chatWelcomed', '1');
    setTimeout(() => {
      addMsg(`Hi, I'm **Mon** — Carlos' AI assistant.\n\nCarlos is a data engineer. I'm here to understand your data challenge and point you to the right fix — and if it's a good fit, connect you with him directly.\n\n**Where Carlos helps:**\n- Pipelines & ETL/ELT architecture\n- Data warehouses (Snowflake, BigQuery, Databricks)\n- Multicloud (AWS, Azure, GCP)\n- Data stack audits & consulting\n\nWhat's the biggest data challenge you're working on right now?`, 'bot');
    }, 300);
  }

  // ── Open / close ─────────────────────────────────────────────
  async function openChat(focus = true) {
    if (chatBox.classList.contains('open')) return;
    chatBox.classList.add('open');
    chatInput.disabled = false;
    chatSend.disabled  = false;
    if (messages.children.length === 0) {
      // Recover the conversation from the DB if the local cache is empty.
      if (chatHistory.length === 0) await rehydrateFromDb();
      if (chatHistory.length > 0) restoreHistory();
      else showWelcome();
    }
    if (focus) chatInput.focus();
    touchActivity();
  }

  // ── Events ───────────────────────────────────────────────────
  chatBtn.addEventListener('click', () => {
    if (chatBox.classList.contains('open')) chatBox.classList.remove('open');
    else openChat();
  });

  // Proactively open the chat ONCE per visitor (first landing) so it's front and
  // centre. The flag lives in localStorage, so we never nag on later pages or
  // return visits, and an explicit dismissal (✕) is respected.
  function maybeAutoOpen() {
    if (STORE.getItem('chatAutoOpened') === '1') return;
    if (STORE.getItem('chatSessionStatus') === 'closed') return;
    STORE.setItem('chatAutoOpened', '1');
    setTimeout(() => openChat(false), 2000);
  }
  maybeAutoOpen();

  // ✕ button — end session explicitly
  chatCloseBtn.addEventListener('click', async () => {
    if (chatHistory.length > 0) {
      await closeSession('closed');
    }
    chatBox.classList.remove('open');
    // Start a brand-new conversation next time.
    chatSessionId = newSessionId();
    chatHistory   = [];
    welcomed      = false;
    rehydrated    = false;
    messages.innerHTML = '';
    chatInput.disabled = false;
    chatSend.disabled  = false;
    chatMenu.style.display = '';
  });

  chatMenu.querySelectorAll('.chat-quick').forEach(btn => {
    btn.addEventListener('click', () => sendMessage(btn.dataset.msg));
  });

  let sending = false;

  function showChatFallback() {
    addMsg("I couldn't reach the model for a moment. You can book a free call with Carlos using the button below, or reach him on the contact page — he'll get straight back to you.", 'bot');
    addButtons([
      { label: 'Book a free call', action: 'cal:discovery-call' },
      { label: 'Contact Carlos', action: '/contact/' },
    ]);
  }

  async function sendMessage(msg) {
    if (!msg.trim() || sending) return; // guard against double-sends
    sending = true;
    chatMenu.style.display = 'none';
    addMsg(msg, 'user');
    chatHistory.push({ role: 'user', content: msg });
    saveHistory();
    logMessage('user', msg);
    maybeCaptureLead(msg);
    resetInactivityTimer();
    chatInput.value = '';
    chatSend.disabled = true;

    const typing = addMsg('Mon is typing…', 'bot typing');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history: chatHistory.slice(0, -1) }),
      });
      // The server may be behind a proxy that returns a non-JSON error page;
      // parse defensively and always degrade gracefully rather than dead-end.
      let data = {};
      try { data = await res.json(); } catch { data = {}; }
      typing.remove();
      if (data.reply && data.reply.trim()) {
        addMsg(data.reply, 'bot');
        // Don't store the canned fallback in history (it shouldn't feed the model).
        if (!data.fallback) {
          chatHistory.push({ role: 'assistant', content: data.reply });
          saveHistory();
          logMessage('assistant', data.reply);
        }
        addButtons(data.buttons);
      } else {
        showChatFallback();
      }
    } catch {
      typing.remove();
      showChatFallback();
    } finally {
      chatSend.disabled = false;
      sending = false;
      chatInput.focus();
    }
  }

  chatForm.addEventListener('submit', e => {
    e.preventDefault();
    sendMessage(chatInput.value.trim());
  });

  // Perpetual model: we intentionally do NOT mark the session abandoned on
  // pagehide. This is a multi-page site, so navigating between pages fires
  // pagehide constantly; the conversation must survive those. The session only
  // ends when the visitor clicks ✕ (closeSession('closed')).

  // Record activity on load if there's an existing conversation.
  if (chatHistory.length > 0) touchActivity();
})();
