import React from 'react';

const SortableHeader: React.FC<{
    children: React.ReactNode;
    onClick: (sortKey: string) => void;
    sortKey: string;
    currentSort: string;
    direction: 'asc' | 'desc';
    className?: string; // Allow passing custom classes for alignment
}> = ({ children, onClick, sortKey, currentSort, direction, className = '' }) => {
    const isActive = currentSort === sortKey;
    
    // Base classes for the header cell
    const baseClasses = "px-6 py-3 cursor-pointer transition-colors hover:bg-brand-secondary/70";
    // Classes to apply when this header is the active sort column
    const activeClasses = isActive ? "text-brand-primary" : "";

    return (
        <th
            scope="col"
            className={`${baseClasses} ${activeClasses} ${className}`}
            onClick={() => onClick(sortKey)}
        >
            {children}
            {isActive && (direction === 'asc' ? ' ▲' : ' ▼')}
        </th>
    );
};

export default SortableHeader;
