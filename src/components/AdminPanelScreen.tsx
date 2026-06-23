import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { Shield, Trash2, Users, Clock, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

interface UserAccess {
  id: string;
  user_id: string;
  email: string | null;
  granted_at: string;
  is_owner: boolean;
}

export const AdminPanelScreen: React.FC = () => {
  const [users, setUsers] = useState<UserAccess[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [userToRevoke, setUserToRevoke] = useState<UserAccess | null>(null);
  const [revoking, setRevoking] = useState<boolean>(false);

  const fetchUsers = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setError('Supabase is not configured.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('user_access')
        .select('*')
        .order('is_owner', { ascending: false })
        .order('granted_at', { ascending: true });

      if (fetchErr) throw fetchErr;
      setUsers(data || []);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Failed to fetch registered users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRevokeClick = (user: UserAccess) => {
    setUserToRevoke(user);
  };

  const confirmRevoke = async () => {
    if (!userToRevoke || !supabase) return;
    setRevoking(true);
    try {
      const { error: deleteErr } = await supabase
        .from('user_access')
        .delete()
        .eq('id', userToRevoke.id);

      if (deleteErr) throw deleteErr;

      setUsers(prev => prev.filter(u => u.id !== userToRevoke.id));
      showStatus('success', `Access successfully revoked for ${userToRevoke.email || 'user'}`);
    } catch (err: any) {
      console.error('Error revoking access:', err);
      showStatus('error', err.message || 'Failed to revoke access.');
    } finally {
      setRevoking(false);
      setUserToRevoke(null);
    }
  };

  const showStatus = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage(null);
    }, 4000);
  };

  // Calculate capacities
  const memberCount = users.filter(u => !u.is_owner).length;
  const maxSlots = 5;
  const percentage = Math.min((memberCount / maxSlots) * 100, 100);

  return (
    <div style={{ width: '100%' }}>
      {/* CSS Styles for Admin Panel */}
      <style>{`
        .admin-progress-container {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-glass);
          border-radius: 8px;
          height: 12px;
          width: 100%;
          overflow: hidden;
          position: relative;
          margin-top: 10px;
        }
        .admin-progress-bar {
          background: var(--gold-gradient);
          height: 100%;
          border-radius: 8px;
          transition: width 0.4s ease-out;
          box-shadow: 0 0 10px rgba(212, 175, 55, 0.5);
        }
        .admin-stat-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: linear-gradient(135deg, rgba(20, 20, 20, 0.8) 0%, rgba(10, 10, 10, 0.95) 100%);
          border: 1.5px solid var(--border-gold);
          border-radius: var(--radius-lg);
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: var(--gold-glow);
        }
        .badge-role {
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .badge-admin {
          background: rgba(212, 175, 55, 0.15);
          color: var(--gold-primary);
          border: 1px solid rgba(212, 175, 55, 0.3);
        }
        .badge-member {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-muted);
          border: 1px solid var(--border-glass);
        }
        .revoke-btn {
          background: none;
          border: 1px solid rgba(255, 77, 77, 0.2);
          color: rgba(255, 77, 77, 0.8);
          cursor: pointer;
          padding: 6px;
          border-radius: var(--radius-sm);
          transition: var(--transition-fast);
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .revoke-btn:hover:not(:disabled) {
          background: rgba(255, 77, 77, 0.15);
          border-color: rgba(255, 77, 77, 0.5);
          color: #ff4d4d;
          box-shadow: 0 0 10px rgba(255, 77, 77, 0.2);
        }
        .revoke-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        .admin-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        .admin-modal {
          background: #0f0f0f;
          border: 1.5px solid var(--border-gold);
          border-radius: var(--radius-lg);
          padding: 24px;
          max-width: 400px;
          width: 100%;
          box-shadow: var(--gold-glow-strong);
          text-align: center;
          animation: fadeInUp 0.3s ease-out;
        }
        .status-toast {
          position: fixed;
          bottom: 90px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          border-radius: 30px;
          font-size: 13px;
          font-weight: 600;
          z-index: 999;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);
          animation: fadeInUp 0.2s ease-out;
        }
        .status-toast.success {
          background: rgba(16, 185, 129, 0.15);
          border: 1.5px solid #10b981;
          color: #34d399;
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.2);
        }
        .status-toast.error {
          background: rgba(239, 68, 68, 0.15);
          border: 1.5px solid #ef4444;
          color: #fca5a5;
          box-shadow: 0 0 20px rgba(239, 68, 68, 0.2);
        }
      `}</style>

      {/* Main Admin Content */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px', color: 'var(--gold-primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Shield size={20} /> VVIP Console
          </h3>
          <button 
            onClick={fetchUsers} 
            disabled={loading}
            className="btn-outline" 
            style={{ width: 'auto', padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}
          >
            <RefreshCw size={12} className={loading ? 'spinning' : ''} /> {loading ? 'Updating...' : 'Refresh'}
          </button>
        </div>

        <p className="text-muted" style={{ fontSize: '13px', lineHeight: '1.6', marginBottom: '20px' }}>
          This console regulates accessing accounts. You can view all active accounts and revoke standard user passes to make seats available.
        </p>

        {/* Capacity / Stats summary card */}
        <div className="admin-stat-card">
          <div style={{ textAlign: 'left', flex: 1 }}>
            <span className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>VVIP Slots Utilization</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '4px 0' }}>
              <span style={{ fontSize: '28px', fontWeight: '800', fontFamily: 'var(--font-display)', color: 'var(--gold-light)' }}>
                {memberCount}
              </span>
              <span className="text-muted" style={{ fontSize: '16px' }}>/ {maxSlots} VIP Seats claimed</span>
            </div>
            
            {/* Progress bar */}
            <div className="admin-progress-container">
              <div className="admin-progress-bar" style={{ width: `${percentage}%` }} />
            </div>
          </div>
          <div style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={32} style={{ color: 'var(--gold-primary)' }} />
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {users.length} Total Users
            </span>
          </div>
        </div>

        {/* User Table Card */}
        <div>
          {loading && users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <RefreshCw size={24} className="spinning" style={{ color: 'var(--gold-primary)', marginBottom: '8px' }} />
              <p className="text-muted">Retrieving VIP register...</p>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '30px 0', border: '1px dashed #ff4d4d', borderRadius: '12px', background: 'rgba(255,77,77,0.02)' }}>
              <AlertCircle size={28} style={{ color: '#ff4d4d', marginBottom: '8px' }} />
              <p style={{ color: '#ff4d4d', fontSize: '14px', fontWeight: '600' }}>{error}</p>
              <button onClick={fetchUsers} className="btn-outline" style={{ display: 'inline-block', width: 'auto', marginTop: '12px', padding: '6px 16px' }}>
                Retry Fetch
              </button>
            </div>
          ) : users.length === 0 ? (
            <p className="text-muted" style={{ textAlign: 'center', padding: '30px 0' }}>No users registered under access control.</p>
          ) : (
            <div className="table-container">
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Granted Date</th>
                    <th>Role</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((item) => (
                    <tr key={item.id} style={{ opacity: item.is_owner ? 1 : 0.9 }}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                          <span style={{ 
                            fontWeight: '600', 
                            color: item.is_owner ? 'var(--gold-primary)' : 'var(--text-primary)',
                            fontSize: '13px'
                          }}>
                            {item.email || 'Anonymous User'}
                          </span>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }} title={item.user_id}>
                            {item.user_id.slice(0, 8)}...{item.user_id.slice(-8)}
                          </span>
                        </div>
                      </td>
                      <td style={{ fontSize: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} className="text-muted" />
                          <span>{new Date(item.granted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}</span>
                        </div>
                      </td>
                      <td>
                        {item.is_owner ? (
                          <span className="badge-role badge-admin">
                            <Shield size={10} /> Admin
                          </span>
                        ) : (
                          <span className="badge-role badge-member">
                            VVIP Member
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="revoke-btn"
                          onClick={() => handleRevokeClick(item)}
                          disabled={item.is_owner || revoking}
                          title={item.is_owner ? "Cannot revoke admin access" : "Revoke User Access"}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {userToRevoke && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(255, 77, 77, 0.1)', color: '#ff4d4d', marginBottom: '16px' }}>
              <AlertCircle size={24} />
            </div>
            <h4 style={{ fontSize: '18px', color: '#ff4d4d', margin: '0 0 12px' }}>Revoke Member Access?</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.6', margin: '0 0 24px' }}>
              Are you sure you want to revoke access for <strong style={{ color: 'var(--text-primary)' }}>{userToRevoke.email}</strong>? 
              This will immediately lock them out of cloud sync.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                className="btn-outline" 
                style={{ flex: 1, margin: 0 }} 
                onClick={() => setUserToRevoke(null)}
                disabled={revoking}
              >
                Cancel
              </button>
              <button 
                className="btn-gold" 
                style={{ flex: 1, margin: 0, backgroundColor: '#ff4d4d', borderColor: '#ff4d4d', color: '#fff' }} 
                onClick={confirmRevoke}
                disabled={revoking}
              >
                {revoking ? 'Revoking...' : 'Confirm Revoke'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status toast alerts */}
      {statusMessage && (
        <div className={`status-toast ${statusMessage.type}`}>
          {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{statusMessage.text}</span>
        </div>
      )}
    </div>
  );
};
