import type { ProductGroup } from '@app/contracts';
import { toInlineSegments } from '../lib/format';

/** Small presentational pieces of an Assistant Message (docs/design.md → Components). */

export function TypingDots() {
  return (
    <div className="flex gap-1 py-2" role="status" aria-label="Assistant is typing">
      <span className="dot" />
      <span className="dot" />
      <span className="dot" />
    </div>
  );
}

export function ToolStatus({ label }: { label: string }) {
  return (
    <div
      role="status"
      className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700"
    >
      <span
        className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-700"
        aria-hidden="true"
      />
      Searching: {label}…
    </div>
  );
}

export function OffCatalogNotice({ request }: { request: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-xl bg-zinc-100 px-3 py-2 text-sm text-zinc-700 ring-1 ring-zinc-200 ring-inset">
      <span aria-hidden="true">🚫</span>
      <span>
        Not sold here: <strong className="font-semibold">{request}</strong>
      </span>
    </div>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800"
    >
      <span>{message} Your message is saved.</span>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-700 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none"
      >
        Retry
      </button>
    </div>
  );
}

export function RichText({ text, streaming }: { text: string; streaming: boolean }) {
  return (
    <p className="text-[15px] leading-relaxed whitespace-pre-line text-zinc-700">
      {toInlineSegments(text).map((s, i) =>
        s.bold ? (
          <strong key={i} className="font-semibold text-zinc-900">
            {s.text}
          </strong>
        ) : (
          s.text
        ),
      )}
      {streaming && <span className="caret" aria-hidden="true" />}
    </p>
  );
}

/** Placeholder until S5 (cards, grid/carousel, Assumption chip, Show more). */
export function ProductGroupPreview({ group }: { group: ProductGroup }) {
  const from = group.query.offset + 1;
  const to = group.query.offset + group.products.length;
  return (
    <section aria-label={group.label} className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center gap-x-2">
        <h3 className="text-sm font-semibold text-zinc-900">{group.label}</h3>
        <span className="text-xs text-zinc-500">
          {group.total === 0 ? 'no matches' : `${from}–${to} of ${group.total}`}
        </span>
      </div>
      <ul className="space-y-1 text-sm text-zinc-700">
        {group.products.map((p) => (
          <li key={p.id} className="flex justify-between gap-3">
            <span className="truncate">{p.title}</span>
            <span className="shrink-0 font-medium">${p.price.toFixed(2)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
