import { Sparkles, Compass, Send, ArrowLeft } from 'lucide-react';

export function CapacityFullScreen({ onSignOut }: { onSignOut: () => void }) {
  return (
    <>
      <style>{`
        @keyframes floatCard {
          0%   { transform: translateY(0px) rotate(0deg); }
          50%  { transform: translateY(-12px) rotate(1.5deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        @keyframes pulseGlow {
          0%   { opacity: 0.25; filter: drop-shadow(0 0 15px rgba(212,175,55,0.25)); }
          50%  { opacity: 0.45; filter: drop-shadow(0 0 35px rgba(212,175,55,0.55)); }
          100% { opacity: 0.25; filter: drop-shadow(0 0 15px rgba(212,175,55,0.25)); }
        }
        @keyframes pulseDot {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.3); opacity: 1; }
        }
        
        .vvip-ticket-card {
          width: 100%;
          max-width: 320px;
          height: 180px;
          border-radius: 16px;
          background: linear-gradient(135deg, rgba(25, 22, 12, 0.9) 0%, rgba(10, 8, 4, 0.98) 100%);
          border: 1.5px solid var(--gold-primary);
          box-shadow: 0 15px 40px rgba(0,0,0,0.8), 0 0 30px rgba(212,175,55,0.15);
          animation: floatCard 4.5s ease-in-out infinite;
          padding: 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          overflow: hidden;
          box-sizing: border-box;
        }
        
        .vvip-ticket-card::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(212, 175, 55, 0.08) 0%, transparent 60%);
          pointer-events: none;
        }

        .vvip-card-glow {
          position: absolute;
          width: 150px;
          height: 150px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(212,175,55,0.3) 0%, rgba(212,175,55,0) 70%);
          top: 15px;
          left: 85px;
          z-index: 0;
          pointer-events: none;
          animation: pulseGlow 4s ease-in-out infinite;
        }

        .vvip-contact-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 15px 28px;
          border-radius: 50px;
          background: var(--gold-gradient);
          color: #050505;
          font-weight: 800;
          font-size: 15px;
          text-decoration: none;
          transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.3s ease;
          border: none;
          cursor: pointer;
          box-shadow: var(--gold-glow);
        }
        
        .vvip-contact-btn:hover {
          transform: translateY(-2px) scale(1.03);
          box-shadow: var(--gold-glow-strong);
        }
        
        .vvip-signout-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: none;
          border: 1px solid var(--border-glass);
          color: var(--text-muted);
          padding: 12px 24px;
          border-radius: 50px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition-smooth);
        }
        
        .vvip-signout-btn:hover {
          color: var(--gold-light);
          border-color: var(--border-gold);
          background: rgba(212, 175, 55, 0.03);
        }
        
        .vvip-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 20px;
          background: rgba(212, 175, 55, 0.08);
          border: 1px solid var(--border-gold);
          color: var(--gold-primary);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .pulse-dot {
          width: 8px;
          height: 8px;
          background-color: var(--gold-primary);
          border-radius: 50%;
          display: inline-block;
          animation: pulseDot 2s infinite ease-in-out;
          box-shadow: 0 0 8px var(--gold-primary);
        }
      `}</style>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '40px 24px',
        gap: '30px',
        textAlign: 'center',
        background: 'var(--bg-main)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle background ambient gold lights */}
        <div style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(212, 175, 55, 0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0
        }} />

        {/* Exclusive Welcome Badge */}
        <div style={{ zIndex: 1 }}>
          <div className="vvip-status-badge">
            <span className="pulse-dot" />
            VVIP Lounge Sanctuary
          </div>
        </div>

        {/* Floating Holographic Ticket */}
        <div className="vvip-ticket-card" style={{ zIndex: 1 }}>
          <div className="vvip-card-glow" />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1 }}>
            <div>
              <p style={{ margin: 0, fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Suite Access</p>
              <h2 style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '0.05em' }}>VVIP GUEST PASS</h2>
            </div>
            <Sparkles size={20} style={{ color: 'var(--gold-primary)' }} />
          </div>
          
          <div style={{ textAlign: 'left', zIndex: 1 }}>
            <p style={{ margin: 0, fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Sanctuary Queue</p>
            <p style={{ margin: '2px 0 0 0', fontSize: '13px', fontWeight: '700', color: 'var(--gold-light)' }}>Prioritized Candidate</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', zIndex: 1, borderTop: '1px dashed rgba(212, 175, 55, 0.25)', paddingTop: '10px' }}>
            <div>
              <span style={{ fontSize: '8px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>VVIP Slots Occupied</span>
              <span style={{ fontSize: '12px', fontWeight: '800', color: '#fff' }}>5 / 5 Standard Seats</span>
            </div>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--gold-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Compass size={12} /> GATEWAY E-1
            </div>
          </div>
        </div>

        {/* Heading & Friendly Reassurance */}
        <div style={{ maxWidth: '360px', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h1 style={{
            fontSize: '26px',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #F3E5AB, #D4AF37)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0,
            lineHeight: 1.2,
          }}>
            Exclusive Gateway Reached
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: '14px',
            lineHeight: 1.6,
            margin: 0,
          }}>
            Welcome! You have arrived at the gate of the VIP Expense Tracker. To preserve absolute sync speed and data privacy, active space is restricted to <strong>5 elite members</strong>.
          </p>
          <p style={{
            color: 'var(--gold-light)',
            fontSize: '13px',
            lineHeight: 1.6,
            fontWeight: '600',
            margin: 0,
            background: 'rgba(212, 175, 55, 0.04)',
            padding: '8px 16px',
            borderRadius: '8px',
            border: '1px solid rgba(212, 175, 55, 0.15)'
          }}>
            ✨ Don't worry—you are in! Your account request is actively queued in the prioritized VVIP waitlist.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', maxWidth: '280px', zIndex: 1 }}>
          <a
            href="https://t.me/yoni_verse"
            target="_blank"
            rel="noopener noreferrer"
            className="vvip-contact-btn"
            id="cap-telegram-btn"
          >
            <Send size={16} /> Contact Founder for Access
          </a>

          <button className="vvip-signout-btn" onClick={onSignOut} id="cap-signout-btn">
            <ArrowLeft size={14} /> Return to Entrance
          </button>
        </div>

        {/* Footer */}
        <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.18)', marginTop: '10px', letterSpacing: '1px', textTransform: 'uppercase', zIndex: 1 }}>
          VIP Expense Tracker · Ultra Exclusive Version
        </p>
      </div>
    </>
  );
}
