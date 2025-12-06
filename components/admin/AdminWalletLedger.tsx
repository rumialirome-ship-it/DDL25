import React, { useMemo, useState } from 'react';
import { useAppContext } from '../../contexts/AppContext.tsx';
import { Transaction, TransactionType } from '../../types/index.ts';
import StatsCard from '../common/StatsCard.tsx';

const AdminWalletLedger: React.FC = () => {
    const { transactions, clients, currentClient } = useAppContext();
    const [dateFilter, setDateFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 25;

    const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c])), [clients]);

    const getDateRange = (filter: string) => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        switch (filter) {
            case 'today': return { start: today, end: new Date(now.getTime() + 1) };
            case 'last7': const last7 = new Date(today); last7.setDate(today.getDate() - 6); return { start: last7, end: new Date(now.getTime() + 1) };
            case 'last30': const last30 = new Date(today); last30.setDate(today.getDate() - 29); return { start: last30, end: new Date(now.getTime() + 1) };
            default: return null;
        }
    };

    const { paginatedEntries, totalPages, summary, openingBalance, closingBalance } = useMemo(() => {
        const allClientTxs = [...transactions].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        
        const adminMovements = allClientTxs.map(tx => {
            const amount = tx.isReversed ? 0 : tx.amount;
            let movement = 0;
            const client = clientMap.get(tx.clientId);

            if (tx.type === TransactionType.Credit) { // Client Credit is a DEBIT from Admin wallet (e.g., prize, commission, manual deposit)
                movement = -amount;
            } else { // DEBIT: Client Debit is a CREDIT to Admin wallet (e.g., bet, manual withdrawal)
                movement = +amount;
            }

            return { originalTx: tx, movement, client };
        });

        const range = getDateRange(dateFilter);
        
        const totalNetMovement = adminMovements.reduce((sum, m) => sum + m.movement, 0);
        const adminWalletAtStartOfTime = (currentClient?.wallet || 0) - totalNetMovement;

        let periodOpeningBalance = adminWalletAtStartOfTime;
        const movementsInPeriod = [];

        for (const m of adminMovements) {
            const txDate = new Date(m.originalTx.createdAt);
            if (range && txDate >= range.start) {
                movementsInPeriod.push(m);
            } else if (!range) {
                movementsInPeriod.push(m);
            } else {
                periodOpeningBalance += m.movement;
            }
        }
        
        let runningBalance = periodOpeningBalance;
        const ledgerEntriesInPeriod = movementsInPeriod
            .filter(m => !range || new Date(m.originalTx.createdAt) < range.end)
            .map(m => {
                runningBalance += m.movement;
                return {
                    id: m.originalTx.id,
                    createdAt: new Date(m.originalTx.createdAt),
                    description: m.originalTx.description,
                    debit: m.movement < 0 ? -m.movement : 0,
                    credit: m.movement > 0 ? m.movement : 0,
                    balanceAfter: runningBalance,
                    clientInfo: m.client ? `${m.client.username} (${m.client.clientId})` : 'N/A',
                };
            });
        
        const periodClosingBalance = ledgerEntriesInPeriod.length > 0 ? ledgerEntriesInPeriod[ledgerEntriesInPeriod.length - 1].balanceAfter : periodOpeningBalance;

        const totalCredit = ledgerEntriesInPeriod.reduce((sum, entry) => sum + entry.credit, 0);
        const totalDebit = ledgerEntriesInPeriod.reduce((sum, entry) => sum + entry.debit, 0);

        const finalSortedEntries = ledgerEntriesInPeriod.reverse();
        const totalPages = Math.ceil(finalSortedEntries.length / ITEMS_PER_PAGE);
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const paginated = finalSortedEntries.slice(startIndex, startIndex + ITEMS_PER_PAGE);

        return { paginatedEntries: paginated, totalPages, summary: { totalCredit, totalDebit }, openingBalance: periodOpeningBalance, closingBalance: periodClosingBalance, };
    }, [transactions, clients, currentClient, dateFilter, currentPage, clientMap]);

    const formatCurrency = (amount: number) => amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const FilterButton: React.FC<{ filterKey: string; label: string }> = ({ filterKey, label }) => (
        <button onClick={() => { setDateFilter(filterKey); setCurrentPage(1); }}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${dateFilter === filterKey ? 'bg-brand-primary text-brand-bg' : 'bg-brand-surface text-brand-text-secondary hover:bg-brand-secondary'}`}>
            {label}
        </button>
    );

    return (
        <div className="space-y-4">
            <div className="bg-brand-bg p-3 rounded-lg border border-brand-secondary flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-brand-text-secondary mr-2">Period:</span>
                <FilterButton filterKey='all' label='All Time' />
                <FilterButton filterKey='today' label='Today' />
                <FilterButton filterKey='last7' label='Last 7 Days' />
                <FilterButton filterKey='last30' label='Last 30 Days' />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard title="Opening Balance" value={`RS. ${formatCurrency(openingBalance)}`} />
                <StatsCard title="Total Credit (In)" value={`RS. ${formatCurrency(summary.totalCredit)}`} className="text-green-400" />
                <StatsCard title="Total Debit (Out)" value={`RS. ${formatCurrency(summary.totalDebit)}`} className="text-yellow-400" />
                <StatsCard title="Closing Balance" value={`RS. ${formatCurrency(closingBalance)}`} className="text-brand-primary" />
            </div>
            {paginatedEntries.length === 0 ? (
                <div className="text-center py-8 bg-brand-bg rounded-lg"><p className="text-brand-text-secondary">No financial movements found for this period.</p></div>
            ) : (
                <>
                    <div className="overflow-x-auto bg-brand-bg rounded-lg max-h-[60vh]">
                        <table className="min-w-full text-sm text-left text-brand-text-secondary">
                            <thead className="text-xs text-brand-text uppercase bg-brand-secondary/80 sticky top-0">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Date</th>
                                    <th scope="col" className="px-6 py-3">Description</th>
                                    <th scope="col" className="px-6 py-3">Related Client</th>
                                    <th scope="col" className="px-6 py-3 text-right">Debit (Out)</th>
                                    <th scope="col" className="px-6 py-3 text-right">Credit (In)</th>
                                    <th scope="col" className="px-6 py-3 text-right">Admin Balance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-secondary/50">
                                {paginatedEntries.map((entry) => (
                                    <tr key={entry.id} className="hover:bg-brand-secondary/30">
                                        <td className="px-6 py-3 whitespace-nowrap">{entry.createdAt.toLocaleString()}</td>
                                        <td className="px-6 py-3 max-w-xs">{entry.description}</td>
                                        <td className="px-6 py-3 font-medium text-brand-text-secondary whitespace-nowrap">{entry.clientInfo}</td>
                                        <td className="px-6 py-3 text-right font-mono text-yellow-400">{entry.debit > 0 ? formatCurrency(entry.debit) : '-'}</td>
                                        <td className="px-6 py-3 text-right font-mono text-green-400">{entry.credit > 0 ? formatCurrency(entry.credit) : '-'}</td>
                                        <td className="px-6 py-3 text-right font-mono text-brand-text">{formatCurrency(entry.balanceAfter)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && (
                        <div className="flex justify-between items-center pt-2">
                             <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className="bg-brand-secondary text-brand-text font-bold py-2 px-4 rounded-lg disabled:opacity-50"> &larr; Previous </button>
                             <span className="text-brand-text-secondary font-semibold"> Page {currentPage} of {totalPages} </span>
                             <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} className="bg-brand-secondary text-brand-text font-bold py-2 px-4 rounded-lg disabled:opacity-50"> Next &rarr; </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
export default AdminWalletLedger;