import React, { useState, useMemo, useEffect } from 'react';
import { GameType } from '../../types/index.ts';

export const BettingForm: React.FC<{ 
    gameType: GameType; 
    maxLength: number; 
    onBook: (params: { numbers: string[], stakeFirst: number, stakeSecond: number }) => Promise<{ successCount: number, total: number, message: string }>, 
    disabled: boolean,
    betMode: 'FIRST' | 'SECOND' | 'BOTH'
}> = ({ gameType, maxLength, onBook, disabled, betMode }) => {
    const [numbers, setNumbers] = useState('');
    const [stakeFirst, setStakeFirst] = useState(5);
    const [stakeSecond, setStakeSecond] = useState(5);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const formatNumbers = (input: string): string => {
        if (maxLength !== 1) {
            // Original logic for 2D, 3D, 4D games: auto-chunks numbers.
            const cleaned = input.replace(/[^0-9]/g, '');
            if (!cleaned) return '';
            const regex = new RegExp(`.{1,${maxLength}}`, 'g');
            return cleaned.match(regex)?.join(',') || '';
        }

        // New, more flexible logic for 1-digit game:
        // This allows users to type digits sequentially (e.g., "123") which will be
        // auto-formatted to "1,2,3", and also allows them to manually type commas
        // as separators without the input field clearing them.

        // 1. Sanitize to keep only digits and commas.
        const sanitized = input.replace(/[^0-9,]/g, '');
        // 2. Split by comma to handle manually entered separators.
        const parts = sanitized.split(',');
        // 3. For each part, which might be a sequence of digits like "456", split it into individual digits.
        const allDigits = parts.flatMap(part => part.split(''));
        // 4. Filter out any empty strings that result from multiple commas (e.g., "1,,2") and re-join.
        return allDigits.filter(d => d).join(',');
    };

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNumbers(formatNumbers(e.target.value));
    };

    const allEnteredNumbers = useMemo(() => {
        const cleaned = numbers.replace(/\s/g, '');
        return cleaned ? cleaned.split(',').filter(n => n.length > 0) : [];
    }, [numbers]);

    const validNumbers = useMemo(() => {
        return allEnteredNumbers.filter(n => n.length === maxLength);
    }, [allEnteredNumbers, maxLength]);

    const invalidNumbers = useMemo(() => {
        return allEnteredNumbers.filter(n => n.length !== maxLength);
    }, [allEnteredNumbers, maxLength]);
    
    const totalStake = useMemo(() => {
        if (betMode === 'BOTH') {
            return validNumbers.length * (stakeFirst + stakeSecond);
        }
        return validNumbers.length * stakeFirst;
    }, [validNumbers, stakeFirst, stakeSecond, betMode]);
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (validNumbers.length === 0) {
            setFeedback({ type: 'error', message: 'Please enter valid numbers with the correct length.' });
            return;
        }

        const result = await onBook({ numbers: validNumbers, stakeFirst, stakeSecond });
        
        setFeedback({ type: result.successCount > 0 ? 'success' : 'error', message: result.message });
        
        if (result.successCount > 0) {
            setNumbers('');
        }
    };
    
    useEffect(() => {
        if (feedback) {
            const timer = setTimeout(() => setFeedback(null), 8000);
            return () => clearTimeout(timer);
        }
    }, [feedback]);

    return (
        <div className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex flex-col gap-4">
                    <div>
                        <label className="text-sm font-bold text-brand-text-secondary">Enter Your Number(s)</label>
                        <input
                            type="text"
                            value={numbers}
                            onChange={handleNumberChange}
                            placeholder={maxLength === 1 ? "e.g., 1,2,3,4,5" : `e.g., 1234,5678 (${maxLength}-digit numbers)`}
                            className="w-full bg-brand-bg border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary font-mono text-lg"
                        />
                        {invalidNumbers.length > 0 && (
                            <p className="text-red-400 text-xs mt-1">
                                Error: The following numbers have an incorrect length and will be ignored: {invalidNumbers.join(', ')}. All numbers for this game must be exactly {maxLength} digits.
                            </p>
                        )}
                    </div>
                     {betMode === 'BOTH' ? (
                        <div className="flex flex-wrap items-end gap-4">
                            <div className="flex-grow">
                                <label className="text-sm font-bold text-brand-text-secondary">Stake (First)</label>
                                <input
                                    type="number"
                                    value={stakeFirst === 0 ? '' : stakeFirst}
                                    min={1}
                                    step={1}
                                    onFocus={e => e.target.select()}
                                    onChange={(e) => setStakeFirst(Number(e.target.value))}
                                    className="w-full bg-brand-bg border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                />
                            </div>
                            <div className="flex-grow">
                                <label className="text-sm font-bold text-brand-text-secondary">Stake (Second)</label>
                                <input
                                    type="number"
                                    value={stakeSecond === 0 ? '' : stakeSecond}
                                    min={1}
                                    step={1}
                                    onFocus={e => e.target.select()}
                                    onChange={(e) => setStakeSecond(Number(e.target.value))}
                                    className="w-full bg-brand-bg border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                />
                            </div>
                        </div>
                    ) : (
                        <div>
                            <label className="text-sm font-bold text-brand-text-secondary">Stake Amount</label>
                            <input
                                type="number"
                                value={stakeFirst === 0 ? '' : stakeFirst}
                                min={1}
                                step={1}
                                onFocus={e => e.target.select()}
                                onChange={(e) => setStakeFirst(Number(e.target.value))}
                                className="w-full bg-brand-bg border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary"
                            />
                        </div>
                    )}
                </div>
                <div className="flex flex-wrap gap-4 items-center justify-between">
                     <div className="text-brand-text-secondary text-sm">
                        {validNumbers.length > 0 && (
                            <span>Placing <span className="font-bold text-brand-primary">{betMode === 'BOTH' ? validNumbers.length * 2 : validNumbers.length}</span> bet(s). Total Stake: <span className="font-bold text-brand-primary">RS. {totalStake.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
                        )}
                    </div>
                    <button type="submit" disabled={disabled || validNumbers.length === 0} className="bg-brand-primary text-brand-bg font-bold py-2 px-6 rounded-lg disabled:bg-brand-secondary hover:bg-yellow-400">
                        Book Now
                    </button>
                </div>
            </form>
            {feedback && (
                <div className={`mt-4 p-4 rounded-lg text-sm whitespace-pre-wrap text-left border ${feedback.type === 'success' ? 'bg-green-900/20 text-green-300 border-green-500/30' : 'bg-red-900/20 text-red-300 border-red-500/30'}`}>
                    {feedback.message}
                </div>
            )}
        </div>
    );
};

export default BettingForm;