import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, AlertTriangle, Download, CheckCircle2, XCircle } from 'lucide-react';
import DataTable from './DataTable';
import { getResults, getReportUrl } from '../api';
import type { FullResults } from '../types';
import BalanceSummaryCard from './BalanceSummaryCard';

const EXC_COLS = [
  'Category', 'Company', 'Transaction_Date', 'Description', 'Voucher',
  'Debit', 'Credit', 'Net_Amount', 'Reference',
];

const fmt = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Props {
  companyNameA: string;
  companyNameB: string;
}

export default function Exceptions({ companyNameA, companyNameB }: Props) {
  const [results, setResults] = useState<FullResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [companyFilter, setCompanyFilter] = useState<'All' | 'A' | 'B'>('All');

  useEffect(() => {
    setLoading(true);
    getResults()
      .then(setResults)
      .catch((e: unknown) => {
        const err = e as { response?: { data?: { detail?: string } }; message?: string };
        setError(err?.response?.data?.detail || err?.message || 'Error');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Center><Loader2 size={32} className="animate-spin text-navy-500" /></Center>;
  if (error) return <Center><AlertCircle size={24} className="text-red-500" /><span className="text-red-600 ml-2">{error}</span></Center>;
  if (!results) return null;

  const categories = ['All', ...Array.from(new Set(results.exceptions.map((e) => e.Category)))];
  
  // Apply both filters
  let filtered = results.exceptions;
  if (catFilter !== 'All') {
    filtered = filtered.filter((e) => e.Category === catFilter);
  }
  if (companyFilter !== 'All') {
    filtered = filtered.filter((e) => e.Company === companyFilter);
  }

  // Calculate summary stats
  const bs = results.balance_summary;
  const balancesMatch = bs && Math.abs(bs.closing_balance.difference) < 0.01;
  const excA = results.exceptions.filter(e => e.Company === 'A');
  const excB = results.exceptions.filter(e => e.Company === 'B');
  const totalExcA = excA.reduce((sum, e) => sum + (e.Debit - e.Credit), 0);
  const totalExcB = excB.reduce((sum, e) => sum + (e.Debit - e.Credit), 0);

  // No exceptions - show success message
  if (results.exceptions.length === 0) {
    return (
      <div className="w-full py-3 px-6 flex flex-col h-full min-h-0 animate-fadeIn">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={40} className="text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">No Exceptions Found</h2>
            <p className="text-gray-500">All transactions have been successfully reconciled!</p>
            {bs && (
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg">
                <CheckCircle2 size={16} />
                Closing Balance Difference: ₹{fmt(bs.closing_balance.difference)}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-3 px-6 flex flex-col h-full min-h-0 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-navy-800 flex items-center gap-2">
            <AlertTriangle size={20} className="text-amber-500" /> Exceptions
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {results.exceptions.length} unmatched transactions requiring attention
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Balance status */}
          {bs && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
              balancesMatch
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {balancesMatch ? (
                <>
                  <CheckCircle2 size={16} />
                  Balances Match Despite Exceptions
                </>
              ) : (
                <>
                  <XCircle size={16} />
                  Balance Variance: ₹{fmt(bs.closing_balance.difference)}
                </>
              )}
            </div>
          )}
          <a
            href={getReportUrl()}
            className="flex items-center gap-2 px-3 py-1.5 bg-navy-800 text-white rounded-lg text-sm font-medium hover:bg-navy-700 transition-colors"
          >
            <Download size={14} /> Export
          </a>
        </div>
      </div>

      {/* Balance Summary */}
      {results.balance_summary && (
        <div className="shrink-0">
          <BalanceSummaryCard data={results.balance_summary} view="exceptions" />
        </div>
      )}

      {/* Exception Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 shrink-0">
        {/* Company A Exceptions */}
        <button
          onClick={() => setCompanyFilter(companyFilter === 'A' ? 'All' : 'A')}
          className={`p-4 rounded-xl border transition-all text-left ${
            companyFilter === 'A'
              ? 'bg-blue-50 border-blue-300 shadow-sm'
              : 'bg-white border-gray-200 hover:border-blue-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-blue-600 uppercase">{companyNameA}</span>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              {excA.length} items
            </span>
          </div>
          <p className="text-lg font-bold text-gray-800">₹{fmt(Math.abs(totalExcA))}</p>
          <p className="text-xs text-gray-500">Missing in {companyNameB}</p>
        </button>

        {/* Company B Exceptions */}
        <button
          onClick={() => setCompanyFilter(companyFilter === 'B' ? 'All' : 'B')}
          className={`p-4 rounded-xl border transition-all text-left ${
            companyFilter === 'B'
              ? 'bg-indigo-50 border-indigo-300 shadow-sm'
              : 'bg-white border-gray-200 hover:border-indigo-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-indigo-600 uppercase">{companyNameB}</span>
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
              {excB.length} items
            </span>
          </div>
          <p className="text-lg font-bold text-gray-800">₹{fmt(Math.abs(totalExcB))}</p>
          <p className="text-xs text-gray-500">Missing in {companyNameA}</p>
        </button>

        {/* Net Difference */}
        <div className={`p-4 rounded-xl border ${
          Math.abs(totalExcA + totalExcB) < 0.01
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-semibold uppercase ${
              Math.abs(totalExcA + totalExcB) < 0.01 ? 'text-emerald-600' : 'text-amber-600'
            }`}>Net Exception Difference</span>
          </div>
          <p className={`text-lg font-bold ${
            Math.abs(totalExcA + totalExcB) < 0.01 ? 'text-emerald-700' : 'text-amber-700'
          }`}>
            ₹{fmt(totalExcA + totalExcB)}
          </p>
          <p className="text-xs text-gray-500">
            {Math.abs(totalExcA + totalExcB) < 0.01 
              ? 'Exceptions balance out' 
              : 'Requires investigation'}
          </p>
        </div>
      </div>

      {/* Category filter chips */}
      <div className="flex flex-wrap gap-2 mb-3 shrink-0">
        <span className="text-xs text-gray-500 self-center mr-2">Filter by type:</span>
        {categories.map((c) => {
          const count = results.exceptions.filter((e) => e.Category === c).length;
          return (
            <button
              key={c}
              onClick={() => setCatFilter(c)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all
                ${catFilter === c
                  ? 'bg-amber-600 text-white shadow'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {c}
              {c !== 'All' && <span className="ml-1 opacity-70">({count})</span>}
            </button>
          );
        })}
        
        {(catFilter !== 'All' || companyFilter !== 'All') && (
          <button
            onClick={() => { setCatFilter('All'); setCompanyFilter('All'); }}
            className="px-3 py-1 text-xs text-navy-600 hover:underline"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Active filters */}
      {(catFilter !== 'All' || companyFilter !== 'All') && (
        <div className="flex items-center gap-2 mb-3 shrink-0 text-sm">
          <span className="text-gray-500">Active filters:</span>
          {companyFilter !== 'All' && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
              {companyFilter === 'A' ? companyNameA : companyNameB}
            </span>
          )}
          {catFilter !== 'All' && (
            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded">
              {catFilter}
            </span>
          )}
          <span className="text-gray-400">({filtered.length} results)</span>
        </div>
      )}

      <div className="flex-1 min-h-0">
        <DataTable
          data={filtered as unknown as Record<string, unknown>[]}
          columns={EXC_COLS}
          keyPrefix="exc"
        />
      </div>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-center py-20">{children}</div>;
}
