import Dexie, { type Table } from 'dexie';

export interface OfflineProduct {
  id?: number | string;
  name: string;
  image_url: string | null;
  cost_price: number;
  selling_price: number;
  max_retail_price: number;
  category_id: string | null;
  user_email?: string | null; 
  synced: number; 
}

class InventoryOfflineDatabase extends Dexie {
  products!: Table<OfflineProduct>;

  constructor() {
    super('InventoryOfflineDb');
    this.version(2).stores({
      products: '++id, name, category_id, user_email, synced' 
    });
  }
}

export const offlineDb = new InventoryOfflineDatabase();