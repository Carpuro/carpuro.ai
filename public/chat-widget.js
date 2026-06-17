// Mon Chat Widget — shared across all pages
(function () {
  const INACTIVITY_MS = 30 * 60 * 1000; // 30 minutes

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

  // ── Session helpers ──────────────────────────────────────────
  function newSessionId() {
    const id = crypto.randomUUID();
    sessionStorage.setItem('chatSessionId', id);
    sessionStorage.setItem('chatHistory', '[]');
    sessionStorage.setItem('chatWelcomed', '0');
    sessionStorage.setItem('chatSessionStatus', 'active');
    sessionStorage.setItem('chatLastActivity', Date.now().toString());
    return id;
  }

  function getSessionId() {
    const status   = sessionStorage.getItem('chatSessionStatus');
    const lastActivity = parseInt(sessionStorage.getItem('chatLastActivity') || '0');
    const timedOut = Date.now() - lastActivity > INACTIVITY_MS;

    // Start fresh if session was closed, abandoned, or timed out
    if (!sessionStorage.getItem('chatSessionId') || status === 'closed' || status === 'abandoned' || timedOut) {
      return newSessionId();
    }
    return sessionStorage.getItem('chatSessionId');
  }

  function touchActivity() {
    sessionStorage.setItem('chatLastActivity', Date.now().toString());
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
  // Restore session if still active, otherwise start fresh
  let chatSessionId = getSessionId();
  let chatHistory   = JSON.parse(sessionStorage.getItem('chatHistory') || '[]');
  let welcomed      = sessionStorage.getItem('chatWelcomed') === '1';
  let inactivityTimer = null;

  function saveHistory() {
    sessionStorage.setItem('chatHistory', JSON.stringify(chatHistory));
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
    sessionStorage.setItem('chatSessionStatus', status);
    clearTimeout(inactivityTimer);
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

  function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    touchActivity();
    inactivityTimer = setTimeout(async () => {
      // Close old session silently, start new one — user never notices
      await closeSession('abandoned');
      chatSessionId = newSessionId();
      chatHistory   = [];
      welcomed      = false;
      messages.innerHTML = '';
    }, INACTIVITY_MS);
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
        b.addEventListener('click', async () => {
          const summary = chatHistory
            .filter(t => t.role === 'user')
            .map(t => t.content)
            .filter(c => !c.startsWith('['))
            .slice(-5)
            .join(' | ');
          try {
            await fetch('/api/chat-log', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: chatSessionId,
                role: 'user',
                content: '[User clicked: Book a Call]',
                page: location.pathname,
                stage: 'scheduled',
              }),
            });
          } catch {}
          const params = new URLSearchParams({ session: chatSessionId });
          if (summary) params.set('notes', summary);
          window.location.href = '/contact/?' + params.toString();
        });
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

  function showWelcome() {
    if (welcomed) return;
    welcomed = true;
    sessionStorage.setItem('chatWelcomed', '1');
    setTimeout(() => {
      addMsg(`Hi! I'm **Mon**, Carlos' AI assistant.\n\nI'm here to understand your data challenges and connect you with the right solution.\n\n**What I can help with:**\n- Pipeline design & ETL/ELT architecture\n- Data warehouse setup (Snowflake, BigQuery, Databricks)\n- Multicloud infrastructure (AWS, Azure, GCP)\n- Data stack audits & consulting\n\nWhat's the biggest data challenge you're facing right now?`, 'bot');
    }, 300);
  }

  // ── Events ───────────────────────────────────────────────────
  chatBtn.addEventListener('click', () => {
    chatBox.classList.toggle('open');
    if (chatBox.classList.contains('open')) {
      chatInput.disabled = false;
      chatSend.disabled  = false;
      if (!welcomed) {
        showWelcome();
      } else if (messages.children.length === 0 && chatHistory.length > 0) {
        restoreHistory();
      }
      chatInput.focus();
      resetInactivityTimer();
    }
  });

  // ✕ button — end session explicitly
  chatCloseBtn.addEventListener('click', async () => {
    if (chatHistory.length > 0) {
      await closeSession('closed');
    }
    chatBox.classList.remove('open');
    // Start fresh next time
    chatSessionId = newSessionId();
    chatHistory   = [];
    welcomed      = false;
    messages.innerHTML = '';
    chatInput.disabled = false;
    chatSend.disabled  = false;
    chatMenu.style.display = '';
    clearTimeout(inactivityTimer);
  });

  chatMenu.querySelectorAll('.chat-quick').forEach(btn => {
    btn.addEventListener('click', () => sendMessage(btn.dataset.msg));
  });

  async function sendMessage(msg) {
    if (!msg.trim()) return;
    chatMenu.style.display = 'none';
    addMsg(msg, 'user');
    chatHistory.push({ role: 'user', content: msg });
    saveHistory();
    logMessage('user', msg);
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
      const data = await res.json();
      typing.remove();
      if (data.reply && data.reply.trim()) {
        addMsg(data.reply, 'bot');
        chatHistory.push({ role: 'assistant', content: data.reply });
        saveHistory();
        logMessage('assistant', data.reply);
      }
      addButtons(data.buttons);
    } catch {
      typing.remove();
      addMsg('Something went wrong. Try again in a moment.', 'bot');
      chatHistory.pop();
      saveHistory();
    } finally {
      chatSend.disabled = false;
      chatInput.focus();
    }
  }

  chatForm.addEventListener('submit', e => {
    e.preventDefault();
    sendMessage(chatInput.value.trim());
  });

  // Close session as abandoned when tab/browser closes
  window.addEventListener('pagehide', () => {
    if (chatHistory.length > 0 && sessionStorage.getItem('chatSessionStatus') === 'active') {
      closeSession('abandoned');
    }
  });

  // Start inactivity timer on load if there's an active session
  if (chatHistory.length > 0) resetInactivityTimer();
})();
