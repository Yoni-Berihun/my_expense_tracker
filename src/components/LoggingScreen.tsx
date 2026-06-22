import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import { getOrCreateCategory } from '../services/sync';
import { Plus, X, Tag, FileText, Check, Wallet } from 'lucide-react';

interface LoggingScreenProps {
  onSuccess: () => void;
}

const FIXED_CATEGORIES = [
  { name: 'food', icon: '🍔' },
  { name: 'cafe', icon: '☕' },
  { name: 'transport', icon: '🚕' },
  { name: 'groceries', icon: '🛒' },
  { name: 'entertainment', icon: '🎬' },
  { name: 'utilities', icon: '💡' },
];

export const LoggingScreen: React.FC<LoggingScreenProps> = ({ onSuccess }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [description, setDescription] = useState('');
  const [relativeDate, setRelativeDate] = useState<'today' | 'yesterday' | '2-days-ago'>('today');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  
  const amountRef = useRef<HTMLInputElement>(null);

  // Live queries for local categories
  const localCategories = useLiveQuery(() => 
    db.categories.where('is_deleted').equals(0).toArray()
  ) || [];

  // Handle auto-suggest filtering
  useEffect(() => {
    if (categoryName.trim() === '') {
      setFilteredSuggestions([]);
      return;
    }
    const normalizedQuery = categoryName.trim().toLowerCase();
    const matches = localCategories
      .map(c => c.name)
      .filter(name => name.includes(normalizedQuery) && !FIXED_CATEGORIES.some(f => f.name === name));
    
    setFilteredSuggestions(matches);
  }, [categoryName, localCategories]);

  // Focus amount input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        amountRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleOpen = () => {
    setIsOpen(true);
    // Haptic feedback if supported
    if (navigator.vibrate) {
      navigator.vibrate(15);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setAmount('');
    setCategoryName('');
    setDescription('');
    setRelativeDate('today');
  };

  const handleSelectFixedCategory = (catName: string) => {
    setCategoryName(catName);
    setShowSuggestions(false);
  };

  const handleLogExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Please enter a valid amount greater than 0.');
      return;
    }

    const finalCategory = categoryName.trim() || 'uncategorized';

    try {
      // 1. Get or create category
      const categoryId = await getOrCreateCategory(finalCategory);

      // 2. Determine target date
      const targetDate = new Date();
      if (relativeDate === 'yesterday') {
        targetDate.setDate(targetDate.getDate() - 1);
      } else if (relativeDate === '2-days-ago') {
        targetDate.setDate(targetDate.getDate() - 2);
      }

      // 3. Add expense to local Dexie DB
      const newExpense = {
        id: crypto.randomUUID(),
        amount: parsedAmount,
        category_id: categoryId,
        description: description.trim(),
        date: targetDate.toISOString(),
        created_at: new Date().toISOString(),
        updated_at: Date.now(),
        is_deleted: 0,
        synced: 0
      };

      await db.expenses.add(newExpense);

      // Trigger tactile success feedback
      if (navigator.vibrate) {
        navigator.vibrate([40, 40, 40]);
      }

      handleClose();
      onSuccess();
    } catch (err) {
      console.error('Failed to log expense:', err);
      alert('An error occurred while saving the expense.');
    }
  };

  // Quick stats computed for today
  const todayExpenses = useLiveQuery(async () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const exps = await db.expenses.where('is_deleted').equals(0).toArray();
    return exps.filter(e => e.date.slice(0, 10) === todayStr);
  });

  const todayTotal = todayExpenses?.reduce((acc, exp) => acc + exp.amount, 0) || 0;

  return (
    <div style={{ width: '100%' }}>
      {/* Premium Dashboard summary header */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '30px 20px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '100px', opacity: 0.03, color: 'var(--gold-primary)' }}>
          <Wallet size={120} />
        </div>
        <span className="text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: '12px' }}>Total Spent Today</span>
        <h2 style={{ fontSize: '42px', fontWeight: '800', background: 'var(--gold-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '5px 0' }}>
          {todayTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span style={{ fontSize: '18px', fontWeight: '600' }}>ETB</span>
        </h2>
        <span className="text-muted">{todayExpenses?.length || 0} transactions logged today</span>
      </div>

      {/* Main logging trigger screen */}
      <div className="glass-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <h3 style={{ fontSize: '20px', marginBottom: '10px' }}>Fast Transaction Logging</h3>
        <p className="text-muted" style={{ marginBottom: '24px' }}>Tap below to enter a new expense instantly or log transactions from previous days.</p>
        
        <button className="btn-gold" style={{ width: '100%', maxWidth: '280px', margin: '0 auto', fontSize: '17px', borderRadius: '30px', padding: '16px' }} onClick={handleOpen}>
          <Plus size={20} /> Add Expense
        </button>
      </div>

      {/* Quick Add Modal */}
      <div className={`modal-overlay ${isOpen ? 'open' : ''}`} onClick={handleClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3 style={{ fontSize: '20px', background: 'var(--gold-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              New Expense
            </h3>
            <button className="modal-close" onClick={handleClose}>
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleLogExpense}>
            {/* Amount input */}
            <div className="form-group" style={{ textAlign: 'center', marginBottom: '25px' }}>
              <label className="form-label" style={{ textAlign: 'center' }}>Amount (ETB)</label>
              <div style={{ position: 'relative', display: 'inline-block', margin: '0 auto', width: '100%', maxWidth: '240px' }}>
                <input
                  ref={amountRef}
                  type="number"
                  step="any"
                  placeholder="0.00"
                  className="form-input"
                  style={{
                    fontSize: '36px',
                    fontWeight: '800',
                    textAlign: 'center',
                    color: 'var(--gold-light)',
                    borderColor: 'var(--border-gold)',
                    background: 'transparent',
                    borderWidth: '0 0 2px 0',
                    borderRadius: '0',
                    width: '100%',
                    padding: '8px'
                  }}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Quick-tap Fixed Categories Grid */}
            <div className="form-group">
              <label className="form-label">Quick Categories</label>
              <div className="categories-grid">
                {FIXED_CATEGORIES.map((cat) => (
                  <div
                    key={cat.name}
                    className={`category-card ${categoryName.toLowerCase() === cat.name ? 'active' : ''}`}
                    onClick={() => handleSelectFixedCategory(cat.name)}
                  >
                    <span style={{ fontSize: '20px' }}>{cat.icon}</span>
                    <span style={{ fontSize: '12px', textTransform: 'capitalize', fontWeight: '500' }}>{cat.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Category Search Input */}
            <div className="form-group autocomplete-container">
              <label className="form-label">Category Name</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: '12px', color: 'var(--gold-primary)' }}><Tag size={16} /></span>
                <input
                  type="text"
                  placeholder="Type category (e.g., taxi, transport...)"
                  className="form-input"
                  style={{ width: '100%', paddingLeft: '38px' }}
                  value={categoryName}
                  onChange={(e) => {
                    setCategoryName(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  required
                />
              </div>
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="autocomplete-dropdown">
                  {filteredSuggestions.map((suggestion) => (
                    <div
                      key={suggestion}
                      className="autocomplete-item"
                      onClick={() => {
                        setCategoryName(suggestion);
                        setShowSuggestions(false);
                      }}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Past Day relative selectors */}
            <div className="form-group">
              <label className="form-label">Transaction Date</label>
              <div className="chip-container">
                <button
                  type="button"
                  className={`chip ${relativeDate === 'today' ? 'active' : ''}`}
                  onClick={() => setRelativeDate('today')}
                >
                  Today
                </button>
                <button
                  type="button"
                  className={`chip ${relativeDate === 'yesterday' ? 'active' : ''}`}
                  onClick={() => setRelativeDate('yesterday')}
                >
                  Yesterday
                </button>
                <button
                  type="button"
                  className={`chip ${relativeDate === '2-days-ago' ? 'active' : ''}`}
                  onClick={() => setRelativeDate('2-days-ago')}
                >
                  2 Days Ago
                </button>
              </div>
            </div>

            {/* Notes input */}
            <div className="form-group" style={{ marginBottom: '25px' }}>
              <label className="form-label">Optional Note</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }}><FileText size={16} /></span>
                <input
                  type="text"
                  placeholder="e.g. coffee with Sarah, cab ride home"
                  className="form-input"
                  style={{ width: '100%', paddingLeft: '38px' }}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn-gold" style={{ width: '100%', borderRadius: '8px' }}>
              <Check size={18} /> Record Transaction
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
