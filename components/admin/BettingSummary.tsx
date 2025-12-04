import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../../contexts/AppContext.tsx';
import { GameType, BettingCondition } from '../../types/index.ts';
import { getGameTypeDisplayName } from '../../utils/helpers.ts';
import * as SortableHeaderModule from '../common/SortableHeader.tsx';
const SortableHeader = SortableHeaderModule.default;
import * as StatsCardModule from '../common/StatsCard.tsx';
const StatsCard = StatsCardModule.default;


interface SummaryData {
    gameType: GameType;
    number: string;
    condition: BettingCondition;
    totalStake: number;
    betCount: number;
    uniquePlayers: number;
}

type SortKey = 'totalStake' | 'betCount' | 'uniquePlayers';

const BettingSummary = () => {
    const { bets, draws } = useAppContext();
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
        
        const relevantBets = bets.filter(b => b.drawId === selectedDrawId);
        
        const summaryMap = new Map<string, { totalStake: number; betCount: number; clients: Set<string> }>();

        for (const bet of relevantBets) {
            const key = `${bet.gameType}-${bet.condition}-${bet.number}`;
            if (!summaryMap.has(key)) {
                summaryMap.set(key, { totalStake: 0, betCount: 0, clients: new Set() });
            }
            const entry = summaryMap.get(key)!;
            entry.totalStake += bet.stake;
            entry.betCount += 1;
            entry.clients.add(bet.clientId);
        }

        const summary: SummaryData[] = Array.from(summaryMap.entries()).map(([key, data]) => {
            const [gameType, condition, number] = key.split('-');
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
    }, [selectedDrawId, bets]);

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
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <h2 className="text-2xl font-bold text-brand-text">Live Betting Summary</h2>
                <div className="w-full md:w-auto md:max-w-xs">
                     <label htmlFor="draw-summary-select" className="sr-only">Select Draw</label>
                    <select
                        id="draw-summary-select"
                        value={selectedDrawId}
                        onChange={e => setSelectedDrawId(e.target.value)}
                        className="w-full bg-brand-surface border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    >
                        {openDraws.map(draw => (
                            <option key={draw.id} value={draw.id}>Draw {draw.name}</option>
                        ))}
                    </select>
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
                                <SortableHeader onClick={() => handleSort('totalStake')} sortKey="totalStake" currentSort={sort.key} direction={sort.direction}>Total Stake</SortableHeader>
                                <SortableHeader onClick={() => handleSort('betCount')} sortKey="betCount" currentSort={sort.key} direction={sort.direction}>Bet Count</SortableHeader>
                                <SortableHeader onClick={() => handleSort('uniquePlayers')} sortKey="uniquePlayers" currentSort={sort.key} direction={sort.direction}>Unique Players</SortableHeader>
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

export default BettingSummary;