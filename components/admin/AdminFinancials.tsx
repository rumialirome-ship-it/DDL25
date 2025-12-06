import React, { useMemo, useState } from 'react';
import { useAppContext } from '../../contexts/AppContext.tsx';
import { Transaction, TransactionType } from '../../types';
import AdminWallet from './AdminWallet.tsx';
import AdminWalletLedger from './AdminWalletLedger.tsx';

// A sub-component for the site-wide log to keep the main component clean
const SiteWideLog: React.FC = () => {
    const { transactions, clients } = useAppContext();
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 25;

    const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c])), [clients]);
    
    const paginatedTransactions = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        // The main transactions list is already sorted newest first from the context
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
        <div className="space-y-4">
             <div className="overflow-x-auto bg-brand-bg rounded-lg max-h-[60vh] relative">
                 <table className="min-w-full text-sm text-left text-brand-text-secondary">
                    <thead className="text-xs text-brand-text uppercase bg-brand-secondary/80 sticky top-0">
                        <tr>
                            <th scope="col" className="px-6 py-3">Date</th>
                            <th scope="col" className="px-6 py-3">Client</th>
                            <th scope="col" className="px-6 py-3">Description</th>
                            <th scope="col" className="px-6 py-3 text-right">Debit</th>
                            <th scope="col" className="px-6 py-3 text-right">Credit</th>
                            <th scope="col" className="px-6 py-3 text-right">Client Balance After</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-secondary/50">
                        {paginatedTransactions.map(tx => {
                             const client = clientMap.get(tx.clientId);
                             return (
                                <tr key={tx.id} className={`hover:bg-brand-secondary/30 ${tx.isReversed ? 'opacity-50' : ''}`}>
                                    <td className="px-6 py-3 whitespace-nowrap">{new Date(tx.createdAt).toLocaleString()}</td>
                                    <td className="px-6 py-3 font-medium text-brand-text">{client ? `${client.username} (${client.clientId})` : 'N/A'}</td>
                                    <td className="px-6 py-3 max-w-xs">{tx.description} {tx.isReversed && <span className="ml-2 text-xs font-bold text-red-400 bg-red-900/50 px-2 py-0.5 rounded-full">REVERSED</span>}</td>
                                    <td className={`px-6 py-3 text-right font-mono text-yellow-400 ${tx.isReversed ? 'line-through' : ''}`}>
                                        {tx.type === TransactionType.Debit ? formatCurrency(tx.amount) : '-'}
                                    </td>
                                    <td className={`px-6 py-3 text-right font-mono text-green-400 ${tx.isReversed ? 'line-through' : ''}`}>
                                        {tx.type === TransactionType.Credit ? formatCurrency(tx.amount) : '-'}
                                    </td>
                                    <td className="px-6 py-3 text-right font-mono text-brand-text">{formatCurrency(tx.balanceAfter)}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                 </table>
                  {transactions.length === 0 && <div className="text-center py-4"><p className="text-brand-text-secondary">No transactions found.</p></div>}
            </div>
            {totalPages > 1 && (
                <div className="flex justify-between items-center pt-2">
                    <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="bg-brand-secondary text-brand-text font-bold py-2 px-4 rounded-lg disabled:opacity-50"> &larr; Previous </button>
                    <span className="text-brand-text-secondary font-semibold"> Page {currentPage} of {totalPages} </span>
                    <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="bg-brand-secondary text-brand-text font-bold py-2 px-4 rounded-lg disabled:opacity-50"> Next &rarr; </button>
                </div>
            )}
        </div>
    );
}

const TabButton: React.FC<{ tabId: string, activeTab: string, onClick: (id: string) => void, children: React.ReactNode }> = ({ tabId, activeTab, onClick, children }) => (
    <button
        onClick={() => onClick(tabId)}
        className={`whitespace-nowrap px-4 py-3 font-semibold rounded-t-lg transition-colors ${activeTab === tabId ? 'bg-brand-surface text-brand-primary border-b-2 border-brand-primary' : 'text-brand-text-secondary hover:text-brand-text'}`}
    >
        {children}
    </button>
);


const AdminFinancials = () => {
    const [activeTab, setActiveTab] = useState('admin-ledger');

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-brand-text">Site-Wide Financials</h2>
            <AdminWallet />
            
             <div className="border-b border-brand-secondary">
                <nav className="-mb-px flex space-x-4">
                    <TabButton tabId="admin-ledger" activeTab={activeTab} onClick={setActiveTab}>
                        Admin Wallet Ledger
                    </TabButton>
                    <TabButton tabId="site-log" activeTab={activeTab} onClick={setActiveTab}>
                        Site-Wide Transaction Log
                    </TabButton>
                </nav>
            </div>
            
            <div className="bg-brand-surface p-4 rounded-b-lg rounded-r-lg shadow border border-brand-secondary">
                {activeTab === 'admin-ledger' && <AdminWalletLedger />}
                {activeTab === 'site-log' && <SiteWideLog />}
            </div>
        </div>
    );
};

export default AdminFinancials;