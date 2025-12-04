import React, { useMemo } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { Draw, Bet, BettingCondition, GameType } from '../../types';
import { getGameTypeDisplayName } from '../../utils/helpers';

const LiveBettingReport: React.FC<{ draw: Draw }> = ({ draw }) => {
    const { getLiveDrawAnalysis } = useAppContext();
    const [analysis, setAnalysis] = React.useState<any>(null);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchAnalysis = async () => {
            setIsLoading(true);
            const data = await getLiveDrawAnalysis(draw.id);
            setAnalysis(data);
            setIsLoading(false);
        };
        fetchAnalysis();
    }, [draw.id, getLiveDrawAnalysis]);

    if (isLoading) {
        return <div className="text-center p-8 text-brand-text-secondary">Loading live report...</div>;
    }

    if (!analysis) {
        return (
            <div className="text-center p-8 text-brand-text-secondary">
                <p className="font-semibold text-brand-text">No Betting Data Found</p>
                <p className="text-sm mt-2">There have been no bets placed for this draw yet, so a live analysis cannot be generated.</p>
            </div>
        );
    }

    const { positionalDigitCounts, totalDigitCounts, consolidatedBets, positionalDigitStake } = analysis;
    const formatCurrency = (amount: number) => amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    const renderPositionalCounts = (condition: BettingCondition) => {
        const gameTypesWithData = [GameType.FourDigits, GameType.ThreeDigits, GameType.TwoDigits].filter(
            gt => positionalDigitCounts[gt] && positionalDigitCounts[gt][condition]
        );

        if (gameTypesWithData.length === 0) {
            return <p className="text-sm text-brand-text-secondary">No multi-digit bets found for this condition.</p>;
        }

        return (
            <div className="space-y-4">
                {gameTypesWithData.map(gameType => (
                    <div key={gameType}>
                        <h5 className="font-semibold text-brand-text">{getGameTypeDisplayName(gameType)} Bets</h5>
                        <div className="mt-2 space-y-1 text-sm text-brand-text-secondary pl-4">
                            {Object.entries(positionalDigitCounts[gameType][condition]).map(([posIndex, data]) => {
                                const topDigits = (data as {digit: string, count: number}[]).slice(0, 5)
                                    .map(item => `'${item.digit}' (${item.count} times)`)
                                    .join(', ');
                                
                                if (!topDigits) return null;

                                return (
                                    <p key={posIndex}>
                                        <span className="font-semibold w-20 inline-block">{parseInt(posIndex, 10) + 1}st Digit:</span>
                                        <span className="font-mono">{topDigits}</span>
                                    </p>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-8 text-brand-text-secondary">
            {/* Section: Bet & Amount Tracking by Position */}
            <div className="bg-brand-bg p-4 rounded-lg border border-brand-secondary">
                <h3 className="text-xl font-bold text-brand-primary mb-4">Bet & Amount Tracking by Position</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="text-xs text-brand-text uppercase bg-brand-secondary/80 text-center">
                            <tr>
                                <th className="px-3 py-3 text-left">Digit</th>
                                <th className="px-3 py-3">1st Digit Total</th>
                                <th className="px-3 py-3">2nd Digit Total</th>
                                <th className="px-3 py-3">3rd Digit Total</th>
                                <th className="px-3 py-3">4th Digit Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-secondary/50 text-center">
                            {['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
                                <tr key={digit} className="hover:bg-brand-secondary/30">
                                    <td className="px-3 py-2 font-mono font-bold text-brand-text text-lg text-left">{digit}</td>
                                    <td className="px-3 py-2 font-mono">RS. {formatCurrency(positionalDigitStake['0'][digit] || 0)}</td>
                                    <td className="px-3 py-2 font-mono">RS. {formatCurrency(positionalDigitStake['1'][digit] || 0)}</td>
                                    <td className="px-3 py-2 font-mono">RS. {formatCurrency(positionalDigitStake['2'][digit] || 0)}</td>
                                    <td className="px-3 py-2 font-mono">RS. {formatCurrency(positionalDigitStake['3'][digit] || 0)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Section 1: Positional Counts */}
            <div className="bg-brand-bg p-4 rounded-lg border border-brand-secondary">
                <h3 className="text-xl font-bold text-brand-primary mb-4">Most Played Digits by Position</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h4 className="text-lg font-semibold text-brand-text mb-2 border-b border-brand-secondary pb-1">First Position Bets</h4>
                        {renderPositionalCounts(BettingCondition.First)}
                    </div>
                    <div>
                        <h4 className="text-lg font-semibold text-brand-text mb-2 border-b border-brand-secondary pb-1">Second Position Bets</h4>
                        {renderPositionalCounts(BettingCondition.Second)}
                    </div>
                </div>
            </div>

            {/* Section 2: Total Digit Counts */}
            <div className="bg-brand-bg p-4 rounded-lg border border-brand-secondary">
                <h3 className="text-xl font-bold text-brand-primary mb-4">Overall Digit Frequency</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left">
                        <thead className="text-xs text-brand-text uppercase bg-brand-secondary/80">
                            <tr>
                                <th scope="col" className="px-6 py-3">Digit</th>
                                <th scope="col" className="px-6 py-3 text-right">Total Times Played</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-secondary/50">
                            {totalDigitCounts.map(({ digit, count }: {digit: string, count: number}) => (
                                <tr key={digit} className="hover:bg-brand-secondary/30">
                                    <td className="px-6 py-2 font-mono font-bold text-brand-text text-lg">{digit}</td>
                                    <td className="px-6 py-2 text-right font-mono text-lg">{count.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Section 3: Consolidated Betting Book */}
            <div className="bg-brand-bg p-4 rounded-lg border border-brand-secondary">
                <h3 className="text-xl font-bold text-brand-primary mb-4">Consolidated Betting Book ({analysis.totalBets} Bets)</h3>
                <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2">
                    {Object.entries(consolidatedBets).map(([gameType, conditions]) => (
                        <div key={gameType}>
                            {Object.entries(conditions as {[key: string]: any}).map(([condition, numberMap]) => (
                                <div key={`${gameType}-${condition}`} className="mb-4">
                                     <h4 className="text-lg font-semibold text-brand-text mb-2">{getGameTypeDisplayName(gameType as GameType)} - <span className="capitalize">{condition.toLowerCase()}</span></h4>
                                     <div className="overflow-x-auto bg-brand-secondary/20 rounded">
                                        <table className="min-w-full text-sm text-left">
                                            <thead className="text-xs text-brand-text uppercase bg-brand-secondary/50">
                                                <tr>
                                                    <th scope="col" className="px-4 py-2">Number</th>
                                                    <th scope="col" className="px-4 py-2 text-right">Total Stake</th>
                                                    <th scope="col" className="px-4 py-2 text-center">Bet Count</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-brand-secondary/30">
                                                {Object.entries(numberMap as {[key: string]: {totalStake: number, betCount: number}}).sort((a,b) => b[1].totalStake - a[1].totalStake).map(([number, data]) => (
                                                    <tr key={number}>
                                                        <td className="px-4 py-1.5 font-mono">{number}</td>
                                                        <td className="px-4 py-1.5 text-right font-mono">RS. {data.totalStake.toLocaleString()}</td>
                                                        <td className="px-4 py-1.5 text-center font-mono">{data.betCount}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                     </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default LiveBettingReport;