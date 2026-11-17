import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

interface Props {
  busy: boolean;
  onSend: (text: string) => void;
}

/** Message input. Enter sends, Shift+Enter adds a line. Disabled while the Assistant replies (AC1.1). */
export function Composer({ busy, onSend }: Props) {
  const [text, setText] = useState('');
  const input = useRef<HTMLTextAreaElement>(null);

  // A disabled textarea loses focus — give it back when the reply ends.
  useEffect(() => {
    if (!busy) input.current?.focus();
  }, [busy]);

  const submit = (e?: { preventDefault(): void }) => {
    e?.preventDefault();
    const trimmed = text.trim();
    if (busy || !trimmed) return; // AC1.2: empty message is never sent
    onSend(trimmed);
    setText('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) submit(e);
  };

  return (
    <form
      onSubmit={submit}
      className="mx-auto flex w-full max-w-3xl items-end gap-2 rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-500/10"
    >
      <label htmlFor="composer-input" className="sr-only">
        Message
      </label>
      <textarea
        id="composer-input"
        ref={input}
        rows={1}
        maxLength={2000}
        value={text}
        disabled={busy}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={busy ? 'Assistant is replying…' : 'What are you looking for?'}
        className="max-h-40 min-h-[2.5rem] flex-1 resize-none bg-transparent px-2 py-2 text-[15px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none disabled:cursor-not-allowed"
      />
      <button
        type="submit"
        disabled={busy || !text.trim()}
        aria-label="Send"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none disabled:bg-zinc-300"
      >
        ↑
      </button>
    </form>
  );
}
