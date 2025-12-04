import React from 'react';

const StatsCard: React.FC<{title: string, value: string, className?: string}> = ({ title, value, className = '' }) => (
    <div className="bg-brand-secondary p-4 rounded-lg shadow">
        <p className="text-sm text-brand-text-secondary">{title}</p>
        <p className={`text-2xl font-bold ${className}`}>{value}</p>
    </div>
);

export default StatsCard;