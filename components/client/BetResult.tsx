import React from 'react';
import { Bet, Draw, DrawStatus, GameType, PrizeRate } from '../../types/index.ts';
import { isBetWinner } from '../../utils/helpers.ts';
import { useAppContext } from '../../contexts/AppContext.tsx';

const BetResult: React.FC<{ bet: Bet; draw?: Draw }> = ({ bet, draw }) => {
    const { currentClient } = useAppContext();

    if (!draw) {
        return <span className="text-gray-400">Loading...</span>;
    }
    if (draw.status === DrawStatus.Finished) {
        if (isBetWinner(bet, draw.winningNumbers)) {
            let winnings = 0;
            if (currentClient && currentClient.id === bet.clientId && currentClient.prizeRates) {
                const conditionKey = bet.condition.toLowerCase() as 'first' | 'second';
                let rate = 0;

                if (bet.gameType === GameType.Positional) {
                    const digitCount = (bet.number.match(/\d/g) || []).length;
                    const positionalRates = currentClient.prizeRates.POSITIONAL;
                    if (positionalRates && positionalRates[digitCount as keyof typeof positionalRates]) {
                        const prizeRate: PrizeRate = positionalRates[digitCount as keyof typeof positionalRates];
                        rate = prizeRate[conditionKey];
                    }
                } else {
                    const gamePrizeRates = currentClient.prizeRates[bet.gameType as keyof typeof currentClient.prizeRates];
                    if (gamePrizeRates && typeof (gamePrizeRates as PrizeRate)[conditionKey] === 'number') {
                        rate = (gamePrizeRates as PrizeRate)[conditionKey];
                    }
                }

                if (rate > 0) {
                    winnings = bet.stake * (rate / 100);
                }
            }
            return <span className="font-bold text-green-400">Won (+RS. {winnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>;
        }
        return <span className="text-red-400">Lost</span>;
    }
    if (draw.status === DrawStatus.Closed) {
        return <span className="text-yellow-400">Processing</span>;
    }
    return <span className="text-blue-400">Pending</span>;
};

export default BetResult;