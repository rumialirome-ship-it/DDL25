import React from 'react';
import { Client, GameType, PrizeRate } from '../../types/index.ts';
import { defaultPrizeRates } from '../../data/mockData.ts';

const PrizeEligibility: React.FC<{ client?: Client | null }> = ({ client }) => {
    // Use the client's specific rates if they are logged in, otherwise show default rates.
    const prizeRates = client?.prizeRates || defaultPrizeRates;
    
    const gameTypesToDisplay = [
        { key: GameType.FourDigits, label: '4 Digits' },
        { key: GameType.ThreeDigits, label: '3 Digits' },
        { key: GameType.TwoDigits, label: '2 Digits' },
        { key: GameType.OneDigit, label: '1 Digit' },
    ];

    const formatMultiplier = (rate: number) => `Stake x ${ (rate / 100).toLocaleString() }`;


    return (
        <div className="bg-brand-surface p-6 rounded-xl shadow-lg border border-brand-secondary text-brand-text-secondary text-left">
            <h2 className="text-xl font-semibold text-brand-primary mb-4 text-center">Game Rules &amp; Payouts</h2>
            
            <h3 className="text-lg font-bold text-brand-text mb-2 mt-4">Prize Payout Rates</h3>
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead className="bg-brand-secondary/50 text-brand-text uppercase">
                        <tr>
                            <th className="py-2 px-4 text-left">Game Type</th>
                            <th className="py-2 px-4 text-center">First (F) Prize</th>
                            <th className="py-2 px-4 text-center">Second (S) Prize</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-secondary/50">
                        {gameTypesToDisplay.map(({ key, label }) => {
                            const rates = prizeRates[key as keyof typeof prizeRates] as PrizeRate;
                            if (!rates) return null; // Fallback, should not happen
                            
                            return (
                                <tr key={key} className="bg-brand-surface/50">
                                    <td className="py-2 px-4 font-semibold">{label}</td>
                                    <td className="py-2 px-4 text-center font-mono">{formatMultiplier(rates.first)}</td>
                                    <td className="py-2 px-4 text-center font-mono">{formatMultiplier(rates.second)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <h3 className="text-lg font-bold text-brand-text mb-2 mt-6">How to Win</h3>
             <div className="space-y-3 text-xs leading-relaxed">
                <div>
                    <strong className="text-brand-text">First Position (F):</strong>
                    <p>Your number must match the <strong className="text-yellow-400">first 4-digit winning number</strong> drawn.</p>
                    <ul className="list-disc list-inside pl-2 mt-1">
                        <li><strong>4D Bet:</strong> Must match all 4 digits. (e.g., bet on `1234` wins if `1234` is drawn)</li>
                        <li><strong>3D Bet:</strong> Must match the first 3 digits. (e.g., bet on `123` wins if `1234` is drawn)</li>
                        <li><strong>2D Bet:</strong> Must match the first 2 digits. (e.g., bet on `12` wins if `1234` is drawn)</li>
                        <li><strong>1D Bet:</strong> Must match the first digit. (e.g., bet on `1` wins if `1234` is drawn)</li>
                    </ul>
                </div>
                <div>
                    <strong className="text-brand-text">Second Position (S):</strong>
                     <p>Your number must match <strong className="text-yellow-400">any of the other three 4-digit winning numbers</strong>, following the same matching rules as the First Position.</p>
                </div>
                 <div>
                    <strong className="text-brand-text">Multi Positional 1 digit Bets:</strong>
                    <p>Place bets on specific digit positions using 'X' as a wildcard. The payout depends on how many digits you specify in your pattern.</p>
                    <ul className="list-disc list-inside pl-2 mt-1">
                        <li>Example: A bet on `5XX1` wins if the winning number is `5231`, `5981`, etc.</li>
                        <li>This bet has 2 specified digits, so it would use the '2 Digits' prize rate.</li>
                    </ul>
                </div>
                <div>
                    <strong className="text-brand-text">Combo Bets:</strong>
                     <p>Generate multiple bets from a set of unique digits. For example, using digits `123` for a 2-digit combo will create bets for `12, 13, 21, 23, 31, 32`. Each of these bets is then judged as a standard '2 Digits' bet.</p>
                </div>
            </div>
        </div>
    );
};

export default PrizeEligibility;
