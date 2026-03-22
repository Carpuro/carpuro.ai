// Mon Chat Widget — shared across all pages
(function () {
  const INACTIVITY_MS = 30 * 60 * 1000; // 30 minutes

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
  const style = document.createElement('style');
  style.textContent = `
    #chat-btn {
      position: fixed; bottom: 1.8rem; right: 1.8rem; z-index: 1000;
      width: 54px; height: 54px; border-radius: 50%;
      background: linear-gradient(135deg, #7c3aed, #2563eb);
      border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.4rem; box-shadow: 0 4px 24px rgba(124,58,237,0.5);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    #chat-btn:hover { transform: scale(1.08); box-shadow: 0 6px 32px rgba(124,58,237,0.7); }
    #chat-box {
      position: fixed; bottom: 5.5rem; right: 1.8rem; z-index: 1000;
      width: min(370px, calc(100vw - 2rem));
      background: #0d0d1a; border: 1px solid rgba(124,58,237,0.3);
      border-radius: 16px; display: flex; flex-direction: column;
      overflow: hidden; box-shadow: 0 8px 40px rgba(0,0,0,0.6);
      transform: scale(0.92) translateY(12px); opacity: 0;
      pointer-events: none;
      transition: transform 0.22s cubic-bezier(.34,1.4,.64,1), opacity 0.18s;
    }
    #chat-box.open { transform: scale(1) translateY(0); opacity: 1; pointer-events: all; }
    #chat-header {
      padding: 0.85rem 1.1rem;
      background: linear-gradient(135deg, rgba(124,58,237,0.2), rgba(37,99,235,0.15));
      border-bottom: 1px solid rgba(255,255,255,0.06);
      display: flex; align-items: center; gap: 0.65rem;
    }
    .chat-avatar {
      width: 32px; height: 32px; border-radius: 50%;
      background: linear-gradient(135deg, #7c3aed, #2563eb);
      display: flex; align-items: center; justify-content: center;
      font-size: 1rem; flex-shrink: 0;
    }
    .chat-header-info { display: flex; flex-direction: column; gap: 1px; flex: 1; }
    .chat-header-info strong { font-size: 0.85rem; font-weight: 600; color: #e2e2f0; }
    .chat-header-info small { font-size: 0.7rem; color: #6b6b8a; }
    .chat-status { display: flex; align-items: center; gap: 4px; }
    .chat-status-dot { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; animation: pulse-dot 2s infinite; }
    @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.4} }
    #chat-close-btn {
      background: none; border: none; color: #6b6b8a; cursor: pointer;
      font-size: 1.1rem; line-height: 1; padding: 0.2rem 0.3rem;
      border-radius: 6px; transition: color 0.2s, background 0.2s;
      margin-left: auto; flex-shrink: 0;
    }
    #chat-close-btn:hover { color: #e2e2f0; background: rgba(255,255,255,0.06); }
    #chat-messages {
      flex: 1; overflow-y: auto; padding: 1rem;
      display: flex; flex-direction: column; gap: 0.7rem;
      max-height: 320px; min-height: 200px;
    }
    #chat-messages::-webkit-scrollbar { width: 4px; }
    #chat-messages::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.3); border-radius: 4px; }
    .chat-msg {
      max-width: 88%; padding: 0.55rem 0.85rem;
      border-radius: 12px; font-size: 0.82rem; line-height: 1.55;
      font-family: 'Inter', sans-serif;
    }
    .chat-msg.bot { background: rgba(255,255,255,0.06); color: #c4c4d8; align-self: flex-start; border-bottom-left-radius: 4px; }
    .chat-msg.user { background: linear-gradient(135deg, #7c3aed, #2563eb); color: #fff; align-self: flex-end; border-bottom-right-radius: 4px; }
    .chat-msg.typing { color: #6b6b8a; font-style: italic; }
    .chat-msg.system { color: #6b6b8a; font-size: 0.75rem; font-style: italic; align-self: center; background: none; padding: 0.2rem 0; }
    #chat-menu { display: flex; flex-wrap: wrap; gap: 0.4rem; padding: 0 1rem 0.75rem; }
    .chat-quick {
      background: rgba(124,58,237,0.12); border: 1px solid rgba(124,58,237,0.3);
      border-radius: 20px; color: #a78bfa; font-size: 0.75rem;
      padding: 0.3rem 0.7rem; cursor: pointer;
      transition: background 0.18s, color 0.18s; font-family: 'Inter', sans-serif;
    }
    .chat-quick:hover { background: rgba(124,58,237,0.25); color: #c4b5fd; }
    #chat-form {
      display: flex; gap: 0.5rem; padding: 0.75rem;
      border-top: 1px solid rgba(255,255,255,0.06);
    }
    #chat-input {
      flex: 1; background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;
      padding: 0.5rem 0.75rem; color: #e2e2f0;
      font-size: 0.82rem; font-family: 'Inter', sans-serif;
      outline: none; transition: border-color 0.2s;
    }
    #chat-input:focus { border-color: rgba(124,58,237,0.5); }
    #chat-input::placeholder { color: #6b6b8a; }
    #chat-send {
      background: linear-gradient(135deg, #7c3aed, #2563eb);
      border: none; border-radius: 8px; color: #fff;
      padding: 0.5rem 0.85rem; font-size: 0.85rem;
      cursor: pointer; transition: opacity 0.2s;
    }
    #chat-send:hover { opacity: 0.85; }
    #chat-send:disabled { opacity: 0.4; cursor: not-allowed; }
    .chat-bot-btns { display: flex; flex-wrap: wrap; gap: 0.4rem; align-self: flex-start; max-width: 100%; }
  `;
  document.head.appendChild(style);

  // ── Inject HTML ──────────────────────────────────────────────
  document.body.insertAdjacentHTML('beforeend', `
    <button id="chat-btn" aria-label="Chat con Mon">💬</button>
    <div id="chat-box">
      <div id="chat-header">
        <div class="chat-avatar">🤖</div>
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
        <button class="chat-quick" data-msg="What's Carlos' tech stack?">🛠 Tech Stack</button>
        <button class="chat-quick" data-msg="Tell me about Carlos' projects">📂 Projects</button>
        <button class="chat-quick" data-msg="What services does Carlos offer?">💼 Services</button>
        <button class="chat-quick" data-msg="How can I contact Carlos?">📬 Contact</button>
      </div>
      <form id="chat-form">
        <input id="chat-input" type="text" placeholder="Ask Mon something..." autocomplete="off" maxlength="300" />
        <button id="chat-send" type="submit">→</button>
      </form>
    </div>
  `);

  // ── State ────────────────────────────────────────────────────
  let chatSessionId = getSessionId(); // may reset sessionStorage if stale
  let chatHistory   = JSON.parse(sessionStorage.getItem('chatHistory') || '[]');
  let welcomed      = sessionStorage.getItem('chatWelcomed') === '1';
  // Safety: if history is empty, mark as not welcomed so welcome shows
  if (chatHistory.length === 0) {
    welcomed = false;
    sessionStorage.setItem('chatWelcomed', '0');
  }
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
      await closeSession('abandoned');
      // Show system message if chat is open
      if (chatBox.classList.contains('open')) {
        addMsg('Session ended due to inactivity. Send a message to start a new conversation.', 'system');
        chatInput.disabled = true;
        chatSend.disabled  = true;
      }
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
      addMsg(`👋 Hi! I'm **Mon**, Carlos' AI sales assistant.\n\nI'm here to understand your data challenges and connect you with the right solution.\n\n🔧 **What I can help you with:**\n- Pipeline design & ETL/ELT architecture\n- Data warehouse setup (Snowflake, BigQuery, Databricks)\n- Multicloud infrastructure (AWS, Azure, GCP)\n- Data stack audits & consulting\n\n💬 **What's the biggest data challenge you're facing right now?**`, 'bot');
    }, 300);
  }

  // ── Events ───────────────────────────────────────────────────
  chatBtn.addEventListener('click', () => {
    chatBox.classList.toggle('open');
    if (chatBox.classList.contains('open')) {
      // Always ensure input is enabled when opening
      chatInput.disabled = false;
      chatSend.disabled  = false;
      if (!welcomed) {
        showWelcome();
      } else if (messages.children.length === 0) {
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
      const res = await fetch('https://carpuro-chat.carpuro.workers.dev', {
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
