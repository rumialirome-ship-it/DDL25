import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../../contexts/AppContext.tsx';
import { GameType, BettingCondition } from '../../types/index.ts';
import { getGameTypeDisplayName } from '../../utils/helpers.ts';
import SortableHeader from '../common/SortableHeader.tsx';
import StatsCard from '../common/StatsCard.tsx';
import Countdown from '../common/Countdown.tsx';


interface SummaryData {
    gameType: GameType;
    number: string;
    condition: BettingCondition;
    totalStake: number;
    betCount: number;
    uniquePlayers: number;
}

type SortKey = 'totalStake' | 'betCount' | 'uniquePlayers';

const LiveBettingMonitor = () => {
    const { draws, betsByDraw } = useAppContext();
    const [selectedDrawId, setSelectedDrawId] = useState('');
    const [activeGameTab, setActiveGameTab] = useState<GameType>(GameType.FourDigits);
    const [sort, setSort] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'totalStake', direction: 'desc' });

    const openDraws = useMemo(() => draws.filter(d => d.status === 'OPEN'), [draws]);

    useEffect(() => {
        if (openDraws.length > 0 && !openDraws.find(d => d.id === selectedDrawId)) {
            setSelectedDrawId(openDraws[0].id);
        } else if (openDraws.length === 0) {
            setSelectedDrawId('');
        }
    }, [openDraws, selectedDrawId]);

    const aggregatedSummary = useMemo(() => {
        if (!selectedDrawId) {
            return { summary: [], totalStake: 0, totalBets: 0 };
        }
        
        const relevantBets = betsByDraw.get(selectedDrawId) || [];
        
        // Consolidate bets using a Map to group by game type, condition, and number.
        // This ensures that multiple bets on the same number are summed up into a single entry.
        const summaryMap = relevantBets.reduce((acc, bet) => {
            // Use a pipe separator for a more robust key.
            const key = `${bet.gameType}|${bet.condition}|${bet.number}`;
            const existingEntry = acc.get(key);

            if (existingEntry) {
                // If we've already seen this bet, add to its totals.
                existingEntry.totalStake += bet.stake;
                existingEntry.betCount += 1;
                existingEntry.clients.add(bet.clientId);
            } else {
                // Otherwise, create a new entry for this bet type.
                acc.set(key, {
                    totalStake: bet.stake,
                    betCount: 1,
                    clients: new Set([bet.clientId]),
                });
            }
            return acc;
        }, new Map<string, { totalStake: number; betCount: number; clients: Set<string> }>());


        const summary: SummaryData[] = Array.from(summaryMap.entries()).map(([key, data]) => {
            const [gameType, condition, number] = key.split('|');
            return {
                gameType: gameType as GameType,
                number,
                condition: condition as BettingCondition,
                totalStake: data.totalStake,
                betCount: data.betCount,
                uniquePlayers: data.clients.size
            };
        });

        const totalStake = relevantBets.reduce((sum, bet) => sum + bet.stake, 0);

        return { summary, totalStake, totalBets: relevantBets.length };
    }, [selectedDrawId, betsByDraw]);

    const filteredAndSortedSummary = useMemo(() => {
        const filtered = aggregatedSummary.summary.filter(item => item.gameType === activeGameTab);

        return filtered.sort((a, b) => {
            const valA = a[sort.key];
            const valB = b[sort.key];
            if (valA < valB) return sort.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sort.direction === 'asc' ? 1 : -1;
            if (a.number < b.number) return -1;
            if (a.number > b.number) return 1;
            return 0;
        });
    }, [aggregatedSummary.summary, activeGameTab, sort]);

    const handleSort = (key: SortKey) => {
        setSort(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    if (openDraws.length === 0) {
        return (
             <div className="text-center py-8 bg-brand-surface rounded-lg">
                <p className="text-brand-text-secondary text-lg">No draw is currently open. Summary is unavailable.</p>
            </div>
        );
    }
    
    const gameTabs = [
        GameType.FourDigits, GameType.ThreeDigits, GameType.TwoDigits,
        GameType.OneDigit, GameType.Positional
    ];
    
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-brand-text mb-4">Live Betting Summary</h2>
                 <div className="mb-4">
                    <label className="block text-sm font-bold text-brand-text-secondary mb-2">Select an Open Draw</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {openDraws.map(draw => {
                            const isSelected = draw.id === selectedDrawId;
                            const bettingCloseTime = new Date(draw.drawTime.getTime() - 10 * 60 * 1000);
                            return (
                                <button
                                    key={draw.id}
                                    onClick={() => setSelectedDrawId(draw.id)}
                                    className={`p-3 rounded-lg border text-center transition-all duration-200 ${isSelected ? 'bg-brand-primary/20 border-brand-primary ring-2 ring-brand-primary shadow-lg' : 'bg-brand-surface border-brand-secondary hover:border-brand-primary/50'}`}
                                >
                                    <h4 className="font-bold text-brand-text">Draw {draw.name}</h4>
                                    <p className="text-xs text-brand-text-secondary mb-2">Time: {draw.drawTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    <Countdown targetDate={bettingCloseTime} />
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-brand-text">
                <StatsCard title="Total Bets for this Draw" value={aggregatedSummary.totalBets.toLocaleString()} />
                <StatsCard title="Total Stake for this Draw" value={`RS. ${aggregatedSummary.totalStake.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} className="text-brand-primary" />
            </div>
            
            <div className="bg-brand-surface rounded-lg shadow border border-brand-secondary">
                <div className="border-b border-brand-secondary">
                    <nav className="-mb-px flex space-x-4 overflow-x-auto px-4">
                       {gameTabs.map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveGameTab(tab)}
                                className={`whitespace-nowrap px-4 py-3 font-semibold rounded-t-lg transition-colors ${activeGameTab === tab ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-brand-text-secondary hover:text-brand-text'}`}
                            >
                                {getGameTypeDisplayName(tab)}
                            </button>
                        ))}
                    </nav>
                </div>
                <div className="overflow-x-auto max-h-[60vh]">
                     <table className="min-w-full text-sm text-left text-brand-text-secondary">
                        <thead className="text-xs text-brand-text uppercase bg-brand-secondary/80 sticky top-0">
                            <tr>
                                <th scope="col" className="px-6 py-3">Number</th>
                                <th scope="col" className="px-6 py-3">Condition</th>
                                <SortableHeader onClick={() => handleSort('totalStake')} sortKey="totalStake" currentSort={sort.key} direction={sort.direction} className="text-right">Total Stake</SortableHeader>
                                <SortableHeader onClick={() => handleSort('betCount')} sortKey="betCount" currentSort={sort.key} direction={sort.direction} className="text-center">Bet Count</SortableHeader>
                                <SortableHeader onClick={() => handleSort('uniquePlayers')} sortKey="uniquePlayers" currentSort={sort.key} direction={sort.direction} className="text-center">Unique Players</SortableHeader>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-secondary/50">
                            {filteredAndSortedSummary.length > 0 ? filteredAndSortedSummary.map(item => (
                                <tr key={`${item.number}-${item.condition}`} className="hover:bg-brand-secondary/30">
                                    <td className="px-6 py-3 font-mono font-bold text-brand-primary">{item.number}</td>
                                    <td className="px-6 py-3">{item.condition}</td>
                                    <td className="px-6 py-3 font-mono text-right text-brand-text">RS. {item.totalStake.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                    <td className="px-6 py-3 text-center">{item.betCount}</td>
                                    <td className="px-6 py-3 text-center">{item.uniquePlayers}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="text-center py-8 text-brand-text-secondary">No bets found for this game type in the selected draw.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default LiveBettingMonitor;