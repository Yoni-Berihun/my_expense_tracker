import { db } from './db';
import { supabase, isSupabaseConfigured } from './supabase';

let isSyncing = false;

export async function getSyncStatus(): Promise<'synced' | 'unsynced' | 'syncing' | 'offline'> {
  if (!isSupabaseConfigured) return 'offline';
  
  const session = await supabase?.auth.getSession();
  if (!session?.data.session) return 'offline';
  
  if (!navigator.onLine) return 'offline';
  if (isSyncing) return 'syncing';

  // Check if there are unsynced changes
  const unsyncedExpenses = await db.expenses.where('synced').equals(0).count();
  const unsyncedCategories = await db.categories.where('synced').equals(0).count();

  if (unsyncedExpenses > 0 || unsyncedCategories > 0) {
    return 'unsynced';
  }

  return 'synced';
}

export async function syncData(onStatusChange?: (status: 'synced' | 'unsynced' | 'syncing' | 'offline') => void) {
  if (isSyncing) return;
  if (!isSupabaseConfigured || !supabase) {
    onStatusChange?.('offline');
    return;
  }
  if (!navigator.onLine) {
    onStatusChange?.('offline');
    return;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    onStatusChange?.('offline');
    return;
  }

  const user = session.user;
  isSyncing = true;
  onStatusChange?.('syncing');

  try {
    const lastSyncTime = Number(localStorage.getItem('last_sync_timestamp') || '0');
    const now = Date.now();

    // ==========================================
    // 1. UPLOAD LOCAL CHANGES
    // ==========================================

    // A. Sync Categories
    const unsyncedCategories = await db.categories.where('synced').equals(0).toArray();
    for (const cat of unsyncedCategories) {
      const { error } = await supabase.from('categories').upsert({
        id: cat.id,
        name: cat.name,
        user_id: user.id,
        updated_at: new Date(cat.updated_at).toISOString(),
        is_deleted: cat.is_deleted === 1
      });
      
      if (!error) {
        await db.categories.update(cat.id, { synced: 1 });
      } else {
        console.error('Error syncing category:', error);
      }
    }

    // B. Sync Expenses
    const unsyncedExpenses = await db.expenses.where('synced').equals(0).toArray();
    for (const exp of unsyncedExpenses) {
      const { error } = await supabase.from('expenses').upsert({
        id: exp.id,
        user_id: user.id,
        amount: exp.amount,
        category_id: exp.category_id,
        description: exp.description,
        date: exp.date,
        created_at: exp.created_at,
        updated_at: new Date(exp.updated_at).toISOString(),
        is_deleted: exp.is_deleted === 1
      });

      if (!error) {
        await db.expenses.update(exp.id, { synced: 1 });
      } else {
        console.error('Error syncing expense:', error);
      }
    }

    // ==========================================
    // 2. DOWNLOAD REMOTE CHANGES
    // ==========================================

    // A. Pull Categories
    const { data: remoteCats, error: catErr } = await supabase
      .from('categories')
      .select('*')
      .gt('updated_at', new Date(lastSyncTime).toISOString());

    if (!catErr && remoteCats) {
      for (const rc of remoteCats) {
        const local = await db.categories.get(rc.id);
        const remoteUpdated = new Date(rc.updated_at).getTime();
        
        // Last Write Wins (LWW)
        if (!local || remoteUpdated > local.updated_at) {
          await db.categories.put({
            id: rc.id,
            name: rc.name,
            updated_at: remoteUpdated,
            is_deleted: rc.is_deleted ? 1 : 0,
            synced: 1
          });
        }
      }
    }

    // B. Pull Expenses
    const { data: remoteExps, error: expErr } = await supabase
      .from('expenses')
      .select('*')
      .gt('updated_at', new Date(lastSyncTime).toISOString());

    if (!expErr && remoteExps) {
      for (const re of remoteExps) {
        const local = await db.expenses.get(re.id);
        const remoteUpdated = new Date(re.updated_at).getTime();

        // Last Write Wins (LWW)
        if (!local || remoteUpdated > local.updated_at) {
          await db.expenses.put({
            id: re.id,
            amount: Number(re.amount),
            category_id: re.category_id,
            description: re.description || '',
            date: re.date,
            created_at: re.created_at,
            updated_at: remoteUpdated,
            is_deleted: re.is_deleted ? 1 : 0,
            synced: 1
          });
        }
      }
    }

    localStorage.setItem('last_sync_timestamp', String(now));
    onStatusChange?.('synced');
  } catch (err) {
    console.error('Synchronization failed:', err);
    onStatusChange?.('offline');
  } finally {
    isSyncing = false;
  }
}

// Auto-sync listener registration
export function setupAutoSync(onStatusChange: (status: 'synced' | 'unsynced' | 'syncing' | 'offline') => void) {
  // Sync when online state changes
  const handleOnline = () => syncData(onStatusChange);
  window.addEventListener('online', handleOnline);

  // Sync periodically (every 20 seconds if online)
  const intervalId = setInterval(() => {
    if (navigator.onLine) {
      syncData(onStatusChange);
    } else {
      onStatusChange('offline');
    }
  }, 20000);

  // Initial check/sync
  getSyncStatus().then(status => {
    onStatusChange(status);
    if (status === 'unsynced' || status === 'synced') {
      syncData(onStatusChange);
    }
  });

  return () => {
    window.removeEventListener('online', handleOnline);
    clearInterval(intervalId);
  };
}

export function normalizeCategoryName(rawName: string): string {
  return rawName.trim().toLowerCase().replace(/\s+/g, ' ');
}

export async function getOrCreateCategory(rawName: string): Promise<string> {
  const normName = normalizeCategoryName(rawName);
  
  // 1. Search local store first
  const existing = await db.categories
    .where('name')
    .equals(normName)
    .first();

  if (existing) {
    // If it was soft-deleted, reactivate it
    if (existing.is_deleted === 1) {
      await db.categories.update(existing.id, {
        is_deleted: 0,
        updated_at: Date.now(),
        synced: 0
      });
    }
    return existing.id;
  }

  // 2. Generate new entry locally
  const newId = crypto.randomUUID();
  await db.categories.add({
    id: newId,
    name: normName,
    updated_at: Date.now(),
    is_deleted: 0,
    synced: 0
  });

  return newId;
}

