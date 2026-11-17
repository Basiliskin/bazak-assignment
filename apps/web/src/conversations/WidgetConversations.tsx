import { useConversationList, useDeleteConversation } from '../api/queries';
import { ConversationList } from './ConversationList';

interface Props {
  activeId: string;
  onSelect: (id: string) => void;
  onDeleted: (id: string) => void;
}

/** In-window Conversation list (☰) for the widget (D39): same list and queries as the sidebar, no chrome. */
export function WidgetConversations({ activeId, onSelect, onDeleted }: Props) {
  const list = useConversationList();
  const remove = useDeleteConversation();

  return (
    <nav
      className="animate-rise absolute inset-0 z-10 overflow-y-auto bg-white px-2 py-3"
      aria-label="Conversations"
    >
      <p className="px-3 pb-2 text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">
        Conversations
      </p>
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
  );
}
