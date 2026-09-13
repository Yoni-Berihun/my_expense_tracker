import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import { toEthiopian } from '../utils/ethiopianCalendar';
import { ChevronDown, ChevronRight, Star } from 'lucide-react';
import { ConsistencyHeatmap } from './ConsistencyHeatmap';

const ET_MONTHS = [
  'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
  'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Puagme'
];

// Determine the current Ethiopian year for scoping the dashboard
const getCurrentEthiopianYear = (): number => toEthiopian(new Date()).year;

interface MonthBreakdown {
  ethMonthIndex: number; // 1–13
  ethMonthName: string;
  total: number;
  categoryBreakdown: { name: string; amount: number; pct: number }[];
  zeroSpendDays: number;
}

export const YearlyOverviewScreen: React.FC = () => {
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null);

  const currentEthYear = useMemo(() => getCurrentEthiopianYear(), []);

  const allExpenses = useLiveQuery(() =>
    db.expenses.where('is_deleted').equals(0).toArray()
  );

  const allCategories = useLiveQuery(() =>
    db.categories.where('is_deleted').equals(0).toArray()
  );

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of allCategories ?? []) {
      map.set(c.id, c.name);
    }
    return map;
  }, [allCategories]);

  // Aggregate the yearly data entirely in the browser from Dexie (0 API calls)
  const { yearlyTotal, monthBreakdowns, currentStreak, longestStreak } = useMemo(() => {
    const expenses = allExpenses ?? [];

    // Group expenses by Ethiopian year+month
    const monthMap = new Map<number, Map<string, number>>(); // ethMonth → (catId → total)
    const zeroByMonth = new Map<number, Set<string>>(); // ethMonth → set of dateStr with zero-spend days

    let yearlyTotal = 0;

    for (const exp of expenses) {
      const ethDate = toEthiopian(new Date(exp.date));
      if (ethDate.year !== currentEthYear) continue;

      const mIdx = ethDate.month;

      // Category totals per month (skip zero-spend entries from total)
      if (exp.amount > 0) {
        yearlyTotal += exp.amount;
        const catMap = monthMap.get(mIdx) ?? new Map<string, number>();
        const catId = exp.category_id ?? 'uncategorized';
        catMap.set(catId, (catMap.get(catId) ?? 0) + exp.amount);
        monthMap.set(mIdx, catMap);
      } else if (exp.description === 'Zero Spend Day') {
        // Track zero spend days per month
        const dateStr = exp.date.slice(0, 10);
        const zeroSet = zeroByMonth.get(mIdx) ?? new Set<string>();
        zeroSet.add(dateStr);
        zeroByMonth.set(mIdx, zeroSet);
      }
    }

    // Build per-month summaries only for months that have data
    const monthBreakdowns: MonthBreakdown[] = ET_MONTHS.map((name, i) => {
      const mIdx = i + 1;
      const catMap = monthMap.get(mIdx) ?? new Map<string, number>();
      const total = [...catMap.values()].reduce((s, v) => s + v, 0);

      const categoryBreakdown = [...catMap.entries()]
        .map(([catId, amount]) => ({
          name: categoryMap.get(catId) ?? catId,
          amount,
          pct: total > 0 ? (amount / total) * 100 : 0
        }))
        .sort((a, b) => b.amount - a.amount);

      return {
        ethMonthIndex: mIdx,
        ethMonthName: name,
        total,
        categoryBreakdown,
        zeroSpendDays: zeroByMonth.get(mIdx)?.size ?? 0
      };
    });

    // Streak calculation: consecutive days tracked up to today
    const trackedDates = new Set(expenses.map(e => e.date.slice(0, 10)));

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    // Walk backwards from today
    const cursor = new Date();
    for (let i = 0; i <= 365; i++) {
      const ds = cursor.toISOString().slice(0, 10);
      if (trackedDates.has(ds)) {
        if (i === 0 || currentStreak > 0) currentStreak++;
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        if (i === 0) currentStreak = 0; // didn't track today yet
        tempStreak = 0;
      }
      cursor.setDate(cursor.getDate() - 1);
    }

    return { yearlyTotal, monthBreakdowns, currentStreak, longestStreak };
  }, [allExpenses, categoryMap, currentEthYear]);

  const activeMonths = monthBreakdowns.filter(m => m.total > 0 || m.zeroSpendDays > 0);

  const GOLD_PALETTE = ['#D4AF37', '#F3E5AB', '#AA7C11', '#E5C158', '#906D0A'];

  return (
    <div style={{ width: '100%' }}>
      {/* Yearly Hero Card */}
      <div className="glass-card" style={{ padding: '28px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden', marginBottom: '20px' }}>
        <div style={{ position: 'absolute', top: '-30px', right: '-30px', opacity: 0.04 }}>
          <Star size={160} style={{ color: 'var(--gold-primary)' }} />
        </div>
        <span className="text-muted" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
          Ethiopian Year {currentEthYear} — Total Expenses
        </span>
        <h1 style={{
          fontSize: '46px', fontWeight: '800', margin: '8px 0 4px',
          background: 'var(--gold-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
        }}>
          {yearlyTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          <span style={{ fontSize: '20px', fontWeight: '600' }}> ETB</span>
        </h1>

        {/* Streak stats */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '16px' }}>
          <div>
            <p style={{ fontSize: '22px', fontWeight: '700', color: '#10b981', margin: 0 }}>{currentStreak}</p>
            <span className="text-muted" style={{ fontSize: '11px' }}>Current streak</span>
          </div>
          <div style={{ width: '1px', background: 'var(--border-glass)' }} />
          <div>
            <p style={{ fontSize: '22px', fontWeight: '700', color: 'var(--gold-light)', margin: 0 }}>{longestStreak}</p>
            <span className="text-muted" style={{ fontSize: '11px' }}>Longest streak</span>
          </div>
          <div style={{ width: '1px', background: 'var(--border-glass)' }} />
          <div>
            <p style={{ fontSize: '22px', fontWeight: '700', color: 'var(--gold-primary)', margin: 0 }}>
              {monthBreakdowns.reduce((s, m) => s + m.zeroSpendDays, 0)}
            </p>
            <span className="text-muted" style={{ fontSize: '11px' }}>Zero spend days</span>
          </div>
        </div>
      </div>

      {/* Consistency Heatmap */}
      <div style={{ marginBottom: '20px' }}>
        <ConsistencyHeatmap />
      </div>

      {/* Ethiopian Calendar Accordion */}
      <div className="glass-card" style={{ padding: '20px 20px 8px' }}>
        <h4 style={{ fontSize: '16px', color: 'var(--gold-primary)', marginBottom: '16px' }}>
          Monthly Breakdown — Ethiopian Calendar
        </h4>

        {activeMonths.length === 0 ? (
          <p className="text-muted" style={{ textAlign: 'center', padding: '30px 0' }}>
            No data recorded for this Ethiopian year yet. Start logging expenses to see your breakdown here.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {monthBreakdowns.map((month) => {
              const hasData = month.total > 0 || month.zeroSpendDays > 0;
              const isExpanded = expandedMonth === month.ethMonthIndex;

              return (
                <div
                  key={month.ethMonthIndex}
                  style={{
                    border: '1px solid',
                    borderColor: isExpanded ? 'rgba(212,175,55,0.4)' : 'var(--border-glass)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    transition: 'border-color 0.2s',
                    opacity: hasData ? 1 : 0.35
                  }}
                >
                  {/* Accordion Header */}
                  <button
                    onClick={() => hasData && setExpandedMonth(isExpanded ? null : month.ethMonthIndex)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', padding: '14px 16px',
                      background: isExpanded ? 'rgba(212,175,55,0.06)' : 'transparent',
                      border: 'none', cursor: hasData ? 'pointer' : 'default',
                      color: 'var(--text-primary)', fontFamily: 'var(--font-body)',
                      transition: 'background 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {isExpanded
                        ? <ChevronDown size={16} style={{ color: 'var(--gold-primary)' }} />
                        : <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                      }
                      <span style={{ fontWeight: '600', fontSize: '15px' }}>{month.ethMonthName}</span>
                      {month.zeroSpendDays > 0 && (
                        <span style={{
                          fontSize: '10px', padding: '2px 6px', borderRadius: '10px',
                          background: 'rgba(16,185,129,0.15)', color: '#10b981', fontWeight: '600'
                        }}>
                          {month.zeroSpendDays} zero spend
                        </span>
                      )}
                    </div>
                    <span style={{ fontWeight: '700', fontSize: '15px', color: month.total > 0 ? 'var(--gold-light)' : 'var(--text-muted)' }}>
                      {month.total > 0 ? `${month.total.toLocaleString('en-US', { maximumFractionDigits: 0 })} ETB` : '—'}
                    </span>
                  </button>

                  {/* Accordion Content */}
                  {isExpanded && month.total > 0 && (
                    <div style={{ padding: '4px 16px 16px', borderTop: '1px solid var(--border-glass)' }}>
                      {/* Mini percentage bar chart per category */}
                      <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {month.categoryBreakdown.map((cat, idx) => (
                          <div key={cat.name}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span style={{ fontSize: '13px', textTransform: 'capitalize', color: 'var(--text-primary)' }}>{cat.name}</span>
                              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                {cat.amount.toLocaleString('en-US', { maximumFractionDigits: 0 })} ETB
                                <span style={{ marginLeft: '6px', color: GOLD_PALETTE[idx % GOLD_PALETTE.length], fontWeight: '700' }}>
                                  {cat.pct.toFixed(0)}%
                                </span>
                              </span>
                            </div>
                            <div style={{ height: '5px', borderRadius: '3px', background: 'rgba(255,255,255,0.06)' }}>
                              <div style={{
                                height: '100%', borderRadius: '3px',
                                width: `${cat.pct}%`,
                                background: GOLD_PALETTE[idx % GOLD_PALETTE.length],
                                transition: 'width 0.5s ease'
                              }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div style={{ height: '24px' }} />
    </div>
  );
};
