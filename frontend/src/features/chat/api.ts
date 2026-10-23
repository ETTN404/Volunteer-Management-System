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
  threadId: string | null;
  messages: ChatMessage[];
  location: ChatLocation | null;
}

export interface ChatThread {
  id: string;
  title: string;
  preview: string;
  messages_count: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface ChatSend {
  message: string;
  thread_id?: string;
  latitude?: number;
  longitude?: number;
  location_source?: 'gps' | 'map';
  location_label?: string;
  forget_location?: boolean;
}

/** 'latest' opens the most recent conversation, 'new' is an empty one not saved yet. */
export type ThreadKey = string;

export const chatApi = {
  /** POST /volunteer/chat — the backend rebuilds the volunteer's live context on every message. */
  // AI replies can take a while; this is not a cold start, so no "waking up" banner and a longer wait.
  send: async (input: ChatSend | string) =>
    (await http.post<ChatReply>('/volunteer/chat', typeof input === 'string' ? { message: input } : input, { timeoutMs: 90_000, silent: true })).data,
  history: async (thread: ThreadKey = 'latest'): Promise<ChatHistory> => {
    const res = await http.get<ChatMessage[]>('/volunteer/chat/history', { query: thread === 'latest' ? {} : { thread_id: thread } });
    return {
      threadId: (res.raw.thread_id as string | null | undefined) ?? null,
      messages: Array.isArray(res.data) ? res.data : [],
      location: (res.raw.location as ChatLocation | null | undefined) ?? null,
    };
  },
  threads: async () => (await http.get<ChatThread[]>('/volunteer/chat/threads')).data ?? [],
  deleteThread: (id: string) => http.delete(`/volunteer/chat/threads/${id}`),
  clear: () => http.delete('/volunteer/chat/history'),
};

export const chatKeys = {
  all: ['chat'] as const,
  history: (thread: ThreadKey) => ['chat', 'history', thread] as const,
  threads: ['chat', 'threads'] as const,
};

const EMPTY: ChatHistory = { threadId: null, messages: [], location: null };

export const useChatHistory = (thread: ThreadKey) =>
  useQuery({
    queryKey: chatKeys.history(thread),
    queryFn: () => chatApi.history(thread),
    staleTime: Infinity,
    enabled: thread !== 'new',
    initialData: thread === 'new' ? EMPTY : undefined,
  });

export const useChatThreads = (enabled = true) => useQuery({ queryKey: chatKeys.threads, queryFn: chatApi.threads, enabled, staleTime: 30_000 });

/** Sends in the given conversation; a reply to a new chat reports its id through `onThread`. */
export function useSendChat(thread: ThreadKey, onThread?: (id: string) => void) {
  const qc = useQueryClient();
  const patch = (key: ThreadKey, fn: (h: ChatHistory) => ChatHistory) => qc.setQueryData<ChatHistory>(chatKeys.history(key), (old) => fn(old ?? EMPTY));

  return useMutation({
    mutationFn: (input: ChatSend) => chatApi.send(input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: chatKeys.history(thread) });
      patch(thread, (h) => ({ ...h, messages: [...h.messages, { role: 'user', content: input.message, created_at: new Date().toISOString() }] }));
    },
    onSuccess: (reply, input) => {
      const current = qc.getQueryData<ChatHistory>(chatKeys.history(thread)) ?? EMPTY;
      const next: ChatHistory = {
        threadId: reply.thread_id ?? current.threadId,
        location: input.forget_location ? null : (reply.location ?? current.location),
        messages: [
          ...current.messages,
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
      };
      qc.setQueryData(chatKeys.history(thread), next);
      if (reply.thread_id) {
        qc.setQueryData(chatKeys.history(reply.thread_id), next);
        if (reply.thread_id !== thread) onThread?.(reply.thread_id);
      }
      void qc.invalidateQueries({ queryKey: chatKeys.threads });
    },
    // Drop the optimistic question so the volunteer can retry it.
    onError: (_e, input) =>
      patch(thread, (h) => {
        const i = h.messages.findLastIndex((m) => m.role === 'user' && m.content === input.message);
        return i < 0 ? h : { ...h, messages: h.messages.filter((_, j) => j !== i) };
      }),
  });
}

export function useDeleteThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: chatApi.deleteThread,
    onSuccess: (_r, id) => {
      qc.setQueryData<ChatThread[]>(chatKeys.threads, (list) => (list ?? []).filter((t) => t.id !== id));
      qc.removeQueries({ queryKey: chatKeys.history(id) });
      void qc.invalidateQueries({ queryKey: chatKeys.history('latest') });
    },
  });
}
