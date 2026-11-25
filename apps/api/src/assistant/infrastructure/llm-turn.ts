/** What every LlmPort adapter does the same way, whichever provider runs the turn. */

/** Tool-call rounds per turn (search → maybe a second search → reply). */
export const MAX_STEPS = 3;

export const LLM_FAILED = 'The assistant could not finish this reply. Please try again.';
export const REPLY_NOT_SAVED =
  'Your reply was shown but could not be saved. It may be missing after a refresh.';

export const SEARCH_PRODUCTS_DESCRIPTION =
  'Search the shop Catalog. One call per Search Intent. Returns `match` (up to 4 matching Products + total) ' +
  'and `recommended` (up to 4 similar Products the system adds as "You might also like", or null).';
export const REPORT_OFF_CATALOG_DESCRIPTION =
  'Mark that the Shopper asked for something this shop does not sell.';

/** The saved reply = the text of every step, in order. */
export const joinStepText = (steps: readonly { text: string }[]): string =>
  steps
    .map((s) => s.text.trim())
    .filter(Boolean)
    .join('\n\n');
