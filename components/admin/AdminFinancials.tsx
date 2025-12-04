import React, { useMemo, useState } from 'react';
import { useAppContext } from '../../contexts/AppContext.tsx';
import { Transaction, TransactionType } from '../../types';
import * as StatsCardModule from '../common/StatsCard.tsx';
const StatsCard = StatsCardModule.default;

const AdminFinancials = () => {
    const { transactions, clients } = useAppContext();
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 25;

    const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c])), [clients]);

    const financialSummary = useMemo(() => {
        let totalDeposits = 0; // Manual credits
        let totalWithdrawals = 0; // Manual debits
        let totalStakes = 0; // Bet-related debits
        let totalWinnings = 0; // Prize credits

        transactions.forEach(tx => {
            if (tx.type === TransactionType.Credit) {
                if (tx.description.toLowerCase().includes('prize') || tx.description.toLowerCase().includes('win on')) {
                    totalWinnings += tx.amount;
                } else if (!tx.description.toLowerCase().includes('commission')) {
                    totalDeposits += tx.amount;
                }
            } else if (tx.type === TransactionType.Debit) {
                 if (tx.description.toLowerCase().includes('booking')) {
                    totalStakes += tx.amount;
                } else {
                    totalWithdrawals += tx.amount;
                }
            }
        });

        return {
            totalDeposits,
            totalWithdrawals,
            totalStakes,
            totalWinnings,
            netFlow: (totalDeposits + totalStakes) - (totalWithdrawals + totalWinnings),
        };
    }, [transactions]);
    
    const paginatedTransactions = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return transactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [transactions, currentPage]);

    const totalPages = Math.ceil(transactions.length / ITEMS_PER_PAGE);
    
    const formatCurrency = (amount: number) => `RS. ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-brand-text">Site-Wide Financials</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard title="Total Stakes (Client Debits)" value={formatCurrency(financialSummary.totalStakes)} className="text-green-400" />
                <StatsCard title="Total Winnings (Client Credits)" value={formatCurrency(financialSummary.totalWinnings)} className="text-yellow-400" />
                <StatsCard title="Manual Deposits" value={formatCurrency(financialSummary.totalDeposits)} />
                <StatsCard title="Manual Withdrawals" value={formatCurrency(financialSummary.totalWithdrawals)} />
            </div>

            <div className="bg-brand-surface rounded-lg shadow">
                <div className="overflow-x-auto max-h-[60vh] relative">
                     <table className="min-w-full text-sm text-left text-brand-text-secondary">
                        <thead className="text-xs text-brand-text uppercase bg-brand-secondary/80 sticky top-0">
                            <tr>
                                <th scope="col" className="px-6 py-3">Date</th>
                                <th scope="col" className="px-6 py-3">Client</th>
                                <th scope="col" className="px-6 py-3">Description</th>
                                <th scope="col" className="px-6 py-3 text-right">Debit</th>
                                <th scope="col" className="px-6 py-3 text-right">Credit</th>
                                <th scope="col" className="px-6 py-3 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-secondary/50">
                            {paginatedTransactions.map(tx => {
                                 const client = clientMap.get(tx.clientId);
                                 return (
                                    <tr key={tx.id} className="hover:bg-brand-secondary/30">
                                        <td className="px-6 py-3 whitespace-nowrap">{new Date(tx.createdAt).toLocaleString()}</td>
                                        <td className="px-6 py-3 font-medium text-brand-text">{client ? `${client.username} (${client.clientId})` : 'N/A'}</td>
                                        <td className="px-6 py-3">{tx.description}</td>
                                        <td className="px-6 py-3 text-right font-mono text-yellow-400">
                                            {tx.type === TransactionType.Debit ? formatCurrency(tx.amount) : '-'}
                                        </td>
                                        <td className="px-6 py-3 text-right font-mono text-green-400">
                                            {tx.type === TransactionType.Credit ? formatCurrency(tx.amount) : '-'}
                                        </td>
                                        <td className="px-6 py-3 text-right font-mono text-brand-text">{formatCurrency(tx.balanceAfter)}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                     </table>
                </div>
                 {transactions.length === 0 && <div className="text-center py-4"><p className="text-brand-text-secondary">No transactions found.</p></div>}
            </div>

            {totalPages > 1 && (
                <div className="flex justify-between items-center pt-2">
                    <button 
                        onClick={() => handlePageChange(currentPage - 1)} 
                        disabled={currentPage === 1}
                        className="bg-brand-secondary hover:bg-opacity-80 text-brand-text font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        &larr; Previous
                    </button>
                    <span className="text-brand-text-secondary font-semibold">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button 
                        onClick={() => handlePageChange(currentPage + 1)} 
                        disabled={currentPage === totalPages}
                        className="bg-brand-secondary hover:bg-opacity-80 text-brand-text font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Next &rarr;
                    </button>
                </div>
            )}
        </div>
    );
};

export default AdminFinancials;