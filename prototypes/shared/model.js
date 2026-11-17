// Functional core of the prototypes: pure functions only (no DOM, no timers, no randomness).
// Mirrors the real app's domain helpers: buildGroup ≈ toProductGroup, deriveTitle, remaining ("N more").
(function (P) {
  const PAGE_SIZE = 4; // R7: ≤ 4 Product Cards per Product Group

  /** ProductGroup (contracts shape) for a seed and offset. Prototype has data for 2 pages max. */
  function buildGroup(products, seeds, key, { offset = 0, brokenImage = false } = {}) {
    const seed = seeds[key];
    const ids = offset === 0 ? seed.ids : seed.moreIds;
    const cards = ids.slice(0, PAGE_SIZE).map((id, i) =>
      brokenImage && i === 0 ? { ...products[id], thumbnail: 'data:image/png;base64,broken' } : products[id],
    );
    return { key, label: seed.label, query: { ...seed.query, offset }, products: cards, total: seed.total, offset };
  }

  const remaining = (group) => Math.max(0, group.total - group.offset - group.products.length);

  /** "Show more" is only offered where the prototype holds a next page. */
  const canShowMore = (seeds, group) => remaining(group) > 0 && group.offset === 0 && seeds[group.key].moreIds.length > 0;

  /** Conversation Title = first Shopper message cut to ~40 chars (GLOSSARY). */
  const deriveTitle = (text) => {
    const clean = text.trim().replace(/\s+/g, ' ');
    return clean.length <= 40 ? clean : clean.slice(0, 39).trimEnd() + '…';
  };

  /** Free-typed text → which canned scenario answers it (stand-in for the LLM). */
  function matchScenario(text) {
    const t = text.toLowerCase();
    if (/flight|hotel|ticket|tokyo|taxi/.test(t)) return 'offCatalog';
    if (/lipstick/.test(t) && /phone/.test(t)) return 'multiIntent';
    if (/laptop/.test(t)) return 'error';
    if (/phone/.test(t)) return 'plain';
    return 'ambiguous';
  }

  /** Split text into small chunks (word + following space) to simulate token streaming. */
  const toStreamChunks = (text) => text.match(/\S+\s*/g) ?? [];

  P.model = { PAGE_SIZE, buildGroup, remaining, canShowMore, deriveTitle, matchScenario, toStreamChunks };
})((window.Proto = window.Proto || {}));
