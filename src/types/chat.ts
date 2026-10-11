export type AiProviderKey = 'gemini' | 'openai' | 'claude' | 'groq' | 'deepseek';

export interface AiModelOption {
  id: string;
  name: string;
  description?: string;
}

export interface ModelsResponse {
  available: boolean;
  provider: AiProviderKey;
  models: AiModelOption[];
  defaultModel: string;
  requiredSecret?: string;
  error?: string;
}

export interface ProviderInfo {
  id: AiProviderKey;
  name: string;
  model: string;
  requiredSecret: string;
  available: boolean;
  codeSnippet: string;
}

export interface EncryptedKeysBundle {
  salt: string;
  iv: string;
  tag: string;
  data: string;
}

export interface AiStatusResponse {
  isAiOnline: boolean;
  provider: string;
  model: string;
  providers: Record<AiProviderKey, ProviderInfo>;
  defaultProvider: AiProviderKey;
  isPasswordRequired?: boolean;
  passwordHash?: string;
  encryptedKeys?: EncryptedKeysBundle;
}

export interface VerifyPasswordResponse {
  valid: boolean;
  error?: string;
  notRequired?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  recommendedStores?: RecommendedStore[];
  recommendedDeals?: RecommendedDeal[];
  recommendedBilling?: RecommendedBilling[];
  followUps?: string[];
  isAiOnline?: boolean;
  provider?: string;
  model?: string;
  statusNote?: string;
}

export interface RecommendedBilling {
  id: number | string;
  name: string;
  discount: number;
  city?: string;
  address?: string;
  category?: string;
  description?: string;
  logo?: string;
  detail_url?: string;
  full_address?: string;
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
  recommendedBilling?: RecommendedBilling[];
  suggestedFollowUps?: string[];
  isAiOnline?: boolean;
  provider?: string;
  model?: string;
  statusNote?: string;
  error?: string;
  requirePassword?: boolean;
}
