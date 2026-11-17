import type { ConversationSummary } from '@app/contracts';
import { relativeTime } from '../lib/format';

interface Props {
  conversations: readonly ConversationSummary[];
  activeId: string | undefined;
  now: Date;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

/** Conversation Titles, newest activity first (server order), active one highlighted (AC6.2). */
export function ConversationList({ conversations, activeId, now, onSelect, onDelete }: Props) {
  if (conversations.length === 0)
    return <p className="px-3 py-2 text-sm text-zinc-400">No conversations yet</p>;
  return (
    <ul className="space-y-0.5">
      {conversations.map((c) => {
        const active = c.id === activeId;
        return (
          <li key={c.id} className="group relative">
            <button
              type="button"
              onClick={() => onSelect(c.id)}
              title={c.title}
              aria-current={active ? 'page' : undefined}
              className={`flex w-full flex-col rounded-xl py-2 pr-9 pl-3 text-left transition focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none ${
                active ? 'bg-indigo-50 text-indigo-900' : 'text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              <span className={`block truncate text-sm ${active ? 'font-medium' : ''}`}>{c.title}</span>
              <span className="block text-xs text-zinc-400">{relativeTime(c.updatedAt, now)}</span>
            </button>
            <button
              type="button"
              onClick={() => onDelete(c.id)}
              aria-label={`Delete “${c.title}”`}
              className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-lg p-1.5 text-xs text-zinc-400 opacity-0 transition group-hover:opacity-100 hover:bg-zinc-200 hover:text-rose-600 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
            >
              <span aria-hidden="true">🗑</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
