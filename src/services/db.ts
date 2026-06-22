import Dexie, { type Table } from 'dexie';

export interface LocalCategory {
  id: string; // UUID
  name: string;
  updated_at: number; // timestamp ms
  is_deleted: number; // 0 for false, 1 for true
  synced: number; // 0 for false, 1 for true
}

export interface LocalExpense {
  id: string; // UUID
  amount: number;
  category_id: string | null;
  description: string;
  date: string; // ISO string
  created_at: string;
  updated_at: number; // timestamp ms
  is_deleted: number; // 0 for false, 1 for true
  synced: number; // 0 for false, 1 for true
}

class VIPExpenseDB extends Dexie {
  expenses!: Table<LocalExpense>;
  categories!: Table<LocalCategory>;

  constructor() {
    super('VIPExpenseDB');
    this.version(1).stores({
      expenses: 'id, category_id, date, updated_at, is_deleted, synced',
      categories: 'id, name, updated_at, is_deleted, synced'
    });
  }
}

export const db = new VIPExpenseDB();
