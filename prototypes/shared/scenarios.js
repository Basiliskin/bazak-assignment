// Scripted Assistant turns standing in for the LLM. Each maps to an acceptance criterion in docs/requirements.md.
(function (P) {
  P.scenarios = {
    plain: {
      menu: 'Plain search (AC3.1, "N more")',
      user: 'show me smartphones',
      groups: ['smartphones'],
      text: 'Here are the **top-rated smartphones** in the shop. Tap a card for details, or tell me a budget or brand and I’ll narrow it down.',
    },
    ambiguous: {
      menu: 'Ambiguous: "something cheap and cool" (R2)',
      user: 'something cheap and cool',
      groups: ['cheapCool'],
      text: 'I took “cheap and cool” as **trendy sunglasses under $30** — the most stylish low-priced pick in the catalog, starting at $19.99. Did you have a specific kind of item or budget in mind?',
    },
    offCatalog: {
      menu: 'Off-catalog: "a flight to Tokyo" (R3)',
      user: 'a flight to Tokyo',
      offCatalog: 'flights',
      groups: ['travelBags'],
      text: 'I can’t book flights — I can only search this shop’s catalog. If you’re packing for Tokyo, here are a couple of **travel-friendly bags**. Want sunglasses or other travel accessories too?',
    },
    multiIntent: {
      menu: 'Multi-intent: phone + lipstick (R4)',
      user: 'a phone under $500 and a lipstick',
      groups: ['phones500', 'lipstick'],
      text: 'Two searches, two results: **phones under $500** (13 match — the Realme XT has the best rating) and **lipsticks** (the shop has one, Red Lipstick at $12.99). Want me to narrow the phones by brand?',
    },
    error: {
      menu: 'LLM error mid-reply + Retry (AC2.3)',
      user: 'best laptops for coding',
      groups: [],
      text: 'Looking at the laptops in the catalog, the best ones for coding are the models with the most memory and',
      failAfterChunks: 16,
      retry: {
        groups: ['laptops'],
        text: 'Here are the **top-rated laptops**. For coding, prioritise RAM and a good keyboard — tap a card to compare specs.',
      },
    },
    brokenImage: {
      menu: 'Broken product image (AC4.5)',
      user: 'show me smartphones',
      groups: ['smartphones'],
      brokenImage: true,
      text: 'Here are the **top-rated smartphones**. (The first card’s image failed to load — a placeholder is shown instead.)',
    },
  };

  /** Empty-state example prompts: one plain + the three tricky cases. */
  P.examples = [
    { icon: '📱', text: 'show me smartphones', scenario: 'plain' },
    { icon: '😎', text: 'something cheap and cool', scenario: 'ambiguous' },
    { icon: '🛍️', text: 'a phone under $500 and a lipstick', scenario: 'multiIntent' },
    { icon: '✈️', text: 'a flight to Tokyo', scenario: 'offCatalog' },
  ];

  /** Past Conversations shown in the sidebar on load (rendered instantly, no streaming). */
  P.storedConversations = [
    { id: 'c-multi', scenario: 'multiIntent', when: '2h ago' },
    { id: 'c-cheap', scenario: 'ambiguous', when: 'Yesterday' },
    { id: 'c-tokyo', scenario: 'offCatalog', when: 'Mon' },
  ];
})((window.Proto = window.Proto || {}));
