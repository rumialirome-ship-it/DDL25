import React from 'react';

const ClientTabButton: React.FC<{
    tabId: string;
    activeTab: string;
    onClick: (tabId: string) => void;
    children: React.ReactNode;
}> = ({ tabId, activeTab, onClick, children }) => (
    <button
        onClick={() => onClick(tabId)}
        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-300
        ${activeTab === tabId 
            ? 'border-brand-primary text-brand-primary' 
            : 'border-transparent text-brand-text-secondary hover:border-brand-secondary hover:text-brand-text'}`}
    >
        {children}
    </button>
);

export default ClientTabButton;