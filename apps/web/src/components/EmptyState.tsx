export const EXAMPLE_PROMPTS = [
  { icon: '📱', text: 'show me smartphones' },
  { icon: '😎', text: 'something cheap and cool' },
  { icon: '🛍️', text: 'a phone under $500 and a lipstick' },
  { icon: '✈️', text: 'a flight to Tokyo' },
] as const;

export function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="animate-rise flex min-h-full flex-col items-center justify-center px-2 py-10 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-xl text-white shadow-lg shadow-indigo-500/20">
        ✦
      </div>
      <h2 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
        What are you shopping for?
      </h2>
      <p className="mt-1.5 max-w-sm text-sm text-zinc-500">
        Describe it in your own words — I’ll search the catalog and show you real products.
      </p>
      <div className="mt-6 grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
        {EXAMPLE_PROMPTS.map((e) => (
          <button
            key={e.text}
            type="button"
            onClick={() => onPick(e.text)}
            className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm text-zinc-700 shadow-sm transition hover:border-indigo-300 hover:shadow focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
          >
            <span className="text-lg" aria-hidden="true">
              {e.icon}
            </span>
            {e.text}
          </button>
        ))}
      </div>
    </div>
  );
}
