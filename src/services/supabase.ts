import { createClient } from '@supabase/supabase-js';
import { db } from './db';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = supabaseUrl !== '' && supabaseAnonKey !== '';

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

if (!isSupabaseConfigured) {
  console.warn(
    'Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are missing. Running in local-only mode.'
  );
}

export async function loginWithSocial(provider: 'google' | 'github') {
  if (!supabase) {
    alert('Supabase is not configured yet. Social login is disabled in local-only mode.');
    return;
  }
  
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: window.location.origin
    }
  });

  if (error) {
    console.error('Auth Error:', error.message);
    throw error;
  }
}

export async function logout() {
  if (supabase) {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign-out error:', error.message);
    }
  }

  // Clear local DB cache on sign out to prevent cross-account visibility
  await db.transaction('rw', db.expenses, db.categories, async () => {
    await db.expenses.clear();
    await db.categories.clear();
  });

  localStorage.removeItem('last_sync_timestamp');
}
