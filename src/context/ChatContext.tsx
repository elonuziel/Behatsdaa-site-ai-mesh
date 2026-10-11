import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ChatMessage, ChatResponse, AiProviderKey, ProviderInfo, AiStatusResponse } from '../types/chat';
import { useClubs } from './ClubContext';

interface ChatContextType {
  messages: ChatMessage[];
  isLoading: boolean;
  isChatOpen: boolean;
  isAiOnline: boolean | null;
  activeProvider: string | null;
  activeModel: string | null;
  selectedProvider: AiProviderKey;
  setSelectedProvider: (provider: AiProviderKey) => void;
  providerStatuses: Record<AiProviderKey, ProviderInfo> | null;
  refreshAiStatus: () => Promise<void>;
  openChat: (initialPrompt?: string) => void;
  closeChat: () => void;
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const STORAGE_KEY = 'behatsdaa_ai_chat_messages_v1';
const PROVIDER_STORAGE_KEY = 'behatsdaa_ai_selected_provider_v1';

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeClubs } = useClubs();
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to parse saved chat messages', e);
    }
    return [];
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [isAiOnline, setIsAiOnline] = useState<boolean | null>(null);
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const [activeModel, setActiveModel] = useState<string | null>(null);
  const [providerStatuses, setProviderStatuses] = useState<Record<AiProviderKey, ProviderInfo> | null>(null);
  const [selectedProvider, setSelectedProviderState] = useState<AiProviderKey>(() => {
    try {
      const saved = localStorage.getItem(PROVIDER_STORAGE_KEY);
      if (saved && ['gemini', 'openai', 'claude', 'groq', 'deepseek'].includes(saved)) {
        return saved as AiProviderKey;
      }
    } catch {}
    return 'gemini';
  });

  const setSelectedProvider = useCallback((p: AiProviderKey) => {
    setSelectedProviderState(p);
    try {
      localStorage.setItem(PROVIDER_STORAGE_KEY, p);
    } catch {}
  }, []);

  const refreshAiStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/ai-status');
      if (res.ok) {
        const data: AiStatusResponse = await res.json();
        setIsAiOnline(data.isAiOnline ?? false);
        setActiveProvider(data.provider || null);
        setActiveModel(data.model || null);
        if (data.providers) {
          setProviderStatuses(data.providers);
        }
      }
    } catch {
      setIsAiOnline(false);
    }
  }, []);

  // Probe AI availability on mount
  useEffect(() => {
    refreshAiStatus();
  }, [refreshAiStatus]);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      console.warn('Failed to persist chat messages', e);
    }
  }, [messages]);

  const clearChat = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isLoading) return;

      const userMsgId = 'user_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      const userMessage: ChatMessage = {
        id: userMsgId,
        role: 'user',
        content: trimmed,
        timestamp: Date.now(),
      };

      const updatedHistory = [...messages, userMessage];
      setMessages(updatedHistory);
      setIsLoading(true);

      try {
        const payloadMessages = updatedHistory.map(m => ({
          role: m.role,
          content: m.content,
        }));

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: payloadMessages,
            activeClubs: Array.from(activeClubs),
            provider: selectedProvider,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Server responded with ${res.status}`);
        }

        const data: ChatResponse = await res.json();

        if (data.isAiOnline !== undefined) {
          setIsAiOnline(data.isAiOnline);
        }
        if (data.provider) {
          setActiveProvider(data.provider);
        }
        if (data.model) {
          setActiveModel(data.model);
        }

        const assistantMsgId = 'assistant_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        const assistantMessage: ChatMessage = {
          id: assistantMsgId,
          role: 'assistant',
          content: data.reply || 'לא התקבלה תשובה מהשרת.',
          timestamp: Date.now(),
          recommendedStores: data.recommendedStores || [],
          recommendedDeals: data.recommendedDeals || [],
          recommendedBilling: data.recommendedBilling || [],
          followUps: data.suggestedFollowUps || [],
          isAiOnline: data.isAiOnline,
          provider: data.provider,
          model: data.model,
          statusNote: data.statusNote,
        };

        setMessages(prev => [...prev, assistantMessage]);
      } catch (err: any) {
        console.error('Error querying AI assistant:', err);
        setIsAiOnline(false);
        const assistantMsgId = 'err_' + Date.now();
        const errorMessage: ChatMessage = {
          id: assistantMsgId,
          role: 'assistant',
          content: `מצטער, נתקלתי בבעיה טכנית בעת עיבוד השאלה: ${err.message || 'שגיאת רשת'}.\nניתן לנסות שוב או לחפש ישירות בסרגל החיפוש.`,
          timestamp: Date.now(),
          isAiOnline: false,
        };
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, activeClubs]
  );

  const openChat = useCallback(
    (initialPrompt?: string) => {
      setIsChatOpen(true);
      if (initialPrompt && initialPrompt.trim()) {
        setTimeout(() => {
          sendMessage(initialPrompt.trim());
        }, 150);
      }
    },
    [sendMessage]
  );

  const closeChat = useCallback(() => {
    setIsChatOpen(false);
  }, []);

  return (
    <ChatContext.Provider
      value={{
        messages,
        isLoading,
        isChatOpen,
        isAiOnline,
        activeProvider,
        activeModel,
        selectedProvider,
        setSelectedProvider,
        providerStatuses,
        refreshAiStatus,
        openChat,
        closeChat,
        sendMessage,
        clearChat,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
