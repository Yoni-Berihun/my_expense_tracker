import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * PWAInstallBanner
 * Shows a native-feeling "Install App" prompt when the browser fires
 * the beforeinstallprompt event (Chrome, Edge, Samsung Internet on Android).
 * On iOS Safari, shows manual "Add to Home Screen" instructions instead.
 */
export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('pwa_banner_dismissed') === 'true';
  });

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (dismissed) return;

    // Android/Chrome: capture the install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // iOS Safari: detect and show instructions
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator as { standalone?: boolean }).standalone;
    if (isIOS && !isInStandaloneMode) {
      // Show after a short delay so it doesn't feel intrusive
      const timer = setTimeout(() => setShowIOSHint(true), 3000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, [dismissed]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setDeferredPrompt(null);
    setShowIOSHint(false);
    setDismissed(true);
    localStorage.setItem('pwa_banner_dismissed', 'true');
  };

  // Don't show anything if nothing to show
  if (!deferredPrompt && !showIOSHint) return null;
  if (dismissed) return null;

  return (
    <>
      <style>{`
        @keyframes slideUpBanner {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        .pwa-banner {
          position: fixed;
          bottom: 90px; /* sit above bottom nav */
          left: 12px;
          right: 12px;
          z-index: 9999;
          animation: slideUpBanner 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
          border-radius: 16px;
          overflow: hidden;
        }
        .pwa-banner-inner {
          background: linear-gradient(135deg, rgba(18,18,18,0.97) 0%, rgba(10,10,10,0.99) 100%);
          border: 1px solid rgba(212, 175, 55, 0.4);
          box-shadow: 0 -4px 40px rgba(0,0,0,0.6), 0 0 30px rgba(212,175,55,0.12);
          backdrop-filter: blur(20px);
          padding: 16px 18px;
          display: flex;
          gap: 14px;
          align-items: center;
        }
        .pwa-icon {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          flex-shrink: 0;
          border: 1px solid rgba(212,175,55,0.3);
        }
        .pwa-install-btn {
          background: linear-gradient(135deg, #D4AF37, #AA7C11);
          color: #050505;
          border: none;
          border-radius: 22px;
          padding: 9px 18px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .pwa-install-btn:hover {
          transform: scale(1.04);
          box-shadow: 0 0 18px rgba(212,175,55,0.5);
        }
        .pwa-dismiss-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          flex-shrink: 0;
          border-radius: 50%;
          display: flex;
          transition: color 0.2s;
        }
        .pwa-dismiss-btn:hover { color: var(--text-primary); }
      `}</style>

      <div className="pwa-banner" role="dialog" aria-label="Install VIP Expense Tracker">
        <div className="pwa-banner-inner">
          <img src="/pwa-192x192.png" alt="App Icon" className="pwa-icon" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 700, fontSize: '14px', margin: 0, color: 'var(--gold-light)' }}>
              Install VIP Expenses
            </p>
            {showIOSHint ? (
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0', lineHeight: 1.4 }}>
                Tap <strong style={{ color: 'var(--gold-primary)' }}>Share</strong> → <strong style={{ color: 'var(--gold-primary)' }}>Add to Home Screen</strong>
              </p>
            ) : (
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0', lineHeight: 1.4 }}>
                Works offline. No app store needed.
              </p>
            )}
          </div>
          {!showIOSHint && (
            <button className="pwa-install-btn" onClick={handleInstall} id="pwa-install-btn">
              <Download size={14} /> Install
            </button>
          )}
          <button className="pwa-dismiss-btn" onClick={handleDismiss} aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      </div>
    </>
  );
}
