import { ClubId } from './club';

export interface UnifiedDeal {
  id: string;
  title: string;
  slug: string;
  club: ClubId;
  supplier: string;
  category: string;
  price: number | null;
  original_price: number | null;
  discount_percent: number;
  discount_type?: 'percent' | 'fixed';
  discount_value?: number | null;
  discount_display?: string | null;
  coupon_code?: string | null;
  validity?: string | null;
  min_spend?: number | null;
  min_spend_display?: string | null;
  is_external?: boolean;
  shipping_included?: boolean;
  locations?: string;
  image?: string | null;
  tag?: string | null;
  tags?: string[];
  description?: string;
  terms_of_use?: string;
  expiration_date?: string | null;
  limits?: string | null;
  url?: string | null;
  variants?: any;
  linked_store?: { id: string; name: string; slug: string; max_discount?: number } | null;
  linkedStore?: { id: string; name: string; slug: string; max_discount?: number } | null;
  linked_billing?: { id: string | number; name: string; slug: string; discount?: number } | null;
  linkedBillingStore?: { id: string | number; name: string; slug: string; discount?: number } | null;
}

export interface SearchIndexDeal {
  id: string;
  name: string;
  slug: string;
  d: number;
  club?: ClubId;
  p?: number;
  cp?: string;
  st?: string;
}
