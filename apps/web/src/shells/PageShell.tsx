import { useParams } from 'react-router';

/** Placeholder — S4 adds the sidebar and ChatView. */
export function PageShell() {
  const { conversationId } = useParams();
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <p className="text-sm text-zinc-500">Chat {conversationId ?? '(new)'} — coming in S4</p>
    </main>
  );
}
