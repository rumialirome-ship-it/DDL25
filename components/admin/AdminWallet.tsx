import React from 'react';
import { useAppContext } from '../../contexts/AppContext.tsx';
import { Role } from '../../types';

const AdminChipIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-200/50">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
);

const AdminWallet: React.FC = () => {
    const { currentClient } = useAppContext();

    if (!currentClient || currentClient.role !== Role.Admin) {
        return null;
    }

    return (
        <div className="mb-8 bg-gradient-to-br from-gray-800 to-brand-secondary p-6 rounded-xl shadow-lg border border-brand-secondary flex flex-col justify-between min-h-[180px] relative overflow-hidden">
            <div className="flex items-center justify-between z-10">
                 <h2 className="text-lg font-semibold text-brand-text-secondary">Admin Wallet Balance</h2>
                 <span className="font-mono text-sm text-brand-accent">ADMIN</span>
            </div>
            <div className="z-10">
                <p className="text-4xl lg:text-5xl font-bold text-brand-text tracking-wider">RS. {currentClient.wallet.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="flex items-center justify-between z-10">
                <span className="font-mono text-lg text-brand-text">{currentClient.username}</span>
                <AdminChipIcon />
            </div>
            <div className="absolute -bottom-16 -right-10 w-48 h-48 border-4 border-brand-accent/20 rounded-full opacity-50"></div>
        </div>
    );
};

export default AdminWallet;