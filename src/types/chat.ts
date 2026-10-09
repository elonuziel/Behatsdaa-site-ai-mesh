export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  recommendedStores?: RecommendedStore[];
  recommendedDeals?: RecommendedDeal[];
  followUps?: string[];
}

export interface RecommendedStore {
  id: string;
  name: string;
  slug: string;
  category?: string;
  clubs?: string[];
  max_discount?: number;
  logo?: string;
  website?: string;
  cards?: any[];
  payment_options?: any[];
}

export interface RecommendedDeal {
  id: string;
  title: string;
  slug: string;
  club?: string;
  supplier?: string;
  category?: string;
  price?: number | null;
  original_price?: number | null;
  discount_percent?: number | null;
  coupon_code?: string | null;
  image?: string;
  url?: string;
}

export interface ChatResponse {
  reply: string;
  recommendedStores?: RecommendedStore[];
  recommendedDeals?: RecommendedDeal[];
  suggestedFollowUps?: string[];
  error?: string;
}
