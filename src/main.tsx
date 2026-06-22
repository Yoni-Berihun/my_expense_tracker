import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Client-side scheduler for daily logging reminders
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
      new Notification("VIP Daily Reminder", {
        body: "Have you logged your transactions today? Tap to record now.",
        icon: "/pwa-192x192.png",
        tag: "daily-reminder"
      });
      localStorage.setItem('last_reminder_date', todayDateStr);
    }
  }
}, 30000); // Check every 30 seconds

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

