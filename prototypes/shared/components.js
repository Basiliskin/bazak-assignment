// Presentational components as pure functions: data in → HTML string out. No DOM access, no state.
// Names match docs/architecture.md (MessageBubble, ProductGroup, ProductCard, ProductDetailsDialog, ConversationList).
// Interaction is declared with data-action attributes; shared/runtime.js handles them.
(function (P) {
  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const money = (n) => `$${Number(n).toFixed(2)}`;
  const originalPrice = (p) => p.price / (1 - p.discountPercentage / 100);
  /** Minimal inline markdown: **bold** only (what the Assistant uses). Escapes first. */
  const inline = (text) => esc(text).replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-zinc-900">$1</strong>');

  // ── Product ────────────────────────────────────────────────────────────────

  const ProductImage = (p, cls) => `
    <div class="relative ${cls} bg-zinc-100/70">
      <div class="img-fallback absolute inset-0 hidden flex-col items-center justify-center gap-1 text-zinc-400">
        <span class="text-2xl" aria-hidden="true">📦</span><span class="text-[11px]">No image</span>
      </div>
      <img src="${esc(p.thumbnail)}" alt="${esc(p.title)}" loading="lazy"
           class="h-full w-full object-contain p-3 mix-blend-multiply transition duration-300 group-hover:scale-105"
           onerror="this.previousElementSibling.classList.replace('hidden','flex'); this.remove()" />
      ${p.discountPercentage >= 5 ? `<span class="absolute left-2 top-2 rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm">−${Math.round(p.discountPercentage)}%</span>` : ''}
    </div>`;

  const Rating = (r) =>
    `<span class="inline-flex items-center gap-0.5 text-xs font-medium text-amber-600" aria-label="Rated ${r.toFixed(1)} out of 5">★ ${r.toFixed(1)}</span>`;

  /** ProductCard — variant 'grid' fills its cell; 'compact' has a fixed width for carousels. */
  const ProductCard = (p, { variant = 'grid' } = {}) => `
    <button type="button" data-action="open-product" data-id="${p.id}"
      class="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white text-left shadow-sm transition
             hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
             ${variant === 'compact' ? 'w-44 shrink-0 snap-start sm:w-48' : 'w-full'}">
      ${ProductImage(p, 'aspect-square')}
      <div class="flex flex-1 flex-col gap-1 p-3">
        <h4 class="line-clamp-1 text-sm font-medium text-zinc-900">${esc(p.title)}</h4>
        <p class="line-clamp-2 text-xs leading-relaxed text-zinc-500">${esc(p.description)}</p>
        <div class="mt-auto flex items-center justify-between pt-1.5">
          <span class="text-sm font-semibold text-zinc-900">${money(p.price)}</span>${Rating(p.rating)}
        </div>
      </div>
    </button>`;

  // ── Product Group ──────────────────────────────────────────────────────────

  const AssumptionChip = (assumption) => `
    <span class="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200">
      <span aria-hidden="true">💡</span> Assumed: ${esc(assumption)}
    </span>`;

  const GroupHeader = (g) => `
    <div class="mb-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
      <h3 class="text-sm font-semibold text-zinc-900">${esc(g.label)}</h3>
      <span class="text-xs text-zinc-500">${g.total === 0 ? 'no matches' : `${g.offset + 1}–${g.offset + g.products.length} of ${g.total}`}</span>
      ${g.query.confidence === 'guessed' && g.query.assumption ? AssumptionChip(g.query.assumption) : ''}
    </div>`;

  const GroupFooter = (g, ref, { remaining, canShowMore }) =>
    remaining === 0
      ? ''
      : `<div class="mt-2.5 flex items-center gap-3 text-xs text-zinc-500">
          <span>${remaining} more match</span>
          ${canShowMore ? `<button type="button" data-action="show-more" data-ref="${ref}" class="rounded-full border border-zinc-200 bg-white px-3 py-1 font-medium text-zinc-700 transition hover:border-indigo-300 hover:text-indigo-700">Show more</button>` : ''}
        </div>`;

  /** Card containers per layout — adding a layout = adding one entry (open/closed). */
  const GROUP_LAYOUTS = {
    grid: (cards) => `<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">${cards.map((p) => ProductCard(p)).join('')}</div>`,
    panel: (cards) => `<div class="grid grid-cols-2 gap-3 2xl:grid-cols-3">${cards.map((p) => ProductCard(p)).join('')}</div>`,
    carousel: (cards) =>
      `<div class="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1">${cards.map((p) => ProductCard(p, { variant: 'compact' })).join('')}</div>`,
  };

  /** ProductGroup — layout 'grid' (A), 'carousel' (B) or 'panel' (C results panel). */
  const ProductGroup = (g, ref, { layout = 'grid', remaining = 0, canShowMore = false } = {}) => `
    <section class="animate-in scroll-mt-4" id="grp-${ref.replace(':', '-')}" aria-label="${esc(g.label)}">
      ${GroupHeader(g)}${g.products.length ? GROUP_LAYOUTS[layout](g.products) : EmptyGroup()}${GroupFooter(g, ref, { remaining, canShowMore })}
    </section>`;

  const EmptyGroup = () =>
    `<p class="rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-500">Nothing matched — try a broader search.</p>`;

  /** GroupChip — compact reference to a group shown in the C results panel. */
  const GroupChip = (g, ref, { active = false } = {}) => `
    <button type="button" data-action="open-panel" data-ref="${ref}"
      class="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition
             ${active ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-zinc-200 bg-white text-zinc-700 hover:border-indigo-300'}">
      <span class="flex -space-x-2">${g.products
        .slice(0, 3)
        .map((p) => `<img src="${esc(p.thumbnail)}" alt="" class="h-5 w-5 rounded-full bg-zinc-100 object-contain ring-2 ring-white" onerror="this.style.visibility='hidden'">`)
        .join('')}</span>
      ${esc(g.label)} <span class="text-zinc-400">${g.total}</span>
      ${g.query.confidence === 'guessed' ? '<span aria-label="assumption">💡</span>' : ''}
    </button>`;

  // ── Messages ───────────────────────────────────────────────────────────────

  const UserBubble = (m) => `
    <div class="flex justify-end animate-in">
      <p class="max-w-[85%] rounded-2xl rounded-br-md bg-indigo-600 px-4 py-2.5 text-sm text-white shadow-sm">${esc(m.text)}</p>
    </div>`;

  const OffCatalogNotice = (what) => `
    <div class="inline-flex items-center gap-2 rounded-xl bg-zinc-100 px-3 py-2 text-sm text-zinc-700 ring-1 ring-inset ring-zinc-200">
      <span aria-hidden="true">🚫</span><span>Not sold here: <strong class="font-semibold">${esc(what)}</strong></span>
    </div>`;

  const ToolStatus = (label) => `
    <div class="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
      <span class="h-3 w-3 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-700"></span>Searching: ${esc(label)}…
    </div>`;

  const TypingDots = () =>
    `<div class="flex gap-1 py-2" aria-label="Assistant is typing"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>`;

  const ErrorBlock = (msgId) => `
    <div role="alert" class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">
      <span>Something went wrong while answering. Your message is saved.</span>
      <button type="button" data-action="retry" data-msg="${msgId}" class="rounded-lg bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-700">Retry</button>
    </div>`;

  /**
   * Assistant MessageBubble. `groupsHtml` is injected by the layout (grid / carousel / chips),
   * so the bubble stays layout-agnostic (open/closed: new layouts don't change this function).
   */
  const AssistantMessage = (m, groupsHtml) => `
    <div class="flex gap-3 animate-in" id="msg-${m.id}">
      <div class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-sm text-white shadow-sm" aria-hidden="true">✦</div>
      <div class="min-w-0 flex-1 space-y-3">
        ${m.status === 'typing' && !m.toolStatus ? TypingDots() : ''}
        ${m.toolStatus ? ToolStatus(m.toolStatus) : ''}
        ${m.offCatalog ? OffCatalogNotice(m.offCatalog) : ''}
        ${groupsHtml}
        <p data-text class="text-[15px] leading-relaxed text-zinc-700 ${m.text ? '' : 'hidden'}">${inline(m.text)}${m.status === 'streaming' ? '<span class="caret"></span>' : ''}</p>
        ${m.status === 'error' ? ErrorBlock(m.id) : ''}
      </div>
    </div>`;

  const EmptyState = (examples) => `
    <div class="flex min-h-full flex-col items-center justify-center px-2 py-10 text-center animate-in">
      <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-xl text-white shadow-lg shadow-indigo-500/20">✦</div>
      <h2 class="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">What are you shopping for?</h2>
      <p class="mt-1.5 max-w-sm text-sm text-zinc-500">Describe it in your own words — I’ll search the catalog and show you real products.</p>
      <div class="mt-6 grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
        ${examples
          .map(
            (e) => `<button type="button" data-action="example" data-scenario="${e.scenario}"
              class="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm text-zinc-700 shadow-sm transition hover:border-indigo-300 hover:shadow">
              <span class="text-lg" aria-hidden="true">${e.icon}</span>${esc(e.text)}</button>`,
          )
          .join('')}
      </div>
    </div>`;

  // ── Conversations ──────────────────────────────────────────────────────────

  /** ConversationList item — `.conv-icon` shows only when a layout collapses the sidebar to a rail. */
  const ConversationItem = (c, active) => `
    <button type="button" data-action="select-conv" data-conv="${c.id}" title="${esc(c.title)}" aria-current="${active ? 'page' : 'false'}"
      class="conv-item flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${active ? 'bg-indigo-50 text-indigo-900' : 'text-zinc-700 hover:bg-zinc-100'}">
      <span class="conv-icon hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${active ? 'bg-indigo-600 text-white' : 'bg-zinc-200 text-zinc-700'}">${esc(c.title.charAt(0).toUpperCase())}</span>
      <span class="conv-text min-w-0 flex-1">
        <span class="block truncate text-sm ${active ? 'font-medium' : ''}">${esc(c.title)}</span>
        <span class="block text-xs text-zinc-400">${esc(c.when)}</span>
      </span>
    </button>`;

  const ConversationList = (conversations, activeId) =>
    conversations.length
      ? conversations.map((c) => ConversationItem(c, c.id === activeId)).join('')
      : `<p class="conv-text px-3 py-2 text-sm text-zinc-400">No conversations yet</p>`;

  // ── Details dialog ─────────────────────────────────────────────────────────

  const StockLabel = (stock) =>
    stock === 0 ? '<span class="text-rose-600">Out of stock</span>'
    : stock <= 10 ? `<span class="text-amber-600">Only ${stock} left</span>`
    : '<span class="text-emerald-600">In stock</span>';

  const ProductDetailsDialog = (p, imageIndex = 0) => `
    <div class="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/40 backdrop-blur-sm sm:items-center sm:p-6 fade-in"
         data-action="close-dialog" data-backdrop>
      <div role="dialog" aria-modal="true" aria-labelledby="dlg-title"
           class="sheet-in max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-3xl sm:rounded-3xl">
        <div class="sticky top-0 z-10 flex items-center justify-between bg-white/90 px-3 pt-2 backdrop-blur">
          <span class="w-9"></span><span class="h-1.5 w-10 rounded-full bg-zinc-300 sm:invisible"></span>
          <button type="button" data-action="close-dialog" aria-label="Close" class="rounded-full p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900">✕</button>
        </div>
        <div class="grid gap-6 px-5 pb-6 pt-1 sm:grid-cols-2 sm:px-6">
          <div>
            ${ProductImage({ ...p, thumbnail: p.images[imageIndex] ?? p.thumbnail }, 'aspect-square rounded-2xl overflow-hidden')}
            ${p.images.length > 1 ? `<div class="mt-3 flex gap-2 overflow-x-auto no-scrollbar">${p.images
              .map(
                (src, i) => `<button type="button" data-action="dialog-image" data-index="${i}" aria-label="Image ${i + 1}"
                  class="h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 bg-zinc-100 ${i === imageIndex ? 'border-indigo-500' : 'border-transparent'}">
                  <img src="${esc(src)}" alt="" class="h-full w-full object-contain mix-blend-multiply"></button>`,
              )
              .join('')}</div>` : ''}
          </div>
          <div class="flex flex-col gap-3">
            <div>
              <p class="text-xs font-medium uppercase tracking-wide text-zinc-400">${esc(p.brand ?? p.category)}</p>
              <h2 id="dlg-title" class="text-lg font-semibold leading-snug text-zinc-900">${esc(p.title)}</h2>
            </div>
            <div class="flex items-baseline gap-2">
              <span class="text-2xl font-semibold text-zinc-900">${money(p.price)}</span>
              ${p.discountPercentage >= 5 ? `<span class="text-sm text-zinc-400 line-through">${money(originalPrice(p))}</span><span class="text-sm font-semibold text-rose-600">−${Math.round(p.discountPercentage)}%</span>` : ''}
            </div>
            <div class="flex items-center gap-3 text-sm">${Rating(p.rating)}<span class="text-zinc-300">•</span>
              ${StockLabel(p.stock)}</div>
            <p class="text-sm leading-relaxed text-zinc-600">${esc(p.description)}</p>
            <div class="flex flex-wrap gap-1.5">${p.tags.map((t) => `<span class="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600">${esc(t)}</span>`).join('')}</div>
          </div>
        </div>
      </div>
    </div>`;

  // ── Composer ───────────────────────────────────────────────────────────────

  const Composer = (busy) => `
    <form data-composer class="mx-auto flex w-full max-w-3xl items-end gap-2 rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-500/10">
      <label for="composer-input" class="sr-only">Message</label>
      <textarea id="composer-input" rows="1" ${busy ? 'disabled' : ''} placeholder="${busy ? 'Assistant is replying…' : 'What are you looking for?'}"
        class="max-h-40 min-h-[2.5rem] flex-1 resize-none bg-transparent px-2 py-2 text-[15px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none disabled:cursor-not-allowed"></textarea>
      <button type="submit" ${busy ? 'disabled' : ''} aria-label="Send"
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition hover:bg-indigo-700 disabled:bg-zinc-300">↑</button>
    </form>`;

  P.ui = {
    esc, money, inline,
    ProductCard, ProductGroup, GroupChip, AssumptionChip,
    UserBubble, AssistantMessage, OffCatalogNotice, ErrorBlock, EmptyState,
    ConversationList, ProductDetailsDialog, Composer,
  };
})((window.Proto = window.Proto || {}));
