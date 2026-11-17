import type { Message } from '@app/contracts';
import { useEffect, useRef, useState } from 'react';
import { ApiError } from '../api/client';
import { useConversation } from '../api/queries';
import { AssistantAvatar, MessageBubble } from '../components/MessageBubble';
import { ErrorBlock, TypingDots } from '../components/chat-parts';
import { Composer } from '../components/Composer';
import { EmptyState } from '../components/EmptyState';
import { ProductDetailsContainer } from '../products/ProductDetailsContainer';
import { describeChatError } from './describe-chat-error';
import { useShoppingChat } from './useShoppingChat';

interface Props {
  conversationId: string;
  /** Just created by "New chat": a 404 means "not saved yet", not "not found" (D27). */
  fresh: boolean;
  onNewChat: () => void;
}

/**
 * One Conversation: loads its history, then hands it to `ChatThread`. Shared by both shells.
 * Waits for a fetch made on this mount so a reopened Conversation never starts from a stale cache.
 */
export function ChatView({ conversationId, fresh, onNewChat }: Props) {
  const conversation = useConversation(conversationId);

  if (!conversation.isFetchedAfterMount) return <Centered>Loading conversation…</Centered>;

  if (conversation.isError) {
    const status = conversation.error instanceof ApiError ? conversation.error.status : 0;
    if (status === 404 && fresh) return <ChatThread conversationId={conversationId} stored={NO_MESSAGES} />;
    return (
      <Centered>
        <p className="text-base font-medium text-zinc-900">
          {status >= 400 && status < 500 ? 'Conversation not found' : 'Could not load this conversation'}
        </p>
        <div className="mt-4 flex gap-2">
          {status >= 500 || status === 0 ? (
            <button type="button" onClick={() => void conversation.refetch()} className={SECONDARY}>
              Try again
            </button>
          ) : null}
          <button type="button" onClick={onNewChat} className={PRIMARY}>
            New chat
          </button>
        </div>
      </Centered>
    );
  }

  return <ChatThread conversationId={conversationId} stored={conversation.data?.messages ?? NO_MESSAGES} />;
}

const NO_MESSAGES: Message[] = [];
const PRIMARY = 'rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700';
const SECONDARY =
  'rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50';

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 text-center text-sm text-zinc-500">
      {children}
    </div>
  );
}

/** Messages + composer for one Conversation, live via `useShoppingChat`. */
function ChatThread({ conversationId, stored }: { conversationId: string; stored: readonly Message[] }) {
  const chat = useShoppingChat(conversationId, stored);
  const [openProductId, setOpenProductId] = useState<number | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const last = chat.items.at(-1);
  const waitingForFirstPart = chat.status === 'submitted' && last?.role === 'user';

  useEffect(() => {
    bottom.current?.scrollIntoView?.({ block: 'end', behavior: 'smooth' });
  }, [chat.items, chat.status]);

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        <div
          className="mx-auto flex min-h-full max-w-3xl flex-col gap-7 px-4 py-6 sm:px-6"
          aria-live="polite"
          aria-busy={chat.busy}
        >
          {chat.items.length === 0 ? (
            <EmptyState onPick={chat.send} />
          ) : (
            chat.items.map((item) => (
              <MessageBubble
                key={item.id}
                item={item}
                live={chat.busy && item === last && item.role === 'assistant'}
                busy={chat.busy}
                onOpenProduct={setOpenProductId}
                // The Assistant repeats that group's search with the next offset (system prompt).
                onShowMore={(group) => void chat.send(`Show more: ${group.label}`)}
              />
            ))
          )}
          {waitingForFirstPart && (
            <div className="flex gap-3">
              <AssistantAvatar />
              <TypingDots />
            </div>
          )}
          {chat.status === 'error' && (
            <ErrorBlock message={describeChatError(chat.error)} onRetry={() => void chat.retry()} />
          )}
          <div ref={bottom} />
        </div>
      </div>
      <div className="shrink-0 bg-gradient-to-t from-zinc-50 via-zinc-50 to-transparent px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
        <Composer busy={chat.busy} onSend={(text) => void chat.send(text)} />
      </div>
      {openProductId !== null && (
        <ProductDetailsContainer
          key={openProductId}
          productId={openProductId}
          onClose={() => setOpenProductId(null)}
        />
      )}
    </>
  );
}
