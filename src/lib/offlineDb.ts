import Dexie, { type Table } from 'dexie';

export interface OfflineProduct {
  id?: number | string;
  name: string;
  image_url: string | null;
  cost_price: number;
  selling_price: number;
  max_retail_price: number;
  category_id: number | null;
  synced: number; // 0 = modified/created offline, 1 = synced with cloud
}

class InventoryOfflineDatabase extends Dexie {
  products!: Table<OfflineProduct>;

  constructor() {
    super('InventoryOfflineDb');
    this.version(1).stores({
      products: '++id, name, category_id, synced'
    });
  }
}

export const offlineDb = new InventoryOfflineDatabase();