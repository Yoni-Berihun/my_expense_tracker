import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { TrendingUp, Award, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react';
import { toEthiopian } from '../utils/ethiopianCalendar';

const ET_MONTHS = [
  'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
  'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Puagme'
];

// Convert an Ethiopian year+month to the Gregorian date range it spans
function ethMonthToGregorianRange(ethYear: number, ethMonth: number): { start: Date; end: Date } {
  // Ethiopian months are 30 days each (month 13 = Puagme, 5 or 6 days)
  // Ethiopian New Year = Sep 11 (Gregorian) in most years
  // Simpler: scan every day across ±2 years to find matching ET year+month range
  // Actually, we'll compute the start by noting:
  // ET Meskerem 1, Year Y ≈ Sep 11 (Gregorian) of Year (Y - 7) or (Y - 8)
  // We'll use the reverse: find the Gregorian boundaries by checking known anchor points
  // Ethiopian epoch offset: ET year = Gregorian year - 7 (before Sep 11) or - 8 (after Sep 11)
  // For simplicity, scan 366 days from the ET new year start
  const gregYearApprox = ethYear + 7; // rough Gregorian year
  const anchor = new Date(`${gregYearApprox}-09-01`);

  let start: Date | null = null;
  let end: Date | null = null;

  for (let i = -30; i <= 400; i++) {
    const d = new Date(anchor);
    d.setDate(anchor.getDate() + i);
    const et = toEthiopian(d);
    if (et.year === ethYear && et.month === ethMonth) {
      if (!start) start = new Date(d);
      end = new Date(d);
    } else if (start) {
      break; // past the end of this month
    }
  }

  if (!start || !end) {
    // fallback
    return { start: new Date(0), end: new Date() };
  }
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export const DashboardScreen: React.FC = () => {
  type RangeType = 'et_month' | '7days' | '30days';
  const [range, setRange] = useState<RangeType>('et_month');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);

  // Ethiopian month/year selector (used when range === 'et_month')
  const currentEthDate = useMemo(() => toEthiopian(new Date()), []);
  const [ethYear, setEthYear] = useState(currentEthDate.year - 1); // default to last year where data lives
  const [ethMonth, setEthMonth] = useState(currentEthDate.month);

  // Load all expenses & categories from Dexie
  const rawExpenses = useLiveQuery(() => db.expenses.where('is_deleted').equals(0).toArray());
  const rawCategories = useLiveQuery(() => db.categories.where('is_deleted').equals(0).toArray());

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    (rawCategories || []).forEach(c => map.set(c.id, c.name));
    return map;
  }, [rawCategories]);

  // Filter expenses — exclude Zero Spend Days (amount=0) from monetary stats
  const filteredExpenses = useMemo(() => {
    const expenses = (rawExpenses || []).filter(e => e.amount > 0); // exclude zero spend
    const now = new Date();

    if (range === '7days') {
      const start = new Date(); start.setDate(now.getDate() - 7);
      return expenses.filter(e => new Date(e.date) >= start);
    }
    if (range === '30days') {
      const start = new Date(); start.setDate(now.getDate() - 30);
      return expenses.filter(e => new Date(e.date) >= start);
    }
    // et_month: filter by selected Ethiopian month
    return expenses.filter(e => {
      const et = toEthiopian(new Date(e.date));
      return et.year === ethYear && et.month === ethMonth;
    });
  }, [rawExpenses, range, ethYear, ethMonth]);

  // KPI stats
  const totalSpent = useMemo(() => filteredExpenses.reduce((s, e) => s + e.amount, 0), [filteredExpenses]);

  const avgDailySpent = useMemo(() => {
    if (filteredExpenses.length === 0) return 0;
    const uniqueDays = new Set(filteredExpenses.map(e => e.date.slice(0, 10))).size;
    return uniqueDays > 0 ? totalSpent / uniqueDays : totalSpent;
  }, [filteredExpenses, totalSpent]);

  const topCategoryInfo = useMemo(() => {
    if (filteredExpenses.length === 0) return { name: 'None', amount: 0 };
    const totals: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      const name = categoryMap.get(e.category_id || '') || 'uncategorized';
      totals[name] = (totals[name] || 0) + e.amount;
    });
    let top = 'None', topVal = 0;
    Object.entries(totals).forEach(([cat, val]) => { if (val > topVal) { topVal = val; top = cat; } });
    return { name: top, amount: topVal };
  }, [filteredExpenses, categoryMap]);

  // Trend line chart — group by day
  const trendChartData = useMemo(() => {
    const dailyMap: Record<string, number> = {};
    const now = new Date();

    if (range === 'et_month') {
      const { start, end } = ethMonthToGregorianRange(ethYear, ethMonth);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dailyMap[d.toISOString().slice(0, 10)] = 0;
      }
    } else {
      const days = range === '7days' ? 7 : 30;
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(); d.setDate(now.getDate() - i);
        dailyMap[d.toISOString().slice(0, 10)] = 0;
      }
    }

    filteredExpenses.forEach(e => {
      const ds = e.date.slice(0, 10);
      if (dailyMap[ds] !== undefined) dailyMap[ds] += e.amount;
    });

    return Object.entries(dailyMap).map(([date, amount]) => ({
      date: new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      amount
    }));
  }, [filteredExpenses, range, ethYear, ethMonth]);

  // Pie chart data
  const pieChartData = useMemo(() => {
    const totals: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      const name = categoryMap.get(e.category_id || '') || 'uncategorized';
      totals[name] = (totals[name] || 0) + e.amount;
    });
    return Object.entries(totals).map(([name, value]) => ({ name: name.toUpperCase(), value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredExpenses, categoryMap]);

  // Bar chart — weeks within the selected period
  const barChartData = useMemo(() => {
    const weeklyTotals: Record<string, number> = { 'Week 1': 0, 'Week 2': 0, 'Week 3': 0, 'Week 4': 0 };
    const now = new Date();
    filteredExpenses.forEach(e => {
      const diff = Math.ceil(Math.abs(now.getTime() - new Date(e.date).getTime()) / 86400000);
      if (diff <= 7) weeklyTotals['Week 1'] += e.amount;
      else if (diff <= 14) weeklyTotals['Week 2'] += e.amount;
      else if (diff <= 21) weeklyTotals['Week 3'] += e.amount;
      else if (diff <= 28) weeklyTotals['Week 4'] += e.amount;
    });
    return Object.entries(weeklyTotals).map(([name, amount]) => ({ name, amount })).reverse();
  }, [filteredExpenses]);

  const GOLD_PALETTE = ['#D4AF37', '#F3E5AB', '#AA7C11', '#E5C158', '#906D0A', '#F9E7B9'];

  const handlePieSliceClick = (data: { name?: string }) => {
    if (!data.name) return;
    const clicked = data.name.toLowerCase();
    setSelectedCategoryFilter(prev => prev === clicked ? null : clicked);
  };

  const previewExpenses = useMemo(() => {
    let result = filteredExpenses;
    if (selectedCategoryFilter) {
      result = result.filter(e => (categoryMap.get(e.category_id || '') || 'uncategorized') === selectedCategoryFilter);
    }
    return result.slice(0, 5);
  }, [filteredExpenses, selectedCategoryFilter, categoryMap]);

  const tooltipStyle = {
    contentStyle: {
      background: 'rgba(10,10,10,0.95)', border: '1px solid var(--gold-primary)',
      borderRadius: '8px', color: '#fff', fontFamily: 'var(--font-body)'
    },
    labelStyle: { color: 'var(--gold-primary)', fontWeight: 'bold' }
  };

  const prevEthMonth = () => {
    if (ethMonth === 1) { setEthMonth(13); setEthYear(y => y - 1); }
    else setEthMonth(m => m - 1);
    setSelectedCategoryFilter(null);
  };
  const nextEthMonth = () => {
    const cur = toEthiopian(new Date());
    if (ethYear > cur.year || (ethYear === cur.year && ethMonth >= cur.month)) return;
    if (ethMonth === 13) { setEthMonth(1); setEthYear(y => y + 1); }
    else setEthMonth(m => m + 1);
    setSelectedCategoryFilter(null);
  };
  const isAtCurrentMonth = ethYear === currentEthDate.year && ethMonth === currentEthDate.month;

  return (
    <div style={{ width: '100%' }}>
      {/* Range Selector Chips */}
      <div className="chip-container" style={{ marginBottom: '14px' }}>
        <button className={`chip ${range === 'et_month' ? 'active' : ''}`}
          onClick={() => { setRange('et_month'); setSelectedCategoryFilter(null); }}>
          ET Month
        </button>
        <button className={`chip ${range === '7days' ? 'active' : ''}`}
          onClick={() => { setRange('7days'); setSelectedCategoryFilter(null); }}>
          Last 7 Days
        </button>
        <button className={`chip ${range === '30days' ? 'active' : ''}`}
          onClick={() => { setRange('30days'); setSelectedCategoryFilter(null); }}>
          Last 30 Days
        </button>
      </div>

      {/* Ethiopian Month Navigator (shown when ET Month range selected) */}
      {range === 'et_month' && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '14px', marginBottom: '20px'
        }}>
          <button onClick={prevEthMonth} style={{
            background: 'var(--bg-input)', border: '1px solid var(--border-glass)',
            borderRadius: '50%', width: '34px', height: '34px', display: 'flex',
            alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)'
          }}>
            <ChevronLeft size={16} />
          </button>
          <div style={{ textAlign: 'center' }}>
            <p style={{
              margin: 0, fontSize: '18px', fontWeight: '700',
              background: 'var(--gold-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
            }}>
              {ET_MONTHS[ethMonth - 1]}
            </p>
            <span className="text-muted" style={{ fontSize: '11px' }}>
              ET {ethYear} · {ethYear === currentEthDate.year - 1 ? 'Last Year' : ethYear === currentEthDate.year ? 'This Year' : String(ethYear)}
            </span>
          </div>
          <button onClick={nextEthMonth} disabled={isAtCurrentMonth} style={{
            background: 'var(--bg-input)', border: '1px solid var(--border-glass)',
            borderRadius: '50%', width: '34px', height: '34px', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            cursor: isAtCurrentMonth ? 'not-allowed' : 'pointer',
            color: isAtCurrentMonth ? 'var(--text-muted)' : 'var(--text-primary)',
            opacity: isAtCurrentMonth ? 0.4 : 1
          }}>
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <div className="glass-card" style={{ padding: '16px', margin: '0', textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--gold-primary)', marginBottom: '8px' }}>
            <span className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Spend</span>
            <DollarSign size={16} />
          </div>
          <p style={{ fontSize: '20px', fontWeight: '800', fontFamily: 'var(--font-display)' }}>
            {totalSpent.toLocaleString('en-US', { maximumFractionDigits: 0 })} <span style={{ fontSize: '12px' }}>ETB</span>
          </p>
        </div>

        <div className="glass-card" style={{ padding: '16px', margin: '0', textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--gold-primary)', marginBottom: '8px' }}>
            <span className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Daily Avg</span>
            <TrendingUp size={16} />
          </div>
          <p style={{ fontSize: '20px', fontWeight: '800', fontFamily: 'var(--font-display)' }}>
            {avgDailySpent.toLocaleString('en-US', { maximumFractionDigits: 0 })} <span style={{ fontSize: '12px' }}>ETB</span>
          </p>
        </div>

        <div className="glass-card" style={{ gridColumn: 'span 2', padding: '14px 16px', margin: '0', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Award style={{ color: 'var(--gold-primary)' }} size={20} />
            <div>
              <span className="text-muted" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Top Category</span>
              <p style={{ fontSize: '16px', fontWeight: '700', textTransform: 'capitalize' }}>{topCategoryInfo.name}</p>
            </div>
          </div>
          <p style={{ fontSize: '18px', fontWeight: '800', color: 'var(--gold-light)' }}>
            {topCategoryInfo.amount.toLocaleString('en-US', { maximumFractionDigits: 0 })} ETB
          </p>
        </div>
      </div>

      {/* Spending Trend Line */}
      <div className="glass-card">
        <h4 style={{ fontSize: '16px', marginBottom: '16px', textAlign: 'left', color: 'var(--gold-primary)' }}>
          Spending Trend
          {range === 'et_month' && <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '8px' }}>
            {ET_MONTHS[ethMonth - 1]} {ethYear} ET
          </span>}
        </h4>
        {trendChartData.every(d => d.amount === 0) ? (
          <p className="text-muted" style={{ padding: '40px 0' }}>No transaction history for this period.</p>
        ) : (
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendChartData}>
                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} width={30} />
                <Tooltip {...tooltipStyle} formatter={(v) => [`${v} ETB`, 'Spent']} />
                <Line type="monotone" dataKey="amount" stroke="url(#goldLine)" strokeWidth={3}
                  dot={{ r: 2, fill: 'var(--gold-primary)' }}
                  activeDot={{ r: 6, stroke: 'var(--bg-main)', strokeWidth: 2 }} />
                <defs>
                  <linearGradient id="goldLine" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#AA7C11" />
                    <stop offset="50%" stopColor="#D4AF37" />
                    <stop offset="100%" stopColor="#F3E5AB" />
                  </linearGradient>
                </defs>
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Pie + Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginBottom: '20px' }}>
        <div className="glass-card" style={{ margin: '0' }}>
          <h4 style={{ fontSize: '16px', marginBottom: '8px', textAlign: 'left', color: 'var(--gold-primary)' }}>Category Breakdown</h4>
          <span className="text-muted" style={{ fontSize: '11px', display: 'block', textAlign: 'left', marginBottom: '12px' }}>
            {selectedCategoryFilter ? `Filtering by ${selectedCategoryFilter.toUpperCase()} — tap again to clear` : 'Tap a segment to filter transactions'}
          </span>
          {pieChartData.length === 0 ? (
            <p className="text-muted" style={{ padding: '40px 0' }}>No categories logged.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '100%', height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieChartData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                      paddingAngle={3} dataKey="value" onClick={handlePieSliceClick}>
                      {pieChartData.map((entry, i) => (
                        <Cell key={i} fill={GOLD_PALETTE[i % GOLD_PALETTE.length]}
                          style={{
                            cursor: 'pointer',
                            opacity: selectedCategoryFilter === entry.name.toLowerCase() || !selectedCategoryFilter ? 1 : 0.3,
                            filter: selectedCategoryFilter === entry.name.toLowerCase() ? 'drop-shadow(0 0 4px var(--gold-primary))' : 'none',
                            transition: 'opacity 0.2s, filter 0.2s'
                          }} />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipStyle} formatter={(v) => [`${v} ETB`, 'Spent']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '10px' }}>
                {pieChartData.map((entry, i) => (
                  <div key={entry.name} onClick={() => handlePieSliceClick(entry)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px',
                      cursor: 'pointer',
                      border: selectedCategoryFilter === entry.name.toLowerCase() ? '1px solid var(--gold-primary)' : '1px solid transparent',
                      padding: '2px 6px', borderRadius: '4px'
                    }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: GOLD_PALETTE[i % GOLD_PALETTE.length], display: 'inline-block' }} />
                    <span style={{ textTransform: 'capitalize', fontWeight: selectedCategoryFilter === entry.name.toLowerCase() ? 'bold' : 'normal' }}>
                      {entry.name.toLowerCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="glass-card" style={{ margin: '0' }}>
          <h4 style={{ fontSize: '16px', marginBottom: '16px', textAlign: 'left', color: 'var(--gold-primary)' }}>Weekly Comparison</h4>
          <div style={{ width: '100%', height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData}>
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} width={30} />
                <Tooltip {...tooltipStyle} formatter={(v) => [`${v} ETB`, 'Spent']} />
                <Bar dataKey="amount" fill="#D4AF37" radius={[4, 4, 0, 0]}>
                  {barChartData.map((_e, i) => (
                    <Cell key={i} fill={i === barChartData.length - 1 ? 'url(#activeGold)' : 'rgba(212,175,55,0.3)'} />
                  ))}
                </Bar>
                <defs>
                  <linearGradient id="activeGold" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F3E5AB" />
                    <stop offset="100%" stopColor="#AA7C11" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent transactions preview */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h4 style={{ fontSize: '15px', color: 'var(--gold-primary)', textTransform: 'capitalize' }}>
            {selectedCategoryFilter ? `${selectedCategoryFilter} Expenses` : 'Recent Transactions'}
          </h4>
          {selectedCategoryFilter && (
            <button onClick={() => setSelectedCategoryFilter(null)}
              style={{ background: 'none', border: 'none', color: 'var(--gold-primary)', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}>
              Clear Filter
            </button>
          )}
        </div>
        {previewExpenses.length === 0 ? (
          <p className="text-muted" style={{ padding: '20px 0' }}>No transactions recorded in this period.</p>
        ) : (
          <div className="table-container">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {previewExpenses.map(exp => (
                  <tr key={exp.id}>
                    <td>{new Date(exp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                    <td style={{ textTransform: 'capitalize' }}>{categoryMap.get(exp.category_id || '') || 'uncategorized'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--gold-light)' }}>
                      {exp.amount.toFixed(2)} ETB
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
