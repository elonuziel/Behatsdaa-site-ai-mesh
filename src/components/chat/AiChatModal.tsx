import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import { ChatCards } from './ChatCards';
import { AiProviderKey } from '../../types/chat';
import {
  Sparkles,
  Send,
  X,
  Trash2,
  Bot,
  User,
  Loader2,
  AlertTriangle,
  RotateCw,
  Cpu,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react';

interface AiChatModalProps {
  onSelectStore: (slug: string) => void;
  onSelectDeal: (id: string) => void;
}

const PROVIDER_OPTIONS: { id: AiProviderKey; name: string; secret: string }[] = [
  { id: 'gemini', name: 'Gemini', secret: 'GOOGLE_API_KEY / GEMINI_API_KEY' },
  { id: 'openai', name: 'OpenAI', secret: 'OPENAI_API_KEY' },
  { id: 'claude', name: 'Claude', secret: 'ANTHROPIC_API_KEY' },
  { id: 'groq', name: 'Groq', secret: 'GROQ_API_KEY' },
  { id: 'deepseek', name: 'DeepSeek', secret: 'DEEPSEEK_API_KEY' },
];

const STARTER_PROMPTS = [
  {
    icon: '🤖',
    title: 'הכרת ה-AI והאתר',
    prompt: 'האם אתה באמת AI, איך אתה עובד ואיך אתה יכול לעזור לי?',
  },
  {
    icon: '🏠',
    title: 'כלי בית וסירים',
    prompt: 'איפה הכי משתלם לקנות כלי בית, סירים ומחבתות עם הנחה?',
  },
  {
    icon: '💳',
    title: 'השוואת שיטות תשלום',
    prompt: 'מה ההבדל בין ארנק נטען 20% להנחה במעמד החיוב באשראי?',
  },
  {
    icon: '🍕',
    title: 'אוכל ומסעדות',
    prompt: 'איפה הכי משתלם להזמין פיצה או לאכול במסעדה עם הנחה?',
  },
  {
    icon: '👟',
    title: 'נעליים וספורט',
    prompt: 'איפה כדאי לקנות נעלי ריצה ובגדי ספורט עם ההנחה הכי גדולה?',
  },
  {
    icon: '⚡',
    title: 'Mastercard Day',
    prompt: 'אילו קופונים שווים פעילים החודש ב-Mastercard Day?',
  },
];

export const AiChatModal: React.FC<AiChatModalProps> = ({
  onSelectStore,
  onSelectDeal,
}) => {
  const {
    messages,
    isLoading,
    isChatOpen,
    selectedProvider,
    setSelectedProvider,
    selectedModel,
    setSelectedModel,
    availableModels,
    isLoadingModels,
    modelsError,
    fetchModelsForProvider,
    providerStatuses,
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
    isProviderActive,
  } = useChat();
  const [inputText, setInputText] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const [showApiKeyDrawer, setShowApiKeyDrawer] = useState(false);
  const [customKeyInput, setCustomKeyInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Focus password input if password required
  useEffect(() => {
    if (isChatOpen && isPasswordRequired && !isPasswordUnlocked) {
      setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 100);
    }
  }, [isChatOpen, isPasswordRequired, isPasswordUnlocked]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim() || isVerifyingPassword) return;
    setIsVerifyingPassword(true);
    const ok = await unlockAi(passwordInput.trim());
    setIsVerifyingPassword(false);
    if (ok) {
      setPasswordInput('');
    }
  };

  // Auto-scroll to bottom of conversation
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isChatOpen) {
      scrollToBottom();
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isChatOpen, messages, isLoading]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isChatOpen) {
        closeChat();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isChatOpen, closeChat]);

  if (!isChatOpen) return null;

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isPasswordRequired && !isPasswordUnlocked) return;
    if (!inputText.trim() || isLoading) return;
    const text = inputText;
    setInputText('');
    sendMessage(text);
  };

  const handlePromptClick = (prompt: string) => {
    if (isPasswordRequired && !isPasswordUnlocked) return;
    sendMessage(prompt);
  };

  // Helper to render markdown text with formatting
  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return <div key={idx} className="h-2" />;
      }

      // Check headings
      if (trimmed.startsWith('### ')) {
        return (
          <h4 key={idx} className="font-bold text-sm text-slate-900 dark:text-white mt-2 mb-1">
            {trimmed.replace('### ', '')}
          </h4>
        );
      }
      if (trimmed.startsWith('## ')) {
        return (
          <h3 key={idx} className="font-bold text-base text-slate-900 dark:text-white mt-3 mb-1.5">
            {trimmed.replace('## ', '')}
          </h3>
        );
      }

      // Check bullet points
      const isBullet = trimmed.startsWith('* ') || trimmed.startsWith('- ');
      const content = isBullet ? trimmed.slice(2) : trimmed;

      // Parse bold **text**
      const parts = content.split(/(\*\*.*?\*\*)/g);
      const parsedContent = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={pIdx} className="font-bold text-emerald-800 dark:text-emerald-300">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      if (isBullet) {
        return (
          <div key={idx} className="flex items-start gap-1.5 my-1 leading-relaxed text-xs sm:text-sm">
            <span className="text-emerald-500 font-bold mt-0.5">•</span>
            <span className="flex-1">{parsedContent}</span>
          </div>
        );
      }

      return (
        <p key={idx} className="my-1 leading-relaxed text-xs sm:text-sm">
          {parsedContent}
        </p>
      );
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-50 duration-200"
      onClick={e => {
        if (e.target === e.currentTarget) closeChat();
      }}
    >
      <div className="relative w-full max-w-3xl h-[92vh] max-h-[850px] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md ${
              isProviderActive(selectedProvider)
                ? 'bg-gradient-to-tr from-emerald-600 via-teal-600 to-indigo-600 shadow-emerald-600/25'
                : 'bg-amber-600 shadow-amber-600/25'
            }`}>
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                  סייר ההטבות והחיסכון
                </h3>
                {isProviderActive(selectedProvider) ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300/40 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    AI מחובר ({PROVIDER_OPTIONS.find(p => p.id === selectedProvider)?.name} • {selectedModel})
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300/40 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    סייר קטלוג מקומי (לא מחובר ל-AI)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                מענה מותאם אישית לחברי בהצדעה, UNIQ ו-Mastercard Day
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setShowApiKeyDrawer(prev => !prev);
                setCustomKeyInput(customApiKeys[selectedProvider] || '');
              }}
              title="הגדרות מפתח API אישי"
              className={`p-2 rounded-xl transition cursor-pointer ${
                showApiKeyDrawer
                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <KeyRound className="w-4 h-4" />
            </button>

            {isPasswordRequired && (
              isPasswordUnlocked ? (
                <button
                  type="button"
                  onClick={lockAi}
                  title="נעילת גישת ה-AI / שינוי סיסמה"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">מאומת</span>
                  <Lock className="w-3 h-3 opacity-60" />
                </button>
              ) : (
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>מוגן בסיסמה</span>
                </div>
              )
            )}

            {messages.length > 0 && (!isPasswordRequired || isPasswordUnlocked) && (
              <button
                type="button"
                onClick={clearChat}
                title="נקה שיחה"
                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={closeChat}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              aria-label="סגור חלון שיחה"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Custom API Key Drawer */}
        {showApiKeyDrawer && (
          <div className="px-4 sm:px-6 py-3 bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 animate-in slide-in-from-top-2 duration-150">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  מפתח API אישי עבור {PROVIDER_OPTIONS.find(p => p.id === selectedProvider)?.name}:
                </span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="password"
                  value={customKeyInput}
                  onChange={e => setCustomKeyInput(e.target.value)}
                  placeholder={`הזן מפתח ${PROVIDER_OPTIONS.find(p => p.id === selectedProvider)?.secret}...`}
                  className="flex-1 sm:w-64 text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => {
                    setCustomApiKey(selectedProvider, customKeyInput);
                    setShowApiKeyDrawer(false);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer shrink-0"
                >
                  שמור מפתח
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              המפתח נשמר מקומית בדפדפן שלך בלבד ומאפשר פנייה ישירה ל-API של הספק מכל סביבה.
            </p>
          </div>
        )}

        {/* Provider Switcher & Dynamic Model Selector Bar (only shown when unlocked) */}
        {(!isPasswordRequired || isPasswordUnlocked) && (
          <div className="px-4 sm:px-6 py-2.5 bg-slate-100/90 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-800 space-y-2">
            {/* Row 1: Direct Provider Switcher */}
            <div className="flex items-center justify-between gap-2 overflow-x-auto">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 shrink-0">
                <span className="font-bold text-slate-700 dark:text-slate-300">ספק AI ישיר:</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                {PROVIDER_OPTIONS.map(opt => {
                  const isSelected = selectedProvider === opt.id;
                  const isAvailable = isProviderActive(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedProvider(opt.id)}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700'
                      }`}
                      title={`${opt.name} - מפתח סודי: ${opt.secret} ${isAvailable ? '(מוגדר ✓)' : '(חסר מפתח)'}`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          isAvailable
                            ? isSelected ? 'bg-emerald-200' : 'bg-emerald-500'
                            : isSelected ? 'bg-amber-300' : 'bg-slate-400'
                        }`}
                      />
                      <span>{opt.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Row 2: Dynamic Model Selector fetched with the API Key */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                <label htmlFor="model-select" className="text-xs font-bold text-slate-600 dark:text-slate-400 shrink-0 flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>בחירת מודל:</span>
                </label>

                {isLoadingModels ? (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                    <span>מושך מודלים עם ה-API Key...</span>
                  </div>
                ) : availableModels.length > 0 ? (
                  <div className="relative flex-1 max-w-md">
                    <select
                      id="model-select"
                      value={selectedModel}
                      onChange={e => setSelectedModel(e.target.value)}
                      className="w-full text-xs font-mono font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer shadow-sm"
                    >
                      {availableModels.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.id} {m.name && m.name !== m.id ? `(${m.name})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="relative flex-1 max-w-md">
                    <select
                      id="model-select"
                      disabled
                      className="w-full text-xs font-medium bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                    >
                      <option value="">
                        {isProviderActive(selectedProvider)
                          ? 'אין מודלים זמינים לספק זה'
                          : `לא זמין (נדרש ${providerStatuses?.[selectedProvider]?.requiredSecret || PROVIDER_OPTIONS.find(p => p.id === selectedProvider)?.secret} ב-Secrets)`}
                      </option>
                    </select>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => fetchModelsForProvider(selectedProvider)}
                  disabled={isLoadingModels}
                  title="משיכת רשימת מודלים מעודכנת עם ה-API Key מהספק"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition cursor-pointer disabled:opacity-50"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isLoadingModels ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {availableModels.length > 0 && (
                <span className="text-[10px] text-slate-400 dark:text-slate-500 hidden sm:inline shrink-0 font-medium">
                  {availableModels.length} מודלים זמינים ב-API
                </span>
              )}
            </div>
          </div>
        )}

        {/* Selected Provider Status Alert if missing API key */}
        {!isProviderActive(selectedProvider) && (
          <div className="px-4 sm:px-6 py-2 bg-amber-500/10 dark:bg-amber-950/40 border-b border-amber-500/20 text-amber-800 dark:text-amber-200 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>
                <strong>{PROVIDER_OPTIONS.find(p => p.id === selectedProvider)?.name}</strong> במצב סייר קטלוג מקומי — לא מוגדר מפתח סודי <code className="font-mono bg-white/70 dark:bg-slate-900 px-1 py-0.5 rounded text-[11px]">{providerStatuses?.[selectedProvider]?.requiredSecret || PROVIDER_OPTIONS.find(p => p.id === selectedProvider)?.secret}</code> ב-GitHub Secrets.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowApiKeyDrawer(true);
                setCustomKeyInput(customApiKeys[selectedProvider] || '');
              }}
              className="text-[11px] font-bold underline cursor-pointer hover:opacity-80 shrink-0 flex items-center gap-1 text-emerald-700 dark:text-emerald-400"
            >
              <KeyRound className="w-3 h-3" />
              הזן מפתח אישי
            </button>
          </div>
        )}

        {/* Model Fetching Error Alert */}
        {modelsError && isProviderActive(selectedProvider) && (
          <div className="px-4 sm:px-6 py-2 bg-rose-500/10 dark:bg-rose-950/40 border-b border-rose-500/20 text-rose-800 dark:text-rose-200 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>{modelsError}</span>
            </div>
            <button
              type="button"
              onClick={() => fetchModelsForProvider(selectedProvider)}
              className="text-[11px] underline font-bold cursor-pointer hover:opacity-80"
            >
              נסה שוב
            </button>
          </div>
        )}

        {/* Scrollable Conversation Thread OR Password Screen */}
        {isPasswordRequired && !isPasswordUnlocked ? (
          <div className="flex-1 overflow-y-auto p-6 sm:p-10 flex flex-col items-center justify-center text-center bg-slate-50/70 dark:bg-slate-900/60">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4 border border-amber-500/20 shadow-xs">
              <Lock className="w-8 h-8" />
            </div>

            <h3 className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 mb-2">
              גישה מוגנת ליכולות ה-AI
            </h3>

            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed">
              השימוש בסייר ה-AI החכם מוגן בסיסמת מערכת סודית (Secret Password). יש להזין את הסיסמה התואמת כדי לפתוח את אפשרויות השיחה.
            </p>

            <form onSubmit={handlePasswordSubmit} className="w-full max-w-xs space-y-3">
              <div className="relative">
                <input
                  ref={passwordInputRef}
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={e => {
                    setPasswordInput(e.target.value);
                    if (passwordError) clearPasswordError();
                  }}
                  placeholder="הזן סיסמת גישה (AI Password)..."
                  className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl border border-slate-300 dark:border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition shadow-2xs text-right"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                  tabIndex={-1}
                  title={showPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {passwordError && (
                <div className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50 flex items-center gap-1.5 justify-center">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={!passwordInput.trim() || isVerifyingPassword}
                className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-white shadow-sm flex items-center justify-center gap-2 transition cursor-pointer ${
                  passwordInput.trim() && !isVerifyingPassword
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                    : 'bg-slate-300 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isVerifyingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>מאמת סיסמה...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>אימות והמשך לשיחה</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>הסיסמה נבדקת ומאומתת מול המפתח הסודי של המערכת</span>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.length === 0 ? (
            /* Welcome Empty State with Category Starters */
            <div className="py-6 sm:py-8 space-y-6 max-w-xl mx-auto text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500/20 via-teal-500/20 to-indigo-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                <Sparkles className="w-7 h-7" />
              </div>

              <div className="space-y-1.5">
                <h4 className="text-lg font-black text-slate-900 dark:text-white">
                  במה תרצה לחסוך היום?
                </h4>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  כתוב לי בשפה חופשית מה אתה מחפש לקנות, לקבל שירות או להזמין, ואמצא עבורך את הרשתות וההנחות הכי שוות בכל המועדונים.
                </p>
              </div>

              {/* Starter Prompt Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-right">
                {STARTER_PROMPTS.map((card, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handlePromptClick(card.prompt)}
                    className="group p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50/80 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 hover:border-emerald-500/50 transition cursor-pointer text-right flex items-start gap-2.5 shadow-2xs"
                  >
                    <span className="text-xl shrink-0 mt-0.5">{card.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition">
                        {card.title}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                        {card.prompt}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Multi-turn Chat Thread */
            messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 sm:gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold shadow-2xs ${
                      isUser
                        ? 'bg-slate-800 dark:bg-slate-700 text-white'
                        : 'bg-gradient-to-tr from-emerald-600 to-teal-600 text-white'
                    }`}
                  >
                    {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  {/* Message Bubble Container */}
                  <div className={`max-w-[85%] sm:max-w-[80%] space-y-2`}>
                    {!isUser && msg.isAiOnline === false && (
                      <div className="p-2.5 rounded-2xl bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2 shadow-2xs">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div className="leading-relaxed">
                          <span className="font-bold">מודל ה-AI אינו זמין {msg.provider ? `(${msg.provider}${msg.model ? ` • ${msg.model}` : ''})` : ''}:</span> התשובה נוצרה במצב לא מקוון מקומי על בסיס קטלוג המערכת בלבד {msg.statusNote ? `— ${msg.statusNote}` : ''}.
                        </div>
                      </div>
                    )}

                    <div
                      className={`rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm ${
                        isUser
                          ? 'bg-emerald-600 text-white rounded-tr-xs shadow-md shadow-emerald-600/10'
                          : 'bg-slate-100/90 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 rounded-tl-xs border border-slate-200/70 dark:border-slate-700/70 shadow-2xs'
                      }`}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      ) : (
                        <>
                          {renderFormattedText(msg.content)}
                          {msg.isAiOnline === true && (
                            <div className="mt-3 pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500">
                              <Sparkles className="w-3 h-3 text-emerald-500" />
                              <span>מענה חי מ-AI ({msg.provider || 'AI'} {msg.model ? `• ${msg.model}` : ''})</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Interactive Stores & Deals Cards attached to assistant response */}
                    {!isUser && (
                      <ChatCards
                        stores={msg.recommendedStores}
                        deals={msg.recommendedDeals}
                        billing={msg.recommendedBilling}
                        onSelectStore={slug => {
                          closeChat();
                          onSelectStore(slug);
                        }}
                        onSelectDeal={id => {
                          closeChat();
                          onSelectDeal(id);
                        }}
                      />
                    )}

                    {/* Suggested Follow-ups */}
                    {!isUser && msg.followUps && msg.followUps.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {msg.followUps.map((fu, fIdx) => (
                          <button
                            key={fIdx}
                            type="button"
                            onClick={() => handlePromptClick(fu)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer shadow-2xs"
                          >
                            <span>💬</span>
                            <span>{fu}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Typing Loading Indicator */}
          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shrink-0 flex items-center justify-center animate-pulse shadow-2xs">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-xs p-3.5 border border-slate-200/70 dark:border-slate-700/70 flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  סורק את קטלוג המועדונים ומגבש תשובה...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer */}
        {isPasswordRequired && !isPasswordUnlocked ? (
          <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 bg-amber-50/70 dark:bg-amber-950/30 flex items-center justify-center gap-2 text-xs sm:text-sm text-amber-800 dark:text-amber-300 font-bold">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>השיחה נעולה. יש להזין סיסמת גישה בחלון למעלה כדי לפתוח את אפשרויות השיחה.</span>
          </div>
        ) : (
          <div className="p-3 sm:p-4 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
            <form onSubmit={handleSend} className="relative flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder="שאל כל שאלה... (למשל: מה ההבדל בין כרטיס נטען למעמד החיוב? או איפה הכי משתלם?)"
                className="w-full pl-12 pr-4 py-3 text-xs sm:text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 rounded-2xl border border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition shadow-inner"
                disabled={isLoading}
              />

              <button
                type="submit"
                disabled={!inputText.trim() || isLoading}
                className={`absolute left-2 p-2 rounded-xl text-white transition cursor-pointer flex items-center justify-center shadow-2xs ${
                  inputText.trim() && !isLoading
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
                    : 'bg-slate-300 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                }`}
                aria-label="שלח הודעה"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 rotate-180" />
                )}
              </button>
            </form>

            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-500" />
                סייר ה-AI מחובר ליותר מ-10,000 סניפים, 1,041 רשתות ו-2,670+ מבצעים
              </span>
              <span className="hidden sm:inline">הקש Enter לשליחה</span>
            </div>
          </div>
        )}
      </>
    )}
  </div>
</div>
);
};
