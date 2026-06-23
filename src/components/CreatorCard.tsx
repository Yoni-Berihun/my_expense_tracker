import { useState, useEffect, useRef } from 'react';

/**
 * CreatorCard — floating "built by" button fixed to bottom-right.
 * Opens a premium glassmorphism popup with creator info and social links.
 */
export function CreatorCard() {
  const [open, setOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      <style>{`
        @keyframes fadeScaleIn {
          from { opacity: 0; transform: scale(0.85) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes pulseRing {
          0%   { box-shadow: 0 0 0 0 rgba(212, 175, 55, 0.5); }
          70%  { box-shadow: 0 0 0 10px rgba(212, 175, 55, 0); }
          100% { box-shadow: 0 0 0 0 rgba(212, 175, 55, 0); }
        }
        .creator-fab {
          position: fixed;
          bottom: 90px;
          right: 16px;
          z-index: 8000;
          width: 46px;
          height: 46px;
          border-radius: 50%;
          border: 2px solid rgba(212, 175, 55, 0.7);
          background: linear-gradient(135deg, #1a1a1a, #0a0a0a);
          cursor: pointer;
          overflow: hidden;
          padding: 0;
          transition: transform 0.2s ease, border-color 0.2s ease;
          animation: pulseRing 2.5s ease-out infinite;
        }
        .creator-fab:hover {
          transform: scale(1.1);
          border-color: #D4AF37;
          box-shadow: 0 0 20px rgba(212, 175, 55, 0.4);
          animation: none;
        }
        .creator-fab img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .creator-popup {
          position: fixed;
          bottom: 148px;
          right: 16px;
          z-index: 8001;
          width: 280px;
          background: linear-gradient(145deg, rgba(20,20,20,0.97), rgba(8,8,8,0.99));
          border: 1px solid rgba(212, 175, 55, 0.35);
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.7), 0 0 40px rgba(212,175,55,0.08);
          backdrop-filter: blur(24px);
          overflow: hidden;
          animation: fadeScaleIn 0.28s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          transform-origin: bottom right;
        }
        .creator-header {
          background: linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.04));
          padding: 24px 20px 16px;
          display: flex;
          align-items: center;
          gap: 14px;
          border-bottom: 1px solid rgba(212,175,55,0.15);
        }
        .creator-avatar {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          border: 2.5px solid rgba(212,175,55,0.6);
          object-fit: cover;
          flex-shrink: 0;
          box-shadow: 0 0 20px rgba(212,175,55,0.2);
        }
        .creator-name {
          font-size: 17px;
          font-weight: 700;
          color: #D4AF37;
          margin: 0 0 2px;
          letter-spacing: 0.3px;
        }
        .creator-role {
          font-size: 11px;
          color: rgba(255,255,255,0.45);
          margin: 0;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .creator-links {
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .creator-link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 12px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          text-decoration: none;
          transition: background 0.2s, border-color 0.2s, transform 0.15s;
        }
        .creator-link:hover {
          background: rgba(212,175,55,0.08);
          border-color: rgba(212,175,55,0.25);
          transform: translateX(3px);
        }
        .creator-link-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .creator-link-text { flex: 1; }
        .creator-link-label {
          font-size: 11px;
          color: rgba(255,255,255,0.35);
          display: block;
          margin-bottom: 1px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .creator-link-handle {
          font-size: 13px;
          font-weight: 600;
          color: rgba(255,255,255,0.85);
        }
        .creator-built-tag {
          text-align: center;
          font-size: 10px;
          color: rgba(255,255,255,0.2);
          padding: 8px;
          border-top: 1px solid rgba(255,255,255,0.05);
          letter-spacing: 0.8px;
          text-transform: uppercase;
        }
        .creator-chevron {
          color: rgba(255,255,255,0.2);
          flex-shrink: 0;
        }
      `}</style>

      <button
        className="creator-fab"
        onClick={() => setOpen(v => !v)}
        aria-label="About the creator"
        id="creator-fab-btn"
        title="Built by Yoni Berihun"
      >
        <img src="/yoni.jpg" alt="Yoni Berihun" />
      </button>

      {open && (
        <div className="creator-popup" ref={cardRef} role="dialog" aria-label="Creator info">
          <div className="creator-header">
            <img src="/yoni.jpg" alt="Yoni Berihun" className="creator-avatar" />
            <div>
              <p className="creator-name">Yoni Berihun</p>
              <p className="creator-role">Full-Stack Developer</p>
            </div>
          </div>

          <div className="creator-links">
            <a href="https://t.me/yoni_verse" target="_blank" rel="noopener noreferrer" className="creator-link" id="creator-telegram-link">
              <div className="creator-link-icon" style={{ background: 'rgba(38,120,196,0.2)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8l-1.7 8.02c-.12.58-.46.72-.93.45l-2.57-1.89-1.24 1.19c-.14.14-.26.26-.53.26l.19-2.62 4.82-4.35c.21-.19-.05-.29-.32-.1L7.6 14.37 5.07 13.6c-.56-.18-.57-.56.12-.82l9.09-3.51c.47-.17.88.11.76.53z" fill="#2674C4"/>
                </svg>
              </div>
              <div className="creator-link-text">
                <span className="creator-link-label">Telegram</span>
                <span className="creator-link-handle">@yoni_verse</span>
              </div>
              <svg className="creator-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>

            <a href="https://instagram.com/yoni_berihun" target="_blank" rel="noopener noreferrer" className="creator-link" id="creator-instagram-link">
              <div className="creator-link-icon" style={{ background: 'rgba(225,48,108,0.15)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" stroke="url(#ig-grad)" strokeWidth="2"/>
                  <circle cx="12" cy="12" r="4.5" stroke="url(#ig-grad)" strokeWidth="2"/>
                  <circle cx="17.5" cy="6.5" r="1.2" fill="#E1306C"/>
                  <defs>
                    <linearGradient id="ig-grad" x1="2" y1="2" x2="22" y2="22">
                      <stop offset="0%" stopColor="#F77737"/>
                      <stop offset="50%" stopColor="#E1306C"/>
                      <stop offset="100%" stopColor="#833AB4"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <div className="creator-link-text">
                <span className="creator-link-label">Instagram</span>
                <span className="creator-link-handle">@yoni_berihun</span>
              </div>
              <svg className="creator-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>

            <a href="https://linkedin.com/in/yoni-berihun" target="_blank" rel="noopener noreferrer" className="creator-link" id="creator-linkedin-link">
              <div className="creator-link-icon" style={{ background: 'rgba(10,102,194,0.2)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#0A66C2">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </div>
              <div className="creator-link-text">
                <span className="creator-link-label">LinkedIn</span>
                <span className="creator-link-handle">yoni-berihun</span>
              </div>
              <svg className="creator-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </div>

          <div className="creator-built-tag">✦ Built with passion ✦</div>
        </div>
      )}
    </>
  );
}
