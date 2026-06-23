import React, { useState, useMemo } from 'react';
import { Coins, ArrowRight, Database, Cloud, FileSpreadsheet, Smartphone } from 'lucide-react';

interface LandingPageProps {
  onEnter: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  const [isExiting, setIsExiting] = useState(false);

  // Generate randomized background bubbles once on mount to keep them stable during re-renders
  const backgroundBubbles = useMemo(() => {
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
          className="btn-gold" 
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
            className="glass-card" 
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
      </div>

      {/* Animations Styling */}
      <style>{`
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
