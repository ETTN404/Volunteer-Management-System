import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from '@/shared/api/http';
import type { ChatReply } from '@/shared/types/api';

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  created_at: string;
}

export const chatApi = {
  /** POST /volunteer/chat — ChatbotResponseResource is returned without a `data` wrapper. */
  send: async (message: string) => (await http.post<ChatReply>('/volunteer/chat', { message })).raw as unknown as ChatReply,
  /** PENDING-BE (G11) */
  history: async () => (await http.get<ChatMessage[]>('/volunteer/chat/history')).data,
  /** PENDING-BE (G11) */
  clear: () => http.delete('/volunteer/chat/history'),
};

export const chatKeys = { history: ['chat', 'history'] as const };

export const useChatHistory = () => useQuery({ queryKey: chatKeys.history, queryFn: chatApi.history, staleTime: Infinity });

export function useSendChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: chatApi.send,
    onMutate: async (message) => {
      await qc.cancelQueries({ queryKey: chatKeys.history });
      qc.setQueryData<ChatMessage[]>(chatKeys.history, (old = []) => [
        ...old,
        { role: 'user', content: message, created_at: new Date().toISOString() },
      ]);
    },
    onSuccess: (reply) => {
      qc.setQueryData<ChatMessage[]>(chatKeys.history, (old = []) => [
        ...old,
        { role: 'model', content: reply.response, created_at: reply.timestamp },
      ]);
    },
  });
}

export function useClearChat() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: chatApi.clear, onSuccess: () => qc.setQueryData(chatKeys.history, []) });
}
