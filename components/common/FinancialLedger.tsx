import React, { useMemo, useState } from 'react';
import { useAppContext } from '../../contexts/AppContext.tsx';
import { Transaction, TransactionType, Role } from '../../types/index.ts';
import StatsCard from './StatsCard.tsx';

const FinancialLedger: React.FC<{ clientId: string }> = ({ clientId }) => {
    const { transactions, clients, currentClient } = useAppContext();
    const [dateFilter, setDateFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 25;

    const client = useMemo(() => {
        if (currentClient?.role === Role.Client && currentClient.id === clientId) {
            return currentClient;
        }
        return clients.find(c => c.id === clientId);
    }, [clients, clientId, currentClient]);

    const getDateRange = (filter: string) => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        switch (filter) {
            case 'today':
                return { start: today, end: new Date(now.getTime() + 1) };
            case 'last7':
                const last7 = new Date(today);
                last7.setDate(today.getDate() - 6);
                return { start: last7, end: new Date(now.getTime() + 1) };
            case 'last30':
                const last30 = new Date(today);
                last30.setDate(today.getDate() - 29);
                return { start: last30, end: new Date(now.getTime() + 1) };
            default:
                return null; // All time
        }
    };

    const { paginatedTransactions, totalPages, summary, openingBalance, closingBalance } = useMemo(() => {
        // 1. Get all txs for the client, sorted OLDEST to NEWEST for calculation
        const allClientTxs = transactions
            .filter(t => t.clientId === clientId)
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        // 2. Determine date range and opening balance
        const range = getDateRange(dateFilter);
        let periodOpeningBalance = 0;
        let transactionsInPeriod: Transaction[];

        if (range) {
            // Find the last transaction BEFORE the start of the period to get the opening balance
            const lastTxBeforePeriod = [...allClientTxs]
                .reverse()
                .find(tx => new Date(tx.createdAt) < range.start);
            
            periodOpeningBalance = lastTxBeforePeriod ? lastTxBeforePeriod.balanceAfter : 0;
            
            transactionsInPeriod = allClientTxs.filter(tx => {
                const txDate = new Date(tx.createdAt);
                return txDate >= range.start && txDate < range.end;
            });
        } else { // 'all' filter
            periodOpeningBalance = 0; // For "All Time", opening balance is always 0
            transactionsInPeriod = allClientTxs;
        }
        
        // 3. Calculate a new, accurate running balance for each transaction in the period
        let runningBalance = periodOpeningBalance;
        const transactionsWithRunningBalance = transactionsInPeriod.map(tx => {
            const amountEffect = tx.isReversed ? 0 : tx.amount;
            if (tx.type === TransactionType.Credit) {
                runningBalance += amountEffect;
            } else { // DEBIT
                runningBalance -= amountEffect;
            }
            return { ...tx, runningBalance }; // Add our calculated running balance
        });
        
        const periodClosingBalance = transactionsWithRunningBalance.length > 0
            ? transactionsWithRunningBalance[transactionsWithRunningBalance.length - 1].runningBalance
            : periodOpeningBalance;

        // 4. Calculate summary totals for the period
        const totalCredit = transactionsInPeriod
            .filter(tx => tx.type === TransactionType.Credit && !tx.isReversed)
            .reduce((sum, tx) => sum + tx.amount, 0);

        const totalDebit = transactionsInPeriod
            .filter(tx => tx.type === TransactionType.Debit && !tx.isReversed)
            .reduce((sum, tx) => sum + tx.amount, 0);

        // 5. Re-sort NEWEST to OLDEST for user-friendly display
        const finalSortedTransactions = transactionsWithRunningBalance.reverse();

        // 6. Paginate the final, display-ready data
        const totalPages = Math.ceil(finalSortedTransactions.length / ITEMS_PER_PAGE);
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const paginated = finalSortedTransactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);

        return {
            paginatedTransactions: paginated,
            totalPages,
            summary: { totalCredit, totalDebit },
            openingBalance: periodOpeningBalance,
            closingBalance: periodClosingBalance,
        };
    }, [transactions, clientId, dateFilter, currentPage]);
    
    if (!client) {
        return <p className="text-brand-text-secondary">Client not found.</p>;
    }

    const formatCurrency = (amount: number) => amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const filterOptions = [
        { key: 'all', label: 'All Time' },
        { key: 'today', label: 'Today' },
        { key: 'last7', label: 'Last 7 Days' },
        { key: 'last30', label: 'Last 30 Days' },
    ];
    
    const FilterButton: React.FC<{ filterKey: string; label: string }> = ({ filterKey, label }) => (
        <button
            onClick={() => { setDateFilter(filterKey); setCurrentPage(1); }}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                dateFilter === filterKey
                    ? 'bg-brand-primary text-brand-bg'
                    : 'bg-brand-surface text-brand-text-secondary hover:bg-brand-secondary'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="space-y-4">
             <div className="flex flex-col md:flex-row gap-4">
                <div className="bg-brand-bg p-3 rounded-lg border border-brand-secondary flex flex-wrap items-center gap-2 flex-grow">
                    <span className="text-sm font-bold text-brand-text-secondary mr-2">Period:</span>
                    {filterOptions.map(opt => <FilterButton key={opt.key} filterKey={opt.key} label={opt.label} />)}
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard title="Opening Balance" value={`RS. ${formatCurrency(openingBalance)}`} />
                <StatsCard title="Total Credit" value={`RS. ${formatCurrency(summary.totalCredit)}`} className="text-green-400" />
                <StatsCard title="Total Debit" value={`RS. ${formatCurrency(summary.totalDebit)}`} className="text-yellow-400" />
                <StatsCard title="Closing Balance" value={`RS. ${formatCurrency(closingBalance)}`} className="text-brand-primary" />
            </div>

            {paginatedTransactions.length === 0 ? (
                <div className="text-center py-8 bg-brand-bg rounded-lg">
                    <p className="text-brand-text-secondary">No financial history found for the selected period.</p>
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto bg-brand-bg rounded-lg max-h-[60vh]">
                        <table className="min-w-full text-sm text-left text-brand-text-secondary">
                            <thead className="text-xs text-brand-text uppercase bg-brand-secondary/80 sticky top-0">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Date</th>
                                    <th scope="col" className="px-6 py-3">Description</th>
                                    <th scope="col" className="px-6 py-3 text-right">Debit</th>
                                    <th scope="col" className="px-6 py-3 text-right">Credit</th>
                                    <th scope="col" className="px-6 py-3 text-right">Balance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-secondary/50">
                                {paginatedTransactions.map((tx) => (
                                    <tr key={tx.id} className={`hover:bg-brand-secondary/30 ${tx.isReversed ? 'opacity-50' : ''}`}>
                                        <td className="px-6 py-3 whitespace-nowrap">{new Date(tx.createdAt).toLocaleString()}</td>
                                        <td className="px-6 py-3 max-w-xs">{tx.description} {tx.isReversed && <span className="ml-2 text-xs font-bold text-red-400 bg-red-900/50 px-2 py-0.5 rounded-full">REVERSED</span>}</td>
                                        <td className={`px-6 py-3 text-right font-mono text-yellow-400 ${tx.isReversed ? 'line-through' : ''}`}>
                                            {tx.type === TransactionType.Debit ? `${formatCurrency(tx.amount)}` : '-'}
                                        </td>
                                        <td className={`px-6 py-3 text-right font-mono text-green-400 ${tx.isReversed ? 'line-through' : ''}`}>
                                            {tx.type === TransactionType.Credit ? `${formatCurrency(tx.amount)}` : '-'}
                                        </td>
                                        <td className="px-6 py-3 text-right font-mono text-brand-text">{formatCurrency(tx.runningBalance)}</td>
                                    </tr>
                                ))}
                            </tbody>
                             <tfoot className="bg-brand-secondary/80 font-bold text-brand-text">
                                <tr>
                                    <td className="px-6 py-3 text-right" colSpan={2}>Period Totals</td>
                                    <td className="px-6 py-3 text-right font-mono text-yellow-400">{formatCurrency(summary.totalDebit)}</td>
                                    <td className="px-6 py-3 text-right font-mono text-green-400">{formatCurrency(summary.totalCredit)}</td>
                                    <td className="px-6 py-3 text-right font-mono"></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex justify-between items-center pt-2">
                            <button
                                onClick={() => setCurrentPage(p => p - 1)}
                                disabled={currentPage === 1}
                                className="bg-brand-secondary hover:bg-opacity-80 text-brand-text font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                &larr; Previous
                            </button>
                            <span className="text-brand-text-secondary font-semibold">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => p + 1)}
                                disabled={currentPage === totalPages}
                                className="bg-brand-secondary hover:bg-opacity-80 text-brand-text font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next &rarr;
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default FinancialLedger;
