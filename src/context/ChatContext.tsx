import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ChatMessage, ChatResponse } from '../types/chat';
import { useClubs } from './ClubContext';

interface ChatContextType {
  messages: ChatMessage[];
  isLoading: boolean;
  isChatOpen: boolean;
  openChat: (initialPrompt?: string) => void;
  closeChat: () => void;
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const STORAGE_KEY = 'behatsdaa_ai_chat_messages_v1';

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
            activeClubs,
            model: 'gemini-3.8-flash',
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Server responded with ${res.status}`);
        }

        const data: ChatResponse = await res.json();

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
        };

        setMessages(prev => [...prev, assistantMessage]);
      } catch (err: any) {
        console.error('Error querying AI assistant:', err);
        const assistantMsgId = 'err_' + Date.now();
        const errorMessage: ChatMessage = {
          id: assistantMsgId,
          role: 'assistant',
          content: `מצטער, נתקלתי בבעיה טכנית בעת עיבוד השאלה: ${err.message || 'שגיאת רשת'}.\nניתן לנסות שוב או לחפש ישירות בסרגל החיפוש.`,
          timestamp: Date.now(),
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
