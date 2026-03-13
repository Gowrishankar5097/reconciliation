import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, CheckCircle2, AlertTriangle, TrendingUp, PieChart } from 'lucide-react';
import { getResults } from '../api';
import type { FullResults } from '../types';

interface Props {
  companyNameA: string;
  companyNameB: string;
}

export default function ResultsDashboard({ companyNameA, companyNameB }: Props) {
  const [results, setResults] = useState<FullResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const bs = results.balance_summary;
  if (!bs) return <Center><span className="text-gray-500">No balance data available</span></Center>;

  const ob = bs.opening_balance;
  const fmt = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Closing balance = Total Debit - Total Credit (net position), always positive
  const closingA = Math.abs(ob.a_debit - ob.a_credit);
  const closingB = Math.abs(ob.b_debit - ob.b_credit);
  const closingDiff = Math.abs(closingA - closingB);

  // Matched transactions totals
  const matchedDebitA = results.matched.reduce((sum, m) => sum + (m.A_Debit || 0), 0);
  const matchedCreditA = results.matched.reduce((sum, m) => sum + (m.A_Credit || 0), 0);
  const matchedDebitB = results.matched.reduce((sum, m) => sum + (m.B_Debit || 0), 0);
  const matchedCreditB = results.matched.reduce((sum, m) => sum + (m.B_Credit || 0), 0);
  const matchedNetA = Math.abs(matchedDebitA - matchedCreditA);
  const matchedNetB = Math.abs(matchedDebitB - matchedCreditB);
  const matchedDiff = Math.abs(matchedNetA - matchedNetB);

  // Exception totals
  const excA = results.exceptions.filter(e => e.Company === 'A');
  const excB = results.exceptions.filter(e => e.Company === 'B');
  const totalExcA = Math.abs(excA.reduce((sum, e) => sum + (e.Debit - e.Credit), 0));
  const totalExcB = Math.abs(excB.reduce((sum, e) => sum + (e.Debit - e.Credit), 0));
  const exceptionDiff = Math.abs(totalExcA - totalExcB);

  // Check if closing balance diff matches exception diff
  const differencesMatch = Math.abs(closingDiff - exceptionDiff) < 0.01;

  // Chart data calculations
  const totalTransactions = ob.a_count + ob.b_count;
  const matchedCount = results.matched.length * 2;
  const exceptionCount = excA.length + excB.length;
  const matchRate = totalTransactions > 0 ? (matchedCount / totalTransactions) * 100 : 0;

  return (
    <div className="w-full h-full overflow-auto animate-fadeIn py-6 px-6 bg-slate-50">
      <div className="max-w-5xl mx-auto">
        {/* Balance Summary Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-4">
          <div className="bg-slate-700 px-5 py-3">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
              <TrendingUp size={16} /> Balance Summary
            </h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="py-3 px-5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</th>
                <th className="py-3 px-5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">{companyNameA}</th>
                <th className="py-3 px-5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">{companyNameB}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="py-3 px-5 text-slate-600">Transaction Count</td>
                <td className="py-3 px-5 text-right text-slate-700 font-medium">{ob.a_count} txns</td>
                <td className="py-3 px-5 text-right text-slate-700 font-medium">{ob.b_count} txns</td>
              </tr>
              <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="py-3 px-5 text-slate-600">Total Debit</td>
                <td className="py-3 px-5 text-right text-slate-700 font-medium">{fmt(ob.a_debit)}</td>
                <td className="py-3 px-5 text-right text-slate-700 font-medium">{fmt(ob.b_debit)}</td>
              </tr>
              <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="py-3 px-5 text-slate-600">Total Credit</td>
                <td className="py-3 px-5 text-right text-slate-700 font-medium">{fmt(ob.a_credit)}</td>
                <td className="py-3 px-5 text-right text-slate-700 font-medium">{fmt(ob.b_credit)}</td>
              </tr>
              <tr className="bg-slate-100">
                <td className="py-3 px-5 font-semibold text-slate-800">Closing Balance</td>
                <td className="py-3 px-5 text-right font-bold text-slate-800 text-lg">{fmt(closingA)}</td>
                <td className="py-3 px-5 text-right font-bold text-slate-800 text-lg">{fmt(closingB)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Closing Balance Difference */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-4">
          <div className="bg-slate-700 px-5 py-3">
            <h3 className="text-white font-semibold text-sm">Closing Balance Difference</h3>
          </div>
          <div className="p-5">
            <div className="flex items-center justify-between mb-3 text-sm">
              <span className="text-slate-500">({companyNameA}) - ({companyNameB})</span>
              <span className="text-slate-500">{fmt(closingA)} - {fmt(closingB)}</span>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <span className="font-semibold text-slate-700">Total Closing Balance Difference</span>
              <span className={`font-bold text-2xl ${closingDiff === 0 ? 'text-green-600' : 'text-slate-800'}`}>₹{fmt(closingDiff)}</span>
            </div>
          </div>
        </div>

        {/* Difference Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-4">
          <div className="bg-slate-700 px-5 py-3">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
              <PieChart size={16} /> Difference Breakdown
            </h3>
          </div>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="py-3 px-5 text-slate-600">Difference Found in Matched Transactions</td>
                <td className="py-3 px-5 text-right font-semibold text-green-600">₹{fmt(matchedDiff)}</td>
              </tr>
              <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="py-3 px-5 text-slate-600">Missing in Exceptions ({excA.length + excB.length} records)</td>
                <td className="py-3 px-5 text-right font-semibold text-orange-600">₹{fmt(exceptionDiff)}</td>
              </tr>
              <tr className="bg-slate-100">
                <td className="py-3 px-5 font-semibold text-slate-800">Total Closing Balance Difference</td>
                <td className="py-3 px-5 text-right font-bold text-slate-800">₹{fmt(closingDiff)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Reconciliation Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-4">
          <div className="bg-slate-700 px-5 py-3">
            <h3 className="text-white font-semibold text-sm">Reconciliation Summary</h3>
          </div>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="py-3 px-5 text-slate-600">Matched Transactions</td>
                <td className="py-3 px-5 text-right text-green-600 font-semibold">{results.matched.length} pairs</td>
              </tr>
              <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="py-3 px-5 text-slate-600">Exceptions ({companyNameA})</td>
                <td className="py-3 px-5 text-right text-orange-600 font-semibold">{excA.length} items — ₹{fmt(totalExcA)}</td>
              </tr>
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-5 text-slate-600">Exceptions ({companyNameB})</td>
                <td className="py-3 px-5 text-right text-orange-600 font-semibold">{excB.length} items — ₹{fmt(totalExcB)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Verification Status */}
        <div className={`rounded-xl shadow-sm p-4 flex items-center gap-3 mb-5 border ${
          differencesMatch ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
        }`}>
          {differencesMatch ? (
            <>
              <CheckCircle2 size={20} className="text-green-600 shrink-0" />
              <div className="text-green-700">
                <span className="font-semibold">Difference Explained: </span>
                <span>₹{fmt(closingDiff)} accounted for by unmatched transactions</span>
              </div>
            </>
          ) : (
            <>
              <AlertTriangle size={20} className="text-orange-600 shrink-0" />
              <div className="text-orange-700">
                <span className="font-semibold">Mismatch: </span>
                <span>Balance ₹{fmt(closingDiff)} | Exceptions ₹{fmt(exceptionDiff)}</span>
              </div>
            </>
          )}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Match Rate Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h4 className="text-slate-700 font-semibold text-sm mb-4 flex items-center gap-2">
              <PieChart size={16} className="text-slate-500" /> Match Rate
            </h4>
            <div className="flex items-center justify-center">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="64" cy="64" r="56" stroke="#e2e8f0" strokeWidth="12" fill="none" />
                  <circle 
                    cx="64" cy="64" r="56" 
                    stroke="#475569"
                    strokeWidth="12" 
                    fill="none"
                    strokeDasharray={`${matchRate * 3.52} 352`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-2xl font-bold text-slate-800">{matchRate.toFixed(1)}%</span>
                  <span className="text-xs text-slate-500">Matched</span>
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-center">
              <div className="bg-slate-100 rounded-lg p-2">
                <p className="text-lg font-bold text-slate-700">{matchedCount}</p>
                <p className="text-xs text-slate-500">Matched</p>
              </div>
              <div className="bg-slate-100 rounded-lg p-2">
                <p className="text-lg font-bold text-slate-700">{exceptionCount}</p>
                <p className="text-xs text-slate-500">Exceptions</p>
              </div>
            </div>
          </div>

          {/* Balance Comparison Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h4 className="text-slate-700 font-semibold text-sm mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-slate-500" /> Balance Comparison
            </h4>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600 font-medium">{companyNameA}</span>
                  <span className="text-slate-600">₹{fmt(closingA)}</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-slate-600 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((closingA / Math.max(closingA, closingB)) * 100, 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600 font-medium">{companyNameB}</span>
                  <span className="text-slate-600">₹{fmt(closingB)}</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-slate-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((closingB / Math.max(closingA, closingB)) * 100, 100)}%` }}
                  />
                </div>
              </div>
              <div className="pt-3 border-t border-slate-200">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 font-medium">Difference</span>
                  <span className="font-bold text-slate-800">₹{fmt(closingDiff)}</span>
                </div>
              </div>
            </div>
            
            {/* Debit/Credit Breakdown */}
            <div className="mt-5 pt-4 border-t border-slate-200">
              <h5 className="text-xs font-semibold text-slate-500 uppercase mb-3">Debit vs Credit</h5>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-200">
                  <p className="text-xs text-slate-500 mb-1">Total Debit</p>
                  <p className="text-sm font-bold text-slate-700">₹{fmt(ob.a_debit + ob.b_debit)}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-200">
                  <p className="text-xs text-slate-500 mb-1">Total Credit</p>
                  <p className="text-sm font-bold text-slate-700">₹{fmt(ob.a_credit + ob.b_credit)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-center py-20">{children}</div>;
}
