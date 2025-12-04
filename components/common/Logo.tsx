import React from 'react';

const Logo: React.FC<{ className?: string }> = ({ className = 'h-8 w-8 text-brand-primary' }) => (
    <svg 
        className={className}
        viewBox="0 0 24 24" 
        fill="currentColor" 
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Daily Dubai Lottery Logo"
    >
        <path d="M12 1.5L14.05 8.35L21.5 9.25L16.25 14.25L17.6 21.65L12 17.9L6.4 21.65L7.75 14.25L2.5 9.25L9.95 8.35L12 1.5Z" opacity="0.4"/>
        <path d="M12 5.5L10.5 10.05L5.5 10.9L9.2 14.4L8.25 19.3L12 16.85L15.75 19.3L14.8 14.4L18.5 10.9L13.5 10.05L12 5.5Z"/>
    </svg>
);

export default Logo;