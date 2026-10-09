/**
 * Behatsdaa Smart Payment Advisor
 *
 * Standalone, dependency-free ES module that compares the three payment
 * channels available for any store and recommends the most profitable one:
 *
 *   A) Rechargeable club cards   → `store.cards` + `store.max_discount`
 *      (also reads `card.discount_numeric` / `card.discount`)
 *   B) Dedicated vouchers/deals  → `store.linked_deals` / `store.linkedDeals`
 *      (uses `discount_percent`, or derives the rate from
 *       `original_price` vs `price`)
 *   C) Credit card billing       → `store.linked_billing` /
 *      `store.linkedBillingStore` (`discount`)
 *
 * Every channel is normalized to a percentage, the winning channel is picked,
 * and a friendly Hebrew recommendation (plus an actionable tip) is produced.
 *
 * Tie-break rule: when two channels offer exactly the same discount, the
 * advisor prefers `card` over `billing` over `voucher`. Card discounts usually
 * apply to the whole chain repeatedly, billing discounts apply automatically
 * at checkout, and vouchers are typically product-specific or one-time.
 */

/** Deterministic preference used only when two channels tie on discount. */
const TIE_BREAK_PRIORITY = { card: 0, billing: 1, voucher: 2 };

/** Message shown when a store exposes no active payment benefit. */
const NO_BENEFIT_TITLE = 'לא נמצאה הטבה פעילה בבית עסק זה';
const NO_BENEFIT_MESSAGE = 'לא נמצאו ערוצי תשלום עם הטבות בבית עסק זה.';

/**
 * Actionable tips. Each one explains the practical difference between a
 * dedicated voucher, a rechargeable club card and a credit-card billing
 * discount, so the shopper understands *why* the winner won.
 */
const ADVICE_TIPS = {
  card: 'כרטיס נטען משתלם במיוחד לרכישות חוזרות, משום שההנחה חלה על כלל המוצרים ברשת. שובר ייעודי עשוי להשתלם יותר לרכישה בודדת (בדקו תוקף ותנאי מימוש), והנחת מעמד החיוב (Max) חלה אוטומטית בכרטיס האשראי המתאים אך אינה ניתנת לכפל עם כרטיסים נטענים.',
  voucher: 'שובר ייעודי מקנה לרוב את החיסכון הגבוה ביותר לרכישה ספציפית, אך הוא בדרך כלל חד-פעמי ומוגבל למוצר או למסלול מסוים — בדקו את תנאי המימוש והתוקף לפני הרכישה. כרטיס נטען מתאים יותר לרכישות חוזרות ברשת, והנחת מעמד החיוב (Max) חלה אוטומטית בכרטיס האשראי המתאים.',
  billing: 'הנחת מעמד החיוב חלה אוטומטית בעת החיוב בכרטיס האשראי המתאים, בלי לרכוש שובר או לטעון כרטיס — אך היא אינה ניתנת לכפל עם כרטיסים נטענים. שובר ייעודי עשוי להשתלם יותר לרכישה בודדת, וכרטיס נטען משתלם לרכישות חוזרות ברשת.',
  none: 'כדאי להשוות בין שלושת ערוצי התשלום: שובר ייעודי משתלם לרכישה חד-פעמית, כרטיס נטען משתלם לרכישות חוזרות ברשת, והנחת מעמד החיוב חלה אוטומטית בכרטיס האשראי המתאים ואינה ניתנת לכפל עם כרטיסים נטענים.',
};

/* ------------------------------------------------------------------ *
 * Small value helpers
 * ------------------------------------------------------------------ */

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function firstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null) return value;
  }
  return null;
}

/** Coerces numbers and numeric strings ('20%', '16.5%') to a finite number. */
function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d.-]/g, '');
    if (cleaned === '' || cleaned === '-' || cleaned === '.') return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** Normalizes any raw value to a discount percentage (0..100, 1 decimal). */
function normalizeDiscount(value) {
  const num = toNumber(value);
  if (num === null || num <= 0) return 0;
  return Math.round(Math.min(num, 100) * 10) / 10;
}

/** Trims a value into a non-empty string, or null. */
function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
  }
  return null;
}

/** '30' / '16.5' — drops a trailing `.0` for clean Hebrew copy. */
function formatPercent(value) {
  const rounded = Math.round(value * 10) / 10;
  return String(rounded);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ------------------------------------------------------------------ *
 * Channel collectors
 * ------------------------------------------------------------------ */

/** Builds a human label for the winning rechargeable card. */
function buildCardLabel(cardName) {
  const clean = firstString(cardName);
  if (!clean) return 'כרטיס נטען בהצדעה';
  // Card names in the dataset sometimes embed the rate ('ארנק רשתות 20%').
  const withoutRate = clean.replace(/\s*\d+([.,]\d+)?\s*%$/, '').trim();
  if (!withoutRate) return 'כרטיס נטען בהצדעה';
  if (withoutRate.startsWith('כרטיס')) return withoutRate;
  return `כרטיס נטען ${withoutRate}`;
}

/** Channel A — rechargeable club cards. Returns null when absent. */
function collectCardChannel(store) {
  const cards = Array.isArray(store.cards) ? store.cards.filter(isObject) : [];
  const storeMaxDiscount = normalizeDiscount(firstDefined(store.max_discount, store.maxDiscount, store.maxDiscountPercent));

  let bestCard = null;
  let bestCardDiscount = 0;
  for (const card of cards) {
    const raw = firstDefined(card.discount_numeric, card.discountNumeric, card.discount, card.max_discount, card.maxDiscount);
    if (raw === null) continue;
    const discount = normalizeDiscount(raw);
    if (bestCard === null || discount > bestCardDiscount) {
      bestCard = card;
      bestCardDiscount = discount;
    }
  }

  const discount = Math.max(storeMaxDiscount, bestCardDiscount);
  if (cards.length === 0 && discount <= 0) return null;

  const useCardName = bestCard !== null && bestCardDiscount >= storeMaxDiscount;
  return {
    type: 'card',
    name: buildCardLabel(useCardName ? firstDefined(bestCard.card_name, bestCard.cardName, bestCard.name, bestCard.title) : null),
    discount,
  };
}

/** Discount of a single voucher, from `discount_percent` or price delta. */
function voucherDiscount(deal) {
  const explicit = normalizeDiscount(firstDefined(deal.discount_percent, deal.discountPercent, deal.discount));
  if (explicit > 0) return explicit;

  const original = toNumber(firstDefined(deal.original_price, deal.originalPrice));
  const price = toNumber(deal.price);
  if (original !== null && original > 0 && price !== null && price >= 0 && price < original) {
    return normalizeDiscount(((original - price) / original) * 100);
  }
  return 0;
}

/** Builds a human label for the winning voucher/deal. */
function buildVoucherLabel(title) {
  if (!title) return 'שובר/מבצע ייעודי';
  // Avoid a redundant 'שובר: שובר ...' prefix when the title already says it.
  return title.includes('שובר') ? title : `שובר: ${title}`;
}

/** Channel B — dedicated vouchers/deals. Returns null when absent. */
function collectVoucherChannel(store) {
  const raw = firstDefined(store.linked_deals, store.linkedDeals);
  const deals = Array.isArray(raw) ? raw.filter(isObject) : [];
  if (deals.length === 0) return null;

  let bestDeal = null;
  let bestDiscount = 0;
  for (const deal of deals) {
    const discount = voucherDiscount(deal);
    if (bestDeal === null || discount > bestDiscount) {
      bestDeal = deal;
      bestDiscount = discount;
    }
  }

  const title = firstString(bestDeal && bestDeal.title, bestDeal && bestDeal.name, bestDeal && bestDeal.supplier);
  return {
    type: 'voucher',
    name: buildVoucherLabel(title),
    discount: bestDiscount,
  };
}

/** Channel C — credit-card billing discount. Returns null when absent. */
function collectBillingChannel(store) {
  const billing = firstDefined(store.linked_billing, store.linkedBillingStore, store.linked_billing_store, store.linkedBilling);
  if (!isObject(billing)) return null;

  const discount = normalizeDiscount(firstDefined(billing.discount, billing.discount_percent, billing.discountPercent));
  const name = firstString(billing.name, billing.title);
  return {
    type: 'billing',
    name: name ? `הנחה במעמד החיוב: ${name}` : 'הנחה במעמד החיוב (Max)',
    discount,
  };
}

/* ------------------------------------------------------------------ *
 * Recommendation builders
 * ------------------------------------------------------------------ */

function buildTitle(winner) {
  if (!winner) return NO_BENEFIT_TITLE;
  return `הדרך המשתלמת ביותר: ${winner.name} (${formatPercent(winner.discount)}% הנחה)`;
}

function buildExplanation(winner, options) {
  if (!winner) {
    return 'לא זוהו הטבות תשלום פעילות בבית העסק. ניתן לבדוק מול הקופה אם קיימות הטבות נוספות שאינן מפורטות באתר.';
  }
  const rate = `${formatPercent(winner.discount)}%`;
  if (options.length === 1) {
    return `בית העסק מציע ערוץ הטבה אחד: ${winner.name} — ${rate} הנחה.`;
  }
  return `השווינו ${options.length} ערוצי תשלום זמינים בבית העסק, ו${winner.name} מקנה את החיסכון הגבוה ביותר — ${rate} הנחה.`;
}

function badgelabel(option, winner) {
  if (winner && option.type === winner.type) return 'הכי משתלם';
  if (option.discount > 0) return 'חלופה';
  return 'ללא הנחה';
}

/* ------------------------------------------------------------------ *
 * Public API
 * ------------------------------------------------------------------ */

/**
 * Compares the payment channels of a store and returns the recommendation.
 *
 * @param {object} store - Store record (cards / linked deals / linked billing).
 * @returns {{
 *   bestMethod: 'card'|'voucher'|'billing'|'none',
 *   bestDiscount: number,
 *   title: string,
 *   explanation: string,
 *   options: Array<{ type: string, name: string, discount: number, isBest: boolean, badge: string }>,
 *   adviceTip: string
 * }}
 */
export function calculateBestPayment(store) {
  const source = isObject(store) ? store : {};

  const options = [];
  const cardChannel = collectCardChannel(source);
  if (cardChannel) options.push(cardChannel);
  const voucherChannel = collectVoucherChannel(source);
  if (voucherChannel) options.push(voucherChannel);
  const billingChannel = collectBillingChannel(source);
  if (billingChannel) options.push(billingChannel);

  // Pick the winner: highest discount, deterministic tie-break, positive only.
  let winner = null;
  for (const option of options) {
    if (option.discount <= 0) continue;
    if (winner === null) {
      winner = option;
      continue;
    }
    if (option.discount > winner.discount) {
      winner = option;
    } else if (option.discount === winner.discount && TIE_BREAK_PRIORITY[option.type] < TIE_BREAK_PRIORITY[winner.type]) {
      winner = option;
    }
  }

  const bestMethod = winner ? winner.type : 'none';
  const bestDiscount = winner ? winner.discount : 0;

  return {
    bestMethod,
    bestDiscount,
    title: buildTitle(winner),
    explanation: buildExplanation(winner, options),
    options: options.map((option) => ({
      type: option.type,
      name: option.name,
      discount: option.discount,
      isBest: Boolean(winner) && option.type === winner.type,
      badge: badgelabel(option, winner),
    })),
    adviceTip: ADVICE_TIPS[bestMethod] || ADVICE_TIPS.none,
  };
}

function renderOptionChip(option) {
  const isBest = option.isBest;
  const hasDiscount = option.discount > 0;

  const containerClass = isBest
    ? 'border-emerald-400 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 ring-2 ring-emerald-400/60'
    : 'border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/60';
  const badgeClass = isBest
    ? 'bg-emerald-600 text-white'
    : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
  const discountClass = isBest ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-200';

  return `<li class="payment-advisor-option ${containerClass} rounded-xl border p-2.5 flex flex-col gap-1.5 min-w-0" data-method="${option.type}" data-best="${isBest ? 'true' : 'false'}"${
    isBest ? ' aria-current="true"' : ''
  }>
        <span class="flex items-center justify-between gap-2">
          <span class="payment-advisor-option-badge ${badgeClass} px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap">${escapeHtml(
            option.badge
          )}</span>
          <span class="payment-advisor-option-discount text-sm font-black ${discountClass}" title="${escapeHtml(
            `${formatPercent(option.discount)}% הנחה`
          )}">${escapeHtml(formatPercent(option.discount))}%</span>
        </span>
        <span class="payment-advisor-option-name text-xs font-medium text-slate-800 dark:text-slate-200 leading-snug line-clamp-2">${escapeHtml(
          option.name
        )}</span>
      </li>`;
}

/**
 * Renders the responsive, accessible Hebrew (RTL) Tailwind HTML card for the
 * store modal (`#store-modal`). The winning channel is highlighted with a
 * gold badge and an emerald comparison chip, followed by chips for the other
 * available channels and an actionable tip.
 *
 * @param {object} store - Store record (cards / linked deals / linked billing).
 * @returns {string} HTML markup.
 */
export function renderPaymentAdvisorHtml(store) {
  const advice = calculateBestPayment(store);
  const storeName = isObject(store) ? firstString(store.name) : null;
  const hasWinner = advice.bestMethod !== 'none';

  const badgeText = hasWinner ? `${formatPercent(advice.bestDiscount)}% הנחה` : 'אין הטבות פעילות';
  const badgeClass = hasWinner
    ? 'bg-amber-400 text-amber-950'
    : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300';

  const optionsBlock =
    advice.options.length > 0
      ? `<ul class="payment-advisor-options grid grid-cols-1 sm:grid-cols-3 gap-2 list-none p-0 m-0" aria-label="השוואת ערוצי תשלום">
      ${advice.options.map(renderOptionChip).join('\n      ')}
    </ul>`
      : `<p class="payment-advisor-empty m-0 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-white/60 dark:bg-slate-800/50 p-3 text-xs text-slate-500 dark:text-slate-400">${escapeHtml(
          NO_BENEFIT_MESSAGE
        )}</p>`;

  const ariaLabel = `איך הכי כדאי לשלם כאן? — המלצת תשלום${storeName ? ` עבור ${escapeHtml(storeName)}` : ''}`;

  return `<section id="payment-advisor" class="payment-advisor payment-advisor--${advice.bestMethod} rounded-2xl border border-amber-200/80 dark:border-amber-800/60 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 p-4 shadow-xs space-y-3" dir="rtl" lang="he" role="region" aria-label="${ariaLabel}">
    <header class="flex items-start justify-between gap-3 flex-wrap">
      <div class="flex items-start gap-2.5 min-w-0">
        <span class="w-8 h-8 shrink-0 rounded-xl bg-amber-500 text-white flex items-center justify-center text-base shadow-xs" aria-hidden="true">💡</span>
        <div class="min-w-0">
          <h4 class="payment-advisor-heading m-0 text-sm font-bold text-slate-900 dark:text-white">איך הכי כדאי לשלם כאן?</h4>
          <p class="payment-advisor-explanation m-0 mt-0.5 text-xs text-slate-600 dark:text-slate-300 leading-snug">${escapeHtml(
            advice.explanation
          )}</p>
        </div>
      </div>
      <span id="advisor-best-badge" class="payment-advisor-best-badge shrink-0 px-2.5 py-1 rounded-xl text-xs font-black shadow-xs ${badgeClass}" role="status"><span aria-hidden="true">🏆</span> ${escapeHtml(
    badgeText
  )}</span>
    </header>
    ${optionsBlock}
    <p class="payment-advisor-tip m-0 flex items-start gap-1.5 rounded-xl border border-amber-200/70 dark:border-amber-900/40 bg-amber-100/70 dark:bg-amber-950/60 p-2.5 text-[11px] leading-relaxed text-amber-900 dark:text-amber-200" role="note">
      <i data-lucide="info" class="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" aria-hidden="true"></i>
      <span class="payment-advisor-tip-text">${escapeHtml(advice.adviceTip)}</span>
    </p>
  </section>`;
}
