import React, { useState, useEffect, useRef } from 'react';
import { Coins, ArrowRight, Database, Cloud, FileSpreadsheet, Smartphone, ShieldAlert } from 'lucide-react';

interface LandingPageProps {
  onEnter: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  decay: number;
  phase: number;
  waveSpeed: number;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  const [isExiting, setIsExiting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Generate randomized background bubbles once on mount to keep them stable during re-renders
  const [backgroundBubbles] = useState(() => {
    return Array.from({ length: 15 }).map((_, i) => {
      const size = Math.floor(Math.random() * 120) + 40; // 40px to 160px
      const left = Math.floor(Math.random() * 100); // 0% to 100%
      const duration = Math.floor(Math.random() * 12) + 10; // 10s to 22s
      const delay = Math.floor(Math.random() * 8); // 0s to 8s
      return {
        id: i,
        style: {
          position: 'absolute' as const,
          bottom: '-200px',
          left: `${left}%`,
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212, 175, 55, 0.06) 0%, rgba(212, 175, 55, 0) 70%)',
          border: '1px solid rgba(212, 175, 55, 0.03)',
          animation: `floatUp ${duration}s infinite linear`,
          animationDelay: `${delay}s`,
          pointerEvents: 'none' as const,
          zIndex: 0
        }
      };
    });
  });

  // Antigravity Canvas-based interactive cursor particles trail
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const particles: Particle[] = [];
    const mouse = { x: -9999, y: -9999, active: false };
    const glow = { x: -9999, y: -9999 };

    const handleMouseMoveGlobal = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;

      // Spawn gold stardust particles on mouse movement
      for (let i = 0; i < 2; i++) {
        particles.push({
          x: mouse.x,
          y: mouse.y,
          vx: (Math.random() - 0.5) * 1.2,
          vy: (Math.random() - 0.5) * 1.2 - 0.8, // drift upwards
          size: Math.random() * 4 + 1.5, // 1.5px to 5.5px stardust sizes
          alpha: 1,
          decay: Math.random() * 0.01 + 0.01, // slower decay for longer tails
          phase: Math.random() * Math.PI * 2,
          waveSpeed: Math.random() * 0.04 + 0.02
        });
      }
    };

    const handleMouseLeave = () => {
      mouse.active = false;
    };

    window.addEventListener('mousemove', handleMouseMoveGlobal);
    document.addEventListener('mouseleave', handleMouseLeave);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Draw mouse soft glowing background aura with lag-damping inertia
      if (mouse.active) {
        if (glow.x === -9999) {
          glow.x = mouse.x;
          glow.y = mouse.y;
        } else {
          glow.x += (mouse.x - glow.x) * 0.08;
          glow.y += (mouse.y - glow.y) * 0.08;
        }

        const gradient = ctx.createRadialGradient(
          glow.x,
          glow.y,
          0,
          glow.x,
          glow.y,
          220
        );
        gradient.addColorStop(0, 'rgba(212, 175, 55, 0.07)');
        gradient.addColorStop(1, 'rgba(212, 175, 55, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(glow.x, glow.y, 220, 0, Math.PI * 2);
        ctx.fill();
      } else {
        glow.x = -9999;
        glow.y = -9999;
      }

      // 2. Draw & update stardust particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.phase += p.waveSpeed;
        p.x += p.vx + Math.sin(p.phase) * 0.5; // side-to-side sine drift wave
        p.y += p.vy;
        p.vy -= 0.015; // float upwards (antigravity)
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = '#D4AF37'; // gold-primary
        ctx.shadowBlur = 12;
        ctx.shadowColor = 'rgba(212, 175, 55, 0.9)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMoveGlobal);
      document.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handleEnterClick = () => {
    if (navigator.vibrate) {
      navigator.vibrate([20, 20]); // Subtle tactile double-tap feel
    }
    setIsExiting(true);
    setTimeout(() => {
      onEnter();
    }, 450); // Match CSS transition duration
  };

  const features = [
    {
      icon: <Database size={24} style={{ color: 'var(--gold-primary)' }} />,
      title: 'Offline-First Ledger',
      description: 'Log expenses instantly even without internet. Saved securely in your browser\'s local database.'
    },
    {
      icon: <Cloud size={24} style={{ color: 'var(--gold-primary)' }} />,
      title: 'Secure Cloud Sync',
      description: 'Sign in to automatically backup and sync your ledger across devices using Supabase security.'
    },
    {
      icon: <FileSpreadsheet size={24} style={{ color: 'var(--gold-primary)' }} />,
      title: 'Luxury Reports',
      description: 'Export structured data instantly. Download premium PDF ledgers or clean CSV spreadsheets.'
    },
    {
      icon: <Smartphone size={24} style={{ color: 'var(--gold-primary)' }} />,
      title: 'PWA Mobile App',
      description: 'Install this application directly on your phone home-screen with zero App Store downloads.'
    }
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        width: '100%',
        backgroundColor: 'var(--bg-main)',
        opacity: isExiting ? 0 : 1,
        transform: isExiting ? 'scale(0.97) translateY(-10px)' : 'scale(1) translateY(0)',
        transition: 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        padding: '40px 20px',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Interactive Cursor Antigravity Particles Canvas Layer */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 0
        }}
      />

      {/* Background Floating Bubbles */}
      <div 
        style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          pointerEvents: 'none', 
          overflow: 'hidden', 
          zIndex: 0 
        }}
      >
        {backgroundBubbles.map((bubble) => (
          <div key={bubble.id} style={bubble.style} />
        ))}
      </div>

      {/* Title & Brand Header */}
      <div 
        style={{ 
          marginTop: 'auto',
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: '12px',
          animation: 'fadeInDown 0.8s cubic-bezier(0.25, 0.8, 0.25, 1)',
          position: 'relative',
          zIndex: 1
        }}
      >
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            width: '64px', 
            height: '64px', 
            borderRadius: '50%', 
            backgroundColor: 'rgba(212, 175, 55, 0.08)', 
            border: '1px solid var(--border-gold)',
            boxShadow: 'var(--gold-glow)',
            marginBottom: '4px'
          }}
        >
          <Coins style={{ color: 'var(--gold-primary)' }} size={32} />
        </div>
        <h1 style={{ margin: 0, fontSize: '32px', letterSpacing: '0.05em' }}>
          VIP <span style={{ fontWeight: '300' }}>EXPENSES</span>
        </h1>
        <p className="text-gold" style={{ margin: 0, fontSize: '12px', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: '600' }}>
          Your finances, elevated.
        </p>
      </div>

      {/* Intro Description & Funny Statement */}
      <div 
        style={{ 
          maxWidth: '440px', 
          margin: '25px 0 35px 0', 
          animation: 'fadeIn 1s ease-out 0.2s both',
          position: 'relative',
          zIndex: 1
        }}
      >
        <p style={{ fontSize: '17px', fontWeight: '500', color: 'var(--gold-light)', margin: '0 0 10px 0', fontFamily: 'var(--font-display)' }}>
          Welcome. We already know you are a very important person.
        </p>
        <p className="text-muted" style={{ fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
          Very important spenders deserve very important tracking. Manage your luxury ledger offline and securely back up your records to the cloud.
        </p>
      </div>

      {/* Main Entrance Button */}
      <div 
        style={{ 
          width: '100%', 
          maxWidth: '280px', 
          marginBottom: '50px', 
          animation: 'fadeInUp 0.8s cubic-bezier(0.25, 0.8, 0.25, 1) 0.3s both',
          position: 'relative',
          zIndex: 1
        }}
      >
        <button 
          className="btn-gold landing-button" 
          onClick={handleEnterClick}
          style={{ 
            width: '100%', 
            borderRadius: '30px', 
            padding: '16px 24px', 
            fontSize: '17px',
            boxShadow: 'var(--gold-glow-strong)'
          }}
        >
          Enter Application <ArrowRight size={18} />
        </button>
      </div>

      {/* Feature Grid */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr', 
          gap: '16px', 
          width: '100%', 
          maxWidth: '480px', 
          marginBottom: 'auto',
          animation: 'fadeInUp 0.8s cubic-bezier(0.25, 0.8, 0.25, 1) 0.5s both',
          position: 'relative',
          zIndex: 1
        }}
      >
        {features.map((feat, index) => (
          <div 
            key={index} 
            className="glass-card landing-card" 
            style={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              gap: '16px', 
              padding: '16px', 
              margin: 0,
              textAlign: 'left',
              background: 'rgba(18, 18, 18, 0.5)'
            }}
          >
            <div style={{ marginTop: '2px' }}>{feat.icon}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--text-primary)', fontWeight: '600' }}>{feat.title}</h4>
              <p className="text-muted" style={{ margin: 0, fontSize: '12px', lineHeight: '1.4' }}>{feat.description}</p>
            </div>
          </div>
        ))}

        {/* Local Storage Data Persistence Notice */}
        <div 
          className="glass-card" 
          style={{ 
            width: '100%', 
            border: '1px dashed rgba(212, 175, 55, 0.35)', 
            background: 'rgba(212, 175, 55, 0.02)', 
            textAlign: 'left', 
            padding: '16px', 
            borderRadius: 'var(--radius-md)', 
            margin: '8px 0 0 0', 
            display: 'flex', 
            gap: '12px', 
            alignItems: 'center',
            boxShadow: 'none'
          }}
        >
          <ShieldAlert size={28} style={{ color: 'var(--gold-primary)', flexShrink: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: 'var(--gold-light)' }}>
              Data Persistence Notice
            </p>
            <p className="text-muted" style={{ margin: 0, fontSize: '11px', lineHeight: '1.4' }}>
              By default, expenses are only stored in your browser's local cache. To ensure your ledger is saved permanently and accessible across all devices, sign in with GitHub.
            </p>
          </div>
        </div>
      </div>

      {/* Animations Styling */}
      <style>{`
        .landing-card {
          position: relative;
          z-index: 1;
          transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), border-color 0.3s ease, box-shadow 0.3s ease, background-color 0.3s ease;
          cursor: pointer;
        }
        .landing-card:hover {
          transform: translateY(-4px) scale(1.02);
          border-color: var(--gold-primary) !important;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.7), var(--gold-glow) !important;
          background-color: rgba(212, 175, 55, 0.05) !important;
        }
        .landing-button {
          position: relative;
          z-index: 1;
          transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.3s ease;
        }
        .landing-button:hover {
          transform: translateY(-3px) scale(1.03);
          box-shadow: var(--gold-glow-strong) !important;
        }
        @keyframes floatUp {
          0% {
            transform: translateY(0) translateX(0) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-120vh) translateX(50px) rotate(360deg);
            opacity: 0;
          }
        }
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};
