import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import { ChatCards } from '../chat/ChatCards';
import {
  Sparkles,
  Send,
  Trash2,
  Bot,
  User,
  Loader2,
  MessageSquare
} from 'lucide-react';

interface MegaAiSearchViewProps {
  onSelectStore: (slug: string) => void;
  onSelectDeal: (id: string) => void;
}

const POPULAR_QUESTIONS = [
  'איפה הכי משתלם להזמין פיצה או לאכול במסעדה?',
  'איפה כדאי לקנות נעלי ריצה או ציוד ספורט?',
  'איזה רשתות סופרמרקט מכבדות כרטיס נטען?',
  'האם יש מבצעים שווים לחופשה במלונות באילת או ספא?',
  'מה ההבדל בין ארנק בהצדעה לכרטיס נטען UNIQ?',
  'אילו קופונים הכי שווים ב-Mastercard Day?'
];

export const MegaAiSearchView: React.FC<MegaAiSearchViewProps> = ({
  onSelectStore,
  onSelectDeal,
}) => {
  const { messages, isLoading, sendMessage, clearChat } = useChat();
  const [inputVal, setInputVal] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || isLoading) return;
    const text = inputVal;
    setInputVal('');
    sendMessage(text);
  };

  const handleQuickQuestion = (q: string) => {
    sendMessage(q);
  };

  // Helper to render markdown text with formatting
  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      let trimmed = line.trim();
      if (!trimmed) return <div key={idx} className="h-2" />;

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

      const isBullet = trimmed.startsWith('* ') || trimmed.startsWith('- ');
      const content = isBullet ? trimmed.slice(2) : trimmed;

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
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-bold border border-white/20">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>סייר AI מבוסס Gemini</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            חיפוש טבעי וחופשי: קבל בדיוק מה שאתה צריך
          </h2>

          <p className="text-emerald-100 text-xs sm:text-sm leading-relaxed">
            חיפוש חכם ביותר מ-<strong>10,000</strong> בתי עסק וסניפים, 1,041 רשתות ו-2,600+ שוברים ומבצעים של בהצדעה, UNIQ ו-Mastercard Day. שאל בכל שפה או ניסוח ותקבל המלצות מדויקות וכרטיסים אינטראקטיביים ישירות מהקטלוג.
          </p>
        </div>
      </div>

      {/* Main Chat Container */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col min-h-[500px]">
        {/* Header toolbar */}
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                שיחת סייר ההטבות
              </h3>
              <p className="text-[11px] text-slate-500">
                זוכר את היסטוריית השיחה שלך ומעדכן המלצות בזמן אמת
              </p>
            </div>
          </div>

          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>נקה היסטוריה</span>
            </button>
          )}
        </div>

        {/* Message Thread */}
        <div className="flex-1 p-4 sm:p-6 space-y-5 overflow-y-auto max-h-[600px]">
          {messages.length === 0 ? (
            <div className="py-10 text-center space-y-5 max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-emerald-500 flex items-center justify-center mx-auto">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white">
                  שאל כל שאלה בנוגע לקניות, רשתות והטבות
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  הנה כמה רעיונות פופולריים שמשתמשים שואלים:
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-2">
                {POPULAR_QUESTIONS.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickQuestion(q)}
                    className="text-xs px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 text-slate-700 dark:text-slate-300 transition cursor-pointer font-medium"
                  >
                    💬 {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map(msg => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold shadow-2xs ${
                      isUser
                        ? 'bg-slate-800 dark:bg-slate-700 text-white'
                        : 'bg-gradient-to-tr from-emerald-600 to-teal-600 text-white'
                    }`}
                  >
                    {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  <div className="max-w-[85%] space-y-2">
                    <div
                      className={`rounded-2xl p-4 text-xs sm:text-sm ${
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

                    {!isUser && (
                      <ChatCards
                        stores={msg.recommendedStores}
                        deals={msg.recommendedDeals}
                        billing={msg.recommendedBilling}
                        onSelectStore={slug => onSelectStore(slug)}
                        onSelectDeal={id => onSelectDeal(id)}
                      />
                    )}

                    {!isUser && msg.followUps && msg.followUps.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {msg.followUps.map((fu, fIdx) => (
                          <button
                            key={fIdx}
                            type="button"
                            onClick={() => handleQuickQuestion(fu)}
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

          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shrink-0 flex items-center justify-center animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-xs p-4 border border-slate-200/70 dark:border-slate-700/70 flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  סורק את קטלוג המועדונים ומגבש תשובה מדויקת...
                </span>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <form onSubmit={handleSubmit} className="relative flex items-center">
            <input
              type="text"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              placeholder="כתוב בשפה חופשית... (למשל: איפה הכי שווה לקנות נעלי ריצה או להזמין סושי?)"
              className="w-full pl-12 pr-4 py-3.5 text-xs sm:text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-2xl border border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:outline-none transition shadow-2xs"
              disabled={isLoading}
            />

            <button
              type="submit"
              disabled={!inputVal.trim() || isLoading}
              className={`absolute left-2.5 p-2 rounded-xl text-white transition cursor-pointer flex items-center justify-center ${
                inputVal.trim() && !isLoading
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/30'
                  : 'bg-slate-300 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
              }`}
              aria-label="שלח"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4 rotate-180" />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
