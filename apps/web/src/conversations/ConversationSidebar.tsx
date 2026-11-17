import { Link } from 'react-router';
import { useConversationList, useDeleteConversation } from '../api/queries';
import { ConversationList } from './ConversationList';

interface Props {
  activeId: string | undefined;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDeleted: (id: string) => void;
  onClose: () => void;
}

/** Sidebar container: loads the Conversation list, owns New chat and delete. */
export function ConversationSidebar({ activeId, onSelect, onNewChat, onDeleted, onClose }: Props) {
  const list = useConversationList();
  const remove = useDeleteConversation();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-xs text-white"
            aria-hidden="true"
          >
            ✦
          </span>
          Shopping Copilot
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 lg:hidden"
          aria-label="Close conversations"
        >
          ✕
        </button>
      </div>
      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={onNewChat}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-3 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
        >
          <span className="text-base leading-none" aria-hidden="true">
            ＋
          </span>
          New chat
        </button>
      </div>
      <p className="px-5 pt-3 pb-1 text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">
        Conversations
      </p>
      <nav className="flex-1 overflow-y-auto px-2 pb-4" aria-label="Conversations">
        {list.isPending ? (
          <p className="px-3 py-2 text-sm text-zinc-400">Loading…</p>
        ) : list.isError ? (
          <p className="px-3 py-2 text-sm text-rose-700">
            Could not load conversations.{' '}
            <button type="button" className="underline" onClick={() => void list.refetch()}>
              Retry
            </button>
          </p>
        ) : (
          <ConversationList
            conversations={list.data}
            activeId={activeId}
            now={new Date()}
            onSelect={onSelect}
            onDelete={(id) => remove.mutate(id, { onSuccess: () => onDeleted(id) })}
          />
        )}
      </nav>
    </div>
  );
}
