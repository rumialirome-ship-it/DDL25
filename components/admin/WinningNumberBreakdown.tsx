import React, { useMemo } from 'react';
import { useAppContext } from '../../contexts/AppContext.tsx';
import { Draw, Bet, GameType, BettingCondition, PrizeRate, PositionalPrizeRates } from '../../types/index.ts';
import { getGameTypeDisplayName } from '../../utils/helpers.ts';

interface WinningBetDetail {
    bet: Bet;
    clientUsername: string;
    commissionCredit: number;
    prizeWon: number;
}

// Local helper functions to check for winning bets against a single number
const checkMatch = (betNumber: string, betGameType: GameType, winningNumber: string): boolean => {
    if (winningNumber.length !== 4) return false;
    switch (betGameType) {
        case GameType.FourDigits: return betNumber.length === 4 && betNumber === winningNumber;
        case GameType.ThreeDigits: return betNumber.length === 3 && winningNumber.startsWith(betNumber);
        case GameType.TwoDigits: return betNumber.length === 2 && winningNumber.startsWith(betNumber);
        case GameType.OneDigit: return betNumber.length === 1 && winningNumber.startsWith(betNumber);
        default: return false;
    }
};

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


const WinningNumberBreakdown: React.FC<{ draw: Draw; winningNumber: string }> = ({ draw, winningNumber }) => {
    const { bets, clients } = useAppContext();
    const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c])), [clients]);

    const reportData = useMemo(() => {
        const winningBetsDetails: WinningBetDetail[] = [];
        const drawBets = bets.filter(b => b.drawId === draw.id);
        const isFirstPrizeNumber = draw.winningNumbers[0] === winningNumber;
        const isSecondPrizeNumber = draw.winningNumbers.slice(1).includes(winningNumber);

        for (const bet of drawBets) {
            let isWinner = false;
            // A bet can only win if its condition matches the prize slot of the number
            if (bet.condition === BettingCondition.First && isFirstPrizeNumber) {
                isWinner = bet.gameType === GameType.Positional 
                    ? checkPatternMatch(bet.number, winningNumber)
                    : checkMatch(bet.number, bet.gameType, winningNumber);
            } else if (bet.condition === BettingCondition.Second && isSecondPrizeNumber) {
                 isWinner = bet.gameType === GameType.Positional 
                    ? checkPatternMatch(bet.number, winningNumber)
                    : checkMatch(bet.number, bet.gameType, winningNumber);
            }

            if (isWinner) {
                const client = clientMap.get(bet.clientId);
                if (!client) continue;

                let prizeWon = 0;
                const conditionKey = bet.condition.toLowerCase() as 'first' | 'second';
                let rate = 0;

                if (bet.gameType === GameType.Positional) {
                    const digitCount = (bet.number.match(/\d/g) || []).length;
                    const positionalRates = client.prizeRates?.POSITIONAL;
                    if (positionalRates && positionalRates[digitCount as keyof PositionalPrizeRates]) {
                        rate = positionalRates[digitCount as keyof PositionalPrizeRates][conditionKey];
                    }
                } else {
                    const gamePrizeRates = client.prizeRates?.[bet.gameType as keyof typeof client.prizeRates];
                    if (gamePrizeRates && typeof (gamePrizeRates as PrizeRate)[conditionKey] === 'number') {
                        rate = (gamePrizeRates as PrizeRate)[conditionKey];
                    }
                }

                if (rate > 0) {
                    prizeWon = bet.stake * (rate / 100);
                }
                
                const commissionRate = client.commissionRates?.[bet.gameType] ?? 0;
                const commissionCredit = bet.stake * (commissionRate / 100);

                winningBetsDetails.push({
                    bet,
                    clientUsername: `${client.username} (${client.clientId})`,
                    commissionCredit,
                    prizeWon,
                });
            }
        }
        
        const sortedDetails = winningBetsDetails.sort((a,b) => b.prizeWon - a.prizeWon);

        const totals = sortedDetails.reduce((acc, item) => {
            acc.totalStake += item.bet.stake;
            acc.totalCommission += item.commissionCredit;
            acc.totalPrizeWon += item.prizeWon;
            return acc;
        }, { totalStake: 0, totalCommission: 0, totalPrizeWon: 0 });

        return { details: sortedDetails, totals };
    }, [draw, winningNumber, bets, clientMap]);

    const formatCurrency = (amount: number) => amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <div className="text-brand-text">
            {reportData.details.length === 0 ? (
                <p className="text-center text-brand-text-secondary py-8">No winning bets found for this number in this draw.</p>
            ) : (
                <div className="overflow-x-auto max-h-[70vh]">
                    <table className="min-w-full text-sm text-left text-brand-text-secondary">
                        <thead className="text-xs text-brand-text uppercase bg-brand-secondary/80 sticky top-0">
                            <tr>
                                <th scope="col" className="px-4 py-3">Client</th>
                                <th scope="col" className="px-4 py-3">Winning Combination</th>
                                <th scope="col" className="px-4 py-3">Game Type</th>
                                <th scope="col" className="px-4 py-3">Condition</th>
                                <th scope="col" className="px-4 py-3 text-right">Stake</th>
                                <th scope="col" className="px-4 py-3 text-right">Prize Won</th>
                                <th scope="col" className="px-4 py-3 text-right" title="Commission is a rebate on stake, credited even on losing bets.">Commission Credit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-secondary/50">
                            {reportData.details.map((item) => (
                                <tr key={item.bet.id} className="hover:bg-brand-secondary/30">
                                    <td className="px-4 py-2 font-medium text-brand-text whitespace-nowrap">{item.clientUsername}</td>
                                    <td className="px-4 py-2 font-mono text-brand-primary">{item.bet.number}</td>
                                    <td className="px-4 py-2">{getGameTypeDisplayName(item.bet.gameType)}</td>
                                    <td className="px-4 py-2">{item.bet.condition}</td>
                                    <td className="px-4 py-2 text-right font-mono">{formatCurrency(item.bet.stake)}</td>
                                    <td className="px-4 py-2 text-right font-mono font-bold text-green-400">{formatCurrency(item.prizeWon)}</td>
                                    <td className="px-4 py-2 text-right font-mono text-blue-400">{formatCurrency(item.commissionCredit)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-brand-secondary/80 font-bold text-brand-text">
                            <tr>
                                <td colSpan={4} className="px-4 py-3 text-right">TOTALS</td>
                                <td className="px-4 py-3 text-right font-mono">{formatCurrency(reportData.totals.totalStake)}</td>
                                <td className="px-4 py-3 text-right font-mono text-green-400 text-base">{formatCurrency(reportData.totals.totalPrizeWon)}</td>
                                <td className="px-4 py-3 text-right font-mono text-blue-400">{formatCurrency(reportData.totals.totalCommission)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </div>
    );
};

export default WinningNumberBreakdown;