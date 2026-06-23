import React, { useState, useEffect } from 'react';
import { supabase, loginWithSocial, loginWithEmail, logout, isSupabaseConfigured } from '../services/supabase';
import { User, RefreshCw, Moon, Sun, ShieldAlert, LogOut, Check } from 'lucide-react';
import { type User as SupabaseUser } from '@supabase/supabase-js';

interface SettingsScreenProps {
  syncStatus: 'synced' | 'unsynced' | 'syncing' | 'offline';
  onForceSync: () => void;
  onShowLanding: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ syncStatus, onForceSync, onShowLanding }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (document.documentElement.getAttribute('data-theme') || 'dark') as 'dark' | 'light';
  });
  const [remindersEnabled, setRemindersEnabled] = useState<boolean>(() => {
    return localStorage.getItem('reminders_enabled') === 'true';
  });
  const [reminderTime, setReminderTime] = useState<string>(() => {
    return localStorage.getItem('reminder_time') || '20:00';
  });

  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  // Listen to Supabase Auth State
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextTheme);
    setTheme(nextTheme);
  };

  const handleToggleReminders = async () => {
    if (!remindersEnabled) {
      // Ask for browser notification permissions
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setRemindersEnabled(true);
        localStorage.setItem('reminders_enabled', 'true');
        // Trigger a test local notification
        new Notification("VIP Expense Tracker", {
          body: "Notifications enabled! We'll remind you to log daily.",
          icon: "/pwa-192x192.png"
        });
      } else {
        alert('Permission denied. Please enable notifications in your browser settings.');
      }
    } else {
      setRemindersEnabled(false);
      localStorage.setItem('reminders_enabled', 'false');
    }
  };

  const handleReminderTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    setReminderTime(newTime);
    localStorage.setItem('reminder_time', newTime);
  };

  const handleSocialLogin = async (provider: 'google' | 'github') => {
    try {
      await loginWithSocial(provider);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      alert(`Login failed: ${message}`);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setEmailLoading(true);
    try {
      await loginWithEmail(email.trim());
      setEmailSent(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      alert(`Login failed: ${message}`);
    } finally {
      setEmailLoading(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to sign out? Your local data cache will be cleared.')) {
      await logout();
      setUser(null);
      alert('Signed out successfully.');
    }
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Account / Authentication Card */}
      <div className="glass-card" style={{ padding: '20px 24px' }}>
        <h3 style={{ fontSize: '18px', color: 'var(--gold-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <User size={18} /> Account Profile
        </h3>

        {!isSupabaseConfigured ? (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <p className="text-muted" style={{ marginBottom: '10px' }}>Running in local offline mode. To enable cloud sync and backups, configure Supabase credentials.</p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 100, 100, 0.1)', color: '#ff6b6b', border: '1px solid rgba(255,100,100,0.2)', padding: '6px 12px', borderRadius: '8px', fontSize: '12px' }}>
              <ShieldAlert size={14} /> Credentials Missing
            </div>
          </div>
        ) : user ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
              {user.user_metadata?.avatar_url ? (
                <img 
                  src={user.user_metadata.avatar_url} 
                  alt="Profile" 
                  style={{ width: '50px', height: '50px', borderRadius: '50%', border: '2px solid var(--gold-primary)' }} 
                />
              ) : (
                <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'var(--bg-input)', border: '2px solid var(--gold-primary)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
                  <User size={24} style={{ color: 'var(--gold-primary)' }} />
                </div>
              )}
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontWeight: '700', fontSize: '16px' }}>{user.user_metadata?.full_name || 'VIP Member'}</p>
                <p className="text-muted" style={{ fontSize: '12px' }}>{user.email}</p>
              </div>
            </div>

            <button className="btn-outline" style={{ width: '100%', borderColor: '#ff4d4d', color: '#ff4d4d' }} onClick={handleLogout}>
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <p className="text-muted" style={{ marginBottom: '16px' }}>Sign in to backup and synchronize your expense records.</p>
            
            {emailSent ? (
              <div style={{ backgroundColor: 'rgba(212, 175, 55, 0.08)', border: '1px solid var(--border-gold)', borderRadius: '8px', padding: '16px', marginBottom: '16px', color: 'var(--gold-light)' }}>
                <p style={{ fontWeight: 'bold', margin: '0 0 6px 0' }}>Verification Link Sent</p>
                <p style={{ fontSize: '13px', margin: 0, color: 'var(--text-muted)' }}>We sent a magic login link to <strong>{email}</strong>. Please check your inbox and click the link to log in.</p>
              </div>
            ) : (
              <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                <input
                  type="email"
                  placeholder="Enter your email address"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={emailLoading}
                  style={{ textAlign: 'center' }}
                />
                <button type="submit" className="btn-gold" style={{ width: '100%' }} disabled={emailLoading}>
                  {emailLoading ? 'Sending link...' : 'Send Magic Login Link'}
                </button>
              </form>
            )}

            <div style={{ display: 'flex', alignItems: 'center', margin: '15px 0' }}>
              <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border-glass)' }} />
              <span className="text-muted" style={{ padding: '0 10px', fontSize: '11px', textTransform: 'uppercase' }}>Or Sign In With</span>
              <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border-glass)' }} />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-outline" style={{ flex: 1 }} onClick={() => handleSocialLogin('google')}>
                Google
              </button>
              <button className="btn-outline" style={{ flex: 1 }} onClick={() => handleSocialLogin('github')}>
                GitHub
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Cloud Sync Status Card */}
      <div className="glass-card" style={{ padding: '20px 24px' }}>
        <h3 style={{ fontSize: '18px', color: 'var(--gold-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RefreshCw size={18} /> Cloud Synchronization
        </h3>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <span className="text-muted" style={{ fontSize: '12px' }}>Connection State</span>
            <p style={{ fontWeight: 'bold', fontSize: '15px', marginTop: '2px' }}>
              {syncStatus === 'synced' && 'All data backed up'}
              {syncStatus === 'unsynced' && 'Unsaved local changes'}
              {syncStatus === 'syncing' && 'Synchronizing databases...'}
              {syncStatus === 'offline' && 'Offline / Cloud unavailable'}
            </p>
          </div>
          
          <div className={`sync-badge ${syncStatus}`}>
            <span 
              style={{ 
                width: '6px', 
                height: '6px', 
                backgroundColor: syncStatus === 'synced' ? 'var(--gold-primary)' : syncStatus === 'offline' ? '#A0A0A0' : '#E5C158',
                borderRadius: '50%' 
              }}
            />
            <span style={{ textTransform: 'capitalize' }}>{syncStatus}</span>
          </div>
        </div>

        <button 
          className="btn-outline" 
          style={{ width: '100%' }} 
          onClick={onForceSync}
          disabled={syncStatus === 'syncing' || syncStatus === 'offline'}
        >
          <RefreshCw size={14} className={syncStatus === 'syncing' ? 'spinning' : ''} /> Force Synchronize Now
        </button>
      </div>

      {/* Preferences (Theme & Reminders) */}
      <div className="glass-card" style={{ padding: '20px 24px' }}>
        <h3 style={{ fontSize: '18px', color: 'var(--gold-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Moon size={18} /> App Settings
        </h3>

        {/* Theme select */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '14px', borderBottom: '1px solid var(--border-glass)', marginBottom: '14px' }}>
          <div>
            <p style={{ fontWeight: '600', fontSize: '14px' }}>Theme Mode</p>
            <span className="text-muted" style={{ fontSize: '11px' }}>Switch between dark luxury and light champagne</span>
          </div>
          <button 
            onClick={handleToggleTheme}
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-glass)',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--gold-primary)'
            }}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        {/* Reminders Toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '14px', borderBottom: remindersEnabled ? '1px solid var(--border-glass)' : 'none', marginBottom: remindersEnabled ? '14px' : '0' }}>
          <div>
            <p style={{ fontWeight: '600', fontSize: '14px' }}>Daily Reminders</p>
            <span className="text-muted" style={{ fontSize: '11px' }}>Get daily notification reminders to track spend</span>
          </div>
          <button 
            onClick={handleToggleReminders}
            style={{
              background: remindersEnabled ? 'rgba(212, 175, 55, 0.2)' : 'var(--bg-input)',
              border: remindersEnabled ? '1px solid var(--gold-primary)' : '1px solid var(--border-glass)',
              borderRadius: '20px',
              padding: '6px 12px',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: '600',
              color: remindersEnabled ? 'var(--gold-light)' : 'var(--text-muted)'
            }}
          >
            {remindersEnabled ? <Check size={14} /> : null} {remindersEnabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>

        {/* Reminder Time Picker (Conditional) */}
        {remindersEnabled && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontWeight: '600', fontSize: '14px' }}>Reminder Time</p>
              <span className="text-muted" style={{ fontSize: '11px' }}>Specify time of day for notifications</span>
            </div>
            <input 
              type="time" 
              className="form-input" 
              style={{ width: '100px', padding: '6px 10px', fontSize: '14px', textAlign: 'center' }}
              value={reminderTime}
              onChange={handleReminderTimeChange}
            />
          </div>
        )}

        {/* Welcome Screen review */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '14px', borderTop: '1px solid var(--border-glass)', marginTop: '14px' }}>
          <div>
            <p style={{ fontWeight: '600', fontSize: '14px' }}>Welcome Screen</p>
            <span className="text-muted" style={{ fontSize: '11px' }}>Review the application features and setup guide</span>
          </div>
          <button 
            onClick={onShowLanding}
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-glass)',
              borderRadius: '20px',
              padding: '6px 12px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: '600',
              color: 'var(--gold-primary)'
            }}
          >
            Show Info
          </button>
        </div>
      </div>
    </div>
  );
};
