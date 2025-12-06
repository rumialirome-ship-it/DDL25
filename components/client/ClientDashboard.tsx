import React, { useState } from 'react';
import { useAppContext } from '../../contexts/AppContext.tsx';
import WalletInfo from './WalletInfo.tsx';
import BettingInterface from './BettingInterface.tsx';
import BetHistory from './BetHistory.tsx';
import ClientTabButton from './ClientTabButton.tsx';
import RuleBasedBulkBetting from './RuleBasedBulkBetting.tsx';
import FinancialStatement from './FinancialStatement.tsx';
import WalletManagement from './WalletManagement.tsx';
import ClientProfile from './ClientProfile.tsx';
import Spinner from '../common/Spinner.tsx';

const DataLoadingFallback: React.FC = () => (
    <div className="flex flex-col items-center justify-center min-h-[200px] text-brand-text-secondary">
        <Spinner />
        <p className="mt-4">Loading your data...</p>
    </div>
);

const ClientDashboard = () => {
    const [activeTab, setActiveTab] = useState('bulk-betting');
    const { isSecondaryLoading } = useAppContext();

    const needsSecondaryData = activeTab === 'history' || activeTab === 'statement';

    const renderContent = () => {
        if (needsSecondaryData && isSecondaryLoading) {
            return <DataLoadingFallback />;
        }
        
        switch (activeTab) {
            case 'booking': return <BettingInterface />;
            case 'bulk-betting': return <RuleBasedBulkBetting />;
            case 'history': return <BetHistory />;
            case 'statement': return <FinancialStatement />;
            case 'wallet': return <WalletManagement />;
            case 'profile': return <ClientProfile />;
            default: return null;
        }
    };

    return (
        <div className="space-y-8">
            <WalletInfo />
            <div className="bg-brand-surface rounded-xl shadow-lg border border-brand-secondary">
                <div className="border-b border-brand-secondary px-4 md:px-6">
                    <nav className="-mb-px flex space-x-4 overflow-x-auto">
                        <ClientTabButton tabId="booking" activeTab={activeTab} onClick={setActiveTab}>Place Bet</ClientTabButton>
                        <ClientTabButton tabId="bulk-betting" activeTab={activeTab} onClick={setActiveTab}>Bulk Betting</ClientTabButton>
                        <ClientTabButton tabId="history" activeTab={activeTab} onClick={setActiveTab}>Bet History</ClientTabButton>
                        <ClientTabButton tabId="statement" activeTab={activeTab} onClick={setActiveTab}>Financial Statement</ClientTabButton>
                        <ClientTabButton tabId="wallet" activeTab={activeTab} onClick={setActiveTab}>Manage Wallet</ClientTabButton>
                        <ClientTabButton tabId="profile" activeTab={activeTab} onClick={setActiveTab}>Profile</ClientTabButton>
                    </nav>
                </div>
                <div className="p-4 md:p-6">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default ClientDashboard;