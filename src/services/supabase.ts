import { createClient } from '@supabase/supabase-js';
import { db } from './db';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = supabaseUrl !== '' && supabaseAnonKey !== '';

// Use PKCE flow so the auth callback uses a code (query param) instead of
// an implicit hash fragment (#access_token=...). This is more secure and
// ensures proper redirects work in deployed environments.
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      }
    })
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
      // Use the deployed Vercel URL or fallback to current origin.
      // The user MUST add this URL to "Redirect URLs" in Supabase dashboard.
      redirectTo: window.location.origin,
    }
  });

  if (error) {
    console.error('Auth Error:', error.message);
    throw error;
  }
}

export async function loginWithEmail(email: string) {
  if (!supabase) {
    alert('Supabase is not configured yet. Email login is disabled in local-only mode.');
    return;
  }
  
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin
    }
  });

  if (error) {
    console.error('Email Auth Error:', error.message);
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
