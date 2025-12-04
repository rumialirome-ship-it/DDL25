import React, { useMemo } from 'react';
import { useAppContext } from '../../contexts/AppContext.tsx';
import { Draw, Bet, Client, GameType, BettingCondition, PrizeRate, PositionalPrizeRates } from '../../types/index.ts';
import { getGameTypeDisplayName } from '../../utils/helpers.ts';

interface ProfitLossDetailProps {
    draw: Draw;
    playedNumber: string;
    conditionFilter: 'ALL' | 'FIRST' | 'SECOND';
}

interface ContributingBet {
    bet: Bet;
    client: Client;
    commission: number;
    potentialPrize: number;
}

const checkPatternMatch = (pattern: string, target: string): boolean => {
    if (pattern.length === 4 && target.length === 4) {
        for (let i = 0; i < 4; i++) {
            const patternChar = pattern[i].toUpperCase();
            if (patternChar !== 'X' && patternChar !== target[i]) {
                return false;
            }
        }
        return true;
    }
    return false;
};

const DrawProfitLossDetail: React.FC<ProfitLossDetailProps> = ({ draw, playedNumber, conditionFilter }) => {
    const { bets, clients } = useAppContext();
    const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c])), [clients]);

    const contributingBets = useMemo(() => {
        const details: ContributingBet[] = [];

        let relevantBets = bets.filter(b => b.drawId === draw.id);
        if (conditionFilter !== 'ALL') {
            relevantBets = relevantBets.filter(b => b.condition === conditionFilter);
        }

        for (const bet of relevantBets) {
            let isMatch = false;
            switch(bet.gameType) {
                case GameType.FourDigits:
                    isMatch = bet.number === playedNumber;
                    break;
                case GameType.ThreeDigits:
                    isMatch = playedNumber.startsWith(bet.number);
                    break;
                case GameType.TwoDigits:
                    isMatch = playedNumber.startsWith(bet.number);
                    break;
                case GameType.OneDigit:
                    isMatch = playedNumber.startsWith(bet.number);
                    break;
                case GameType.Positional:
                    isMatch = checkPatternMatch(bet.number, playedNumber);
                    break;
            }

            if (isMatch) {
                const client = clientMap.get(bet.clientId);
                if (!client) continue;
                
                // Calculate commission for this bet
                const commissionRate = client.commissionRates?.[bet.gameType] ?? 0;
                const commission = bet.stake * (commissionRate / 100);

                // Calculate potential prize for this bet
                let potentialPrize = 0;
                if (client.prizeRates) {
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
                    potentialPrize = rate > 0 ? bet.stake * (rate / 100) : 0;
                }
                
                details.push({ bet, client, commission, potentialPrize });
            }
        }

        return details;
    }, [draw.id, playedNumber, conditionFilter, bets, clientMap]);

    const totals = useMemo(() => {
        return contributingBets.reduce((acc, item) => {
            acc.stake += item.bet.stake;
            acc.commission += item.commission;
            acc.prize += item.potentialPrize;
            return acc;
        }, { stake: 0, commission: 0, prize: 0 });
    }, [contributingBets]);

    const formatCurrency = (amount: number) => amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    if (contributingBets.length === 0) {
        return <p className="text-brand-text-secondary text-center py-4">No contributing bets found for this number with the current filters.</p>;
    }

    return (
        <div className="text-brand-text">
            <div className="overflow-x-auto max-h-[60vh]">
                <table className="min-w-full text-sm text-left text-brand-text-secondary">
                    <thead className="text-xs text-brand-text uppercase bg-brand-secondary/80 sticky top-0">
                        <tr>
                            <th className="px-4 py-3">Client</th>
                            <th className="px-4 py-3">Original Bet</th>
                            <th className="px-4 py-3">Game Type</th>
                            <th className="px-4 py-3">Condition</th>
                            <th className="px-4 py-3 text-right">Stake</th>
                            <th className="px-4 py-3 text-right">Commission</th>
                            <th className="px-4 py-3 text-right">Potential Prize</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-secondary/50">
                        {contributingBets.map(({ bet, client, commission, potentialPrize }, index) => (
                            <tr key={`${bet.id}-${index}`} className="hover:bg-brand-secondary/30">
                                <td className="px-4 py-2 font-medium text-brand-text whitespace-nowrap">{client.username} ({client.clientId})</td>
                                <td className="px-4 py-2 font-mono">{bet.number}</td>
                                <td className="px-4 py-2">{getGameTypeDisplayName(bet.gameType)}</td>
                                <td className="px-4 py-2">{bet.condition}</td>
                                <td className="px-4 py-2 text-right font-mono">{formatCurrency(bet.stake)}</td>
                                <td className="px-4 py-2 text-right font-mono text-blue-400">{formatCurrency(commission)}</td>
                                <td className="px-4 py-2 text-right font-mono text-yellow-400">{formatCurrency(potentialPrize)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-brand-secondary/80 font-bold text-brand-text">
                         <tr>
                            <td colSpan={4} className="px-4 py-3 text-right">TOTALS</td>
                            <td className="px-4 py-3 text-right font-mono">{formatCurrency(totals.stake)}</td>
                            <td className="px-4 py-3 text-right font-mono text-blue-400">{formatCurrency(totals.commission)}</td>
                            <td className="px-4 py-3 text-right font-mono text-yellow-400 text-base">{formatCurrency(totals.prize)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

export default DrawProfitLossDetail;
