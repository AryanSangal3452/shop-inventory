import Dexie, { type Table } from 'dexie';

export interface OfflineProduct {
  id?: number | string;
  name: string;
  image_url: string | null;
  cost_price: number;
  selling_price: number;
  max_retail_price: number;
  category_id: string | null;
  user_email?: string; // Add field definition here
  synced: number; 
}

class InventoryOfflineDatabase extends Dexie {
  products!: Table<OfflineProduct>;

  constructor() {
    super('InventoryOfflineDb');
    // 🟢 ADDED user_email index here so your phone can find your laptop's matching items
    this.version(2).stores({
      products: '++id, name, category_id, user_email, synced'
    });
  }
}

export const offlineDb = new InventoryOfflineDatabase();