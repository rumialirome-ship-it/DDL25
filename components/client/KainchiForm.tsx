import React, { useState, useEffect, useMemo } from 'react';
import { getPermutations } from '../../utils/helpers.ts';

const ComboForm: React.FC<{ 
    onBook: (params: { numbers: string[], stakeFirst: number, stakeSecond: number, combinationSize: 2|3|4 }) => Promise<{ successCount: number, total: number, message: string }>, 
    disabled: boolean,
    betMode: 'FIRST' | 'SECOND' | 'BOTH'
}> = ({ onBook, disabled, betMode }) => {
    const [digits, setDigits] = useState('');
    const [combinationSize, setCombinationSize] = useState<2 | 3 | 4>(2);
    const [stakeFirst, setStakeFirst] = useState(5);
    const [stakeSecond, setStakeSecond] = useState(5);
    const [generated, setGenerated] = useState<string[]>([]);
    const [selected, setSelected] = useState<string[]>([]);
    const [error, setError] = useState('');
    const [feedback, setFeedback] = useState<{type: 'success' | 'error', message: string} | null>(null);

    const comboRules = { 2: { min: 3, max: 6 }, 3: { min: 3, max: 7 }, 4: { min: 4, max: 7 } };

    const handleGenerate = () => {
        setError('');
        setGenerated([]);
        setSelected([]);
        const uniqueDigits = Array.from(new Set(digits.split('').map(Number)));
        const rules = comboRules[combinationSize];
        if (uniqueDigits.length < rules.min || uniqueDigits.length > rules.max) {
            setError(`For permutations of size ${combinationSize}, you must provide between ${rules.min} and ${rules.max} unique digits. You provided ${uniqueDigits.length}.`);
            return;
        }
        const permutations = getPermutations(uniqueDigits, combinationSize);
        setGenerated(permutations);
        setSelected(permutations);
    };

    const toggleSelection = (num: string) => {
        setSelected(prev => prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num]);
    };
    
    const toggleSelectAll = () => {
        if (selected.length === generated.length) {
            setSelected([]);
        } else {
            setSelected(generated);
        }
    };

    const handleCombinationSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setCombinationSize(Number(e.target.value) as 2|3|4);
        setDigits('');
        setGenerated([]);
        setSelected([]);
        setError('');
    };

    const handleBook = async (bookAll: boolean) => {
        const numbersToBook = bookAll ? generated : selected;
        if (numbersToBook.length === 0) {
            setFeedback({ type: 'error', message: 'Please select at least one number to book.' });
            return;
        }
        
        const result = await onBook({ numbers: numbersToBook, stakeFirst, stakeSecond, combinationSize });

        setFeedback({ type: result.successCount > 0 ? 'success' : 'error', message: result.message });
        
        if (result.successCount > 0) {
            setGenerated([]);
            setSelected([]);
            setDigits('');
        }
    };

    useEffect(() => {
        if (feedback) {
            const timer = setTimeout(() => setFeedback(null), 8000);
            return () => clearTimeout(timer);
        }
    }, [feedback]);

    const totalStakeSelected = useMemo(() => {
        if (betMode === 'BOTH') {
            return selected.length * (stakeFirst + stakeSecond);
        }
        return selected.length * stakeFirst;
    }, [selected, stakeFirst, stakeSecond, betMode]);

    const currentRules = comboRules[combinationSize];
    const placeholder = `Enter ${currentRules.min} to ${currentRules.max} unique digits`;
    
    return (
        <div className="space-y-4">
            {error && <p className="text-red-400 text-center p-2 bg-red-900/20 rounded-md text-sm">{error}</p>}
            <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-grow">
                    <label className="text-sm font-bold text-brand-text-secondary">{placeholder}</label>
                    <input type="text" value={digits} onChange={(e) => setDigits(e.target.value.replace(/[^0-9]/g, ''))} className="w-full bg-brand-bg border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary" placeholder="e.g., 12345" />
                    <p className="text-xs text-brand-text-secondary mt-1">
                        For a {combinationSize}-digit combination, you must provide between {currentRules.min} and {currentRules.max} unique digits.
                    </p>
                </div>
                <div>
                    <label className="text-sm font-bold text-brand-text-secondary">Permutation Size</label>
                    <select value={combinationSize} onChange={handleCombinationSizeChange} className="w-full bg-brand-bg border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary">
                        <option value={2}>2 Digits</option>
                        <option value={3}>3 Digits</option>
                        <option value={4}>4 Digits</option>
                    </select>
                </div>
                <button onClick={handleGenerate} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700">Generate</button>
            </div>
            {generated.length > 0 && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <p className="text-brand-text-secondary">{generated.length} numbers generated:</p>
                        <button onClick={toggleSelectAll} className="text-sm text-brand-primary hover:underline">{selected.length === generated.length ? 'Deselect All' : 'Select All'}</button>
                    </div>
                    <div className="max-h-32 overflow-y-auto bg-brand-bg p-2 rounded-md my-2 border border-brand-secondary flex flex-wrap gap-2">
                        {generated.map(num => (
                            <button key={num} onClick={() => toggleSelection(num)} className={`font-mono text-sm px-2 py-1 rounded transition-colors ${selected.includes(num) ? 'bg-brand-primary text-brand-bg' : 'bg-brand-secondary text-brand-text hover:bg-brand-secondary/70'}`}>
                                {num}
                            </button>
                        ))}
                    </div>
                     <div className="flex flex-col md:flex-row items-end gap-4">
                        {betMode === 'BOTH' ? (
                            <div className="flex items-end gap-4 flex-grow">
                                <div className="flex-grow">
                                    <label className="text-sm font-bold text-brand-text-secondary">Stake (First)</label>
                                    <input type="number" value={stakeFirst === 0 ? '' : stakeFirst} min={1} step={1} onChange={e => setStakeFirst(Number(e.target.value))} className="w-full bg-brand-bg border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                                </div>
                                <div className="flex-grow">
                                    <label className="text-sm font-bold text-brand-text-secondary">Stake (Second)</label>
                                    <input type="number" value={stakeSecond === 0 ? '' : stakeSecond} min={1} step={1} onChange={e => setStakeSecond(Number(e.target.value))} className="w-full bg-brand-bg border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                                </div>
                            </div>
                        ) : (
                            <div className="flex-grow">
                                <label className="text-sm font-bold text-brand-text-secondary">Stake per Number</label>
                                <input type="number" value={stakeFirst === 0 ? '' : stakeFirst} min={1} step={1} onChange={e => setStakeFirst(Number(e.target.value))} className="w-full bg-brand-bg border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                            </div>
                        )}
                        <div className="flex items-end gap-2 w-full md:w-auto">
                            <button onClick={() => handleBook(true)} disabled={disabled || generated.length === 0} className="w-full md:w-auto bg-green-600 text-white font-bold py-2 px-4 rounded-lg disabled:bg-brand-secondary disabled:cursor-not-allowed hover:bg-green-700">Book All ({generated.length})</button>
                            <button onClick={() => handleBook(false)} disabled={disabled || selected.length === 0} className="w-full md:w-auto bg-brand-primary text-brand-bg font-bold py-2 px-4 rounded-lg disabled:bg-brand-secondary disabled:cursor-not-allowed hover:bg-yellow-400">Book Selected ({selected.length})</button>
                        </div>
                    </div>
                    <p className="text-brand-text-secondary text-sm">Total Stake for Selected: <span className="font-bold text-brand-primary">RS. {totalStakeSelected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
                </div>
            )}
            {feedback && (
                 <div className={`mt-4 p-4 rounded-lg text-sm whitespace-pre-wrap text-left border ${feedback.type === 'success' ? 'bg-green-900/20 text-green-300 border-green-500/30' : 'bg-red-900/20 text-red-300 border-red-500/30'}`}>
                    {feedback.message}
                </div>
            )}
        </div>
    );
};

export default ComboForm;