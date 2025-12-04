import React, { useMemo } from 'react';
import { useAppContext } from '../../contexts/AppContext.tsx';
import BetResult from './BetResult.tsx';
import { GameType } from '../../types/index.ts';
import { getGameTypeDisplayName } from '../../utils/helpers.ts';

const BetHistory: React.FC = () => {
    const { currentClient, bets, draws } = useAppContext();
    const drawMap = useMemo(() => new Map(draws.map(d => [d.id, d])), [draws]);

    const todaysBets = useMemo(() => {
        if (!currentClient) return [];
        const todaysDrawIds = new Set(draws.map(d => d.id));
        return bets
            .filter(b => b.clientId === currentClient.id && todaysDrawIds.has(b.drawId))
            .sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime());
    }, [currentClient, bets, draws]);

    if (!currentClient) return null;

    if (todaysBets.length === 0) {
        return <div className="text-center py-8"><p className="text-brand-text-secondary">You haven't placed any bets today.</p></div>
    }

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                <h2 className="text-xl font-bold text-brand-text">Today's Bets</h2>
            </div>
            <div className="overflow-auto bg-brand-bg rounded-lg shadow-md max-h-[60vh]">
                <table className="min-w-full text-sm text-left text-brand-text-secondary">
                    <thead className="text-xs text-brand-text uppercase bg-brand-secondary/50 sticky top-0">
                        <tr>
                            <th scope="col" className="px-6 py-3">Date</th>
                            <th scope="col" className="px-6 py-3">Draw</th>
                            <th scope="col" className="px-6 py-3">Game</th>
                            <th scope="col" className="px-6 py-3">Number</th>
                            <th scope="col" className="px-6 py-3">Condition</th>
                            <th scope="col" className="px-6 py-3 text-right">Stake</th>
                            <th scope="col" className="px-6 py-3 text-right">Result</th>
                        </tr>
                    </thead>
                    <tbody>
                        {todaysBets.map(bet => {
                            const draw = drawMap.get(bet.drawId);
                            return (
                                <tr key={bet.id} className="bg-brand-surface border-b border-brand-secondary hover:bg-brand-surface/50">
                                    <td className="px-6 py-4">{new Date(bet.createdAt).toLocaleString()}</td>
                                    <td className="px-6 py-4 font-medium text-brand-text">{draw ? `Draw ${draw.name}` : `Draw ${bet.drawId.split('-').pop()}`}</td>
                                    <td className="px-6 py-4">
                                        {getGameTypeDisplayName(bet.gameType)}
                                        {bet.gameType === GameType.Positional && bet.positions && (
                                            <span className="text-xs block text-brand-text-secondary">
                                                Pos: [{bet.positions.join(',')}]
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 font-mono text-brand-primary">{bet.number}</td>
                                    <td className="px-6 py-4">{bet.condition}</td>
                                    <td className="px-6 py-4 text-right font-mono">{bet.stake.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td className="px-6 py-4 text-right"><BetResult bet={bet} draw={draw} /></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default BetHistory;