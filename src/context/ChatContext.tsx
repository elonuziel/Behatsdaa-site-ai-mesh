import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  ChatMessage,
  ChatResponse,
  AiProviderKey,
  ProviderInfo,
  AiStatusResponse,
  AiModelOption,
  ModelsResponse,
  EncryptedKeysBundle,
} from '../types/chat';
import { useClubs } from './ClubContext';
import {
  fetchJsonWithFallback,
  verifyPasswordHash,
  decryptKeysWithPassword,
  getClientCatalog,
  findRelevantCatalogClient,
  generateClientFallbackResponse,
  executeDirectAiChat,
} from '../services/clientAi';

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
  isPasswordRequired: boolean;
  isPasswordUnlocked: boolean;
  unlockAi: (password: string) => Promise<boolean>;
  lockAi: () => void;
  passwordError: string | null;
  clearPasswordError: () => void;
  customApiKeys: Record<string, string>;
  setCustomApiKey: (provider: AiProviderKey, key: string) => void;
  decryptedKeys: Record<string, string>;
  isProviderActive: (provider: AiProviderKey) => boolean;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const STORAGE_KEY = 'behatsdaa_ai_chat_messages_v1';
const PROVIDER_STORAGE_KEY = 'behatsdaa_ai_selected_provider_v1';
const MODEL_PREFS_KEY = 'behatsdaa_ai_models_by_provider_v1';
const AI_PASSWORD_STORAGE_KEY = 'behatsdaa_ai_user_password_v1';
const CUSTOM_KEYS_STORAGE_KEY = 'behatsdaa_ai_custom_keys_v1';

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
  const [rawIsAiOnline, setIsAiOnline] = useState<boolean | null>(null);
  const [hasBackendServer, setHasBackendServer] = useState<boolean>(false);
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const [activeModel, setActiveModel] = useState<string | null>(null);
  const [providerStatuses, setProviderStatuses] = useState<Record<AiProviderKey, ProviderInfo> | null>(null);

  // Secret Password & Decrypted API Keys protection state
  const [isPasswordRequired, setIsPasswordRequired] = useState<boolean>(false);
  const [isPasswordUnlocked, setIsPasswordUnlocked] = useState<boolean>(false);
  const [passwordHash, setPasswordHash] = useState<string | null>(null);
  const [encryptedBundle, setEncryptedBundle] = useState<EncryptedKeysBundle | null>(null);
  const [decryptedKeys, setDecryptedKeys] = useState<Record<string, string>>({});
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [customApiKeys, setCustomApiKeys] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_KEYS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [aiPassword, setAiPassword] = useState<string>(() => {
    try {
      return localStorage.getItem(AI_PASSWORD_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });

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

  const clearPasswordError = useCallback(() => {
    setPasswordError(null);
  }, []);

  const setCustomApiKey = useCallback((provider: AiProviderKey, key: string) => {
    setCustomApiKeys(prev => {
      const next = { ...prev, [provider]: key.trim() };
      try {
        localStorage.setItem(CUSTOM_KEYS_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const lockAi = useCallback(() => {
    setIsPasswordUnlocked(false);
    setAiPassword('');
    setDecryptedKeys({});
    setPasswordError(null);
    try {
      localStorage.removeItem(AI_PASSWORD_STORAGE_KEY);
    } catch {}
  }, []);

  const unlockAi = useCallback(
    async (candidatePassword: string): Promise<boolean> => {
      const trimmed = candidatePassword.trim();
      if (!trimmed) {
        setPasswordError('אנא הזן סיסמת גישה.');
        return false;
      }

      let verified = false;
      let keys: Record<string, string> | null = null;

      // 1. First try backend endpoint /api/verify-password
      try {
        const res = await fetch('/api/verify-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: trimmed }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.valid) {
            verified = true;
          }
        } else if (res.status === 401) {
          setPasswordError('סיסמה שגויה. אנא נסה שוב.');
          return false;
        }
      } catch {
        // Backend unavailable (e.g. static GitHub Pages)
      }

      // 2. Client-side hash check (for static GitHub Pages)
      if (!verified && passwordHash) {
        verified = await verifyPasswordHash(trimmed, passwordHash);
      }

      // 3. Client-side key decryption (if encrypted keys bundle is present)
      if (encryptedBundle) {
        keys = await decryptKeysWithPassword(trimmed, encryptedBundle);
        if (keys) {
          verified = true;
          setDecryptedKeys(keys);
        }
      }

      // 4. If password was not required initially
      if (!isPasswordRequired && !passwordHash) {
        verified = true;
      }

      if (verified) {
        setAiPassword(trimmed);
        setIsPasswordUnlocked(true);
        setPasswordError(null);
        setIsAiOnline(true);
        try {
          localStorage.setItem(AI_PASSWORD_STORAGE_KEY, trimmed);
        } catch {}
        return true;
      }

      setPasswordError('סיסמה שגויה. אנא נסה שוב.');
      return false;
    },
    [passwordHash, isPasswordRequired, encryptedBundle]
  );

  const isProviderActive = useCallback(
    (provider: AiProviderKey): boolean => {
      if (customApiKeys[provider] && customApiKeys[provider].trim().length > 0) return true;
      if (decryptedKeys[provider] && decryptedKeys[provider].trim().length > 0) return true;
      if (hasBackendServer && Boolean(providerStatuses?.[provider]?.available)) return true;
      return false;
    },
    [customApiKeys, decryptedKeys, hasBackendServer, providerStatuses]
  );

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
        setHasBackendServer(true);
        const data: AiStatusResponse = await res.json();
        setIsAiOnline(data.isAiOnline ?? false);
        setActiveProvider(data.provider || null);
        setActiveModel(data.model || null);
        if (data.providers) {
          setProviderStatuses(data.providers);
        }
        if (data.isPasswordRequired !== undefined) {
          setIsPasswordRequired(Boolean(data.isPasswordRequired));
          if (!data.isPasswordRequired) {
            setIsPasswordUnlocked(true);
          } else {
            const saved = localStorage.getItem(AI_PASSWORD_STORAGE_KEY);
            if (saved) {
              unlockAi(saved);
            }
          }
        }
        return;
      }
    } catch {
      // Backend unavailable -> fallback to static GitHub Pages bundle
    }

    setHasBackendServer(false);

    // Static GitHub Pages fallback: probe ai-models.json via multi-path fetch
    try {
      const staticBundle = await fetchJsonWithFallback<{
        updatedAt?: string;
        isPasswordRequired?: boolean;
        passwordHash?: string;
        encryptedKeys?: EncryptedKeysBundle;
        providers?: Record<string, any>;
      }>([
        './data/ai-models.json',
        'data/ai-models.json',
        './ai-models.json',
        'ai-models.json',
      ]);

      if (staticBundle) {
        if (staticBundle.passwordHash) {
          setPasswordHash(staticBundle.passwordHash);
        }
        if (staticBundle.encryptedKeys) {
          setEncryptedBundle(staticBundle.encryptedKeys);
        }

        const req = Boolean(staticBundle.isPasswordRequired);
        setIsPasswordRequired(req);

        if (!req) {
          setIsPasswordUnlocked(true);
          // If encrypted keys are present without password required, decrypt with default public app key
          if (staticBundle.encryptedKeys) {
            decryptKeysWithPassword('behatsdaa-public-app-key-v1', staticBundle.encryptedKeys).then(k => {
              if (k) setDecryptedKeys(k);
            });
          }
        } else {
          setIsPasswordUnlocked(false);
          const saved = localStorage.getItem(AI_PASSWORD_STORAGE_KEY);
          if (saved) {
            unlockAi(saved);
          }
        }

        if (staticBundle.providers) {
          const statuses = {} as Record<AiProviderKey, ProviderInfo>;
          let online = false;
          let actProv: AiProviderKey = 'gemini';
          let actMod = 'gemini-flash-lite-latest';

          for (const [key, val] of Object.entries(staticBundle.providers) as [AiProviderKey, any][]) {
            const isAvail = Boolean(val.available && val.hasDirectSecret);
            statuses[key] = {
              id: key,
              name: val.name || key,
              available: isAvail,
              model: val.defaultModel || '',
              requiredSecret: val.requiredSecret || '',
              codeSnippet: '',
            };
            if (isAvail && !online) {
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
    } catch (e) {
      console.warn('Error reading static AI model bundle:', e);
    }

    setIsAiOnline(false);
  }, [unlockAi]);

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
          const staticBundle = await fetchJsonWithFallback<{
            providers?: Record<string, any>;
          }>([
            './data/ai-models.json',
            'data/ai-models.json',
            './ai-models.json',
            'ai-models.json',
          ]);

          const providerData = staticBundle?.providers?.[p];
          if (providerData) {
            data = {
              available: Boolean(providerData.available && providerData.hasDirectSecret),
              provider: p,
              models: providerData.models || [],
              defaultModel: providerData.defaultModel,
              error: providerData.error,
            };
          }
        } catch {}
      }

      if (data && Array.isArray(data.models) && data.models.length > 0) {
        setAvailableModels(data.models);
        setProviderStatuses(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            [p]: {
              ...prev[p],
              available: Boolean(data?.available),
              model: data?.defaultModel || prev[p]?.model || '',
            },
          };
        });

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
        if (data?.defaultModel) {
          setSelectedModelState(data.defaultModel);
        }
      }

      if (data && !data.available && data.error) {
        setModelsError(data.error);
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

      if (isPasswordRequired && !isPasswordUnlocked) {
        setPasswordError('נדרש להזין סיסמת גישה כדי להשתמש ב-AI.');
        return;
      }

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

      const payloadMessages = updatedHistory.map(m => ({
        role: m.role,
        content: m.content,
      }));

      // 1. First try backend endpoint /api/chat with a short timeout
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: payloadMessages,
            activeClubs: Array.from(activeClubs),
            provider: selectedProvider,
            model: selectedModel,
            password: aiPassword,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const data: ChatResponse = await res.json();
          if (data.isAiOnline !== undefined) setIsAiOnline(data.isAiOnline);
          if (data.provider) setActiveProvider(data.provider);
          if (data.model) setActiveModel(data.model);

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
          setIsLoading(false);
          return;
        } else if (res.status === 401) {
          setIsPasswordUnlocked(false);
          setPasswordError('סיסמת גישה שגויה או שנדרשת סיסמה לשימוש ב-AI.');
          setIsLoading(false);
          return;
        }
      } catch (err: any) {
        if (err?.message?.includes('נדרשת סיסמת גישה')) {
          setIsLoading(false);
          return;
        }
        // Backend not running (static GitHub Pages) -> seamlessly execute client-side AI engine!
      }

      // 2. Client-side execution for GitHub Pages & static hosting
      try {
        console.log('⚡ [Client AI Engine] Executing client-side AI reasoning for static site...');
        const catalog = await getClientCatalog();

        // Extract topic context from previous conversation turns
        let previousTopic = '';
        const userMsgs = updatedHistory.filter(m => m.role === 'user');
        if (userMsgs.length > 1) {
          const prior = userMsgs.slice(0, -1).map(m => m.content).join(' ');
          const topics = ['esim', 'איסים', 'חו ל', 'טיסה', 'פיצה', 'נעליים', 'ספורט', 'סירים', 'כלי בית', 'mastercard', 'uniq', 'בהצדעה'];
          const matched = topics.filter(t => prior.toLowerCase().includes(t));
          if (matched.length > 0) previousTopic = matched.join(' ');
        }

        const { topStores, topDeals, topBilling } = findRelevantCatalogClient(
          trimmed,
          catalog,
          Array.from(activeClubs),
          previousTopic
        );

        let catalogContext = '';
        if (topStores.length > 0) {
          catalogContext += 'חנויות רלוונטיות מהקטלוג:\n' + topStores.map(s => `- ${s.name} (הנחה: ${s.max_discount || 0}%, מועדונים: ${(s.clubs || []).join(', ')})`).join('\n') + '\n\n';
        }
        if (topDeals.length > 0) {
          catalogContext += 'מבצעים רלוונטיים:\n' + topDeals.map(d => `- "${d.title}" (${d.price ? d.price + ' ₪' : ''} ${d.discount_percent ? d.discount_percent + '% הנחה' : ''} ${d.coupon_code ? 'קוד: ' + d.coupon_code : ''})`).join('\n') + '\n\n';
        }
        if (topBilling.length > 0) {
          catalogContext += 'הנחות באשראי:\n' + topBilling.map(b => `- "${b.name}" (${b.discount}% באשראי ${b.city ? b.city : ''})`).join('\n');
        }

        // Check if we have an API key for the selected provider
        const apiKey = decryptedKeys[selectedProvider] || customApiKeys[selectedProvider] || '';
        let replyContent = '';
        let directAiSuccess = false;

        if (apiKey) {
          try {
            replyContent = await executeDirectAiChat({
              provider: selectedProvider,
              model: selectedModel,
              apiKey,
              messages: payloadMessages,
              catalogContext,
            });
            directAiSuccess = Boolean(replyContent && replyContent.trim());
          } catch (apiErr: any) {
            console.warn(`Direct AI call to ${selectedProvider} failed:`, apiErr);
          }
        }

        if (!directAiSuccess) {
          const fallbackText = generateClientFallbackResponse(
            trimmed,
            topStores,
            topDeals,
            topBilling,
            previousTopic
          );
          if (!apiKey) {
            replyContent = `> ℹ️ **סייר קטלוג מקומי:** לא הוגדר מפתח סודי לספק ${selectedProvider.toUpperCase()} ב-GitHub Secrets (או בהגדרות המפתח 🔑). המענה מבוסס על סריקת קטלוג ההטבות והמועדונים:\n\n` + fallbackText;
          } else {
            replyContent = fallbackText;
          }
        }

        const assistantMsgId = 'assistant_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        const assistantMessage: ChatMessage = {
          id: assistantMsgId,
          role: 'assistant',
          content: replyContent,
          timestamp: Date.now(),
          recommendedStores: topStores,
          recommendedDeals: topDeals,
          recommendedBilling: topBilling,
          isAiOnline: directAiSuccess,
          provider: directAiSuccess ? selectedProvider : 'סייר הקטלוג המקומי',
          model: directAiSuccess ? selectedModel : undefined,
        };

        setMessages(prev => [...prev, assistantMessage]);
      } catch (fallbackErr: any) {
        console.error('Error during client-side AI processing:', fallbackErr);
        const assistantMsgId = 'err_' + Date.now();
        const errorMessage: ChatMessage = {
          id: assistantMsgId,
          role: 'assistant',
          content: 'מצטער, חלה תקלה בעיבוד התשובה. אנא נסה לנסח את השאלה מחדש או לבדוק בסרגל החיפוש.',
          timestamp: Date.now(),
          isAiOnline: false,
        };
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, isPasswordRequired, isPasswordUnlocked, activeClubs, selectedProvider, selectedModel, aiPassword, decryptedKeys, customApiKeys]
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
        isAiOnline: hasBackendServer ? (rawIsAiOnline ?? false) : isProviderActive(selectedProvider),
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
        isPasswordRequired,
        isPasswordUnlocked,
        unlockAi,
        lockAi,
        passwordError,
        clearPasswordError,
        customApiKeys,
        setCustomApiKey,
        decryptedKeys,
        isProviderActive,
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
