import React from 'react';

const CurrentDateDisplay: React.FC<{ className?: string }> = ({ className }) => {
    const today = new Date();
    const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = today.toLocaleDateString('en-US', dateOptions);

    return (
        <p className={`text-lg text-brand-text-secondary ${className || ''}`}>
            {formattedDate}
        </p>
    );
};

export default CurrentDateDisplay;
