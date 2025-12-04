import type { Bet, Client, Draw } from '../types/index.ts';
import { GameType, BettingCondition, PrizeRate, PositionalPrizeRates } from '../types/index.ts';
import type { NumberReport } from '../components/admin/ComprehensiveBook.tsx';
import type { ReportRow as ProfitLossReportRow } from '../components/admin/DrawProfitLossReport.tsx';

// --- SHARED HELPER ---
const checkPatternMatch = (pattern: string, target: string): boolean => {
    if (pattern.length === 4 && target.length === 4) {
        for (let i = 0; i < 4; i++) {
            const patternChar = pattern[i].toUpperCase();
            if (patternChar !== 'X' && patternChar !== target[i]) return false;
        }
        return true;
    }
    return false;
};

// --- COMPREHENSIVE BOOK LOGIC ---

interface ProcessingStakeDetail { stake: number; sources: Set<string>; }
interface ProcessingNumberReport { '4D': ProcessingStakeDetail; '3D': ProcessingStakeDetail; '2D': ProcessingStakeDetail; '1D': ProcessingStakeDetail; total: number; }

function processComprehensiveData(payload: { draw: Draw; bets: Bet[]; conditionFilter: 'ALL' | 'FIRST' | 'SECOND' }): NumberReport[] {
    const { draw, bets, conditionFilter } = payload;
    const reportData = new Map<string, ProcessingNumberReport>();
    
    let relevantBets = bets;
    if (conditionFilter !== 'ALL') {
        relevantBets = relevantBets.filter(b => b.condition === conditionFilter);
    }

    const initializeEntry = (num: string) => {
        if (!reportData.has(num)) {
            reportData.set(num, {
                '4D': { stake: 0, sources: new Set() },
                '3D': { stake: 0, sources: new Set() },
                '2D': { stake: 0, sources: new Set() },
                '1D': { stake: 0, sources: new Set() },
                total: 0
            });
        }
        return reportData.get(num)!;
    };

    for (const bet of relevantBets) {
        const { gameType, number, stake } = bet;

        switch (gameType) {
            case GameType.FourDigits: {
                const entry = initializeEntry(number);
                entry['4D'].stake += stake;
                entry.total += stake;
                break;
            }
            case GameType.ThreeDigits: {
                for (let i = 0; i < 10; i++) {
                    const fullNumber = number + i.toString();
                    const entry = initializeEntry(fullNumber);
                    entry['3D'].stake += stake;
                    entry['3D'].sources.add(number);
                    entry.total += stake;
                }
                break;
            }
            case GameType.TwoDigits: {
                for (let i = 0; i < 100; i++) {
                    const fullNumber = number + i.toString().padStart(2, '0');
                    const entry = initializeEntry(fullNumber);
                    entry['2D'].stake += stake;
                    entry['2D'].sources.add(number);
                    entry.total += stake;
                }
                break;
            }
            case GameType.OneDigit: {
                for (let i = 0; i < 1000; i++) {
                    const fullNumber = number + i.toString().padStart(3, '0');
                    const entry = initializeEntry(fullNumber);
                    entry['1D'].stake += stake;
                    entry['1D'].sources.add(number);
                    entry.total += stake;
                }
                break;
            }
        }
    }
    return Array.from(reportData.entries()).map(([number, data]) => ({
        number,
        '4D': { stake: data['4D'].stake, sources: Array.from(data['4D'].sources) },
        '3D': { stake: data['3D'].stake, sources: Array.from(data['3D'].sources) },
        '2D': { stake: data['2D'].stake, sources: Array.from(data['2D'].sources) },
        '1D': { stake: data['1D'].stake, sources: Array.from(data['1D'].sources) },
        total: data.total
    }));
}

// --- PROFIT/LOSS REPORT LOGIC ---

interface ProcessingProfitLossRow {
    playedNumber: string; source1D: Set<string>; source2D: Set<string>; source3D: Set<string>; source4D: Set<string>;
    totalStake: number; totalCommission: number; potentialPrize: number;
}

function processProfitLossData(payload: { draw: Draw; bets: Bet[]; clients: Client[]; conditionFilter: 'ALL' | 'FIRST' | 'SECOND' }): ProfitLossReportRow[] {
    const { bets, clients, conditionFilter } = payload;
    const reportMap = new Map<string, ProcessingProfitLossRow>();
    const clientMap = new Map(clients.map(c => [c.id, c]));
    
    let relevantBets = bets;
    if (conditionFilter !== 'ALL') {
        relevantBets = relevantBets.filter(b => b.condition === conditionFilter);
    }

    const getPrizeForBet = (bet: Bet, client: Client): number => {
        if (!client.prizeRates) return 0;
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
        return rate > 0 ? bet.stake * (rate / 100) : 0;
    };

    for (const bet of relevantBets) {
        const client = clientMap.get(bet.clientId);
        if (!client) continue;

        const commission = bet.stake * ((client.commissionRates?.[bet.gameType] ?? 0) / 100);
        const potentialPrize = getPrizeForBet(bet, client);

        const applyToReport = (prefix: string, length: number, sourceSetKey: 'source1D' | 'source2D' | 'source3D' | 'source4D') => {
            const correctedPrefix = prefix.substring(0, length);
            const multiplier = 10 ** (4 - length);
            for (let i = 0; i < multiplier; i++) {
                const suffix = i.toString().padStart(4 - length, '0');
                const fullNumber = correctedPrefix + suffix;
                if (!reportMap.has(fullNumber)) {
                    reportMap.set(fullNumber, { playedNumber: fullNumber, source1D: new Set(), source2D: new Set(), source3D: new Set(), source4D: new Set(), totalStake: 0, totalCommission: 0, potentialPrize: 0, });
                }
                const entry = reportMap.get(fullNumber)!;
                entry.totalStake += bet.stake;
                entry.totalCommission += commission;
                entry.potentialPrize += potentialPrize;
                entry[sourceSetKey].add(bet.number);
            }
        };
        
        switch (bet.gameType) {
            case GameType.FourDigits: applyToReport(bet.number, 4, 'source4D'); break;
            case GameType.ThreeDigits: applyToReport(bet.number, 3, 'source3D'); break;
            case GameType.TwoDigits: applyToReport(bet.number, 2, 'source2D'); break;
            case GameType.OneDigit: applyToReport(bet.number, 1, 'source1D'); break;
            case GameType.Positional:
                const correctedPositionalNumber = bet.number.substring(0, 4);
                const digits = correctedPositionalNumber.split('').map((char, index) => (char !== 'X' ? { char, index } : null)).filter(Boolean);
                const wildcards = 4 - (digits.length as number);
                const combinations = 10 ** wildcards;
                for(let i=0; i<combinations; i++) {
                    let tempNumber = correctedPositionalNumber.split('');
                    let combinationStr = i.toString().padStart(wildcards, '0');
                    let wildCardIdx = 0;
                    for(let j=0; j<4; j++) { if(tempNumber[j] === 'X') { tempNumber[j] = combinationStr[wildCardIdx++]; } }
                    const fullNumber = tempNumber.join('');
                    if (!reportMap.has(fullNumber)) { reportMap.set(fullNumber, { playedNumber: fullNumber, source1D: new Set(), source2D: new Set(), source3D: new Set(), source4D: new Set(), totalStake: 0, totalCommission: 0, potentialPrize: 0, }); }
                    const entry = reportMap.get(fullNumber)!;
                    entry.totalStake += bet.stake;
                    entry.totalCommission += commission;
                    entry.potentialPrize += potentialPrize;
                    entry.source2D.add(bet.number);
                }
                break;
        }
    }
    return Array.from(reportMap.values()).map(item => ({
        ...item,
        source1D: Array.from(item.source1D),
        source2D: Array.from(item.source2D),
        source3D: Array.from(item.source3D),
        source4D: Array.from(item.source4D),
    }));
}


// --- WORKER MESSAGE HANDLER ---

self.onmessage = (event: MessageEvent) => {
    const { type, payload } = event.data;
    if (type === 'COMPREHENSIVE_BOOK') {
        const result = processComprehensiveData(payload);
        self.postMessage({ type: 'COMPREHENSIVE_BOOK_RESULT', payload: result });
    } else if (type === 'PROFIT_LOSS_REPORT') {
        const result = processProfitLossData(payload);
        self.postMessage({ type: 'PROFIT_LOSS_REPORT_RESULT', payload: result });
    }
};

// This export is needed to treat the file as a module
export {};