import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../../contexts/AppContext.tsx';
import { Draw, BettingCondition, GameType, Bet } from '../../types/index.ts';
import StatsCard from '../common/StatsCard.tsx';
import SortableHeader from '../common/SortableHeader.tsx';
import { getGameTypeDisplayName } from '../../utils/helpers.ts';

const DrawReport: React.FC<{ draw: Draw }> = ({ draw }) => {
    const { getDrawStats, bets } = useAppContext();
    const [activeTab, setActiveTab] = useState('breakdown');
    type SortKey = 'players' | 'count' | 'totalStake';
    const [sort, setSort] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'totalStake', direction: 'desc' });
    const [stats, setStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            setIsLoading(true);
            try {
                const data = await getDrawStats(draw.id);
                setStats(data);
            } catch (error) {
                console.error("Failed to fetch draw report:", error);
                setStats(null);
            } finally {
                setIsLoading(false);
            }
        };

        if (draw && draw.status === 'FINISHED') {
            fetchStats();
        } else {
            setIsLoading(false);
            setStats(null);
        }
    }, [draw, getDrawStats]);
    
    const sortedBetsByNumber = useMemo(() => {
        if (!stats?.betsByNumber) return [];
        const entries = [...stats.betsByNumber.entries()];
        entries.sort(([, a], [, b]) => {
            const valA = sort.key === 'players' ? a.players.size : a[sort.key];
            const valB = sort.key === 'players' ? b.players.size : b[sort.key];
            if (valA < valB) return sort.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sort.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return entries;
    }, [stats, sort]);

    const totalPossibleNumbersMap: Partial<Record<GameType, number>> = {
        [GameType.FourDigits]: 10000,
        [GameType.ThreeDigits]: 1000,
        [GameType.TwoDigits]: 100,
        [GameType.OneDigit]: 10,
    };

    const uniqueNumbersPerCategory = useMemo(() => {
        const relevantBets = bets.filter(bet => bet.drawId === draw.id);
        const categoryNumbers = new Map<GameType, Set<string>>();

        for (const bet of relevantBets) {
            if (!categoryNumbers.has(bet.gameType)) {
                categoryNumbers.set(bet.gameType, new Set());
            }
            categoryNumbers.get(bet.gameType)!.add(bet.number);
        }
        return categoryNumbers;
    }, [draw.id, bets]);
    

    if (isLoading) {
        return <p className="text-brand-text-secondary">Loading report...</p>;
    }
    
    if (!stats) {
        return <p className="text-brand-text-secondary">Could not generate a report for this draw.</p>;
    }
    
    const handleSort = (key: SortKey) => {
        let direction: 'asc' | 'desc' = 'desc';
        if (sort.key === key && sort.direction === 'desc') {
            direction = 'asc';
        }
        setSort({ key, direction });
    };

    const categoryEntries = Array.from(stats.categoryAnalysis?.entries() || []);
    const digitEntries = Array.from(stats.digitAnalysis?.entries() || []);
    const conditionEntries = Array.from(stats.conditionAnalysis?.entries() || []);
    const formatCurrency = (amount: number) => amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-brand-text">
                <StatsCard title="Total Stake" value={`RS. ${formatCurrency(stats.totalStake)}`} />
                <StatsCard title="Total Payout" value={`RS. ${formatCurrency(stats.totalPayout)}`} className="text-yellow-400" />
                <StatsCard title="Total Commission" value={`RS. ${formatCurrency(stats.totalCommission || 0)}`} className="text-blue-400" />
                <StatsCard title="Net Profit/Loss" value={`RS. ${formatCurrency(stats.netProfit)}`} className={stats.netProfit >= 0 ? 'text-green-400' : 'text-red-400'} />
            </div>

            <div className="border-b border-brand-secondary">
                <nav className="-mb-px flex space-x-4 overflow-x-auto">
                    <button onClick={() => setActiveTab('breakdown')} className={`px-3 py-2 font-semibold ${activeTab === 'breakdown' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-brand-text-secondary'}`}>Bet Breakdown</button>
                    <button onClick={() => setActiveTab('condition')} className={`px-3 py-2 font-semibold ${activeTab === 'condition' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-brand-text-secondary'}`}>Condition Analysis</button>
                    <button onClick={() => setActiveTab('category')} className={`px-3 py-2 font-semibold ${activeTab === 'category' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-brand-text-secondary'}`}>Category Analysis</button>
                    <button onClick={() => setActiveTab('digit')} className={`px-3 py-2 font-semibold ${activeTab === 'digit' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-brand-text-secondary'}`}>Digit Analysis</button>
                </nav>
            </div>
            
            <div className="overflow-x-auto bg-brand-bg rounded-lg max-h-96">
                {activeTab === 'breakdown' && (
                    <table className="min-w-full text-sm text-left text-brand-text-secondary">
                        <thead className="text-xs text-brand-text uppercase bg-brand-secondary/80 sticky top-0">
                            <tr>
                                <th scope="col" className="px-6 py-3">Number</th>
                                <SortableHeader onClick={() => handleSort('players')} sortKey="players" currentSort={sort.key} direction={sort.direction} className="text-center">Player Count</SortableHeader>
                                <SortableHeader onClick={() => handleSort('count')} sortKey="count" currentSort={sort.key} direction={sort.direction} className="text-center">Bet Count</SortableHeader>
                                <SortableHeader onClick={() => handleSort('totalStake')} sortKey="totalStake" currentSort={sort.key} direction={sort.direction} className="text-right">Total Stake</SortableHeader>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-secondary/50">
                            {sortedBetsByNumber.map(([number, data]) => (
                                <tr key={number} className="hover:bg-brand-secondary/30">
                                    <td className="px-6 py-3 font-mono font-bold text-brand-text">{number}</td>
                                    <td className="px-6 py-3 text-center">{data.players.size}</td>
                                    <td className="px-6 py-3 text-center">{data.count}</td>
                                    <td className="px-6 py-3 text-right font-mono">RS. {formatCurrency(data.totalStake)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                 {activeTab === 'condition' && (
                    <table className="min-w-full text-sm text-left text-brand-text-secondary">
                        <thead className="text-xs text-brand-text uppercase bg-brand-secondary/80 sticky top-0">
                            <tr>
                                <th scope="col" className="px-6 py-3">Condition</th>
                                <th scope="col" className="px-6 py-3 text-right">Total Stake</th>
                                <th scope="col" className="px-6 py-3 text-right">Total Payout</th>
                                <th scope="col" className="px-6 py-3 text-right">Net Profit/Loss</th>
                            </tr>
                        </thead>
                         <tbody className="divide-y divide-brand-secondary/50">
                            {conditionEntries.map(([condition, data]) => (
                                <tr key={condition} className="hover:bg-brand-secondary/30">
                                    <td className="px-6 py-3 font-bold text-brand-text">{condition}</td>
                                    <td className="px-6 py-3 text-right font-mono">RS. {formatCurrency(data.totalStake)}</td>
                                    <td className="px-6 py-3 text-right font-mono text-yellow-400">RS. {formatCurrency(data.totalPayout)}</td>
                                    <td className={`px-6 py-3 text-right font-mono ${data.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>RS. {formatCurrency(data.netProfit)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                 {activeTab === 'category' && (
                    <table className="min-w-full text-sm text-left text-brand-text-secondary">
                        <thead className="text-xs text-brand-text uppercase bg-brand-secondary/80 sticky top-0">
                            <tr>
                                <th scope="col" className="px-6 py-3">Game Type</th>
                                <th scope="col" className="px-6 py-3">Booked / Total</th>
                                <th scope="col" className="px-6 py-3 text-center">Coverage</th>
                                <th scope="col" className="px-6 py-3 text-right">Total Stake</th>
                                <th scope="col" className="px-6 py-3 text-center">Bet Count</th>
                                <th scope="col" className="px-6 py-3 text-center">Player Count</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-secondary/50">
                            {categoryEntries.map(([gameType, data]) => {
                                const totalPossible = totalPossibleNumbersMap[gameType as GameType] || 0;
                                const bookedCount = uniqueNumbersPerCategory.get(gameType as GameType)?.size || 0;
                                const coverage = totalPossible > 0 ? `${((bookedCount / totalPossible) * 100).toFixed(2)}%` : 'N/A';
                                
                                return (
                                <tr key={gameType} className="hover:bg-brand-secondary/30">
                                    <td className="px-6 py-3 font-bold text-brand-text">{getGameTypeDisplayName(gameType as GameType)}</td>
                                    <td className="px-6 py-3 font-mono">{bookedCount.toLocaleString()} / {totalPossible > 0 ? totalPossible.toLocaleString() : 'N/A'}</td>
                                    <td className={`px-6 py-3 text-center font-mono ${bookedCount > 0 ? 'text-green-400' : ''}`}>{coverage}</td>
                                    <td className="px-6 py-3 text-right font-mono">RS. {formatCurrency(data.totalStake)}</td>
                                    <td className="px-6 py-3 text-center">{data.betCount}</td>
                                    <td className="px-6 py-3 text-center">{data.playerCount}</td>
                                </tr>
                                )
                            })}
                        </tbody>
                    </table>
                )}
                {activeTab === 'digit' && (
                    <table className="min-w-full text-sm text-left text-brand-text-secondary">
                        <thead className="text-xs text-brand-text uppercase bg-brand-secondary/80 sticky top-0">
                            <tr>
                                <th scope="col" className="px-6 py-3">Digit/Combination</th>
                                <th scope="col" className="px-6 py-3">Player Count</th>
                                <th scope="col" className="px-6 py-3">Bet Count</th>
                                <th scope="col" className="px-6 py-3 text-right">Total Stake</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-secondary/50">
                            {digitEntries.sort((a,b) => b[1].totalStake - a[1].totalStake).map(([digit, data]) => (
                                <tr key={digit} className="hover:bg-brand-secondary/30">
                                    <td className="px-6 py-3 font-mono font-bold text-brand-text">{digit}</td>
                                    <td className="px-6 py-3">{data.playerCount}</td>
                                    <td className="px-6 py-3">{data.betCount}</td>
                                    <td className="px-6 py-3 text-right font-mono">RS. {formatCurrency(data.totalStake)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default DrawReport;