import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router';
import { useConversationList } from '../api/queries';
import { ChatView } from '../chat/ChatView';
import { WidgetConversations } from '../conversations/WidgetConversations';
import { chatLocation } from './PageShell';
import { useWidgetState } from './useWidgetState';

/**
 * Widget (D): floating ✦ launcher → chat window (420×680, full screen below `sm`).
 * Header: ☰ Conversations · title · ＋ new chat · ⤢ full page · ✕ close (AC6b.1–6b.3).
 */
export function WidgetShell() {
  const [state, setState] = useWidgetState();
  const [listOpen, setListOpen] = useState(false);
  const navigate = useNavigate();
  const launcher = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(state.open);
  const list = useConversationList();
  const title = list.data?.find((c) => c.id === state.conversationId)?.title ?? 'New chat';

  // Focus back on the launcher after closing (the composer takes focus by itself on open).
  useEffect(() => {
    if (wasOpen.current && !state.open) launcher.current?.focus();
    wasOpen.current = state.open;
  }, [state.open]);

  const show = (conversationId: string) => {
    setListOpen(false);
    setState({ open: true, conversationId });
  };
  const newChat = () => show(crypto.randomUUID());
  const close = () => {
    setListOpen(false);
    setState((s) => ({ ...s, open: false }));
  };
  const openFullPage = () => {
    const target = chatLocation(state.conversationId);
    close();
    void navigate(target.to, { state: target.state });
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && listOpen) {
      e.stopPropagation();
      setListOpen(false);
    }
  };

  if (!state.open) {
    return (
      <button
        ref={launcher}
        type="button"
        onClick={() => setState((s) => ({ ...s, open: true }))}
        aria-label="Open shopping copilot"
        className="fixed right-5 bottom-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-2xl text-white shadow-lg transition hover:scale-105 hover:shadow-xl focus-visible:ring-4 focus-visible:ring-indigo-500/40 focus-visible:outline-none motion-reduce:transition-none sm:right-6 sm:bottom-6"
      >
        <span aria-hidden="true">✦</span>
      </button>
    );
  }

  return (
    <section
      role="dialog"
      aria-label="Shopping copilot"
      onKeyDown={onKeyDown}
      className="animate-rise fixed inset-0 z-40 flex h-dvh flex-col overflow-hidden bg-zinc-50 text-zinc-900 sm:inset-auto sm:right-6 sm:bottom-6 sm:h-[680px] sm:max-h-[calc(100dvh-3rem)] sm:w-[420px] sm:rounded-3xl sm:border sm:border-zinc-200 sm:shadow-2xl"
    >
      <header className="flex h-14 shrink-0 items-center gap-1 border-b border-zinc-200/80 bg-white px-2">
        <HeaderButton
          label={listOpen ? 'Hide conversations' : 'Show conversations'}
          onClick={() => setListOpen((o) => !o)}
          expanded={listOpen}
        >
          ☰
        </HeaderButton>
        <h2 className="min-w-0 flex-1 truncate px-1 text-sm font-medium text-zinc-700">{title}</h2>
        <HeaderButton label="New chat" onClick={newChat}>
          ＋
        </HeaderButton>
        <HeaderButton label="Open as full page" onClick={openFullPage}>
          ⤢
        </HeaderButton>
        <HeaderButton label="Close shopping copilot" onClick={close}>
          ✕
        </HeaderButton>
      </header>
      <div className="relative flex min-h-0 flex-1 flex-col">
        <ChatView
          key={state.conversationId}
          conversationId={state.conversationId}
          // The id comes from a local pointer and may never have been saved: 404 = empty new chat.
          fresh
          onNewChat={newChat}
          layout="carousel"
        />
        {listOpen && (
          <WidgetConversations
            activeId={state.conversationId}
            onSelect={show}
            onDeleted={(id) => id === state.conversationId && newChat()}
          />
        )}
      </div>
    </section>
  );
}

function HeaderButton({
  label,
  onClick,
  expanded,
  children,
}: {
  label: string;
  onClick: () => void;
  expanded?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-expanded={expanded}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-600 transition hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
    >
      <span aria-hidden="true">{children}</span>
    </button>
  );
}
