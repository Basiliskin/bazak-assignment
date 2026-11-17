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
