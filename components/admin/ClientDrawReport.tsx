import React, { useMemo } from 'react';
import { useAppContext } from '../../contexts/AppContext.tsx';
import { Client, Draw, Bet, GameType, BettingCondition, PrizeRate, PositionalPrizeRates } from '../../types';
import { isBetWinner } from '../../utils/helpers.ts';

interface ReportData {
    booked: string[];
    totalStake: number;
    totalPrize: number;
    isWinner: boolean;
}

const ClientDrawReport: React.FC<{ client: Client; draw: Draw }> = ({ client, draw }) => {
    const { betsByDraw } = useAppContext();

    const reportData = useMemo(() => {
        const drawBets = betsByDraw.get(draw.id) || [];
        const clientBets = drawBets.filter(b => b.clientId === client.id);

        // Updated gameOrder to include a generic "Multi Positional" category,
        // which will correctly capture all bets of this type.
        const gameOrder = [
            '4 Digits', '3 Digits', '2 Digits', '1 Digit', 'Multi Positional'
        ];
        
        const data: Map<string, { [key in BettingCondition]?: ReportData }> = new Map(gameOrder.map(g => [g, {}]));

        for (const bet of clientBets) {
            let gameName: string;
            
            // Use bet.gameType as the source of truth for categorization.
            // This robustly handles all bet types, including complex positional patterns.
            switch (bet.gameType) {
                case GameType.FourDigits: gameName = '4 Digits'; break;
                case GameType.ThreeDigits: gameName = '3 Digits'; break;
                case GameType.TwoDigits: gameName = '2 Digits'; break;
                case GameType.OneDigit: gameName = '1 Digit'; break;
                case GameType.Positional: gameName = 'Multi Positional'; break;
                default: continue; // Skip Combo or other types not in this specific report
            }

            if (!data.has(gameName)) continue;

            const gameGroup = data.get(gameName)!;
            if (!gameGroup[bet.condition]) {
                gameGroup[bet.condition] = { booked: [], totalStake: 0, totalPrize: 0, isWinner: false };
            }
            const conditionGroup = gameGroup[bet.condition]!;

            conditionGroup.booked.push(bet.number); // Use the full number/pattern
            conditionGroup.totalStake += bet.stake;

            if (isBetWinner(bet, draw.winningNumbers)) {
                conditionGroup.isWinner = true;
                if (client && client.prizeRates) {
                    const conditionKey = bet.condition.toLowerCase() as 'first' | 'second';
                    let rate = 0;

                    if (bet.gameType === GameType.Positional) {
                        const digitCount = (bet.number.match(/\d/g) || []).length;
                        const positionalRates = client.prizeRates.POSITIONAL;
                        if (positionalRates && positionalRates[digitCount as keyof PositionalPrizeRates]) {
                            const prizeRate: PrizeRate = positionalRates[digitCount as keyof PositionalPrizeRates];
                            rate = prizeRate[conditionKey];
                        }
                    } else {
                        const gamePrizeRates = client.prizeRates[bet.gameType as keyof typeof client.prizeRates];
                        if (gamePrizeRates && typeof (gamePrizeRates as PrizeRate)[conditionKey] === 'number') {
                             rate = (gamePrizeRates as PrizeRate)[conditionKey];
                        }
                    }

                    if (rate > 0) {
                        const winnings = bet.stake * (rate / 100);
                        conditionGroup.totalPrize += winnings;
                    }
                }
            }
        }
        
        // Calculate summary
        let totalFirstStake = 0, totalSecondStake = 0;
        let actualPrizeF = 0, actualPrizeS = 0;

        // Commission is now calculated dynamically based on each bet's type and the client's specific rates.
        const commission = clientBets.reduce((sum, bet) => {
            const rate = client.commissionRates?.[bet.gameType] ?? 0;
            return sum + (bet.stake * (rate / 100));
        }, 0);


        for (const [, conditions] of data.entries()) {
            if (conditions.FIRST) {
                totalFirstStake += conditions.FIRST.totalStake;
                actualPrizeF += conditions.FIRST.totalPrize;
            }
            if (conditions.SECOND) {
                totalSecondStake += conditions.SECOND.totalStake;
                actualPrizeS += conditions.SECOND.totalPrize;
            }
        }

        const totalBookingAmount = totalFirstStake + totalSecondStake;
        const totalEarned = commission + actualPrizeF + actualPrizeS;

        return {
            tableData: data,
            gameOrder,
            summary: {
                totalFirstStake,
                totalSecondStake,
                totalBookingAmount,
                commission,
                actualPrizeF,
                actualPrizeS,
                totalEarned
            }
        };

    }, [client, draw, betsByDraw]);
    
    const { tableData, gameOrder, summary } = reportData;
    const formatCurrency = (amount: number) => amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <div className="text-brand-text">
            <h3 className="text-xl font-bold text-center mb-2 text-brand-primary">BET PLACED BY CLIENT {client.clientId} / {client.username.toUpperCase()}</h3>
            <div className="border border-brand-secondary rounded-lg overflow-hidden">
                <table className="min-w-full text-sm text-center">
                    <thead className="bg-brand-secondary/50 text-brand-text uppercase">
                        <tr>
                            <th rowSpan={2} className="py-2 px-2 border-r border-brand-secondary/50">Games</th>
                            <th colSpan={3} className="py-2 px-2 border-r border-brand-secondary/50">First Position</th>
                            <th colSpan={3} className="py-2 px-2">Second Position</th>
                        </tr>
                        <tr>
                            <th className="py-2 px-2 border-t border-r border-brand-secondary/50 font-semibold">Booked Digits</th>
                            <th className="py-2 px-2 border-t border-r border-brand-secondary/50 font-semibold">Stake</th>
                            <th className="py-2 px-2 border-t border-r border-brand-secondary/50 font-semibold">Prize</th>
                            <th className="py-2 px-2 border-t border-brand-secondary/50 font-semibold">Booked Digits</th>
                            <th className="py-2 px-2 border-t border-brand-secondary/50 font-semibold">Stake</th>
                            <th className="py-2 px-2 border-t border-brand-secondary/50 font-semibold">Prize</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-secondary/50">
                        {gameOrder.map(gameName => {
                            const first = tableData.get(gameName)?.[BettingCondition.First];
                            const second = tableData.get(gameName)?.[BettingCondition.Second];

                            if (!first && !second) return null;

                            return (
                                <tr key={gameName} className="bg-brand-surface hover:bg-brand-surface/50">
                                    <td className="py-2 px-2 border-r border-brand-secondary/50 font-semibold text-left">{gameName}</td>
                                    {/* First Position */}
                                    <td className="py-2 px-2 border-r border-brand-secondary/50 font-mono break-all">{first?.booked.join(', ')}</td>
                                    <td className="py-2 px-2 border-r border-brand-secondary/50 font-mono">{first?.totalStake > 0 ? formatCurrency(first.totalStake) : ''}</td>
                                    <td className={`py-2 px-2 border-r border-brand-secondary/50 font-mono font-bold ${first?.isWinner ? 'bg-yellow-400/80 text-black' : ''}`}>
                                        {first?.totalPrize > 0 ? formatCurrency(first.totalPrize) : ''}
                                    </td>
                                    {/* Second Position */}
                                    <td className="py-2 px-2 border-r border-brand-secondary/50 font-mono break-all">{second?.booked.join(', ')}</td>
                                    <td className="py-2 px-2 border-r border-brand-secondary/50 font-mono">{second?.totalStake > 0 ? formatCurrency(second.totalStake) : ''}</td>
                                    <td className={`py-2 px-2 font-mono font-bold ${second?.isWinner ? 'bg-yellow-400/80 text-black' : ''}`}>
                                        {second?.totalPrize > 0 ? formatCurrency(second.totalPrize) : ''}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                    <tfoot className="bg-brand-secondary/50 font-bold text-brand-text">
                        <tr>
                            <td className="py-2 px-2 border-r border-brand-secondary/50 text-right">TOTAL</td>
                             <td className="py-2 px-2 border-r border-brand-secondary/50"></td>
                             <td className="py-2 px-2 border-r border-brand-secondary/50 font-mono">{formatCurrency(summary.totalFirstStake)}</td>
                             <td className="py-2 px-2 border-r border-brand-secondary/50 font-mono text-yellow-300">{formatCurrency(summary.actualPrizeF)}</td>
                             <td className="py-2 px-2 border-r border-brand-secondary/50"></td>
                             <td className="py-2 px-2 border-r border-brand-secondary/50 font-mono">{formatCurrency(summary.totalSecondStake)}</td>
                             <td className="py-2 px-2 font-mono text-yellow-300">{formatCurrency(summary.actualPrizeS)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                <div className="bg-brand-secondary p-2 rounded-lg">
                    <p className="text-xs text-brand-text-secondary uppercase">Total Booking</p>
                    <p className="font-bold text-lg">{formatCurrency(summary.totalBookingAmount)}</p>
                </div>
                <div className="bg-brand-secondary p-2 rounded-lg" title="Commission is a rebate credited to the client based on their total stakes for this draw, calculated using their personal commission rates.">
                    <p className="text-xs text-brand-text-secondary uppercase">Commission</p>
                    <p className="font-bold text-lg">{formatCurrency(summary.commission)}</p>
                </div>
                <div className="bg-brand-secondary p-2 rounded-lg">
                    <p className="text-xs text-brand-text-secondary uppercase">Prize - F</p>
                    <p className="font-bold text-lg text-yellow-400">{formatCurrency(summary.actualPrizeF)}</p>
                </div>
                 <div className="bg-brand-secondary p-2 rounded-lg">
                    <p className="text-xs text-brand-text-secondary uppercase">Prize - S</p>
                    <p className="font-bold text-lg text-yellow-400">{formatCurrency(summary.actualPrizeS)}</p>
                </div>
                <div className="bg-brand-primary p-2 rounded-lg text-brand-bg col-span-2 md:col-span-1">
                    <p className="text-xs font-semibold uppercase">Total Earned</p>
                    <p className="font-bold text-xl">{formatCurrency(summary.totalEarned)}</p>
                </div>
            </div>
        </div>
    );
};

export default ClientDrawReport;