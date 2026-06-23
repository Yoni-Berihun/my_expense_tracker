import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'

// ── Service Worker Registration ────────────────────────────────────────────
// registerSW handles auto-updates. onNeedRefresh fires when a new SW is ready.
const updateSW = registerSW({
  onNeedRefresh() {
    // Silently update in the background; next time user opens the app they get the new version
    updateSW(true);
  },
  onOfflineReady() {
    console.log('[PWA] App ready to work offline.');
  },
});

// ── Daily Reminder Scheduler ───────────────────────────────────────────────
setInterval(() => {
  const enabled = localStorage.getItem('reminders_enabled') === 'true';
  if (!enabled) return;

  if (Notification.permission !== 'granted') return;

  const reminderTime = localStorage.getItem('reminder_time') || '20:00';
  const now = new Date();
  const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  if (currentHHMM === reminderTime) {
    const todayDateStr = now.toISOString().slice(0, 10);
    const lastFired = localStorage.getItem('last_reminder_date');
    if (lastFired !== todayDateStr) {
      new Notification('VIP Daily Reminder', {
        body: 'Have you logged your transactions today? Tap to record now.',
        icon: '/pwa-192x192.png',
        tag: 'daily-reminder',
      });
      localStorage.setItem('last_reminder_date', todayDateStr);
    }
  }
}, 30000); // Check every 30 seconds

// ── Render ─────────────────────────────────────────────────────────────────
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
