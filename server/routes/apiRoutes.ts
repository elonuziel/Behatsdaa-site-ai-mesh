import { Router } from 'express';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import {
  DIRECT_AI_PROVIDERS,
  readEnvSecrets,
  getAiPassword,
  getProviderKey
} from '../config/providers';
import {
  loadCatalogData,
  normalizeHebrew,
  findRelevantCatalog,
  generateFollowUps,
  handleExecuteCatalogTool,
  generateFallbackResponse,
  catalogToolsGemini,
  catalogToolsOpenAI,
  catalogToolsClaude,
  cachedStores,
  cachedDeals,
  cachedBillingStores,
  ISRAELI_CITIES_MAP,
  StoreItem,
  DealItem,
  BillingStoreItem
} from '../services/catalogService';

export const apiRouter = Router();

// Replace app. with apiRouter.
// POST /api/chat: Multi-turn chat with AI (Multi-model frameworks with direct provider execution)
apiRouter.post('/api/chat', async (req, res) => {
  try {
    const env = readEnvSecrets();
    const serverPassword = getAiPassword(env);

    // If an AI access password is configured on the server, ensure it is matched
    if (serverPassword) {
      const userPassword = (req.body?.password || '').trim();
      const userPassHash = crypto.createHash('sha256').update(userPassword).digest('hex');
      const serverPassHash = crypto.createHash('sha256').update(serverPassword).digest('hex');

      if (userPassword !== serverPassword && userPassHash !== serverPassHash) {
        return res.status(401).json({
          error: 'נדרשת סיסמת גישה תקינה לשימוש ב-AI (סיסמה שגויה או חסרה).',
          requirePassword: true,
          invalidPassword: true,
        });
      }
    }

    const { messages, activeClubs, provider: requestedProvider = 'gemini', model: requestedModel } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    const latestUserMessage = [...messages].reverse().find(m => m.role === 'user');
    const userPromptText = latestUserMessage ? latestUserMessage.content : '';

    // Extract conversation context from prior turns to maintain topic continuity
    let previousTopic = '';
    const userMessages = messages.filter(m => m.role === 'user');
    if (userMessages.length > 1) {
      const priorUserPrompts = userMessages.slice(0, -1).map(m => m.content).join(' ');
      const normPrior = normalizeHebrew(priorUserPrompts);
      // Key topic anchors: esim, food, shoes, hotel, supermarket, etc.
      const topicMatches: string[] = [];
      const topics = [
        'esim', 'איסים', 'סים', 'חו ל', 'טיסה', 'פיצה', 'נעליים', 'ספורט', 'מלון', 'ספא', 'קרפור',
        'שופרסל', 'וולט', 'משלוחה', 'רכב', 'מוסך', 'שיניים', 'בגדים', 'טרמינל x', 'מגה ספורט',
        'mastercard', 'mastercarday', 'matercarday', 'matercard', 'מאסטרקארד', 'מסטרקארד',
        'uniq', 'יוניק', 'behatsdaa', 'בהצדעה'
      ];
      for (const t of topics) {
        if (normPrior.includes(t)) topicMatches.push(t);
      }
      if (topicMatches.length > 0) {
        previousTopic = topicMatches.join(' ');
      }
    }

    // Search catalog for grounded knowledge with conversation awareness, Dual-Tier location search, and dynamic sizing
    const {
      topStores,
      topDeals,
      topBilling,
      promptStores,
      promptDeals,
      promptBilling,
      detectedCity
    } = findRelevantCatalog(userPromptText, activeClubs, previousTopic);

    // Build catalog context summary using dynamic context sizing (10 / 40 / 80 items)
    let catalogContext = '';
    if (detectedCity) {
      catalogContext += `\n📍 **זוהתה כוונת חיפוש מקומי בעיר: ${detectedCity}**\nהקטלוג שולב במודל Dual-Tier: עסקים מקומיים פיזיים בעיר (Tier A) לצד רשתות ארציות הפועלות עם סניפים פעילים בעיר (Tier B).\n`;
    }

    const storesForPrompt = promptStores && promptStores.length > 0 ? promptStores : topStores;
    const dealsForPrompt = promptDeals && promptDeals.length > 0 ? promptDeals : topDeals;
    const billingForPrompt = promptBilling && promptBilling.length > 0 ? promptBilling : topBilling;

    if (storesForPrompt.length > 0) {
      catalogContext += '\nרשתות וחנויות רלוונטיות מהקטלוג:\n' + storesForPrompt.map((s, idx) => {
        const clubsStr = (s.clubs || []).join(', ');
        const cardsStr = (s.cards || []).map((c: any) => `${c.card_name} (${c.discount})`).join(', ');
        const coverageTag = s.coverage === 'online' ? ' [רכישה אונליין בלבד]' : (s.is_mall_chain ? ' [רשת קניונים ארצית עם פריסה מקומית]' : ' [פריסה ארצית]');
        return `${idx + 1}. ${s.name} (קטגוריה: ${s.category || 'כללי'}, הנחה מרבית: ${s.max_discount || 0}%, מועדונים: ${clubsStr}${cardsStr ? ', כרטיסים: ' + cardsStr : ''})${coverageTag}`;
      }).join('\n');
    }

    if (dealsForPrompt.length > 0) {
      catalogContext += '\n\nמבצעים ושוברים רלוונטיים מהקטלוג:\n' + dealsForPrompt.map((d, idx) => {
        const priceStr = d.price ? `${d.price} ₪` : 'ללא מחיר נקוב';
        const discStr = d.discount_percent ? ` (${d.discount_percent}% הנחה)` : '';
        const couponStr = d.coupon_code ? `, קוד קופון: ${d.coupon_code}` : '';
        return `${idx + 1}. "${d.title}" - ספק: ${d.supplier || 'בהצדעה'}, מועדון: ${d.club || 'behatsdaa'}, מחיר: ${priceStr}${discStr}${couponStr}`;
      }).join('\n');
    }

    if (billingForPrompt.length > 0) {
      catalogContext += '\n\nעסקים וחנויות מהקטלוג המורחב (הנחות במעמד החיוב באשראי בהצדעה מתוך 10,650+ סניפים):\n' + billingForPrompt.map((b, idx) => {
        const locStr = b.full_address || b.city || '';
        const isLocalTag = detectedCity ? ' [עסק מקומי בעיר]' : '';
        return `${idx + 1}. "${b.name}" - ${b.discount}% הנחה במעמד החיוב באשראי${locStr ? ' (' + locStr + ')' : ''}, תחום: ${b.category || 'כללי'}${isLocalTag}`;
      }).join('\n');
    }

    const systemInstruction = `אתה "סייר ה-AI והיועץ הפיננסי של פורטל ההטבות שלי".
אתה מודל בינה מלאכותית מודרני, חד, שיחתי וחכם המחובר ישירות לקטלוג המועדונים וההטבות של בהצדעה, UNIQ ו-Mastercard Day.
המשתמש משוחח איתך בשיחה רציפה (Multi-turn conversation). חובה עליך להבין את ההקשר של כל השאלות הקודמות בשיחה ולהתנהג כמו בן אדם ויועץ מומחה, לא כמו בוט מנותק!

מידע מקיף ומדויק על מועדון Mastercard Day (הטבות יום מאסטרקארד בכל 10 בחודש):
1. **חבילות גלישה, תקשורת ו-eSIM לחו"ל ב-Mastercard Day**:
   - **VOYE**: **25% הנחה** ב-10 וב-11 בחודש (ו-**18% הנחה** בכל שאר ימות החודש) על כל חבילות הגלישה וה-eSIM באתר ובאפליקציית VOYE! קוד קופון: \`MASTERCARDAY\`.
   - **Airalo**: **20% הנחה** ב-10 וב-11 בחודש (ו-**15% הנחה** בכל שאר ימות החודש) על כל חבילות האינטרנט באתר ובאפליקציית Airalo (חברת ה-eSIM הפופולרית בעולם)! קוד קופון: \`MASTERCARDAY\`.
   - **Gett בחו"ל**: 20 ₪ הנחה בהזמנת נסיעה בחו"ל באפליקציית Gett (קוד קופון: \`mastercard 10\`).
   - **Booking.com**: 4% קרדיט כספי לארנק בהזמנת לינה ומלונות (קוד: \`MASTERCARDAY\`).

2. **קטגוריות מובילות נוספות ב-Mastercard Day (בכל 10 בחודש)**:
   - **אופנה ולייף סטייל**: Terminal X (50 ₪ הנחה בקנייה מעל 250 ₪ עם קוד \`MASTERCARDAY10\`), adidas (אקסטרה 20% הנחה), ALDO (20%), GALI (20%), Lee Cooper (20%), Minene (20%), Nine West (20%), Nautica (15%), Timberland (15%), Guess (15%).
   - **קולינריה ומסעדות**: מקדונלד'ס (50% הנחה על ארוחות), דומינו'ס (2 פיצות משפחתיות + נלווה ב-130 ₪ עם קוד \`MDAY130\`), גולדה Golda (קילו גלידה + 2 רטבים ב-84 ₪ בלבד), משלוחה (30 ₪ הנחה לחדשים), rebar (10 ₪ הנחה על משקה M).
   - **חשמל, אלקטרוניקה וגיימינג**: עולם הקולנוע והחשמל (200 ₪ הנחה מעל 2000 ₪), BUG (עד 30% הנחה), Lenovo (10% הנחה נוספים), Nintendo (10% הנחה), Last Price (10% אקסטרה הנחה), Walla Shops (10% הנחה).
   - **קניות בינלאומיות אונליין**: Amazon (10% הנחה מעל $49), AliExpress ($5 הנחה מעל $35).

3. **מועדון בהצדעה (משרתי מילואים ולוחמים)**:
   - **eSIM ותקשורת**: GlobaleSIM (15% הנחה אוטומטית במעמד החיוב באשראי בהצדעה ללא צורך בקוד קופון), BeSIM (10% הנחה אוטומטית במעמד החיוב).
   - **ארנק רשתות / כרטיס נטען 20%**: טעינה דיגיטלית מוזלת (מגה ספורט, פוקס הום, שילב, קולומביה, סטימצקי, ורדינון ועוד).
   - **הנחה אוטומטית באשראי**: מעל 10,650 בתי עסק וסניפים בכל עיר בישראל (2%-15% אוטומטית בדף החשבון).
   - **שוברים מסובסדים**: קולנוע (סינמה סיטי ב-33 ₪), ארוחות (מקדונלד'ס, בורגרים, פיצה האט), מלונות וספא.

4. **מועדון UNIQ (סטודנטים ובוגרים אקדמאים)**:
   - **כרטיס נטען UNIQ 15%**: טעינה דיגיטלית ל-31 רשתות מובילות כולל טרמינל X.
   - מבצעים וקופונים ייחודיים ללימודים, פנאי וקולנוע.

הנחיות קריטיות לשיחה (Conversation Rules):
- **מענה לשאלות המשך (Follow-up handling)**:
  אם המשתמש שאל קודם "איפה לקנות ESIM" וענית לו על בהצדעה, ואז הוא שואל: "אבל מה עם MASTERCARDAY גם לם יש" (או "גם להם יש?"):
  ענה ישירות ובצורה שיחתית טבעית: **כן, בהחלט!** הסבר שב-Mastercard Day ישנן שתי הטבות מצוינות ל-eSIM ולגלישה בחו"ל עם אחוזי הנחה אפילו גבוהים יותר (VOYE 25% ו-Airalo 20% עם קוד קופון MASTERCARDAY).
  ערוך עבורו השוואה חכמה: ב-10-11 לחודש VOYE נותן את ההנחה הגבוהה ביותר (25%), Airalo נותן 20% ומציע את הכיסוי הגלובלי הנרחב ביותר, ואילו בבהצדעה יש 15% ב-GlobaleSIM ו-10% ב-BeSIM שתקפים בכל יום בשנה אוטומטית באשראי בלי לחכות לקופון. הזכר גם את הטבות הנסיעות המשלימות של מאסטרקארד (20 ₪ ב-Gett ו-4% ב-Booking.com).
- **מענה לגבי שאר המבצעים והאפשרויות (All other deals and options)**:
  אם המשתמש מבקש לראות גם את שאר המבצעים של Mastercard Day או להכיר אפשרויות נוספות, פתח בפניו סקירה שיחתית, עשירה ומסודרת של ההטבות הבולטות לפי תחומי עניין (אופנה, מסעדות ואוכל, מחשבים וטכנולוגיה, קניות אונליין).
- **מענה לחיפושים לפי עיר או מיקום (Dual-Tier Location Search - עסקים מקומיים לצד רשתות ארציות)**:
  כאשר המשתמש שואל על עיר ספציפית (כגון: "פיצה בפתח תקווה", "מסעדות בתל אביב", "ספורט בחיפה"):
  השתמש תמיד במודל הדו-שכבתי:
  1. הדגש עסקים ומסעדות מקומיים פיזיים הפועלים בעיר זו מתוך ספריית החיוב (הנחות אוטומטיות באשראי של 5%-15% במעמד החיוב).
  2. שלב לצדם רשתות ארציות מובילות ורשתות קניונים (כמו פיצה האט, דומינוס, מגה ספורט, פוקס וכו') שמפעילות סניפים פעילים בעיר ומציעות ארנק נטען מוזל של 20% או שוברים מסובסדים.
  3. הסבר למשתמש בצורה ישירה ומועילה על שתי האפשרויות: גם המקומות המקומיים וגם הרשתות הארציות הפועלות בעיר!
- **שיחה זורמת, אנושית ומקצועית**: שוחח כמו יועץ חיסכון אישי שמבין בדיוק מה הצרכים של המשתמש. אל תזרוק רשימות אקראיות של חנויות שאינן קשורות לנושא!

${catalogContext ? `פריטים שנמצאו בקטלוג המערכת עבור השאלה הנוכחית:\n${catalogContext}` : 'לא נמצאו פריטים קונקרטיים בקטלוג עבור מילות השאלה הללו. השתמש בידע הקטלוגי המלא שלך והסבר למשתמש בצורה עשירה ומלאה.'}`;

    // Enrich system instruction with real-time exact database aggregations when count/statistics are queried
    const isCountQueryIntent = /כמה|כמות|מספר|סך הכל|סה"כ|how many|count/i.test(normalizeHebrew(userPromptText));
    let exactAggregationFacts = '';
    if (isCountQueryIntent) {
      const jerusalemBillingCount = cachedBillingStores.filter(b => normalizeHebrew(b.city || '').includes('ירושלים')).length;
      exactAggregationFacts = `\n\n[נתוני אגרגציה סטטיסטיים מדויקים מכל 13,600+ פריטי הקטלוג]:
- מספר בתי עסק בירושלים המעניקים הנחה אוטומטית במעמד החיוב באשראי בהצדעה: בדיוק ${jerusalemBillingCount} בתי עסק (מתוך סך 10,659 עסקים בקטלוג).
- סך הרשתות בקטלוג הארצי: ${cachedStores.length}.
- סך המבצעים והשוברים: ${cachedDeals.length}.
- אם המשתמש שואל "כמה עסקים נותנים הנחה בירושלים במעמד החיוב", השב תמיד עם המספר המדויק: בדיוק ${jerusalemBillingCount} עסקים. השתמש בכלי aggregate_catalog במידת הצורך לקבלת פילוח נוסף.`;
    }

    const fullSystemInstruction = systemInstruction + exactAggregationFacts;

    // Map conversation history into Gemini Content format
    const contents = messages
      .filter(m => m && m.content && m.content.trim())
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content.trim() }],
      }));

    const targetProviderKey = (typeof requestedProvider === 'string' && DIRECT_AI_PROVIDERS[requestedProvider])
      ? requestedProvider
      : 'gemini';
    const providerDef = DIRECT_AI_PROVIDERS[targetProviderKey];
    const apiKey = getProviderKey(targetProviderKey, env);

    let replyText = '';
    let isAiOnline = false;
    let usedProvider = providerDef.name;
    let usedModel = (typeof requestedModel === 'string' && requestedModel.trim())
      ? requestedModel.trim()
      : providerDef.defaultModel;
    let statusNote = '';

    if (!apiKey) {
      statusNote = `משתנה סודי ${providerDef.envKeys.join(' או ')} אינו מוגדר ב-Secrets של GitHub או ב-.env עבור ספק ${providerDef.name}.`;
      replyText = `> ⚠️ **מודל אינו זמין (ספק ${providerDef.name}):** לא נמצא מפתח סודי \`${providerDef.envKeys[0]}\` ב-GitHub Secrets או בקובץ \`.env\`. התשובה להלן נוצרה במצב לא מקוון מקומי מתוך קטלוג המערכת בלבד:\n\n` +
        generateFallbackResponse(userPromptText, topStores, topDeals, topBilling, previousTopic);
    } else {
      // Direct provider execution without middleman
      if (targetProviderKey === 'gemini') {
        const candidateModels = [
          usedModel,
          'gemini-flash-lite-latest',
          env.GOOGLE_MODEL || env.GEMINI_MODEL,
          'gemini-2.5-flash-lite',
          'gemini-3.1-flash-lite',
          'gemini-2.5-flash',
          'gemini-2.5-pro',
        ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);

        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
        });

        for (const mName of candidateModels) {
          try {
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error(`Timeout for ${mName}`)), 7000)
            );

            const aiPromise = (async () => {
              const firstResponse = await ai.models.generateContent({
                model: mName,
                contents,
                config: {
                  systemInstruction: fullSystemInstruction,
                  temperature: 0.7,
                  tools: catalogToolsGemini as any,
                },
              });

              // Check if Gemini invoked Function Calling (e.g. aggregate_catalog or search_catalog)
              if (firstResponse && (firstResponse as any).functionCalls && (firstResponse as any).functionCalls.length > 0) {
                const fCall = (firstResponse as any).functionCalls[0];
                const toolResult = handleExecuteCatalogTool(fCall.name, fCall.args);
                const candidateContent = firstResponse.candidates?.[0]?.content;

                try {
                  const followUpResponse = await ai.models.generateContent({
                    model: mName,
                    contents: [
                      ...contents,
                      candidateContent || { role: 'model', parts: [{ functionCall: fCall }] },
                      {
                        role: 'user',
                        parts: [
                          {
                            functionResponse: {
                              name: fCall.name,
                              response: { output: toolResult },
                            },
                          },
                        ],
                      },
                    ],
                    config: {
                      systemInstruction: fullSystemInstruction,
                      temperature: 0.7,
                    },
                  });

                  if (followUpResponse && followUpResponse.text) {
                    return followUpResponse;
                  }
                } catch (fnErr) {
                  console.warn('Gemini functionResponse follow-up error:', fnErr);
                }

                if (toolResult && toolResult.message) {
                  return { text: toolResult.message };
                }
              }

              return firstResponse;
            })();

            const response = await Promise.race([aiPromise, timeoutPromise]);
            if (response && response.text) {
              replyText = response.text;
              isAiOnline = true;
              usedProvider = 'Gemini';
              if (usedModel !== mName) {
                replyText = `> ℹ️ *המודל המבוקש \`${usedModel}\` לא היה זמין בספק Gemini (שגיאה 404 / לא נתמך). המענה נוצר בהצלחה באמצעות מודל ברירת המחדל \`${mName}\`:*\n\n` + replyText;
              }
              usedModel = mName;
              break;
            }
          } catch (geminiError: any) {
            console.warn(`Gemini model ${mName} call failed (${geminiError?.message || geminiError}), trying next candidate...`);
            if (mName === usedModel) {
              const is404 = geminiError?.status === 404 || (geminiError?.message || '').includes('404') || (geminiError?.message || '').includes('not found');
              statusNote = is404
                ? `המודל "${mName}" אינו קיים ב-Gemini API (שגיאה 404 - Not Found). מומלץ לבחור gemini-flash-lite-latest`
                : `מודל Gemini ${mName} לא היה זמין (${geminiError?.message || 'שגיאה'})`;
            }
          }
        }
      } else if (targetProviderKey === 'openai') {
        try {
          const openAiMessages = [
            { role: 'system', content: fullSystemInstruction },
            ...messages.filter(m => m && m.content).map(m => ({
              role: m.role === 'assistant' ? 'assistant' : 'user',
              content: m.content,
            })),
          ];
          const modelName = usedModel;
          const resAI = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: modelName,
              messages: openAiMessages,
              temperature: 0.7,
              max_tokens: 1500,
              tools: catalogToolsOpenAI,
              tool_choice: 'auto',
            }),
            signal: AbortSignal.timeout(20000),
          });
          if (resAI.ok) {
            const json: any = await resAI.json();
            const choice = json.choices?.[0];
            if (choice?.message?.tool_calls && choice.message.tool_calls.length > 0) {
              const tc = choice.message.tool_calls[0];
              const toolResult = handleExecuteCatalogTool(tc.function.name, tc.function.arguments);
              const followUpRes = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                  model: modelName,
                  messages: [
                    ...openAiMessages,
                    choice.message,
                    {
                      role: 'tool',
                      tool_call_id: tc.id,
                      content: JSON.stringify(toolResult),
                    },
                  ],
                  temperature: 0.7,
                  max_tokens: 1500,
                }),
                signal: AbortSignal.timeout(20000),
              });
              if (followUpRes.ok) {
                const followJson: any = await followUpRes.json();
                const text = followJson.choices?.[0]?.message?.content;
                if (text) {
                  replyText = text;
                  isAiOnline = true;
                  usedProvider = 'OpenAI';
                  usedModel = modelName;
                }
              } else if (toolResult.message) {
                replyText = toolResult.message;
                isAiOnline = true;
                usedProvider = 'OpenAI';
                usedModel = modelName;
              }
            } else if (choice?.message?.content) {
              replyText = choice.message.content;
              isAiOnline = true;
              usedProvider = 'OpenAI';
              usedModel = modelName;
            }
          } else {
            const errBody = await resAI.text();
            console.warn(`OpenAI direct call returned ${resAI.status}: ${errBody}`);
            statusNote = `המודל ${modelName} אינו זמין (OpenAI HTTP ${resAI.status}): ${errBody.slice(0, 140)}`;
          }
        } catch (err: any) {
          console.warn('OpenAI direct call failed:', err?.message || err);
          statusNote = `המודל ${usedModel} אינו זמין: ${err?.message || 'שגיאת רשת'}`;
        }
      } else if (targetProviderKey === 'claude') {
        try {
          const anthropicMessages = messages.filter(m => m && m.content).map(m => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
          }));
          const modelName = usedModel;
          const resAI = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: modelName,
              system: fullSystemInstruction,
              messages: anthropicMessages,
              max_tokens: 1500,
              temperature: 0.7,
              tools: catalogToolsClaude,
            }),
            signal: AbortSignal.timeout(20000),
          });
          if (resAI.ok) {
            const json: any = await resAI.json();
            const toolUse = Array.isArray(json.content) && json.content.find((b: any) => b.type === 'tool_use');
            if (toolUse) {
              const toolResult = handleExecuteCatalogTool(toolUse.name, toolUse.input);
              const followUpRes = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-api-key': apiKey,
                  'anthropic-version': '2023-06-01',
                },
                body: JSON.stringify({
                  model: modelName,
                  system: fullSystemInstruction,
                  messages: [
                    ...anthropicMessages,
                    { role: 'assistant', content: json.content },
                    {
                      role: 'user',
                      content: [
                        {
                          type: 'tool_result',
                          tool_use_id: toolUse.id,
                          content: JSON.stringify(toolResult),
                        },
                      ],
                    },
                  ],
                  max_tokens: 1500,
                  temperature: 0.7,
                }),
                signal: AbortSignal.timeout(20000),
              });
              if (followUpRes.ok) {
                const followJson: any = await followUpRes.json();
                const text = followJson.content?.[0]?.text;
                if (text) {
                  replyText = text;
                  isAiOnline = true;
                  usedProvider = 'Claude';
                  usedModel = modelName;
                }
              } else if (toolResult.message) {
                replyText = toolResult.message;
                isAiOnline = true;
                usedProvider = 'Claude';
                usedModel = modelName;
              }
            } else {
              const text = json.content?.[0]?.text;
              if (text) {
                replyText = text;
                isAiOnline = true;
                usedProvider = 'Claude';
                usedModel = modelName;
              }
            }
          } else {
            const errBody = await resAI.text();
            console.warn(`Anthropic direct call returned ${resAI.status}: ${errBody}`);
            statusNote = `המודל ${modelName} אינו זמין (Claude HTTP ${resAI.status}): ${errBody.slice(0, 140)}`;
          }
        } catch (err: any) {
          console.warn('Claude direct call failed:', err?.message || err);
          statusNote = `המודל ${usedModel} אינו זמין: ${err?.message || 'שגיאת רשת'}`;
        }
      } else if (targetProviderKey === 'groq') {
        try {
          const groqMessages = [
            { role: 'system', content: fullSystemInstruction },
            ...messages.filter(m => m && m.content).map(m => ({
              role: m.role === 'assistant' ? 'assistant' : 'user',
              content: m.content,
            })),
          ];
          const modelName = usedModel;
          const resAI = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: modelName,
              messages: groqMessages,
              temperature: 0.7,
              max_tokens: 1500,
              tools: catalogToolsOpenAI,
              tool_choice: 'auto',
            }),
            signal: AbortSignal.timeout(20000),
          });
          if (resAI.ok) {
            const json: any = await resAI.json();
            const choice = json.choices?.[0];
            if (choice?.message?.tool_calls && choice.message.tool_calls.length > 0) {
              const tc = choice.message.tool_calls[0];
              const toolResult = handleExecuteCatalogTool(tc.function.name, tc.function.arguments);
              const followUpRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                  model: modelName,
                  messages: [
                    ...groqMessages,
                    choice.message,
                    {
                      role: 'tool',
                      tool_call_id: tc.id,
                      content: JSON.stringify(toolResult),
                    },
                  ],
                  temperature: 0.7,
                  max_tokens: 1500,
                }),
                signal: AbortSignal.timeout(20000),
              });
              if (followUpRes.ok) {
                const followJson: any = await followUpRes.json();
                const text = followJson.choices?.[0]?.message?.content;
                if (text) {
                  replyText = text;
                  isAiOnline = true;
                  usedProvider = 'Groq';
                  usedModel = modelName;
                }
              } else if (toolResult.message) {
                replyText = toolResult.message;
                isAiOnline = true;
                usedProvider = 'Groq';
                usedModel = modelName;
              }
            } else if (choice?.message?.content) {
              replyText = choice.message.content;
              isAiOnline = true;
              usedProvider = 'Groq';
              usedModel = modelName;
            }
          } else {
            const errBody = await resAI.text();
            console.warn(`Groq direct call returned ${resAI.status}: ${errBody}`);
            statusNote = `המודל ${modelName} אינו זמין (Groq HTTP ${resAI.status}): ${errBody.slice(0, 140)}`;
          }
        } catch (err: any) {
          console.warn('Groq direct call failed:', err?.message || err);
          statusNote = `המודל ${usedModel} אינו זמין: ${err?.message || 'שגיאת רשת'}`;
        }
      } else if (targetProviderKey === 'deepseek') {
        try {
          const deepseekMessages = [
            { role: 'system', content: fullSystemInstruction },
            ...messages.filter(m => m && m.content).map(m => ({
              role: m.role === 'assistant' ? 'assistant' : 'user',
              content: m.content,
            })),
          ];
          const modelName = usedModel;
          const resAI = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: modelName,
              messages: deepseekMessages,
              temperature: 0.7,
              max_tokens: 1500,
              tools: catalogToolsOpenAI,
              tool_choice: 'auto',
            }),
            signal: AbortSignal.timeout(20000),
          });
          if (resAI.ok) {
            const json: any = await resAI.json();
            const choice = json.choices?.[0];
            if (choice?.message?.tool_calls && choice.message.tool_calls.length > 0) {
              const tc = choice.message.tool_calls[0];
              const toolResult = handleExecuteCatalogTool(tc.function.name, tc.function.arguments);
              const followUpRes = await fetch('https://api.deepseek.com/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                  model: modelName,
                  messages: [
                    ...deepseekMessages,
                    choice.message,
                    {
                      role: 'tool',
                      tool_call_id: tc.id,
                      content: JSON.stringify(toolResult),
                    },
                  ],
                  temperature: 0.7,
                  max_tokens: 1500,
                }),
                signal: AbortSignal.timeout(20000),
              });
              if (followUpRes.ok) {
                const followJson: any = await followUpRes.json();
                const text = followJson.choices?.[0]?.message?.content;
                if (text) {
                  replyText = text;
                  isAiOnline = true;
                  usedProvider = 'DeepSeek';
                  usedModel = modelName;
                }
              } else if (toolResult.message) {
                replyText = toolResult.message;
                isAiOnline = true;
                usedProvider = 'DeepSeek';
                usedModel = modelName;
              }
            } else if (choice?.message?.content) {
              replyText = choice.message.content;
              isAiOnline = true;
              usedProvider = 'DeepSeek';
              usedModel = modelName;
            }
          } else {
            const errBody = await resAI.text();
            console.warn(`DeepSeek direct call returned ${resAI.status}: ${errBody}`);
            statusNote = `המודל ${modelName} אינו זמין (DeepSeek HTTP ${resAI.status}): ${errBody.slice(0, 140)}`;
          }
        } catch (err: any) {
          console.warn('DeepSeek direct call failed:', err?.message || err);
          statusNote = `המודל ${usedModel} אינו זמין: ${err?.message || 'שגיאת רשת'}`;
        }
      }

      if (!isAiOnline || !replyText) {
        isAiOnline = false;
        usedProvider = providerDef.name;
        if (!statusNote) {
          statusNote = `המודל שנבחר (${usedModel}) בספק ${providerDef.name} אינו זמין כרגע.`;
        }
        replyText = `> ⚠️ **מודל אינו זמין (${providerDef.name} • ${usedModel}):** ${statusNote}\n> המענה נוצר במצב לא מקוון מקומי על סמך קטלוג המערכת:\n\n` +
          generateFallbackResponse(userPromptText, topStores, topDeals, topBilling, previousTopic);
      }
    }

    // Keep deals and stores if they have genuine relevance
    const filteredStores = topStores;
    const filteredDeals = topDeals;
    const filteredBilling = topBilling;

    const followUps = generateFollowUps(userPromptText, topStores, topDeals);

    return res.json({
      reply: replyText,
      isAiOnline,
      provider: usedProvider,
      model: usedModel,
      statusNote,
      recommendedStores: filteredStores.map(s => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        category: s.category,
        clubs: s.clubs,
        max_discount: s.max_discount,
        logo: s.logo,
        website: s.website,
        cards: s.cards,
        payment_options: s.payment_options,
      })),
      recommendedDeals: filteredDeals.map(d => ({
        id: d.id,
        title: d.title,
        slug: d.slug,
        club: d.club,
        supplier: d.supplier,
        category: d.category,
        price: d.price,
        original_price: d.original_price,
        discount_percent: d.discount_percent,
        coupon_code: d.coupon_code,
        image: d.image,
        url: d.url,
      })),
      recommendedBilling: filteredBilling.map(b => ({
        id: b.id,
        name: b.name,
        discount: b.discount,
        city: b.city,
        address: b.address,
        category: b.category,
        description: b.description,
        logo: b.logo,
        detail_url: b.detail_url,
        full_address: b.full_address,
      })),
      suggestedFollowUps: followUps,
    });
  } catch (error: any) {
    console.error('Chat endpoint error:', error);
    return res.status(500).json({
      error: 'שגיאה בעיבוד הבקשה. אנא נסה שוב.',
      details: error?.message || 'Unknown error',
    });
  }
});

// Dynamic Model Fetching with provider API key
async function fetchProviderModels(providerId: string, apiKey: string): Promise<Array<{ id: string; name: string; description?: string }>> {
  if (providerId === 'gemini') {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });
    const listRes = await ai.models.list();
    const modelsList: Array<{ id: string; name: string; description?: string }> = [];
    for await (const m of listRes) {
      const cleanId = (m.name || '').replace(/^models\//, '');
      if (cleanId) {
        modelsList.push({
          id: cleanId,
          name: m.displayName || cleanId,
          description: m.description || '',
        });
      }
    }
    const priority = [
      'gemini-flash-lite-latest',
      'gemini-2.5-flash-lite',
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash-lite',
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-3.8-flash',
      'gemini-3.1-pro-preview',
      'gemini-flash-latest',
      'gemini-pro-latest',
    ];
    modelsList.sort((a, b) => {
      const idxA = priority.indexOf(a.id);
      const idxB = priority.indexOf(b.id);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.id.localeCompare(b.id);
    });
    return modelsList;
  }

  if (providerId === 'openai') {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI HTTP ${res.status}: ${errText}`);
    }
    const data: any = await res.json();
    const list = Array.isArray(data.data) ? data.data : [];
    const modelsList: Array<{ id: string; name: string; description?: string }> = list
      .map((m: any) => ({
        id: m.id,
        name: m.id,
      }))
      .filter((m: any) => {
        const id = m.id.toLowerCase();
        return id.includes('gpt') || id.includes('o1') || id.includes('o3') || id.includes('chat');
      });

    const priority = ['gpt-4o', 'gpt-4o-mini', 'o1', 'o3-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'];
    modelsList.sort((a, b) => {
      const idxA = priority.indexOf(a.id);
      const idxB = priority.indexOf(b.id);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.id.localeCompare(b.id);
    });
    return modelsList;
  }

  if (providerId === 'groq') {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Groq HTTP ${res.status}: ${errText}`);
    }
    const data: any = await res.json();
    const list = Array.isArray(data.data) ? data.data : [];
    const modelsList = list.map((m: any) => ({
      id: m.id,
      name: m.id,
      description: m.owned_by ? `ספק: ${m.owned_by}` : undefined,
    }));
    const priority = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'];
    modelsList.sort((a: any, b: any) => {
      const idxA = priority.indexOf(a.id);
      const idxB = priority.indexOf(b.id);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.id.localeCompare(b.id);
    });
    return modelsList;
  }

  if (providerId === 'deepseek') {
    const res = await fetch('https://api.deepseek.com/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`DeepSeek HTTP ${res.status}: ${errText}`);
    }
    const data: any = await res.json();
    const list = Array.isArray(data.data) ? data.data : [];
    return list.map((m: any) => ({
      id: m.id,
      name: m.id,
    }));
  }

  if (providerId === 'claude') {
    try {
      const res = await fetch('https://api.anthropic.com/v1/models', {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const data: any = await res.json();
        const list = Array.isArray(data.data) ? data.data : [];
        if (list.length > 0) {
          return list.map((m: any) => ({
            id: m.id,
            name: m.display_name || m.id,
          }));
        }
      }
    } catch {}

    // Fallback list of Claude models
    return [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet (Latest)' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
      { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
    ];
  }

  return [];
}

// GET /api/models: Fetch dynamic models directly from provider API using configured secret key
apiRouter.get('/api/models', async (req, res) => {
  const provider = (typeof req.query.provider === 'string' && DIRECT_AI_PROVIDERS[req.query.provider])
    ? req.query.provider
    : 'gemini';
  const def = DIRECT_AI_PROVIDERS[provider];
  const env = readEnvSecrets();
  const apiKey = getProviderKey(provider, env);

  if (!apiKey) {
    return res.json({
      available: false,
      provider,
      models: [],
      defaultModel: def.defaultModel,
      requiredSecret: def.envKeys[0],
      error: `משתנה סודי ${def.envKeys.join(' או ')} אינו מוגדר ב-Secrets של GitHub או ב-.env עבור ${def.name}.`,
    });
  }

  try {
    const models = await fetchProviderModels(provider, apiKey);
    return res.json({
      available: true,
      provider,
      models,
      defaultModel: def.defaultModel,
      requiredSecret: def.envKeys[0],
    });
  } catch (err: any) {
    console.warn(`Failed to fetch models for provider ${provider}:`, err?.message || err);
    return res.json({
      available: false,
      provider,
      models: [],
      defaultModel: def.defaultModel,
      requiredSecret: def.envKeys[0],
      error: `שגיאה במשיכת מודלים מספק ${def.name}: ${err?.message || 'שגיאת גישה'}`,
    });
  }
});

// POST /api/verify-password: Check if user-entered password matches AI secret password
apiRouter.post('/api/verify-password', (req, res) => {
  const env = readEnvSecrets();
  const serverPassword = getAiPassword(env);

  if (!serverPassword) {
    return res.json({ valid: true, notRequired: true });
  }

  const userPassword = (req.body?.password || '').trim();
  const userPassHash = crypto.createHash('sha256').update(userPassword).digest('hex');
  const serverPassHash = crypto.createHash('sha256').update(serverPassword).digest('hex');

  if (userPassword === serverPassword || userPassHash === serverPassHash) {
    return res.json({ valid: true });
  }

  return res.status(401).json({ valid: false, error: 'סיסמה שגויה. אנא נסה שוב.' });
});

// GET /api/ai-status: Health check for current AI providers and secrets
apiRouter.get('/api/ai-status', (req, res) => {
  const env = readEnvSecrets();
  const serverPassword = getAiPassword(env);
  const providerStatuses: Record<string, any> = {};

  for (const [id, def] of Object.entries(DIRECT_AI_PROVIDERS)) {
    const key = getProviderKey(id, env);
    providerStatuses[id] = {
      id,
      name: def.name,
      model: def.defaultModel,
      requiredSecret: def.envKeys[0],
      available: Boolean(key),
    };
  }

  // Find first available or default to gemini
  const availableProvider = Object.keys(providerStatuses).find(k => providerStatuses[k].available) || 'gemini';

  return res.json({
    isAiOnline: Boolean(providerStatuses[availableProvider]?.available),
    provider: providerStatuses[availableProvider]?.name,
    model: providerStatuses[availableProvider]?.model,
    providers: providerStatuses,
    defaultProvider: availableProvider,
    isPasswordRequired: Boolean(serverPassword),
  });
});
