export interface WalletItem {
  id: string;
  name: string;
  short_name: string;
  discount: number;
  color_theme: string;
  badge_class: string;
  monthly_cap: number;
  instant_cap: number;
  category_scope: string;
  description: string;
  stores_count: number;
}

export interface GeneralCaps {
  monthly_cap_general: number;
  monthly_cap_fighter: number;
  instant_balance_cap: number;
  min_reload: number;
  daily_cap: string;
}

export interface GeneralRule {
  id: string;
  title: string;
  summary: string;
}

export interface WalletsInfoData {
  metadata: {
    title: string;
    last_updated: string;
    general_caps: GeneralCaps;
    general_rules: GeneralRule[];
  };
  wallets: WalletItem[];
}
