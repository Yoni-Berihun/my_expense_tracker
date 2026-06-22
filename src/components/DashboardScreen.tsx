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
import { TrendingUp, Award, DollarSign } from 'lucide-react';

export const DashboardScreen: React.FC = () => {
  const [range, setRange] = useState<'7days' | '30days' | 'month'>('7days');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);

  // Load all expenses & categories from Dexie
  const rawExpenses = useLiveQuery(() => db.expenses.where('is_deleted').equals(0).toArray()) || [];
  const rawCategories = useLiveQuery(() => db.categories.where('is_deleted').equals(0).toArray()) || [];

  // Create a mapping of category ID -> Name (normalized lowercase/capitalized)
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    rawCategories.forEach(c => {
      map.set(c.id, c.name);
    });
    return map;
  }, [rawCategories]);

  // Filter expenses based on selected range
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    let startDate = new Date();

    if (range === '7days') {
      startDate.setDate(now.getDate() - 7);
    } else if (range === '30days') {
      startDate.setDate(now.getDate() - 30);
    } else if (range === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return rawExpenses.filter(e => new Date(e.date) >= startDate);
  }, [rawExpenses, range]);

  // Calculate Key Stats
  const totalSpent = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  const avgDailySpent = useMemo(() => {
    if (filteredExpenses.length === 0) return 0;
    const uniqueDays = new Set(filteredExpenses.map(e => e.date.slice(0, 10))).size;
    return uniqueDays > 0 ? totalSpent / uniqueDays : totalSpent;
  }, [filteredExpenses, totalSpent]);

  const topCategoryInfo = useMemo(() => {
    if (filteredExpenses.length === 0) return { name: 'None', amount: 0 };
    
    const totals: { [key: string]: number } = {};
    filteredExpenses.forEach(e => {
      const catName = categoryMap.get(e.category_id || '') || 'uncategorized';
      totals[catName] = (totals[catName] || 0) + e.amount;
    });

    let topCat = 'None';
    let topVal = 0;
    Object.entries(totals).forEach(([cat, val]) => {
      if (val > topVal) {
        topVal = val;
        topCat = cat;
      }
    });

    return { name: topCat, amount: topVal };
  }, [filteredExpenses, categoryMap]);

  // Data parsing for Trend Line Chart (Daily aggregation)
  const trendChartData = useMemo(() => {
    const dailyMap: { [key: string]: number } = {};
    
    // Initialize dates for range to make chart continuous
    const now = new Date();
    const daysToInit = range === '7days' ? 7 : range === '30days' ? 30 : now.getDate();
    for (let i = daysToInit - 1; i >= 0; i--) {
      const d = new Date();
      if (range === 'month') {
        d.setDate(now.getDate() - i);
        // Only include dates in the current month
        if (d.getMonth() !== now.getMonth()) continue;
      } else {
        d.setDate(now.getDate() - i);
      }
      dailyMap[d.toISOString().slice(0, 10)] = 0;
    }

    filteredExpenses.forEach(e => {
      const dayStr = e.date.slice(0, 10);
      if (dailyMap[dayStr] !== undefined) {
        dailyMap[dayStr] += e.amount;
      } else if (range === 'month') {
        // Fallback for custom month dates
        dailyMap[dayStr] = (dailyMap[dayStr] || 0) + e.amount;
      }
    });

    return Object.entries(dailyMap).map(([date, amount]) => {
      const formattedDate = new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return { date: formattedDate, amount };
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredExpenses, range]);

  // Data parsing for Category breakdown Pie Chart
  const pieChartData = useMemo(() => {
    const totals: { [key: string]: number } = {};
    filteredExpenses.forEach(e => {
      const catName = categoryMap.get(e.category_id || '') || 'uncategorized';
      totals[catName] = (totals[catName] || 0) + e.amount;
    });

    return Object.entries(totals).map(([name, value]) => ({
      name: name.toUpperCase(),
      value
    })).sort((a, b) => b.value - a.value);
  }, [filteredExpenses, categoryMap]);

  // Data parsing for Weekly bar comparison (Mon-Sun segments)
  const barChartData = useMemo(() => {
    const weeklyTotals: { [key: string]: number } = { 'Week 1': 0, 'Week 2': 0, 'Week 3': 0, 'Week 4': 0 };
    const now = new Date();
    
    filteredExpenses.forEach(e => {
      const expDate = new Date(e.date);
      const diffTime = Math.abs(now.getTime() - expDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 7) {
        weeklyTotals['Week 1'] += e.amount; // Current Week
      } else if (diffDays <= 14) {
        weeklyTotals['Week 2'] += e.amount;
      } else if (diffDays <= 21) {
        weeklyTotals['Week 3'] += e.amount;
      } else if (diffDays <= 28) {
        weeklyTotals['Week 4'] += e.amount;
      }
    });

    return Object.entries(weeklyTotals).map(([name, amount]) => ({ name, amount })).reverse();
  }, [filteredExpenses]);

  // Premium Gold Colors for Chart Blocks
  const GOLD_PALETTE = ['#D4AF37', '#F3E5AB', '#AA7C11', '#E5C158', '#906D0A', '#F9E7B9'];

  // Handle Pie Slice Click to Filter List
  const handlePieSliceClick = (data: any) => {
    const catClicked = data.name.toLowerCase();
    if (selectedCategoryFilter === catClicked) {
      setSelectedCategoryFilter(null); // Toggle off
    } else {
      setSelectedCategoryFilter(catClicked); // Filter by this category
    }
  };

  const previewExpenses = useMemo(() => {
    let result = filteredExpenses;
    if (selectedCategoryFilter) {
      result = result.filter(e => (categoryMap.get(e.category_id || '') || 'uncategorized') === selectedCategoryFilter);
    }
    return result.slice(0, 5); // top 5 list
  }, [filteredExpenses, selectedCategoryFilter, categoryMap]);

  const customTooltipStyle = {
    contentStyle: {
      background: 'rgba(10, 10, 10, 0.95)',
      border: '1px solid var(--gold-primary)',
      borderRadius: '8px',
      color: '#fff',
      fontFamily: 'var(--font-body)'
    },
    labelStyle: { color: 'var(--gold-primary)', fontWeight: 'bold' }
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Time Range Selector */}
      <div className="chip-container" style={{ marginBottom: '20px' }}>
        <button
          className={`chip ${range === '7days' ? 'active' : ''}`}
          onClick={() => { setRange('7days'); setSelectedCategoryFilter(null); }}
        >
          Last 7 Days
        </button>
        <button
          className={`chip ${range === '30days' ? 'active' : ''}`}
          onClick={() => { setRange('30days'); setSelectedCategoryFilter(null); }}
        >
          Last 30 Days
        </button>
        <button
          className={`chip ${range === 'month' ? 'active' : ''}`}
          onClick={() => { setRange('month'); setSelectedCategoryFilter(null); }}
        >
          This Month
        </button>
      </div>

      {/* KPI Dashboard Cards */}
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

      {/* Line Chart Card (Spending Trend) */}
      <div className="glass-card">
        <h4 style={{ fontSize: '16px', marginBottom: '16px', textAlign: 'left', color: 'var(--gold-primary)' }}>Spending Trend</h4>
        {trendChartData.length === 0 ? (
          <p className="text-muted" style={{ padding: '40px 0' }}>No transaction history for this period.</p>
        ) : (
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendChartData}>
                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={10} tickFormatter={(v) => `${v}`} tickLine={false} width={30} />
                <Tooltip {...customTooltipStyle} formatter={(value) => [`${value} ETB`, 'Spent']} />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="url(#goldGradientLine)"
                  strokeWidth={3}
                  dot={{ r: 2, fill: 'var(--gold-primary)' }}
                  activeDot={{ r: 6, stroke: 'var(--bg-main)', strokeWidth: 2 }}
                />
                <defs>
                  <linearGradient id="goldGradientLine" x1="0" y1="0" x2="1" y2="0">
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

      {/* Grid of Pie Chart and Weekly Bars */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginBottom: '20px' }}>
        {/* Pie Chart Card (Breakdown) */}
        <div className="glass-card" style={{ margin: '0' }}>
          <h4 style={{ fontSize: '16px', marginBottom: '8px', textAlign: 'left', color: 'var(--gold-primary)' }}>Category Breakdown</h4>
          <span className="text-muted" style={{ fontSize: '11px', display: 'block', textAlign: 'left', marginBottom: '12px' }}>
            {selectedCategoryFilter ? `Filtering by ${selectedCategoryFilter.toUpperCase()} (Tap again to clear)` : 'Tap segments to filter preview table'}
          </span>
          {pieChartData.length === 0 ? (
            <p className="text-muted" style={{ padding: '40px 0' }}>No categories logged.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '100%', height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                      onClick={handlePieSliceClick}
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={GOLD_PALETTE[index % GOLD_PALETTE.length]} 
                          style={{
                            cursor: 'pointer',
                            opacity: selectedCategoryFilter === entry.name.toLowerCase() || !selectedCategoryFilter ? 1 : 0.35,
                            filter: selectedCategoryFilter === entry.name.toLowerCase() ? 'drop-shadow(0 0 4px var(--gold-primary))' : 'none',
                            transition: 'opacity 0.2s, filter 0.2s'
                          }}
                        />
                      ))}
                    </Pie>
                    <Tooltip {...customTooltipStyle} formatter={(value) => [`${value} ETB`, 'Spent']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '10px' }}>
                {pieChartData.map((entry, index) => (
                  <div 
                    key={entry.name} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px', 
                      fontSize: '10px', 
                      cursor: 'pointer',
                      border: selectedCategoryFilter === entry.name.toLowerCase() ? '1px solid var(--gold-primary)' : '1px solid transparent',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}
                    onClick={() => handlePieSliceClick(entry)}
                  >
                    <span style={{ width: '8px', height: '8px', backgroundColor: GOLD_PALETTE[index % GOLD_PALETTE.length], borderRadius: '50%' }}></span>
                    <span style={{ textTransform: 'capitalize', fontWeight: selectedCategoryFilter === entry.name.toLowerCase() ? 'bold' : 'normal' }}>{entry.name.toLowerCase()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Weekly Bar Chart Card */}
        <div className="glass-card" style={{ margin: '0' }}>
          <h4 style={{ fontSize: '16px', marginBottom: '16px', textAlign: 'left', color: 'var(--gold-primary)' }}>Weekly Comparison</h4>
          <div style={{ width: '100%', height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData}>
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} width={30} />
                <Tooltip {...customTooltipStyle} formatter={(value) => [`${value} ETB`, 'Spent']} />
                <Bar dataKey="amount" fill="#D4AF37" radius={[4, 4, 0, 0]}>
                  {barChartData.map((_entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={index === barChartData.length - 1 ? 'url(#activeGoldGrad)' : 'rgba(212, 175, 55, 0.3)'} 
                    />
                  ))}
                </Bar>
                <defs>
                  <linearGradient id="activeGoldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F3E5AB" />
                    <stop offset="100%" stopColor="#AA7C11" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Filtered preview table */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h4 style={{ fontSize: '15px', color: 'var(--gold-primary)', textTransform: 'capitalize' }}>
            {selectedCategoryFilter ? `${selectedCategoryFilter} Expenses` : 'Recent Transactions'}
          </h4>
          {selectedCategoryFilter && (
            <button 
              onClick={() => setSelectedCategoryFilter(null)} 
              style={{ background: 'none', border: 'none', color: 'var(--gold-primary)', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Clear Filter
            </button>
          )}
        </div>
        {previewExpenses.length === 0 ? (
          <p className="text-muted" style={{ padding: '20px 0' }}>No transactions recorded in this range.</p>
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
                {previewExpenses.map((exp) => (
                  <tr key={exp.id}>
                    <td>{new Date(exp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                    <td style={{ textTransform: 'capitalize' }}>
                      {categoryMap.get(exp.category_id || '') || 'uncategorized'}
                    </td>
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
