import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import { ChatCards } from './ChatCards';
import {
  Sparkles,
  Send,
  X,
  Trash2,
  Bot,
  User,
  Loader2
} from 'lucide-react';

interface AiChatModalProps {
  onSelectStore: (slug: string) => void;
  onSelectDeal: (id: string) => void;
}

const STARTER_PROMPTS = [
  {
    icon: '🤖',
    title: 'הכרת ה-AI והאתר',
    prompt: 'האם אתה באמת AI, איך אתה עובד ואיך אתה יכול לעזור לי?',
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
    icon: '🛒',
    title: 'סופרמרקט ומזון',
    prompt: 'איזה רשתות סופרמרקט מכבדות כרטיס נטען או הנחה במעמד החיוב?',
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
  const { messages, isLoading, isChatOpen, closeChat, sendMessage, clearChat } = useChat();
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    if (!inputText.trim() || isLoading) return;
    const text = inputText;
    setInputText('');
    sendMessage(text);
  };

  const handlePromptClick = (prompt: string) => {
    sendMessage(prompt);
  };

  // Helper to render markdown text with formatting
  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      let trimmed = line.trim();
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
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/25">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                  סייר ההטבות החכם (Gemini AI)
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300/40">
                  חיפוש בשפה חופשית
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                מענה מותאם אישית לחברי בהצדעה, UNIQ ו-Mastercard Day
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {messages.length > 0 && (
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

        {/* Scrollable Conversation Thread */}
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
                        renderFormattedText(msg.content)
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
      </div>
    </div>
  );
};
