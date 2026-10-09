export interface BillingStore {
  id: string | number;
  name: string;
  slug: string;
  city: string;
  category: string;
  discount: number;
  address: string;
  full_address: string;
  lat: number | null;
  lng: number | null;
  store_id?: string | null;
  deals_count?: number;
}
