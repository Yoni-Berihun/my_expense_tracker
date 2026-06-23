import { useState, useEffect } from 'react';
import { LoggingScreen } from './components/LoggingScreen';
import { DashboardScreen } from './components/DashboardScreen';
import { ReportsScreen } from './components/ReportsScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { LandingPage } from './components/LandingPage';
import { setupAutoSync, syncData } from './services/sync';
import { supabase, isSupabaseConfigured } from './services/supabase';
import { PlusCircle, BarChart3, FileText, Settings, Coins, RefreshCw, User } from 'lucide-react';
import { type User as SupabaseUser } from '@supabase/supabase-js';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { CreatorCard } from './components/CreatorCard';
import './index.css';

function App() {
  const [activeTab, setActiveTab] = useState<'logging' | 'dashboard' | 'reports' | 'settings'>('logging');
  const [syncStatus, setSyncStatus] = useState<'synced' | 'unsynced' | 'syncing' | 'offline'>('offline');
  const [showLanding, setShowLanding] = useState<boolean>(() => localStorage.getItem('has_visited') === null);
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);

  // Listen for Supabase auth state changes globally
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    // Get current session immediately (handles the OAuth PKCE code exchange on redirect)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCurrentUser(session.user);
        // Authenticated users always bypass the landing page
        setShowLanding(false);
        localStorage.setItem('has_visited', 'true');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user ?? null;
      setCurrentUser(user);

      if (user) {
        // Skip landing page and mark as visited when authenticated
        setShowLanding(false);
        localStorage.setItem('has_visited', 'true');

        // Trigger an immediate sync after sign-in
        if (event === 'SIGNED_IN') {
          syncData(setSyncStatus);
        }
      }

      if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Register Auto Sync
  useEffect(() => {
    const cleanup = setupAutoSync((newStatus) => {
      setSyncStatus(newStatus);
    });
    return cleanup;
  }, []);

  const handleTabChange = (tab: 'logging' | 'dashboard' | 'reports' | 'settings') => {
    setActiveTab(tab);
    if (navigator.vibrate) {
      navigator.vibrate(10); // Subtle tick vibration on touch
    }
  };

  const handleForceSync = async () => {
    await syncData(setSyncStatus);
  };

  // Quick helper to refresh data when a transaction is logged successfully
  const handleLoggingSuccess = () => {
    // Navigate to dashboard or refresh stats automatically
    setActiveTab('dashboard');
  };

  if (showLanding) {
    return (
      <LandingPage
        onEnter={() => {
          localStorage.setItem('has_visited', 'true');
          setShowLanding(false);
        }}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%' }}>
      {/* Top VIP Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '12px', borderBottom: '1px solid var(--border-glass)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Coins style={{ color: 'var(--gold-primary)' }} size={24} />
          <h1 style={{ margin: 0, fontSize: '20px' }}>VIP <span style={{ fontWeight: '300' }}>EXPENSES</span></h1>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* User Avatar (when logged in) */}
          {currentUser && (
            <button
              onClick={() => handleTabChange('settings')}
              title={currentUser.user_metadata?.full_name || currentUser.email || 'Profile'}
              style={{
                background: 'none',
                border: '1.5px solid var(--border-gold)',
                borderRadius: '50%',
                padding: 0,
                cursor: 'pointer',
                width: '32px',
                height: '32px',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--gold-primary)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--gold-glow)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-gold)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
              }}
            >
              {currentUser.user_metadata?.avatar_url ? (
                <img
                  src={currentUser.user_metadata.avatar_url}
                  alt="Profile"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <User size={16} style={{ color: 'var(--gold-primary)' }} />
              )}
            </button>
          )}

          {/* Quick Top Sync Status indicator */}
          <div 
            onClick={handleForceSync}
            style={{ 
              cursor: syncStatus !== 'offline' ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 8px',
              borderRadius: '12px',
              fontSize: '11px',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-glass)'
            }}
            title="Click to sync now"
          >
            <RefreshCw size={12} className={syncStatus === 'syncing' ? 'spinning' : ''} style={{ color: syncStatus === 'synced' ? 'var(--gold-primary)' : 'var(--text-muted)' }} />
            <span style={{ 
              fontSize: '10px', 
              color: syncStatus === 'synced' ? 'var(--gold-light)' : 'var(--text-muted)',
              textTransform: 'capitalize'
            }}>
              {syncStatus}
            </span>
          </div>
        </div>
      </header>

      {/* Main Screen Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
        {activeTab === 'logging' && <LoggingScreen onSuccess={handleLoggingSuccess} />}
        {activeTab === 'dashboard' && <DashboardScreen />}
        {activeTab === 'reports' && <ReportsScreen />}
        {activeTab === 'settings' && (
          <SettingsScreen 
            syncStatus={syncStatus} 
            onForceSync={handleForceSync} 
            onShowLanding={() => setShowLanding(true)} 
          />
        )}
      </main>

      {/* Bottom VIP Navigation Bar */}
      <nav className="bottom-nav">
        <div className="bottom-nav-inner">
          <button 
            className={`nav-item ${activeTab === 'logging' ? 'active' : ''}`}
            onClick={() => handleTabChange('logging')}
          >
            <PlusCircle />
            <span>Log</span>
          </button>
          
          <button 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleTabChange('dashboard')}
          >
            <BarChart3 />
            <span>Dashboard</span>
          </button>
          
          <button 
            className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => handleTabChange('reports')}
          >
            <FileText />
            <span>Reports</span>
          </button>
          
          <button 
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => handleTabChange('settings')}
          >
            <Settings />
            <span>Settings</span>
          </button>
        </div>
      </nav>

      {/* PWA Install Prompt Banner */}
      <PWAInstallBanner />

      {/* Creator floating card */}
      <CreatorCard />
    </div>
  );
}

export default App;
