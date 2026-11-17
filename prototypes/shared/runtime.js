// Imperative shell of the prototypes: state, timers, DOM updates and event handling.
// Each page calls Proto.boot(config) and provides the DOM slots below; layout differences live in config + page CSS.
//
// Page DOM contract:
//   #conversation-list, #chat-title, #scroll, #messages, #composer-root      (required)
//   #results-panel-body                                                       (only when config.panel)
//   [data-action="toggle-sidebar" | "toggle-rail" | "new-chat" | "close-panel"] anywhere
(function (P) {
  const { model, ui, products, groupSeeds: seeds, scenarios } = P;
  const $ = (sel) => document.querySelector(sel);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const uid = () => Math.random().toString(36).slice(2, 9);
  const isMobile = () => window.matchMedia('(max-width: 1023px)').matches;

  let config;
  const state = { conversations: [], activeId: null, messages: [], busy: false, run: 0, panelRef: null, dialog: null, lastFocus: null };

  // ── Rendering ──────────────────────────────────────────────────────────────

  const groupView = (m, g, i) => {
    const ref = `${m.id}:${i}`;
    return { ref, opts: { layout: config.groupLayout, remaining: model.remaining(g), canShowMore: model.canShowMore(seeds, g) } };
  };

  function groupsHtml(m) {
    if (!m.groups?.length) return '';
    if (config.groupLayout === 'chips') {
      const active = state.panelRef?.startsWith(`${m.id}:`);
      return `<div class="flex flex-wrap gap-2">${m.groups.map((g, i) => ui.GroupChip(g, `${m.id}:${i}`, { active })).join('')}</div>`;
    }
    return `<div class="space-y-5">${m.groups.map((g, i) => { const v = groupView(m, g, i); return ui.ProductGroup(g, v.ref, v.opts); }).join('')}</div>`;
  }

  const messageHtml = (m) => (m.role === 'user' ? ui.UserBubble(m) : ui.AssistantMessage(m, groupsHtml(m)));

  function renderMessages() {
    $('#messages').innerHTML = state.messages.length ? state.messages.map(messageHtml).join('') : ui.EmptyState(P.examples);
    scrollToBottom();
  }

  function rerender(m) {
    const el = document.getElementById(`msg-${m.id}`);
    if (el) el.outerHTML = messageHtml(m);
    else renderMessages();
    scrollToBottom();
  }

  function renderText(m) {
    const p = document.querySelector(`#msg-${m.id} [data-text]`);
    if (!p) return;
    p.classList.toggle('hidden', !m.text);
    p.innerHTML = ui.inline(m.text) + (m.status === 'streaming' ? '<span class="caret"></span>' : '');
    scrollToBottom();
  }

  function renderSidebar() {
    $('#conversation-list').innerHTML = ui.ConversationList(state.conversations, state.activeId);
    const conv = state.conversations.find((c) => c.id === state.activeId);
    $('#chat-title').textContent = conv ? conv.title : 'New chat';
  }

  function renderComposer() {
    $('#composer-root').innerHTML = ui.Composer(state.busy);
    const input = $('#composer-input');
    if (!state.busy && !isMobile() && input?.offsetParent) input.focus();
  }

  function renderPanel() {
    const body = $('#results-panel-body');
    if (!body) return;
    const msgId = state.panelRef?.split(':')[0];
    const m = state.messages.find((x) => x.id === msgId);
    body.innerHTML = m
      ? `<div class="space-y-6">${m.groups.map((g, i) => ui.ProductGroup(g, `${m.id}:${i}`, { layout: 'panel', remaining: model.remaining(g), canShowMore: model.canShowMore(seeds, g) })).join('')}</div>`
      : `<div class="flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-sm text-zinc-400"><span class="text-3xl">🛍️</span>Product results will appear here.</div>`;
  }

  function renderDialog() {
    let root = $('#dialog-root');
    if (!root) { root = document.createElement('div'); root.id = 'dialog-root'; document.body.append(root); }
    root.innerHTML = state.dialog ? ui.ProductDetailsDialog(products[state.dialog.id], state.dialog.imageIndex) : '';
    document.body.classList.toggle('overflow-hidden', !!state.dialog);
    if (state.dialog) root.querySelector('[aria-label="Close"]')?.focus();
  }

  const scrollToBottom = () => { const s = $('#scroll'); s.scrollTop = s.scrollHeight; };

  function setBusy(busy) {
    state.busy = busy;
    renderComposer();
  }

  // ── Conversation flow (simulated Assistant) ────────────────────────────────

  /** Plays one scripted Assistant turn into `m` (new or retried message). Cancelled when state.run changes. */
  async function assistantTurn(script, m) {
    const run = state.run;
    const alive = () => run === state.run;
    setBusy(true);
    if (!m) { m = { id: uid(), role: 'assistant', text: '', groups: [], status: 'typing' }; state.messages.push(m); renderMessages(); }
    else { Object.assign(m, { text: '', groups: [], offCatalog: null, status: 'typing' }); rerender(m); }
    await sleep(450);

    const groups = script.groups.map((k) => model.buildGroup(products, seeds, k, { offset: script.offset ?? 0, brokenImage: script.brokenImage }));
    for (const g of groups) {
      if (!alive()) return;
      m.toolStatus = g.label; rerender(m); await sleep(550);
    }
    if (!alive()) return;
    Object.assign(m, { toolStatus: null, groups, offCatalog: script.offCatalog ?? null, status: 'streaming' });
    rerender(m);
    if (config.panel && groups.length) { state.panelRef = `${m.id}:0`; renderPanel(); rerender(m); }

    const chunks = model.toStreamChunks(script.text);
    for (let i = 0; i < chunks.length; i++) {
      if (!alive()) return;
      if (script.failAfterChunks === i) {
        Object.assign(m, { status: 'error', retryScript: script.retry });
        rerender(m); setBusy(false); persist(); return;
      }
      m.text += chunks[i]; renderText(m); await sleep(32);
    }
    m.status = 'done'; rerender(m); setBusy(false); persist();
  }

  async function sendUserMessage(text, scenarioKey) {
    if (state.busy || !text.trim()) return;
    if (!state.activeId) {
      const conv = { id: `c-${uid()}`, title: model.deriveTitle(text), when: 'Just now', messages: [] };
      state.conversations.unshift(conv); state.activeId = conv.id;
    }
    state.messages.push({ id: uid(), role: 'user', text });
    renderSidebar(); renderMessages();
    await assistantTurn(scenarios[scenarioKey ?? model.matchScenario(text)]);
  }

  /** Saves the current thread into its Conversation (stand-in for the server's SQLite write). */
  function persist() {
    const conv = state.conversations.find((c) => c.id === state.activeId);
    if (!conv) return;
    conv.messages = structuredClone(state.messages); conv.when = 'Just now';
    state.conversations = [conv, ...state.conversations.filter((c) => c !== conv)];
    saveSession();
    renderSidebar();
  }

  // Session storage only so the prototype survives refresh / "Expand" between pages. Never required to work.
  const SESSION_KEY = 'proto-conversations';
  function saveSession() {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(state.conversations)); } catch { /* storage unavailable: ignore */ }
  }
  function loadSession() {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? 'null');
      return Array.isArray(parsed) && parsed.every((c) => c.id && c.title && Array.isArray(c.messages)) ? parsed : null;
    } catch { return null; }
  }

  function openConversation(id) {
    state.run++; // cancel any running stream
    const conv = state.conversations.find((c) => c.id === id);
    state.activeId = conv?.id ?? null;
    state.messages = conv ? structuredClone(conv.messages) : [];
    const lastWithGroups = [...state.messages].reverse().find((m) => m.groups?.length);
    state.panelRef = lastWithGroups ? `${lastWithGroups.id}:0` : null;
    document.body.classList.remove('sidebar-open', 'panel-open', 'list-open');
    state.busy = false;
    renderSidebar(); renderMessages(); renderComposer(); renderPanel();
  }

  function playScenario(key) {
    openConversation(null);
    sendUserMessage(scenarios[key].user, key);
  }

  // ── Events ─────────────────────────────────────────────────────────────────

  const findGroup = (ref) => {
    const [msgId, i] = ref.split(':');
    const m = state.messages.find((x) => x.id === msgId);
    return m?.groups[Number(i)];
  };

  const actions = {
    'new-chat': () => openConversation(null),
    'select-conv': (el) => openConversation(el.dataset.conv),
    example: (el) => sendUserMessage(scenarios[el.dataset.scenario].user, el.dataset.scenario),
    scenario: (el) => { el.closest('details')?.removeAttribute('open'); playScenario(el.dataset.scenario); },
    'toggle-sidebar': () => document.body.classList.toggle('sidebar-open'),
    'toggle-rail': () => document.body.classList.toggle('rail-expanded'),
    'open-product': (el) => { state.lastFocus = el; state.dialog = { id: Number(el.dataset.id), imageIndex: 0 }; renderDialog(); },
    'dialog-image': (el) => { state.dialog.imageIndex = Number(el.dataset.index); renderDialog(); },
    'close-dialog': (el, e) => {
      if (el.hasAttribute('data-backdrop') && e.target !== el) return; // clicks inside the panel bubble up
      state.dialog = null; renderDialog(); state.lastFocus?.focus();
    },
    retry: (el) => {
      const m = state.messages.find((x) => x.id === el.dataset.msg);
      if (m?.retryScript && !state.busy) assistantTurn(m.retryScript, m);
    },
    'show-more': (el) => {
      const g = findGroup(el.dataset.ref);
      if (!g || state.busy) return;
      document.body.classList.remove('panel-open');
      state.messages.push({ id: uid(), role: 'user', text: `Show more: ${g.label}` });
      renderMessages();
      assistantTurn({ groups: [g.key], offset: g.offset + g.products.length, text: `Here are more from **${g.label}**.` });
    },
    'open-panel': (el) => {
      state.panelRef = el.dataset.ref;
      if (!state.busy) renderMessages();
      renderPanel();
      if (isMobile()) document.body.classList.add('panel-open');
      document.getElementById(`grp-${el.dataset.ref.replace(':', '-')}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    'close-panel': () => document.body.classList.remove('panel-open'),
  };

  /** Read-only view + commands handed to page-specific actions (config.actions). */
  const api = { get activeId() { return state.activeId; }, openConversation };

  function bindEvents() {
    const all = { ...actions, ...config.actions };
    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-action]');
      if (el && all[el.dataset.action]) all[el.dataset.action](el, e, api);
    });
    document.addEventListener('submit', (e) => {
      if (!e.target.matches('[data-composer]')) return;
      e.preventDefault();
      const input = $('#composer-input');
      sendUserMessage(input.value);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (state.dialog) { state.dialog = null; renderDialog(); state.lastFocus?.focus(); }
        else document.body.classList.remove('sidebar-open', 'panel-open', 'list-open');
      }
      if (e.key === 'Enter' && !e.shiftKey && e.target.id === 'composer-input') {
        e.preventDefault(); e.target.form.requestSubmit();
      }
    });
    document.addEventListener('input', (e) => {
      if (e.target.id !== 'composer-input') return;
      e.target.style.height = 'auto'; e.target.style.height = `${e.target.scrollHeight}px`;
    });
  }

  function mountScenarioMenu() {
    const variants = [['A', 'a-classic.html', 'Classic'], ['B', 'b-carousel.html', 'Carousel'], ['C', 'c-panel.html', 'Panel'], ['D', 'd-widget.html', 'Widget']];
    const menu = document.createElement('details');
    menu.className = 'scenario-menu fixed right-3 top-2.5 z-40 text-sm';
    menu.innerHTML = `
      <summary class="flex cursor-pointer list-none items-center gap-1.5 rounded-full border border-zinc-200 bg-white/90 px-3 py-1.5 font-medium text-zinc-700 shadow-sm backdrop-blur hover:border-indigo-300">
        <span class="h-2 w-2 rounded-full bg-indigo-500"></span>Scenarios</summary>
      <div class="absolute right-0 mt-2 w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl">
        <p class="px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Play a scenario</p>
        <button data-action="new-chat" class="w-full rounded-lg px-2 py-1.5 text-left hover:bg-zinc-100">Empty new chat</button>
        ${Object.entries(scenarios).map(([k, s]) => `<button data-action="scenario" data-scenario="${k}" class="w-full rounded-lg px-2 py-1.5 text-left hover:bg-zinc-100">${ui.esc(s.menu)}</button>`).join('')}
        <p class="px-2 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Variant</p>
        <div class="grid grid-cols-2 gap-1 px-1">${variants.map(([v, href, name]) => `<a href="${href}" class="flex-1 rounded-lg px-2 py-1.5 text-center ${v === config.variant ? 'bg-indigo-600 text-white' : 'bg-zinc-100 hover:bg-zinc-200'}">${v} · ${name}</a>`).join('')}</div>
        <p class="px-2 pt-3 text-[11px] text-zinc-400">Tip: past chats are in the sidebar. Resize the window (or DevTools device mode) for mobile.</p>
      </div>`;
    document.body.append(menu);
  }

  function seedConversations() {
    const saved = loadSession();
    if (saved) { state.conversations = saved; return; }
    state.conversations = P.storedConversations.map((s) => {
      const sc = scenarios[s.scenario];
      const groups = sc.groups.map((k) => model.buildGroup(products, seeds, k));
      return {
        id: s.id, title: model.deriveTitle(sc.user), when: s.when,
        messages: [
          { id: uid(), role: 'user', text: sc.user },
          { id: uid(), role: 'assistant', text: sc.text, groups, offCatalog: sc.offCatalog ?? null, status: 'done' },
        ],
      };
    });
  }

  P.boot = (cfg) => {
    config = { groupLayout: 'grid', panel: false, actions: {}, ...cfg };
    seedConversations();
    bindEvents();
    mountScenarioMenu();
    renderSidebar(); renderMessages(); renderComposer(); renderPanel();
    // Deep links for review/screenshots: #scenario=<key> plays a scenario, #conv=<id> opens a stored one.
    const params = new URLSearchParams(location.hash.slice(1));
    config.onBoot?.(params, api);
    if (scenarios[params.get('scenario')]) playScenario(params.get('scenario'));
    else if (params.get('conv')) openConversation(params.get('conv'));
    if (params.has('sidebar')) document.body.classList.add('sidebar-open');
    if (params.has('product')) { state.dialog = { id: Number(params.get('product')), imageIndex: 0 }; renderDialog(); }
  };
})((window.Proto = window.Proto || {}));
