import React from 'react';
import { useAppContext } from '../../contexts/AppContext';
import * as FinancialLedgerModule from '../common/FinancialLedger.tsx';
const FinancialLedger = FinancialLedgerModule.default;

const FinancialStatement: React.FC = () => {
    const { currentClient } = useAppContext();

    if (!currentClient) {
        return <p>Please log in to view your statement.</p>;
    }

    return (
        <div>
            <h2 className="text-xl font-bold text-brand-text mb-4">Your Financial Statement</h2>
            <FinancialLedger clientId={currentClient.id} />
        </div>
    );
};

export default FinancialStatement;