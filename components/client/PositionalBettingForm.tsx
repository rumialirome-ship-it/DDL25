import React, { useState, useEffect, useMemo } from 'react';

const PositionalBettingForm: React.FC<{
    onBook: (params: { patterns: string[], stakeFirst: number, stakeSecond: number }) => Promise<{ successCount: number, total: number, message: string }>,
    disabled: boolean,
    betMode: 'FIRST' | 'SECOND' | 'BOTH'
}> = ({ onBook, disabled, betMode }) => {
    const [patternsInput, setPatternsInput] = useState('');
    const [stakeFirst, setStakeFirst] = useState(5);
    const [stakeSecond, setStakeSecond] = useState(5);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [error, setError] = useState('');

    const handlePatternsInputChange = (value: string) => {
        // Sanitize to only keep valid characters (digits and X), removing any user-typed commas.
        const cleaned = value.toUpperCase().replace(/[^0-9X]/g, '');
        
        // Chunk the sanitized string into groups of 4 and join with a comma.
        const formatted = cleaned.match(/.{1,4}/g)?.join(',') || '';
        
        setPatternsInput(formatted);
        if (error) setError('');
    };

    useEffect(() => {
        if (feedback) {
            const timer = setTimeout(() => setFeedback(null), 8000);
            return () => clearTimeout(timer);
        }
    }, [feedback]);
    
    const allEnteredPatterns = useMemo(() => {
        return patternsInput.split(',').map(p => p.trim()).filter(p => p.length > 0);
    }, [patternsInput]);
    
    const validPatterns = useMemo(() => {
        return allEnteredPatterns.filter(p => p.length === 4 && /[0-9]/.test(p));
    }, [allEnteredPatterns]);
    
    const invalidPatterns = useMemo(() => {
        return allEnteredPatterns.filter(p => p.length !== 4 || !/[0-9]/.test(p));
    }, [allEnteredPatterns]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFeedback(null);
        setError('');

        if (validPatterns.length === 0) {
            setError('Please enter at least one valid 4-character pattern (using digits and "X", with at least one digit).');
            return;
        }
        
        const result = await onBook({ patterns: validPatterns, stakeFirst, stakeSecond });
        setFeedback({ type: result.successCount > 0 ? 'success' : 'error', message: result.message });

        if (result.successCount > 0) {
            setPatternsInput('');
            setStakeFirst(5);
            setStakeSecond(5);
        }
    };
    
    const totalStake = useMemo(() => {
        if (betMode === 'BOTH') {
            return validPatterns.length * (stakeFirst + stakeSecond);
        }
        return validPatterns.length * stakeFirst;
    }, [validPatterns, stakeFirst, stakeSecond, betMode]);
    
    const isBookable = !disabled && validPatterns.length > 0 && (betMode === 'BOTH' ? (stakeFirst > 0 || stakeSecond > 0) : stakeFirst > 0);

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="text-sm font-bold text-brand-text-secondary">Enter Pattern(s)</label>
                <p className="text-xs text-brand-text-secondary mb-2">Place bets on digits in specific positions. Use 'X' as a wildcard. Commas are added automatically.</p>
                <textarea
                    rows={3}
                    value={patternsInput}
                    onChange={(e) => handlePatternsInputChange(e.target.value)}
                    placeholder="e.g., 5XX4X1X2 will become 5XX4,X1X2"
                    className="w-full bg-brand-bg border-2 border-brand-secondary rounded-lg py-3 px-4 text-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary font-mono text-lg tracking-wider"
                />
                {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
                {invalidPatterns.length > 0 && (
                     <p className="text-yellow-400 text-xs mt-1">
                        Invalid patterns will be ignored: {invalidPatterns.join(', ')}
                    </p>
                )}
            </div>
            
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                {betMode === 'BOTH' ? (
                    <div className="flex flex-wrap items-end gap-4 flex-grow">
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
                    <div className="flex-grow">
                        <label className="text-sm font-bold text-brand-text-secondary">Stake per Pattern</label>
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

                <div className="w-full md:w-auto text-right">
                    <button type="submit" disabled={!isBookable} className="w-full md:w-auto bg-brand-primary text-brand-bg font-bold py-2 px-6 rounded-lg disabled:bg-brand-secondary disabled:cursor-not-allowed hover:bg-yellow-400">
                        Book Now
                    </button>
                </div>
            </div>
            {validPatterns.length > 0 && (
                <div className="text-brand-text-secondary text-sm">
                    Placing <span className="font-bold text-brand-primary">{betMode === 'BOTH' ? validPatterns.length * 2 : validPatterns.length}</span> bet(s). Total Stake: <span className="font-bold text-brand-primary">RS. {totalStake.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
            )}
             {feedback && (
                <div className={`mt-4 p-3 rounded-lg text-sm whitespace-pre-wrap text-left border ${feedback.type === 'success' ? 'bg-green-900/20 text-green-300 border-green-500/30' : 'bg-red-900/20 text-red-300 border-red-500/30'}`}>
                    {feedback.message}
                </div>
            )}
        </form>
    );
};

export default PositionalBettingForm;