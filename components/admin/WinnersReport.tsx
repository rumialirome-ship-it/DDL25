import React, { useMemo, useState } from 'react';
import { useAppContext } from '../../contexts/AppContext.tsx';
import { Draw, Bet, Client, GameType, BettingCondition, PrizeRate, PositionalPrizeRates } from '../../types/index.ts';
import { isBetWinner, getGameTypeDisplayName } from '../../utils/helpers.ts';
import StatsCard from '../common/StatsCard.tsx';

const ChevronDownIcon: React.FC<{ expanded: boolean }> = ({ expanded }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
);


interface WinningBetDetail {
    bet: Bet;
    client: Client;
    prizeWon: number;
}

interface GroupedWinner {
    client: Client;
    totalWon: number;
    bets: {
        bet: Bet;
        prizeWon: number;
    }[];
}


const WinnersReport: React.FC<{ draw: Draw | undefined }> = ({ draw }) => {
    const { betsByDraw, clients } = useAppContext();
    const [expandedWinners, setExpandedWinners] = useState<Set<string>>(new Set());

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

    const groupedWinners = useMemo(() => {
        const groups = new Map<string, GroupedWinner>();

        for (const winnerDetail of winnersData.winners) {
            const { client, bet, prizeWon } = winnerDetail;
            if (!groups.has(client.id)) {
                groups.set(client.id, {
                    client,
                    totalWon: 0,
                    bets: [],
                });
            }
            const group = groups.get(client.id)!;
            group.totalWon += prizeWon;
            group.bets.push({ bet, prizeWon });
        }

        return Array.from(groups.values()).sort((a, b) => b.totalWon - a.totalWon);
    }, [winnersData.winners]);

    const handleToggleExpand = (clientId: string) => {
        setExpandedWinners(prev => {
            const newSet = new Set(prev);
            if (newSet.has(clientId)) {
                newSet.delete(clientId);
            } else {
                newSet.add(clientId);
            }
            return newSet;
        });
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatsCard title="Total Payout for Draw" value={`RS. ${formatCurrency(winnersData.totalPayout)}`} className="text-green-400" />
                <StatsCard title="Total Winning Bets" value={winnersData.winners.length.toLocaleString()} />
                <StatsCard title="Total Unique Winners" value={groupedWinners.length.toLocaleString()} />
            </div>

            {groupedWinners.length === 0 ? (
                <p className="text-center text-brand-text-secondary py-8">No winning bets found for this draw.</p>
            ) : (
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                    {groupedWinners.map(group => {
                        const isExpanded = expandedWinners.has(group.client.id);
                        return (
                            <div key={group.client.id} className="bg-brand-bg rounded-lg border border-brand-secondary transition-shadow hover:shadow-md">
                                <button 
                                    className="w-full flex justify-between items-center p-4 text-left hover:bg-brand-secondary/20"
                                    onClick={() => handleToggleExpand(group.client.id)}
                                    aria-expanded={isExpanded}
                                    aria-controls={`winner-details-${group.client.id}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="flex-shrink-0 text-brand-text-secondary">
                                            <ChevronDownIcon expanded={isExpanded} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-brand-text">{group.client.username} ({group.client.clientId})</p>
                                            <p className="text-sm text-brand-text-secondary">{group.bets.length} winning {group.bets.length === 1 ? 'bet' : 'bets'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0 ml-4">
                                        <p className="text-sm text-brand-text-secondary">Total Prize Won</p>
                                        <p className="font-bold text-lg text-green-400">RS. {formatCurrency(group.totalWon)}</p>
                                    </div>
                                </button>
                                {isExpanded && (
                                    <div id={`winner-details-${group.client.id}`} className="p-4 border-t border-brand-secondary/50 bg-brand-surface/50">
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full text-sm text-left text-brand-text-secondary">
                                                <thead className="text-xs text-brand-text uppercase bg-brand-secondary/80">
                                                    <tr>
                                                        <th scope="col" className="px-4 py-2">Winning Bet</th>
                                                        <th scope="col" className="px-4 py-2">Game</th>
                                                        <th scope="col" className="px-4 py-2">Condition</th>
                                                        <th scope="col" className="px-4 py-2 text-right">Stake</th>
                                                        <th scope="col" className="px-4 py-2 text-right">Prize Won</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-brand-secondary/50">
                                                    {group.bets.sort((a,b) => b.prizeWon - a.prizeWon).map(({ bet, prizeWon }, index) => (
                                                        <tr key={`${bet.id}-${index}`}>
                                                            <td className="px-4 py-2 font-mono text-brand-primary">{bet.number}</td>
                                                            <td className="px-4 py-2">{getGameTypeDisplayName(bet.gameType)}</td>
                                                            <td className="px-4 py-2">{bet.condition}</td>
                                                            <td className="px-4 py-2 text-right font-mono">{formatCurrency(bet.stake)}</td>
                                                            <td className="px-4 py-2 text-right font-mono font-bold text-green-400">{formatCurrency(prizeWon)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    );
};

export default WinnersReport;
