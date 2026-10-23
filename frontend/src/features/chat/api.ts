import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from '@/shared/api/http';
import type { ChatLocation, ChatReply, ChatShiftCard } from '@/shared/types/api';

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  created_at: string;
  cards?: ChatShiftCard[];
  follow_ups?: string[];
  ask_location?: boolean;
  degraded?: boolean;
}

export interface ChatHistory {
  messages: ChatMessage[];
  location: ChatLocation | null;
}

export interface ChatSend {
  message: string;
  latitude?: number;
  longitude?: number;
  location_source?: 'gps' | 'map';
  location_label?: string;
  forget_location?: boolean;
}

export const chatApi = {
  /** POST /volunteer/chat — the backend rebuilds the volunteer's live context on every message. */
  // AI replies can take a while; this is not a cold start, so no "waking up" banner and a longer wait.
  send: async (input: ChatSend | string) =>
    (await http.post<ChatReply>('/volunteer/chat', typeof input === 'string' ? { message: input } : input, { timeoutMs: 90_000, silent: true })).data,
  history: async (): Promise<ChatHistory> => {
    const res = await http.get<ChatMessage[]>('/volunteer/chat/history');
    return { messages: Array.isArray(res.data) ? res.data : [], location: (res.raw.location as ChatLocation | null | undefined) ?? null };
  },
  clear: () => http.delete('/volunteer/chat/history'),
};

export const chatKeys = { history: ['chat', 'history'] as const };

export const useChatHistory = () => useQuery({ queryKey: chatKeys.history, queryFn: chatApi.history, staleTime: Infinity });

export function useSendChat() {
  const qc = useQueryClient();
  const patch = (fn: (h: ChatHistory) => ChatHistory) => qc.setQueryData<ChatHistory>(chatKeys.history, (old) => fn(old ?? { messages: [], location: null }));

  return useMutation({
    mutationFn: (input: ChatSend) => chatApi.send(input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: chatKeys.history });
      patch((h) => ({ ...h, messages: [...h.messages, { role: 'user', content: input.message, created_at: new Date().toISOString() }] }));
    },
    onSuccess: (reply, input) =>
      patch((h) => ({
        location: input.forget_location ? null : (reply.location ?? h.location),
        messages: [
          ...h.messages,
          {
            role: 'model',
            content: typeof reply.response === 'string' ? reply.response : '',
            created_at: reply.timestamp ?? new Date().toISOString(),
            cards: reply.cards ?? [],
            follow_ups: reply.follow_ups ?? [],
            ask_location: Boolean(reply.ask_location),
            degraded: Boolean(reply.degraded),
          },
        ],
      })),
    // Drop the optimistic question so the volunteer can retry it.
    onError: (_e, input) =>
      patch((h) => {
        const i = h.messages.findLastIndex((m) => m.role === 'user' && m.content === input.message);
        return i < 0 ? h : { ...h, messages: h.messages.filter((_, j) => j !== i) };
      }),
  });
}

export function useClearChat() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: chatApi.clear, onSuccess: () => qc.setQueryData<ChatHistory>(chatKeys.history, (h) => ({ messages: [], location: h?.location ?? null })) });
}
