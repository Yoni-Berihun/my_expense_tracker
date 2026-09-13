import React, { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import { toEthiopian } from '../utils/ethiopianCalendar';
import { getLocalDateStr } from '../utils/dateHelpers';

interface DayData {
  dateStr: string;
  totalAmount: number;
  isZeroSpend: boolean; // logged but zero amount
  isTracked: boolean;   // any record exists for this day
}

export const ConsistencyHeatmap: React.FC = () => {
  // Pull all non-deleted expenses from Dexie — already local, 0 Supabase calls
  const allExpenses = useLiveQuery(() =>
    db.expenses.where('is_deleted').equals(0).toArray()
  );

  // Build a lookup map: dateStr → { total, hasZero }
  const dayMap = useMemo(() => {
    const map = new Map<string, { total: number; hasZero: boolean }>();
    for (const exp of allExpenses ?? []) {
      const d = getLocalDateStr(new Date(exp.date));
      const existing = map.get(d) ?? { total: 0, hasZero: false };
      map.set(d, {
        total: existing.total + exp.amount,
        hasZero: existing.hasZero || exp.amount === 0
      });
    }
    return map;
  }, [allExpenses]);

  // Build 371-day grid (53 weeks × 7 days) ending today
  const days = useMemo((): DayData[] => {
    const today = new Date();
    // Start from exactly 52 weeks ago (Monday of that week for alignment)
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 364);

    const result: DayData[] = [];
    for (let i = 0; i <= 364; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const dateStr = getLocalDateStr(d);
      const record = dayMap.get(dateStr);
      result.push({
        dateStr,
        totalAmount: record?.total ?? 0,
        isZeroSpend: record !== undefined && record.total === 0 && record.hasZero,
        isTracked: record !== undefined
      });
    }
    return result;
  }, [dayMap]);

  // Compute max for relative intensity scaling
  const maxAmount = useMemo(() => {
    return Math.max(...days.map(d => d.totalAmount), 1);
  }, [days]);

  const getCellColor = (day: DayData): string => {
    if (!day.isTracked) return 'rgba(255,255,255,0.04)'; // untracked
    if (day.isZeroSpend) return 'rgba(16, 185, 129, 0.7)';  // green — zero spend
    const intensity = Math.min(day.totalAmount / maxAmount, 1);
    // Scale from dim gold → bright gold
    const alpha = 0.15 + intensity * 0.75;
    return `rgba(212, 175, 55, ${alpha.toFixed(2)})`;
  };

  // Group into 53 columns (weeks)
  const weeks = useMemo(() => {
    const w: DayData[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      w.push(days.slice(i, Math.min(i + 7, days.length)));
    }
    return w;
  }, [days]);

  const monthLabels = useMemo(() => {
    const labels: { label: string; col: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, colIdx) => {
      const et = toEthiopian(new Date(week[0].dateStr + 'T12:00:00'));
      if (et.month !== lastMonth) {
        labels.push({
          label: et.monthName.slice(0, 3), // e.g. "Mes", "Tik"
          col: colIdx
        });
        lastMonth = et.month;
      }
    });
    return labels;
  }, [weeks]);

  const todayStr = getLocalDateStr(new Date());

  return (
    <div className="glass-card" style={{ padding: '20px', overflowX: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '14px' }}>
        <h4 style={{ fontSize: '16px', color: 'var(--gold-primary)', margin: 0 }}>
          Consistency Heatmap
        </h4>
        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '10px', color: 'var(--text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(16, 185, 129, 0.7)', display: 'inline-block' }} />
            Zero spend
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(212,175,55,0.7)', display: 'inline-block' }} />
            Spent
          </span>
        </div>
      </div>

      {/* Month row labels */}
      <div style={{ display: 'flex', paddingLeft: '18px', marginBottom: '4px', position: 'relative', minWidth: `${weeks.length * 13}px` }}>
        {monthLabels.map(({ label, col }) => (
          <span
            key={`${label}-${col}`}
            style={{
              position: 'absolute',
              left: `${col * 13 + 18}px`,
              fontSize: '9px',
              color: 'var(--text-muted)'
            }}
          >
            {label}
          </span>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: 'flex', gap: '3px', minWidth: `${weeks.length * 13}px` }}>
        {/* Day-of-week labels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', justifyContent: 'space-around', marginRight: '2px' }}>
          {['S','M','T','W','T','F','S'].map((d, i) => (
            <span key={i} style={{ fontSize: '8px', color: 'var(--text-muted)', height: '10px', lineHeight: '10px' }}>{d}</span>
          ))}
        </div>

        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {week.map((day) => {
              const et = toEthiopian(new Date(day.dateStr + 'T12:00:00'));
              const displayDate = `${et.monthName} ${et.day}, ${et.year} ET`;
              return (
                <div
                  key={day.dateStr}
                  title={`${displayDate}: ${day.isZeroSpend ? 'Zero Spend ✦' : day.isTracked ? `${day.totalAmount.toFixed(0)} ETB` : 'No data'}`}
                  style={{
                    width: 10, height: 10,
                    borderRadius: 2,
                    background: getCellColor(day),
                    border: day.dateStr === todayStr ? '1px solid var(--gold-primary)' : '1px solid transparent',
                    transition: 'transform 0.1s',
                    cursor: day.isTracked ? 'pointer' : 'default',
                  }}
                  onMouseOver={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.5)'; }}
                  onMouseOut={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'; }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
