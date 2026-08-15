import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import { FileDown, Calendar, Tag, Trash2, Pencil, X, Check } from 'lucide-react';
import type { LocalExpense } from '../services/db';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: {
    startY?: number;
    head: string[][];
    body: (string | number)[][];
    headStyles?: Record<string, unknown>;
    alternateRowStyles?: Record<string, unknown>;
    styles?: Record<string, unknown>;
  }) => void;
  lastAutoTable: {
    finalY: number;
  };
}

const getNowTimestamp = () => Date.now();

// Returns YYYY-MM-DD in the user's LOCAL timezone (avoids UTC day-shift)
const getLocalDateStr = (d: Date = new Date()): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const ReportsScreen: React.FC = () => {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | 'week' | 'month' | 'last30' | 'custom'>('all');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  // Inline edit modal state
  const [editing, setEditing] = useState<LocalExpense | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [editNote, setEditNote] = useState<string>('');

  // Fetch local data
  const rawExpenses = useLiveQuery(() => db.expenses.where('is_deleted').equals(0).toArray());
  const rawCategories = useLiveQuery(() => db.categories.where('is_deleted').equals(0).toArray());

  // ID to name mapper
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    const categories = rawCategories || [];
    categories.forEach(c => map.set(c.id, c.name));
    return map;
  }, [rawCategories]);

  // Apply filters
  const filteredExpenses = useMemo(() => {
    const expenses = rawExpenses || [];
    let list = [...expenses];

    // Category Filter
    if (categoryFilter !== 'all') {
      list = list.filter(e => e.category_id === categoryFilter);
    }

    // Date Range Filter
    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (dateRangeFilter === 'week') {
      startDate = new Date();
      startDate.setDate(now.getDate() - 7);
    } else if (dateRangeFilter === 'last30') {
      startDate = new Date();
      startDate.setDate(now.getDate() - 30);
    } else if (dateRangeFilter === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (dateRangeFilter === 'custom') {
      if (customStart) startDate = new Date(customStart);
      if (customEnd) {
        endDate = new Date(customEnd);
        endDate.setHours(23, 59, 59, 999); // End of the day
      }
    }

    if (startDate) {
      list = list.filter(e => new Date(e.date) >= startDate!);
    }
    if (endDate) {
      list = list.filter(e => new Date(e.date) <= endDate!);
    }

    // Sort by date descending
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [rawExpenses, categoryFilter, dateRangeFilter, customStart, customEnd]);

  // Calculate stats for filtered results
  const totalAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  // Open the edit modal, prefilling fields from the selected expense
  const handleOpenEdit = (exp: LocalExpense) => {
    setEditing(exp);
    setEditAmount(String(exp.amount));
    setEditDate(getLocalDateStr(new Date(exp.date)));
    setEditNote(exp.description || '');
  };

  const handleCloseEdit = () => {
    setEditing(null);
    setEditAmount('');
    setEditDate('');
    setEditNote('');
  };

  // Persist edits to amount / date / note. Only these fields change; id,
  // category and created_at are preserved, and synced:0 re-queues the row.
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;

    const parsedAmount = parseFloat(editAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Please enter a valid amount greater than 0.');
      return;
    }

    const [y, m, d] = editDate.split('-').map(Number);
    if (!y || !m || !d) {
      alert('Please select a valid date.');
      return;
    }

    // Keep the original time-of-day so chronological ordering is preserved.
    const orig = new Date(editing.date);
    const newDate = new Date(y, m - 1, d, orig.getHours(), orig.getMinutes(), orig.getSeconds());

    await db.expenses.update(editing.id, {
      amount: parsedAmount,
      date: newDate.toISOString(),
      description: editNote.trim(),
      updated_at: getNowTimestamp(),
      synced: 0
    });

    handleCloseEdit();
  };

  // Soft delete handler
  const handleDeleteExpense = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      await db.expenses.update(id, {
        is_deleted: 1,
        updated_at: getNowTimestamp(),
        synced: 0
      });
    }
  };

  // CSV Export Routine
  const handleExportCSV = () => {
    if (filteredExpenses.length === 0) {
      alert('No data available to export.');
      return;
    }

    const headers = ['Date', 'Category', 'Amount (ETB)', 'Description'];
    const rows = filteredExpenses.map(exp => [
      new Date(exp.date).toLocaleDateString(),
      categoryMap.get(exp.category_id || '') || 'Uncategorized',
      exp.amount.toFixed(2),
      exp.description.replace(/"/g, '""') // Escape quotes
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `VIP_Expenses_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PDF Export Routine
  const handleExportPDF = () => {
    if (filteredExpenses.length === 0) {
      alert('No data available to export.');
      return;
    }

    const doc = new jsPDF() as jsPDFWithAutoTable;
    
    // Set VIP Dark Background for Title Header
    doc.setFillColor(10, 10, 10);
    doc.rect(0, 0, 220, 40, 'F');
    
    // Title Text (Gold color)
    doc.setTextColor(212, 175, 55);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('VIP EXPENSE TRACKER REPORT', 14, 25);
    
    // Subtitle (Muted grey)
    doc.setTextColor(160, 160, 160);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()} | Filter: ${dateRangeFilter.toUpperCase()}`, 14, 34);

    // Table Columns
    const tableColumn = ["Date", "Category", "Description", "Amount (ETB)"];
    const tableRows = filteredExpenses.map(exp => [
      new Date(exp.date).toLocaleDateString(),
      categoryMap.get(exp.category_id || '') || 'Uncategorized',
      exp.description || '-',
      `${exp.amount.toFixed(2)}`
    ]);

    // Autotable customization
    doc.autoTable({
      startY: 48,
      head: [tableColumn],
      body: tableRows,
      headStyles: {
        fillColor: [170, 124, 17], // Gold color theme
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [248, 246, 240] // Light luxury beige
      },
      styles: {
        font: 'Helvetica',
        fontSize: 10
      }
    });

    // Add total row at the end
    const finalY = doc.lastAutoTable.finalY + 12;
    doc.setFontSize(12);
    doc.setTextColor(10, 10, 10);
    doc.text(`Total Spending: ${totalAmount.toFixed(2)} ETB`, 14, finalY);

    doc.save(`VIP_Expenses_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Search and filter controls */}
      <div className="glass-card" style={{ padding: '16px', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '18px', color: 'var(--gold-primary)', marginBottom: '16px', textAlign: 'left' }}>Filters</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Category selection */}
          <div className="form-group" style={{ margin: '0' }}>
            <label className="form-label">Category</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: '12px', color: 'var(--gold-primary)' }}><Tag size={16} /></span>
              <select 
                className="form-select" 
                style={{ width: '100%', paddingLeft: '38px' }}
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">All Categories</option>
                {(rawCategories || []).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Date range selection */}
          <div className="form-group" style={{ margin: '0' }}>
            <label className="form-label">Date Range</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: '12px', color: 'var(--gold-primary)' }}><Calendar size={16} /></span>
              <select 
                className="form-select" 
                style={{ width: '100%', paddingLeft: '38px' }}
                value={dateRangeFilter}
                onChange={(e) => setDateRangeFilter(e.target.value as typeof dateRangeFilter)}
              >
                <option value="all">All Time</option>
                <option value="week">Past Week</option>
                <option value="last30">Past 30 Days</option>
                <option value="month">This Month</option>
                <option value="custom">Custom Date Range</option>
              </select>
            </div>
          </div>

          {/* Custom Date Inputs (Conditional) */}
          {dateRangeFilter === 'custom' && (
            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <div className="form-group" style={{ flex: 1, margin: '0' }}>
                <span className="text-muted" style={{ fontSize: '11px' }}>Start Date</span>
                <input 
                  type="date" 
                  className="form-input" 
                  style={{ width: '100%', padding: '8px 12px', fontSize: '14px' }}
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ flex: 1, margin: '0' }}>
                <span className="text-muted" style={{ fontSize: '11px' }}>End Date</span>
                <input 
                  type="date" 
                  className="form-input" 
                  style={{ width: '100%', padding: '8px 12px', fontSize: '14px' }}
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Overview Card */}
      <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <span className="text-muted">Filtered Total</span>
          <h3 style={{ fontSize: '24px', background: 'var(--gold-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginTop: '2px' }}>
            {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
          </h3>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-outline" style={{ padding: '10px 14px', fontSize: '13px' }} onClick={handleExportCSV}>
            CSV
          </button>
          <button className="btn-gold" style={{ padding: '10px 14px', fontSize: '13px' }} onClick={handleExportPDF}>
            <FileDown size={14} /> PDF
          </button>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="glass-card">
        <h4 style={{ fontSize: '16px', color: 'var(--gold-primary)', marginBottom: '14px', textAlign: 'left' }}>Transactions ({filteredExpenses.length})</h4>
        
        {filteredExpenses.length === 0 ? (
          <p className="text-muted" style={{ padding: '40px 0' }}>No transactions found matching the filters.</p>
        ) : (
          <div className="table-container" style={{ maxHeight: '350px', overflowY: 'auto' }}>
            <table className="premium-table">
              <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Note</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ textAlign: 'center', width: '70px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {new Date(exp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td style={{ textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                      {categoryMap.get(exp.category_id || '') || 'uncategorized'}
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      {exp.description || '-'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--gold-light)', whiteSpace: 'nowrap' }}>
                      {exp.amount.toFixed(2)} ETB
                    </td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => handleOpenEdit(exp)}
                        style={{ background: 'none', border: 'none', color: 'var(--gold-primary)', cursor: 'pointer', opacity: 0.8, padding: '4px' }}
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteExpense(exp.id)}
                        style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer', opacity: 0.7, padding: '4px' }}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Expense Modal */}
      <div className={`modal-overlay ${editing ? 'open' : ''}`} onClick={handleCloseEdit}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3 style={{ fontSize: '20px', background: 'var(--gold-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Edit Expense
            </h3>
            <button className="modal-close" onClick={handleCloseEdit}>
              <X size={24} />
            </button>
          </div>

          {editing && (
            <form onSubmit={handleSaveEdit}>
              {/* Amount */}
              <div className="form-group" style={{ textAlign: 'center', marginBottom: '25px' }}>
                <label className="form-label" style={{ textAlign: 'center' }}>Amount (ETB)</label>
                <div style={{ position: 'relative', display: 'inline-block', margin: '0 auto', width: '100%', maxWidth: '240px' }}>
                  <input
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
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Date */}
              <div className="form-group">
                <label className="form-label">Transaction Date</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: '12px', color: 'var(--gold-primary)', pointerEvents: 'none' }}>
                    <Calendar size={16} />
                  </span>
                  <input
                    type="date"
                    className="form-input"
                    style={{ width: '100%', paddingLeft: '38px', colorScheme: 'dark' }}
                    value={editDate}
                    max={getLocalDateStr()}
                    onChange={(e) => { if (e.target.value) setEditDate(e.target.value); }}
                    required
                  />
                </div>
              </div>

              {/* Note */}
              <div className="form-group" style={{ marginBottom: '25px' }}>
                <label className="form-label">Optional Note</label>
                <input
                  type="text"
                  placeholder="e.g. coffee with Sarah"
                  className="form-input"
                  style={{ width: '100%' }}
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                />
              </div>

              <button type="submit" className="btn-gold" style={{ width: '100%', borderRadius: '8px' }}>
                <Check size={18} /> Save Changes
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
