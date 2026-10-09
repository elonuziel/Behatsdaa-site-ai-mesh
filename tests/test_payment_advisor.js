/**
 * Automated Test Suite for the Behatsdaa Smart Payment Advisor
 * (js/payment-advisor.js)
 *
 * Runs in plain Node.js (ES modules only) with zero external dependencies.
 *
 *   node tests/test_payment_advisor.js
 *
 * Coverage:
 *  - Stores with only rechargeable cards
 *  - Stores with only dedicated vouchers (discount_percent & price delta)
 *  - Stores with only a billing discount
 *  - Multi-channel stores where all 3 methods compete
 *  - Identical discounts (deterministic tie-break)
 *  - Zero discounts, malformed entries and empty/missing data
 *  - Advice tips explaining voucher vs card vs credit card
 *  - Rendered RTL/accessible Tailwind HTML for #store-modal
 */

import assert from 'assert';
import { calculateBestPayment, renderPaymentAdvisorHtml } from '../js/payment-advisor.js';

/* ------------------------------------------------------------------ *
 * Fixtures
 * ------------------------------------------------------------------ */

const cardsOnlyStore = {
  id: 'cards-only',
  name: 'חנות כרטיסים',
  max_discount: 30,
  cards: [
    { card_name: 'חבר טעמים', discount: '15%', discount_numeric: 15 },
    { card_name: 'כרטיס צהוב חבר', discount: '30%', discount_numeric: 30 },
  ],
};

const vouchersOnlyStore = {
  id: 'vouchers-only',
  name: 'חנות שוברים',
  linked_deals: [
    { id: '1', title: 'שובר ספא זוגי', price: 200, original_price: 400, discount_percent: 50, supplier: 'ספא' },
    { id: '2', title: 'שובר קפה', price: 30, original_price: 50, discount_percent: 40, supplier: 'קפה' },
  ],
};

const billingOnlyStore = {
  id: 'billing-only',
  name: 'מסעדת השף',
  linked_billing: { id: 1, name: 'מסעדת השף', discount: 8, city: 'תל אביב' },
};

const multiChannelStore = {
  id: 'multi-channel',
  name: 'ערד טקסטיל',
  max_discount: 20,
  cards: [{ card_name: 'ארנק רשתות 20%', discount: '20%', discount_numeric: 20 }],
  linkedDeals: [{ id: '99', title: 'מבצע טקסטיל ענק', price: 90, original_price: 500, discount_percent: 82 }],
  linkedBillingStore: { id: 5457, name: 'ערד טקסטיל', discount: 6 },
};

const emptyStore = { id: 'empty', name: 'חנות ללא הטבות' };

/* ------------------------------------------------------------------ *
 * Tiny zero-dependency test harness
 * ------------------------------------------------------------------ */

let passed = 0;
let failed = 0;

function section(title) {
  console.log(`\n${title}`);
}

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✅ PASS: ${name}`);
  } catch (error) {
    failed++;
    process.exitCode = 1;
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     ↳ ${error && error.message ? error.message : error}`);
  }
}

console.log('====================================================');
console.log('   Behatsdaa Payment Advisor — Automated Tests      ');
console.log('====================================================');

/* ------------------------------------------------------------------ *
 * 1. Stores with only rechargeable cards
 * ------------------------------------------------------------------ */

section('1. Stores with only rechargeable cards');

test('recommends the card channel with the store max discount', () => {
  const advice = calculateBestPayment(cardsOnlyStore);
  assert.strictEqual(advice.bestMethod, 'card');
  assert.strictEqual(advice.bestDiscount, 30);
  assert.strictEqual(advice.title, 'הדרך המשתלמת ביותר: כרטיס צהוב חבר (30% הנחה)');
  assert.strictEqual(advice.options.length, 1);
  assert.deepStrictEqual(advice.options[0], {
    type: 'card',
    name: 'כרטיס צהוב חבר',
    discount: 30,
    isBest: true,
    badge: 'הכי משתלם',
  });
});

test('falls back to max_discount when there is no cards array', () => {
  const advice = calculateBestPayment({ name: 'רשת', max_discount: 25 });
  assert.strictEqual(advice.bestMethod, 'card');
  assert.strictEqual(advice.bestDiscount, 25);
  assert.strictEqual(advice.options[0].name, 'כרטיס נטען בהצדעה');
  assert.strictEqual(advice.options[0].badge, 'הכי משתלם');
});

test('derives the card discount from card entries when max_discount is missing', () => {
  const advice = calculateBestPayment({
    cards: [
      { card_name: 'מועדון X', discount: '12.5%' },
      { card_name: 'מועדון Y', discount_numeric: 18 },
    ],
  });
  assert.strictEqual(advice.bestMethod, 'card');
  assert.strictEqual(advice.bestDiscount, 18);
  assert.strictEqual(advice.options[0].name, 'כרטיס נטען מועדון Y');
});

test('parses string card discounts and strips an embedded rate from card names', () => {
  const advice = calculateBestPayment({ cards: [{ card_name: 'חבר טעמים 16.5%', discount: '16.5%' }] });
  assert.strictEqual(advice.bestMethod, 'card');
  assert.strictEqual(advice.bestDiscount, 16.5);
  assert.strictEqual(advice.options[0].name, 'כרטיס נטען חבר טעמים');
});

/* ------------------------------------------------------------------ *
 * 2. Stores with only dedicated vouchers
 * ------------------------------------------------------------------ */

section('2. Stores with only dedicated vouchers');

test('recommends the highest-discount voucher', () => {
  const advice = calculateBestPayment(vouchersOnlyStore);
  assert.strictEqual(advice.bestMethod, 'voucher');
  assert.strictEqual(advice.bestDiscount, 50);
  assert.strictEqual(advice.title, 'הדרך המשתלמת ביותר: שובר ספא זוגי (50% הנחה)');
  assert.strictEqual(advice.options.length, 1);
  assert.strictEqual(advice.options[0].name, 'שובר ספא זוגי');
  assert.strictEqual(advice.options[0].isBest, true);
});

test('derives the voucher discount from original_price vs price', () => {
  const advice = calculateBestPayment({ linked_deals: [{ title: 'מבצע טקסטיל', price: 60, original_price: 100 }] });
  assert.strictEqual(advice.bestMethod, 'voucher');
  assert.strictEqual(advice.bestDiscount, 40);
  assert.strictEqual(advice.options[0].name, 'שובר: מבצע טקסטיל');
});

test('rounds price-derived discounts to one decimal', () => {
  const advice = calculateBestPayment({ linked_deals: [{ title: 'מבצע', price: 250, original_price: 375 }] });
  assert.strictEqual(advice.bestMethod, 'voucher');
  assert.strictEqual(advice.bestDiscount, 33.3);
});

test('explicit discount_percent takes precedence over the price delta', () => {
  const advice = calculateBestPayment({ linked_deals: [{ title: 'מבצע', price: 50, original_price: 100, discount_percent: 10 }] });
  assert.strictEqual(advice.bestDiscount, 10);
});

test('a voucher with no real discount contributes 0', () => {
  const advice = calculateBestPayment({ linked_deals: [{ title: 'ללא הנחה', price: 100, original_price: 100, discount_percent: 0 }] });
  assert.strictEqual(advice.bestMethod, 'none');
  assert.strictEqual(advice.bestDiscount, 0);
  assert.deepStrictEqual(advice.options[0], {
    type: 'voucher',
    name: 'שובר: ללא הנחה',
    discount: 0,
    isBest: false,
    badge: 'ללא הנחה',
  });
});

test('malformed voucher entries are skipped without throwing', () => {
  const advice = calculateBestPayment({ linked_deals: [null, 'x', 42, { title: 'טוב', discount_percent: 20 }] });
  assert.strictEqual(advice.bestMethod, 'voucher');
  assert.strictEqual(advice.bestDiscount, 20);
  assert.strictEqual(advice.options.length, 1);
});

/* ------------------------------------------------------------------ *
 * 3. Stores with only a billing discount
 * ------------------------------------------------------------------ */

section('3. Stores with only a billing discount');

test('recommends the credit-card billing channel', () => {
  const advice = calculateBestPayment(billingOnlyStore);
  assert.strictEqual(advice.bestMethod, 'billing');
  assert.strictEqual(advice.bestDiscount, 8);
  assert.strictEqual(advice.title, 'הדרך המשתלמת ביותר: הנחה במעמד החיוב: מסעדת השף (8% הנחה)');
  assert.strictEqual(advice.options.length, 1);
  assert.deepStrictEqual(advice.options[0], {
    type: 'billing',
    name: 'הנחה במעמד החיוב: מסעדת השף',
    discount: 8,
    isBest: true,
    badge: 'הכי משתלם',
  });
});

test('accepts numeric string billing discounts', () => {
  const advice = calculateBestPayment({ linked_billing: { name: 'חנות', discount: '12.5%' } });
  assert.strictEqual(advice.bestDiscount, 12.5);
});

test('uses a generic billing label when the business name is missing', () => {
  const advice = calculateBestPayment({ linked_billing: { discount: 5 } });
  assert.strictEqual(advice.options[0].name, 'הנחה במעמד החיוב (Max)');
});

/* ------------------------------------------------------------------ *
 * 4. All three channels competing
 * ------------------------------------------------------------------ */

section('4. All three channels competing');

test('the highest discount wins and all channels are comparable', () => {
  const advice = calculateBestPayment(multiChannelStore);
  assert.strictEqual(advice.bestMethod, 'voucher');
  assert.strictEqual(advice.bestDiscount, 82);
  assert.strictEqual(advice.options.length, 3);
  assert.deepStrictEqual(advice.options.map((option) => option.type), ['card', 'voucher', 'billing']);
  assert.deepStrictEqual(advice.options.map((option) => option.discount), [20, 82, 6]);
  assert.deepStrictEqual(advice.options.map((option) => option.isBest), [false, true, false]);
  assert.deepStrictEqual(advice.options.map((option) => option.badge), ['חלופה', 'הכי משתלם', 'חלופה']);
  assert.ok(advice.title.includes('מבצע טקסטיל ענק'), 'title names the winning voucher');
  assert.ok(advice.title.includes('82% הנחה'), 'title includes the winning rate');
  assert.ok(advice.explanation.includes('82%'), 'explanation includes the winning rate');
  assert.ok(advice.explanation.includes('3 ערוצי תשלום'), 'explanation counts the compared channels');
});

test('a card can beat a weaker voucher and billing discount', () => {
  const advice = calculateBestPayment({
    name: 'סינמה סיטי',
    max_discount: 20,
    cards: [{ card_name: 'ארנק סינמה', discount: '20%', discount_numeric: 20 }],
    linked_deals: [{ title: 'פופקורן זוגי', price: 35, original_price: 40, discount_percent: 13 }],
    linked_billing: { name: 'סינמה סיטי', discount: 3 },
  });
  assert.strictEqual(advice.bestMethod, 'card');
  assert.strictEqual(advice.bestDiscount, 20);
  assert.strictEqual(advice.options.filter((option) => option.isBest).length, 1);
});

test('exactly one channel is ever marked as best', () => {
  for (const store of [cardsOnlyStore, vouchersOnlyStore, billingOnlyStore, multiChannelStore]) {
    const advice = calculateBestPayment(store);
    assert.strictEqual(
      advice.options.filter((option) => option.isBest).length,
      1,
      `expected exactly one best option for ${store.id}`
    );
    assert.strictEqual(advice.bestDiscount, Math.max(...advice.options.map((option) => option.discount)));
  }
});

test('calculation does not mutate the store and options are fresh per call', () => {
  const snapshot = JSON.parse(JSON.stringify(multiChannelStore));
  const first = calculateBestPayment(multiChannelStore);
  first.options[0].isBest = true;
  first.options.push({ type: 'hacked' });
  const second = calculateBestPayment(multiChannelStore);
  assert.deepStrictEqual(multiChannelStore, snapshot, 'store object must not be mutated');
  assert.strictEqual(second.options.length, 3);
  assert.strictEqual(second.options[0].isBest, false);
});

/* ------------------------------------------------------------------ *
 * 5. Identical discounts (deterministic tie-break)
 * ------------------------------------------------------------------ */

section('5. Identical discounts (deterministic tie-break)');

test('identical card / voucher / billing discounts prefer the card', () => {
  const advice = calculateBestPayment({
    cards: [{ card_name: 'כרטיס 20', discount: '20%' }],
    max_discount: 20,
    linked_deals: [{ title: 'שובר 20', discount_percent: 20 }],
    linked_billing: { name: 'חיוב 20', discount: 20 },
  });
  assert.strictEqual(advice.bestMethod, 'card');
  assert.strictEqual(advice.bestDiscount, 20);
  assert.strictEqual(advice.options.filter((option) => option.isBest).length, 1);
  assert.strictEqual(advice.options.find((option) => option.isBest).type, 'card');
});

test('identical card / billing discounts prefer the card', () => {
  const advice = calculateBestPayment({
    max_discount: 15,
    linked_billing: { name: 'חיוב', discount: 15 },
  });
  assert.strictEqual(advice.bestMethod, 'card');
});

test('identical voucher / billing discounts prefer billing', () => {
  const advice = calculateBestPayment({
    linked_deals: [{ title: 'שובר 10', discount_percent: 10 }],
    linked_billing: { name: 'חיוב', discount: 10 },
  });
  assert.strictEqual(advice.bestMethod, 'billing');
  assert.strictEqual(advice.options.filter((option) => option.isBest).length, 1);
});

/* ------------------------------------------------------------------ *
 * 6. Zero discounts, malformed and missing data
 * ------------------------------------------------------------------ */

section('6. Zero discounts, malformed and missing data');

test('empty and missing stores return the none recommendation', () => {
  for (const store of [undefined, null, {}, { cards: [] }, { linked_deals: [] }, { linked_billing: null }, 'text', 42]) {
    const advice = calculateBestPayment(store);
    assert.strictEqual(advice.bestMethod, 'none');
    assert.strictEqual(advice.bestDiscount, 0);
    assert.deepStrictEqual(advice.options, []);
    assert.strictEqual(advice.title, 'לא נמצאה הטבה פעילה בבית עסק זה');
    assert.ok(advice.explanation.length > 0, 'explanation is always populated');
    assert.ok(advice.adviceTip.length > 0, 'adviceTip is always populated');
  }
});

test('channels with 0% discounts still render as visible chips but nobody wins', () => {
  const advice = calculateBestPayment({
    max_discount: 0,
    cards: [{ card_name: 'כרטיס 0', discount: '0%' }],
    linked_deals: [{ title: 'שובר 0', price: 100, original_price: 100, discount_percent: 0 }],
    linked_billing: { name: 'חיוב', discount: 0 },
  });
  assert.strictEqual(advice.bestMethod, 'none');
  assert.strictEqual(advice.bestDiscount, 0);
  assert.strictEqual(advice.options.length, 3);
  assert.ok(advice.options.every((option) => option.isBest === false));
  assert.ok(advice.options.every((option) => option.badge === 'ללא הנחה'));
});

test('non-object channel payloads never throw', () => {
  const advice = calculateBestPayment({ cards: ['x', 5], linked_deals: 'nope', linked_billing: 42 });
  assert.strictEqual(advice.bestMethod, 'none');
  assert.deepStrictEqual(advice.options, []);
});

test('discounts are clamped to the 0..100 range', () => {
  const overcapped = calculateBestPayment({ max_discount: 150 });
  assert.strictEqual(overcapped.bestDiscount, 100);
  const negative = calculateBestPayment({ linked_billing: { name: 'חיוב', discount: -5 } });
  assert.strictEqual(negative.bestMethod, 'none');
  assert.strictEqual(negative.options[0].discount, 0);
});

test('camelCase field variants are supported', () => {
  const advice = calculateBestPayment({
    maxDiscount: 12,
    cards: [{ cardName: 'כרטיס בדיקה', discountNumeric: 12 }],
    linkedDeals: [{ title: 'שובר בדיקה', discountPercent: 25 }],
    linkedBillingStore: { name: 'חיוב בדיקה', discount: 5 },
  });
  assert.strictEqual(advice.bestMethod, 'voucher');
  assert.strictEqual(advice.bestDiscount, 25);
  assert.deepStrictEqual(advice.options.map((option) => option.discount), [12, 25, 5]);
});

/* ------------------------------------------------------------------ *
 * 7. Advice tips
 * ------------------------------------------------------------------ */

section('7. Advice tips');

test('the winning-method tip explains voucher vs card vs credit card', () => {
  const cardTip = calculateBestPayment(cardsOnlyStore).adviceTip;
  const voucherTip = calculateBestPayment(vouchersOnlyStore).adviceTip;
  const billingTip = calculateBestPayment(billingOnlyStore).adviceTip;

  assert.ok(cardTip.includes('שובר'), 'card tip mentions vouchers');
  assert.ok(cardTip.includes('מעמד החיוב'), 'card tip mentions billing');
  assert.ok(voucherTip.includes('כרטיס נטען'), 'voucher tip mentions cards');
  assert.ok(voucherTip.includes('מעמד החיוב'), 'voucher tip mentions billing');
  assert.ok(billingTip.includes('שובר'), 'billing tip mentions vouchers');
  assert.ok(billingTip.includes('כרטיס נטען'), 'billing tip mentions cards');

  assert.notStrictEqual(cardTip, voucherTip);
  assert.notStrictEqual(voucherTip, billingTip);
  assert.notStrictEqual(cardTip, billingTip);
});

test('the fallback tip still compares all three payment avenues', () => {
  const tip = calculateBestPayment(emptyStore).adviceTip;
  assert.ok(tip.includes('שובר'));
  assert.ok(tip.includes('כרטיס נטען'));
  assert.ok(tip.includes('מעמד החיוב'));
});

/* ------------------------------------------------------------------ *
 * 8. Rendered HTML
 * ------------------------------------------------------------------ */

section('8. Rendered HTML');

test('renders RTL accessible Tailwind markup with a gold badge and emerald winner chip', () => {
  const html = renderPaymentAdvisorHtml(cardsOnlyStore);
  assert.strictEqual(typeof html, 'string');
  assert.ok(html.includes('dir="rtl"'), 'declares RTL direction');
  assert.ok(html.includes('lang="he"'), 'declares Hebrew language');
  assert.ok(html.includes('role="region"'), 'exposes an accessible region');
  assert.ok(html.includes('aria-label="איך הכי כדאי לשלם כאן?'), 'region has an aria-label');
  assert.ok(html.includes('id="payment-advisor"'), 'stable container id for #store-modal');
  assert.ok(html.includes('payment-advisor--card'), 'marks the winning method');
  assert.ok(html.includes('grid-cols-1 sm:grid-cols-3'), 'uses a responsive comparison grid');
  assert.ok(html.includes('bg-amber-400'), 'shows a gold recommendation badge');
  assert.ok(html.includes('bg-emerald-600'), 'highlights the winner with emerald');
  assert.ok(html.includes('הכי משתלם'), 'winner chip is labelled');
  assert.ok(html.includes('30%'), 'shows the winning percentage');
  assert.ok(html.includes('כרטיס צהוב חבר'), 'shows the winning channel name');
  assert.ok(html.includes('שובר ייעודי'), 'includes the actionable tip');
});

test('renders a comparison chip for every available method', () => {
  const html = renderPaymentAdvisorHtml(multiChannelStore);
  assert.strictEqual(html.split('data-method="').length - 1, 3, 'one chip per channel');
  assert.ok(html.includes('data-method="card"'));
  assert.ok(html.includes('data-method="voucher"'));
  assert.ok(html.includes('data-method="billing"'));
  assert.ok(html.includes('מבצע טקסטיל ענק'));
  assert.ok(html.includes('הנחה במעמד החיוב: ערד טקסטיל'));
});

test('highlights exactly one winning method with aria-current', () => {
  const html = renderPaymentAdvisorHtml(multiChannelStore);
  assert.strictEqual(html.split('aria-current="true"').length - 1, 1, 'only the winner is marked');
  assert.strictEqual(html.split('data-best="true"').length - 1, 1, 'only the winner is flagged best');
  assert.strictEqual(html.split('data-best="false"').length - 1, 2, 'the other methods are alternatives');
});

test('shows a clear empty state when there are no benefits', () => {
  for (const store of [emptyStore, undefined, null]) {
    const html = renderPaymentAdvisorHtml(store);
    assert.ok(html.includes('payment-advisor--none'), 'marks the none state');
    assert.ok(html.includes('אין הטבות פעילות'), 'badge explains the state');
    assert.ok(html.includes('payment-advisor-empty'), 'renders an empty-state block');
    assert.ok(html.includes('לא נמצאו ערוצי תשלום עם הטבות'), 'empty-state copy is present');
    assert.ok(!html.includes('aria-current="true"'), 'no winner is marked');
    assert.ok(html.includes('שובר ייעודי'), 'still explains the general trade-off');
  }
});

test('escapes untrusted store, card and voucher names', () => {
  const html = renderPaymentAdvisorHtml({
    name: 'חנות <script>alert(1)</script>',
    cards: [{ card_name: '<script>card()</script>', discount: '10%' }],
    linked_deals: [{ title: '</li><script>voucher()</script>', discount_percent: 50 }],
  });
  assert.ok(!html.includes('<script>'), 'no raw script tag may survive');
  assert.ok(html.includes('&lt;script&gt;'), 'script markup is escaped');
  assert.ok(!html.includes('<img'), 'no raw tags from data');
});

test('always returns a non-empty HTML string', () => {
  for (const store of [cardsOnlyStore, vouchersOnlyStore, billingOnlyStore, multiChannelStore, emptyStore, undefined, null, 'x']) {
    const html = renderPaymentAdvisorHtml(store);
    assert.strictEqual(typeof html, 'string');
    assert.ok(html.trim().length > 0);
    assert.ok(html.includes('payment-advisor'));
  }
});

/* ------------------------------------------------------------------ *
 * Summary
 * ------------------------------------------------------------------ */

console.log('\n====================================================');
if (failed === 0) {
  console.log(`🎉 All ${passed} payment advisor tests passed successfully!`);
} else {
  console.log(`❌ ${failed} of ${passed + failed} payment advisor tests failed.`);
  process.exitCode = 1;
}
console.log('====================================================\n');
