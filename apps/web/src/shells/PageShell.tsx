import { useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router';
import { useConversationList } from '../api/queries';
import { ChatView } from '../chat/ChatView';
import { ConversationSidebar } from '../conversations/ConversationSidebar';

interface NewChatState {
  fresh: true;
}

const isNewChatState = (state: unknown): state is NewChatState =>
  typeof state === 'object' && state !== null && (state as NewChatState).fresh === true;

/**
 * Where a Conversation opens as a full page. `fresh` lets a not-yet-saved id show an empty chat
 * instead of "not found" — used by New chat and by the widget's ⤢ (its id may not be saved yet).
 */
export const chatLocation = (id: string) => ({
  to: `/chat/${id}`,
  state: { fresh: true } satisfies NewChatState,
});

const newChatTarget = () => chatLocation(crypto.randomUUID());

/** `/chat` → a new Conversation id in the URL right away, so the URL never changes mid-stream (D27). */
export function NewChatRedirect() {
  const [target] = useState(newChatTarget);
  return <Navigate to={target.to} state={target.state} replace />;
}

/** Full page (A): persistent sidebar ≥ lg, drawer below; the active Conversation lives in the URL. */
export function PageShell() {
  const { conversationId = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  // Drawer is open for one Conversation: navigating to another closes it without an effect.
  const [drawerFor, setDrawerFor] = useState<string | null>(null);
  const drawerOpen = drawerFor === conversationId;
  const setDrawerOpen = (open: boolean) => setDrawerFor(open ? conversationId : null);
  const list = useConversationList();
  const title = list.data?.find((c) => c.id === conversationId)?.title ?? 'New chat';

  const newChat = () => {
    const target = newChatTarget();
    void navigate(target.to, { state: target.state });
  };

  return (
    <div className="flex h-dvh bg-zinc-50 text-zinc-900">
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 shrink-0 border-r border-zinc-200 bg-white transition-transform duration-250 ease-out lg:static lg:translate-x-0 ${
          drawerOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <ConversationSidebar
          activeId={conversationId}
          onSelect={(id) => void navigate(`/chat/${id}`)}
          onNewChat={newChat}
          onDeleted={(id) => id === conversationId && newChat()}
          onClose={() => setDrawerOpen(false)}
        />
      </aside>
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-zinc-950/30 backdrop-blur-[1px] lg:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-zinc-200/80 bg-white/80 px-3 backdrop-blur sm:px-4">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 lg:hidden"
            aria-label="Open conversations"
          >
            ☰
          </button>
          <h1 className="truncate text-sm font-medium text-zinc-700">{title}</h1>
        </header>
        <ChatView
          key={conversationId}
          conversationId={conversationId}
          fresh={isNewChatState(location.state)}
          onNewChat={newChat}
        />
      </main>
    </div>
  );
}
