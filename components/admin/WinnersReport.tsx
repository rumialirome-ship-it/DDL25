import React, { useMemo, useState } from 'react';
import { useAppContext } from '../../contexts/AppContext.tsx';
import { Draw, Bet, Client, GameType, BettingCondition, PrizeRate, PositionalPrizeRates } from '../../types/index.ts';
import { isBetWinner, getGameTypeDisplayName } from '../../utils/helpers.ts';
import SortableHeader from '../common/SortableHeader.tsx';
import StatsCard from '../common/StatsCard.tsx';

interface WinningBetDetail {
    bet: Bet;
    client: Client;
    prizeWon: number;
}

type SortKey = 'client' | 'prizeWon' | 'stake';

const WinnersReport: React.FC<{ draw: Draw | undefined }> = ({ draw }) => {
    const { betsByDraw, clients } = useAppContext();
    const [sort, setSort] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'prizeWon', direction: 'desc' });

    const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c])), [clients]);

    const winnersData = useMemo(() => {
        if (!draw || draw.status !== 'FINISHED' || !draw.winningNumbers) {
            return { winners: [], totalPayout: 0 };
        }

        const winningBets: WinningBetDetail[] = [];
        const drawBets = betsByDraw.get(draw.id) || [];
        let totalPayout = 0;

        for (const bet of drawBets) {
            if (isBetWinner(bet, draw.winningNumbers)) {
                const client = clientMap.get(bet.clientId);
                if (!client || !client.prizeRates) continue;

                const conditionKey = bet.condition.toLowerCase() as 'first' | 'second';
                let rate = 0;

                if (bet.gameType === GameType.Positional) {
                    const digitCount = (bet.number.match(/\d/g) || []).length;
                    const positionalRates = client.prizeRates.POSITIONAL;
                    if (positionalRates && positionalRates[digitCount as keyof PositionalPrizeRates]) {
                        rate = positionalRates[digitCount as keyof PositionalPrizeRates][conditionKey];
                    }
                } else {
                    const gamePrizeRates = client.prizeRates[bet.gameType as keyof typeof client.prizeRates];
                    if (gamePrizeRates && typeof (gamePrizeRates as PrizeRate)[conditionKey] === 'number') {
                        rate = (gamePrizeRates as PrizeRate)[conditionKey];
                    }
                }

                if (rate > 0) {
                    const prizeWon = bet.stake * (rate / 100);
                    totalPayout += prizeWon;
                    winningBets.push({ bet, client, prizeWon });
                }
            }
        }
        return { winners: winningBets, totalPayout };
    }, [draw, betsByDraw, clientMap]);

    const sortedWinners = useMemo(() => {
        return [...winnersData.winners].sort((a, b) => {
            let valA, valB;
            switch(sort.key) {
                case 'client':
                    valA = a.client.username;
                    valB = b.client.username;
                    break;
                case 'stake':
                    valA = a.bet.stake;
                    valB = b.bet.stake;
                    break;
                case 'prizeWon':
                default:
                    valA = a.prizeWon;
                    valB = b.prizeWon;
                    break;
            }

            if (typeof valA === 'string' && typeof valB === 'string') {
                 if (valA < valB) return sort.direction === 'asc' ? -1 : 1;
                 if (valA > valB) return sort.direction === 'asc' ? 1 : -1;
                 return 0;
            }
             if (valA < valB) return sort.direction === 'asc' ? -1 : 1;
             if (valA > valB) return sort.direction === 'asc' ? 1 : -1;
             return 0;
        });
    }, [winnersData.winners, sort]);

    const handleSort = (key: SortKey) => {
        setSort(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    if (!draw) {
        return <p className="text-center text-brand-text-secondary py-4">Please select a finished draw to view the winners list.</p>;
    }
    
    if (draw.status !== 'FINISHED') {
        return <p className="text-center text-brand-text-secondary py-4">This report is only available for 'FINISHED' draws.</p>;
    }

    const formatCurrency = (amount: number) => amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StatsCard title="Total Winning Bets" value={winnersData.winners.length.toLocaleString()} />
                <StatsCard title="Total Payout for Draw" value={`RS. ${formatCurrency(winnersData.totalPayout)}`} className="text-green-400" />
            </div>

            {winnersData.winners.length === 0 ? (
                <p className="text-center text-brand-text-secondary py-8">No winning bets found for this draw.</p>
            ) : (
                <div className="overflow-x-auto max-h-[60vh]">
                    <table className="min-w-full text-sm text-left text-brand-text-secondary">
                        <thead className="text-xs text-brand-text uppercase bg-brand-secondary/80 sticky top-0">
                            <tr>
                                <SortableHeader onClick={() => handleSort('client')} sortKey="client" currentSort={sort.key} direction={sort.direction}>Client</SortableHeader>
                                <th scope="col" className="px-6 py-3">Winning Bet</th>
                                <th scope="col" className="px-6 py-3">Game</th>
                                <th scope="col" className="px-6 py-3">Condition</th>
                                <SortableHeader onClick={() => handleSort('stake')} sortKey="stake" currentSort={sort.key} direction={sort.direction} className="text-right">Stake</SortableHeader>
                                <SortableHeader onClick={() => handleSort('prizeWon')} sortKey="prizeWon" currentSort={sort.key} direction={sort.direction} className="text-right">Prize Won</SortableHeader>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-secondary/50">
                            {sortedWinners.map(({ bet, client, prizeWon }) => (
                                <tr key={bet.id} className="hover:bg-brand-secondary/30">
                                    <td className="px-6 py-2 font-medium text-brand-text whitespace-nowrap">{client.username} ({client.clientId})</td>
                                    <td className="px-6 py-2 font-mono text-brand-primary">{bet.number}</td>
                                    <td className="px-6 py-2">{getGameTypeDisplayName(bet.gameType)}</td>
                                    <td className="px-6 py-2">{bet.condition}</td>
                                    <td className="px-6 py-2 text-right font-mono">{formatCurrency(bet.stake)}</td>
                                    <td className="px-6 py-2 text-right font-mono font-bold text-green-400">{formatCurrency(prizeWon)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default WinnersReport;