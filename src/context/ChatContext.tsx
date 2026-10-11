import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  ChatMessage,
  ChatResponse,
  AiProviderKey,
  ProviderInfo,
  AiStatusResponse,
  AiModelOption,
  ModelsResponse,
} from '../types/chat';
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
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  availableModels: AiModelOption[];
  isLoadingModels: boolean;
  modelsError: string | null;
  fetchModelsForProvider: (provider?: AiProviderKey) => Promise<void>;
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
const MODEL_PREFS_KEY = 'behatsdaa_ai_models_by_provider_v1';

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

  const [providerModelPreferences, setProviderModelPreferences] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(MODEL_PREFS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.gemini === 'gemini-3.1-pro' || !parsed.gemini) {
          parsed.gemini = 'gemini-flash-lite-latest';
        }
        return parsed;
      }
    } catch {}
    return {
      gemini: 'gemini-flash-lite-latest',
      openai: 'gpt-4o',
      claude: 'claude-3-5-sonnet',
      groq: 'llama-3.3-70b',
      deepseek: 'deepseek-chat',
    };
  });

  const [selectedModel, setSelectedModelState] = useState<string>(() => {
    const saved = providerModelPreferences[selectedProvider];
    if (saved && saved !== 'gemini-3.1-pro') return saved;
    return selectedProvider === 'gemini' ? 'gemini-flash-lite-latest' : 'gpt-4o';
  });

  const [availableModels, setAvailableModels] = useState<AiModelOption[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState<boolean>(false);
  const [modelsError, setModelsError] = useState<string | null>(null);

  const setSelectedModel = useCallback((model: string) => {
    setSelectedModelState(model);
    setProviderModelPreferences(prev => {
      const next = { ...prev, [selectedProvider]: model };
      try {
        localStorage.setItem(MODEL_PREFS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [selectedProvider]);

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
        return;
      }
    } catch {
      // Ignore and fallback to workflow build static bundle
    }

    // Static GitHub Pages fallback: probe workflow-generated ai-models.json
    try {
      const staticRes = await fetch('./data/ai-models.json').catch(() => fetch('./ai-models.json'));
      if (staticRes && staticRes.ok) {
        const staticBundle = await staticRes.json();
        if (staticBundle?.providers) {
          const statuses = {} as Record<AiProviderKey, ProviderInfo>;
          let online = false;
          let actProv: AiProviderKey = 'gemini';
          let actMod = 'gemini-flash-lite-latest';

          for (const [key, val] of Object.entries(staticBundle.providers) as [AiProviderKey, any][]) {
            statuses[key] = {
              id: key,
              name: val.name || key,
              available: !!val.available,
              model: val.defaultModel || '',
              requiredSecret: val.requiredSecret || '',
              codeSnippet: '',
            };
            if (val.available && !online) {
              online = true;
              actProv = key;
              actMod = val.defaultModel || '';
            }
          }
          setProviderStatuses(statuses);
          setIsAiOnline(online);
          if (online) {
            setActiveProvider(actProv);
            setActiveModel(actMod);
          }
          return;
        }
      }
    } catch {}

    setIsAiOnline(false);
  }, []);

  const fetchModelsForProvider = useCallback(async (providerToFetch?: AiProviderKey) => {
    const p = providerToFetch || selectedProvider;
    setIsLoadingModels(true);
    setModelsError(null);
    try {
      let data: ModelsResponse | null = null;
      try {
        const res = await fetch(`/api/models?provider=${p}`);
        if (res.ok) {
          data = await res.json();
        }
      } catch {
        // Fallback to static workflow build file
      }

      // If server response is unavailable or not marked available, check workflow-generated static bundle
      if (!data || !data.available) {
        try {
          const staticRes = await fetch('./data/ai-models.json').catch(() => fetch('./ai-models.json'));
          if (staticRes && staticRes.ok) {
            const staticBundle = await staticRes.json();
            const providerData = staticBundle?.providers?.[p];
            if (providerData) {
              data = {
                available: !!providerData.available,
                provider: p,
                models: providerData.models || [],
                defaultModel: providerData.defaultModel,
                error: providerData.error,
              };
            }
          }
        } catch {}
      }

      if (data && data.available && Array.isArray(data.models) && data.models.length > 0) {
        setAvailableModels(data.models);
        // Mark provider as available immediately in providerStatuses state
        setProviderStatuses(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            [p]: {
              ...prev[p],
              available: true,
              model: data?.defaultModel || prev[p]?.model || '',
            },
          };
        });
        // If current selectedModel is valid and exists in the list, keep it; otherwise fall back to default
        const currentSaved = providerModelPreferences[p];
        const match = currentSaved && currentSaved !== 'gemini-3.1-pro' ? data.models.find(m => m.id === currentSaved) : null;
        if (match) {
          setSelectedModelState(match.id);
        } else if (data.defaultModel && data.models.some(m => m.id === data.defaultModel)) {
          setSelectedModelState(data.defaultModel);
        } else if (p === 'gemini' && data.models.some(m => m.id === 'gemini-flash-lite-latest')) {
          setSelectedModelState('gemini-flash-lite-latest');
        } else {
          setSelectedModelState(data.models[0].id);
        }
      } else {
        setAvailableModels([]);
        if (data?.error) {
          setModelsError(data.error);
        } else if (data?.defaultModel) {
          setSelectedModelState(data.defaultModel);
        }
      }
    } catch (err: any) {
      console.warn('Failed to fetch models for provider:', p, err);
      setModelsError(err?.message || 'שגיאה במשיכת מודלים');
      setAvailableModels([]);
    } finally {
      setIsLoadingModels(false);
    }
  }, [selectedProvider, providerModelPreferences]);

  const setSelectedProvider = useCallback((p: AiProviderKey) => {
    setSelectedProviderState(p);
    try {
      localStorage.setItem(PROVIDER_STORAGE_KEY, p);
    } catch {}
    // Set fallback model for provider while fetching fresh list
    const savedForProvider = providerModelPreferences[p];
    if (savedForProvider) {
      setSelectedModelState(savedForProvider);
    }
    fetchModelsForProvider(p);
    refreshAiStatus();
  }, [fetchModelsForProvider, providerModelPreferences, refreshAiStatus]);

  // Probe AI availability on mount & fetch models for default provider
  useEffect(() => {
    refreshAiStatus();
    fetchModelsForProvider(selectedProvider);
  }, []); // Run on mount

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
            model: selectedModel,
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
    [messages, isLoading, activeClubs, selectedProvider, selectedModel]
  );

  const openChat = useCallback(
    (initialPrompt?: string) => {
      setIsChatOpen(true);
      refreshAiStatus();
      if (initialPrompt && initialPrompt.trim()) {
        setTimeout(() => {
          sendMessage(initialPrompt.trim());
        }, 150);
      }
    },
    [sendMessage, refreshAiStatus]
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
        selectedModel,
        setSelectedModel,
        availableModels,
        isLoadingModels,
        modelsError,
        fetchModelsForProvider,
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
