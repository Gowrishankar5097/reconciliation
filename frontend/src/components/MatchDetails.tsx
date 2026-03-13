import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, CheckCircle2, Download, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import DataTable from './DataTable';
import { getResults, getReportUrl } from '../api';
import type { FullResults } from '../types';

const MATCH_COLS = [
  'Match_Type',
  'A_Date', 'B_Date', 'Date_Difference_Days',
  'A_Description', 'B_Description',
  'A_Voucher', 'B_Voucher',
  'A_Debit', 'B_Credit',
  'A_Credit', 'B_Debit',
  'Amount_Difference', 'Matching_Layer',
];

const fmt = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Props {
  companyNameA: string;
  companyNameB: string;
}

export default function MatchDetails({ companyNameA, companyNameB }: Props) {
  const [results, setResults] = useState<FullResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [summaryOpen, setSummaryOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    getResults()
      .then(setResults)
      .catch((e) => setError(e?.response?.data?.detail || e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Center><Loader2 size={32} className="animate-spin text-navy-500" /></Center>;
  if (error) return <Center><AlertCircle size={24} className="text-red-500" /><span className="text-red-600 ml-2">{error}</span></Center>;
  if (!results) return null;

  const matchTypes = ['All', ...Array.from(new Set(results.matched.map((m) => m.Match_Type)))];
  const filtered = typeFilter === 'All'
    ? results.matched
    : results.matched.filter((m) => m.Match_Type === typeFilter);

  // Calculate matched totals
  const matchedDebitA = results.matched.reduce((sum, m) => sum + (m.A_Debit || 0), 0);
  const matchedCreditA = results.matched.reduce((sum, m) => sum + (m.A_Credit || 0), 0);
  const matchedDebitB = results.matched.reduce((sum, m) => sum + (m.B_Debit || 0), 0);
  const matchedCreditB = results.matched.reduce((sum, m) => sum + (m.B_Credit || 0), 0);
  const matchedNetA = Math.abs(matchedDebitA - matchedCreditA);
  const matchedNetB = Math.abs(matchedDebitB - matchedCreditB);
  const matchedDifference = Math.abs(matchedNetA - matchedNetB);

  return (
    <div className="w-full py-4 px-6 flex flex-col h-full min-h-0 animate-fadeIn">
      {/* Header Row - Modern */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg">
            <CheckCircle2 size={20} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800 text-lg">Matched Transactions</h2>
            <p className="text-xs text-slate-500">{results.matched.length} pairs successfully reconciled</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Filter chips */}
          {matchTypes.map((t) => {
            const count = t === 'All' ? results.matched.length : results.matched.filter((m) => m.Match_Type === t).length;
            const isActive = typeFilter === t;
            return (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm ${
                  isActive 
                    ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-emerald-200' 
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                {t} ({count})
              </button>
            );
          })}
          <a
            href={getReportUrl()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-lg text-xs font-semibold hover:from-slate-800 hover:to-slate-900 shadow-lg transition-all"
          >
            <Download size={14} /> Export
          </a>
        </div>
      </div>

      {/* Accordion Summary - Modern */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-3 shrink-0 overflow-hidden">
        <button
          onClick={() => setSummaryOpen(!summaryOpen)}
          className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-emerald-500" />
            <span>Summary: Total Closing Difference Amount</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${matchedDifference === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              ₹{fmt(matchedDifference)}
            </span>
          </div>
          {summaryOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {summaryOpen && (
          <div className="border-t border-slate-100 p-5">
            {/* Balance Summary Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</th>
                    <th className="py-3 px-4 text-right text-xs font-semibold text-blue-600 uppercase tracking-wide">{companyNameA}</th>
                    <th className="py-3 px-4 text-right text-xs font-semibold text-indigo-600 uppercase tracking-wide">{companyNameB}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-slate-600">Transaction Count</td>
                    <td className="py-3 px-4 text-right text-slate-700 font-medium">{results.matched.length} txns</td>
                    <td className="py-3 px-4 text-right text-slate-700 font-medium">{results.matched.length} txns</td>
                  </tr>
                  <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-slate-600">Total Debit</td>
                    <td className="py-3 px-4 text-right text-slate-700 font-medium">{fmt(matchedDebitA)}</td>
                    <td className="py-3 px-4 text-right text-slate-700 font-medium">{fmt(matchedDebitB)}</td>
                  </tr>
                  <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-slate-600">Total Credit</td>
                    <td className="py-3 px-4 text-right text-slate-700 font-medium">{fmt(matchedCreditA)}</td>
                    <td className="py-3 px-4 text-right text-slate-700 font-medium">{fmt(matchedCreditB)}</td>
                  </tr>
                  <tr className="bg-gradient-to-r from-red-50 to-rose-50">
                    <td className="py-3 px-4 font-semibold text-red-700">Closing Balance</td>
                    <td className="py-3 px-4 text-right font-bold text-red-700 text-lg">{fmt(matchedNetA)}</td>
                    <td className="py-3 px-4 text-right font-bold text-red-700 text-lg">{fmt(matchedNetB)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Closing Balance Difference */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4">
              <p className="text-slate-600 text-sm mb-2">Closing Balance Difference</p>
              <p className="text-slate-500 text-sm">({companyNameA}) - ({companyNameB})</p>
              <p className="text-slate-500 text-sm mb-3">{fmt(matchedNetA)} - {fmt(matchedNetB)}</p>
              <div className="flex items-center justify-between pt-3 border-t border-blue-200">
                <span className="font-semibold text-blue-700">Total Closing Difference Amount</span>
                <span className="font-bold text-2xl text-emerald-600">₹{fmt(matchedDifference)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Data Table - Takes remaining space */}
      <div className="flex-1 min-h-0 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <DataTable
          data={filtered as unknown as Record<string, unknown>[]}
          columns={MATCH_COLS}
          keyPrefix="match"
        />
      </div>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-center py-20">{children}</div>;
}
