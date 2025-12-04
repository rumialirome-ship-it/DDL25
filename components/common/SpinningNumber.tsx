import React, { useState, useEffect, memo } from 'react';

const SpinningDigit: React.FC<{ size: 'large' | 'small' }> = memo(({ size }) => {
    const [digit, setDigit] = useState<string>('0');

    useEffect(() => {
        const interval = setInterval(() => {
            setDigit(Math.floor(Math.random() * 10).toString());
        }, 80); // 80ms for a fast, readable spin

        return () => clearInterval(interval);
    }, []);

    const sizeClasses = size === 'large'
        ? 'w-8 h-12 leading-[3rem] text-4xl'
        : 'w-5 h-8 leading-[2rem] text-lg';

    return (
        <div className={`inline-block text-center bg-brand-bg rounded-md text-brand-text shadow-inner transition-all duration-100 border border-brand-secondary/50 ${sizeClasses}`}>
            {digit}
        </div>
    );
});

const SpinningNumber: React.FC<{ length: number; size?: 'large' | 'small' }> = ({ length, size = 'large' }) => {
    return (
        <div className="flex justify-center items-center gap-1 font-mono tracking-wider">
            {Array.from({ length }).map((_, index) => (
                <SpinningDigit key={index} size={size} />
            ))}
        </div>
    );
};

export default SpinningNumber;