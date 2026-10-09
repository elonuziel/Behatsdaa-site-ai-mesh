import { useMemo } from 'react';
import { UnifiedStore, PaymentStrategy } from '../types/store';
import { ClubId } from '../types/club';

export function calculateBestPaymentStrategy(
  store: UnifiedStore | null,
  activeClubs: Set<ClubId>
): PaymentStrategy {
  if (!store || !store.payment_options || store.payment_options.length === 0) {
    return {
      bestOption: null,
      options: [],
      recommendationText: 'לא נמצאו אמצעי תשלום ספציפיים לרשת זו'
    };
  }

  // Filter options to only those corresponding to clubs the user has selected
  const availableOptions = store.payment_options.filter(opt => activeClubs.has(opt.club));

  if (availableOptions.length === 0) {
    return {
      bestOption: null,
      options: [],
      recommendationText: 'אין הטבות פעילות למועדונים שבחרת עבור רשת זו. בחר מועדונים נוספים לצפייה בהטבות.'
    };
  }

  // Sort options:
  // 1. Percentage discount (descending)
  // 2. Option type priority: loaded_card > billing_discount > voucher > promo_code
  // 3. Fixed amount
  const typeWeight: Record<string, number> = {
    loaded_card: 4,
    billing_discount: 3,
    voucher: 2,
    promo_code: 1
  };

  const sorted = [...availableOptions].sort((a, b) => {
    const rateA = a.rateType === 'percent' ? a.rate : 0;
    const rateB = b.rateType === 'percent' ? b.rate : 0;
    if (rateB !== rateA) return rateB - rateA;

    const weightA = typeWeight[a.type] || 0;
    const weightB = typeWeight[b.type] || 0;
    if (weightB !== weightA) return weightB - weightA;

    return (b.rate || 0) - (a.rate || 0);
  });

  const best = sorted[0];
  let recommendationText = '';

  if (best.type === 'loaded_card') {
    recommendationText = `המסלול המשתלם ביותר: טעינת ${best.label} עם ${best.rate}% הנחה מראש`;
  } else if (best.type === 'billing_discount') {
    recommendationText = `המסלול המשתלם ביותר: תשלום בכרטיס המועדון המקנה ${best.rate}% הנחה אוטומטית במעמד החיוב`;
  } else if (best.type === 'promo_code') {
    recommendationText = `המסלול המשתלם ביותר: שימוש בקוד קופון "${best.code || 'הטבה'}" לקבלת ${best.description}`;
  } else {
    recommendationText = `ההטבה המשתלמת ביותר: ${best.label}`;
  }

  return {
    bestOption: best,
    options: sorted,
    recommendationText
  };
}

export function usePaymentAdvisor(store: UnifiedStore | null, activeClubs: Set<ClubId>): PaymentStrategy {
  return useMemo(() => calculateBestPaymentStrategy(store, activeClubs), [store, activeClubs]);
}
