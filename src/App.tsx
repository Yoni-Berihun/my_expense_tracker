import { useState, useEffect } from 'react';
import { LoggingScreen } from './components/LoggingScreen';
import { DashboardScreen } from './components/DashboardScreen';
import { ReportsScreen } from './components/ReportsScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { LandingPage } from './components/LandingPage';
import { setupAutoSync, syncData } from './services/sync';
import { PlusCircle, BarChart3, FileText, Settings, Coins, RefreshCw } from 'lucide-react';
import './index.css';

function App() {
  const [activeTab, setActiveTab] = useState<'logging' | 'dashboard' | 'reports' | 'settings'>('logging');
  const [syncStatus, setSyncStatus] = useState<'synced' | 'unsynced' | 'syncing' | 'offline'>('offline');
  const [showLanding, setShowLanding] = useState<boolean>(() => localStorage.getItem('has_visited') === null);

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
    </div>
  );
}

export default App;
