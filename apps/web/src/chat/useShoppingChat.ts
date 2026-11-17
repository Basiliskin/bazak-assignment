import { useChat } from '@ai-sdk/react';
import type { Message } from '@app/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { DefaultChatTransport } from 'ai';
import { useMemo, useState } from 'react';
import { api } from '../api/client';
import { queryKeys } from '../api/queries';
import type { ShopUIMessage } from './chat-types';
import { toChatItems } from './to-chat-items';
import { toChatRequest } from './to-chat-request';
import { toUIMessages } from './to-ui-messages';

/**
 * `useChat` wired to POST /api/chat for one Conversation. Seeded with the stored Messages (D26);
 * sends only the new Message; refreshes the sidebar when a turn ends.
 */
export function useShoppingChat(conversationId: string, stored: readonly Message[]) {
  const queryClient = useQueryClient();
  const [transport] = useState(
    () =>
      new DefaultChatTransport<ShopUIMessage>({
        api: api.chatUrl,
        prepareSendMessagesRequest: ({ messages }) => ({ body: toChatRequest(conversationId, messages) }),
      }),
  );
  const [initialMessages] = useState(() => toUIMessages(stored));

  const chat = useChat<ShopUIMessage>({
    id: conversationId,
    messages: initialMessages,
    transport,
    generateId: () => crypto.randomUUID(),
    onFinish: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.conversationList });
    },
  });

  const items = useMemo(() => toChatItems(chat.messages), [chat.messages]);
  const busy = chat.status === 'submitted' || chat.status === 'streaming';

  return {
    items,
    status: chat.status,
    busy,
    error: chat.error,
    send: (text: string) => chat.sendMessage({ text }),
    retry: () => chat.regenerate(),
  };
}
