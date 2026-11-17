import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from './client';

export const queryKeys = {
  conversationList: ['conversations', 'list'] as const,
  conversation: (id: string) => ['conversation', id] as const,
  product: (id: number) => ['product', id] as const,
};

const retryUnlessClientError = (failures: number, error: unknown) =>
  !(error instanceof ApiError && error.status < 500) && failures < 1;

export const useConversationList = () =>
  useQuery({ queryKey: queryKeys.conversationList, queryFn: api.listConversations });

/** History of one Conversation. A 404 is an answer (new or deleted chat), not something to retry. */
export const useConversation = (id: string) =>
  useQuery({
    queryKey: queryKeys.conversation(id),
    queryFn: () => api.getConversation(id),
    retry: retryUnlessClientError,
    refetchOnWindowFocus: false,
  });

export const useDeleteConversation = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: api.deleteConversation,
    onSuccess: (_, id) => {
      client.removeQueries({ queryKey: queryKeys.conversation(id) });
      return client.invalidateQueries({ queryKey: queryKeys.conversationList });
    },
  });
};

/** Details popup (AC4.3). Catalog data changes rarely — cached for the session. */
export const useProduct = (id: number) =>
  useQuery({
    queryKey: queryKeys.product(id),
    queryFn: () => api.getProduct(id),
    retry: retryUnlessClientError,
    staleTime: Infinity,
  });
