import React from 'react';

interface AdminStatsCardProps {
    title: string;
    value: string;
    icon: React.ReactNode;
    className?: string;
}

const AdminStatsCard: React.FC<AdminStatsCardProps> = ({ title, value, icon, className = '' }) => {
    return (
        <div className="bg-brand-surface border border-brand-secondary p-4 rounded-lg shadow-lg flex items-center space-x-4">
            <div className="bg-brand-secondary p-3 rounded-full">
                {icon}
            </div>
            <div>
                <p className="text-sm text-brand-text-secondary">{title}</p>
                <p className={`text-2xl font-bold text-brand-text ${className}`}>{value}</p>
            </div>
        </div>
    );
};

export default AdminStatsCard;