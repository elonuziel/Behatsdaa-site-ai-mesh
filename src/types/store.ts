import { ClubId } from './club';

export type PaymentOptionType = 'loaded_card' | 'billing_discount' | 'voucher' | 'promo_code';

export interface PaymentOption {
  club: ClubId;
  type: PaymentOptionType;
  rate: number;
  rateType: 'percent' | 'fixed';
  label: string;
  description: string;
  terms?: string;
  code?: string;
  url?: string;
}

export interface PaymentStrategy {
  bestOption: PaymentOption | null;
  options: PaymentOption[];
  recommendationText: string;
}

export interface CardDiscount {
  card_name: string;
  discount_rate: number;
}

export interface StoreDealSummary {
  id: string;
  title: string;
  slug?: string;
  price?: number | null;
  original_price?: number | null;
  discount_percent?: number;
  supplier?: string;
}

export interface BillingBranchSummary {
  id: string | number;
  name: string;
  slug?: string;
  discount: number;
  city?: string;
  address?: string;
  full_address?: string;
}

export interface UnifiedStore {
  id: string;
  name: string;
  slug: string;
  category: string;
  clubs: ClubId[];
  max_discount: number;
  logo: string | null;
  website: string | null;
  conditions: string;
  cards: (string | { card_id?: string; card_name?: string })[];
  discounts: CardDiscount[];
  payment_options: PaymentOption[];
  linked_deals?: StoreDealSummary[];
  linkedDeals?: StoreDealSummary[];
  linked_billing?: BillingBranchSummary | null;
  linkedBillingStore?: BillingBranchSummary | null;
  billing_branches?: BillingBranchSummary[];
}

export interface SearchIndexStore {
  id: string;
  name: string;
  slug: string;
  d: number;
  clubs?: ClubId[];
  cd?: Partial<Record<ClubId, number>>;
}
