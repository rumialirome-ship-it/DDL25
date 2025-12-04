import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../../contexts/AppContext.tsx';
import { getSmartAnalysis } from '../../services/GeminiService.tsx';
import { DrawStatus, GameType, Bet, SmartAnalysisReport, SmartInterimReport, BettingCondition, Draw } from '../../types/index.ts';
import { getGameTypeDisplayName } from '../../utils/helpers.ts';
import StatsCard from '../common/StatsCard.tsx';
import ComprehensiveBook from './ComprehensiveBook.tsx';
import Modal from '../common/Modal.tsx';
import WinningNumberBreakdown from './WinningNumberBreakdown.tsx';
import DrawProfitLossReport from './DrawProfitLossReport.tsx';
import WinnersReport from './WinnersReport.tsx';

type ConditionBetBreakdown = Map<string, { totalStake: number, count: number }>;
type GameBetBreakdown = Map<BettingCondition, ConditionBetBreakdown>;
type FullBetBreakdown = Map<GameType, GameBetBreakdown>;

const GameWiseSheetComponent: React.FC<{ gameBreakdown: FullBetBreakdown; selectedDraw: Draw | undefined }> = ({ gameBreakdown, selectedDraw }) => {
    if (!selectedDraw) {
        return <p className="text-center text-brand-text-secondary py-4">Please select a draw to view the report.</p>;
    }
    
    if (gameBreakdown.size === 0) {
        return <p className="text-center text-brand-text-secondary py-4">No bets were placed for this draw.</p>;
    }

    const gameOrder = [
        GameType.FourDigits, GameType.ThreeDigits, GameType.TwoDigits,
        GameType.OneDigit, GameType.Positional, GameType.Combo
    ];

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h3 className="text-xl font-bold text-brand-text">
                    Game-wise Report for Draw {selectedDraw.name}
                </h3>
                <p className="text-sm text-brand-text-secondary">
                    Draw Time: {selectedDraw.drawTime.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </p>
            </div>

            {gameOrder.map(gameType => {
                const breakdownForGame = gameBreakdown.get(gameType);
                if (!breakdownForGame) return null;

                const consolidatedNumbers = new Map<string, { firstStake: number, secondStake: number }>();
                let totalGameStake = 0;

                for (const [condition, conditionBreakdown] of breakdownForGame.entries()) {
                    for (const [number, stats] of conditionBreakdown.entries()) {
                        totalGameStake += stats.totalStake;
                        const existing = consolidatedNumbers.get(number) || { firstStake: 0, secondStake: 0 };
                        if (condition === BettingCondition.First) {
                            existing.firstStake += stats.totalStake;
                        } else {
                            existing.secondStake += stats.totalStake;
                        }
                        consolidatedNumbers.set(number, existing);
                    }
                }

                if (consolidatedNumbers.size === 0) return null;

                const sortedNumbers = Array.from(consolidatedNumbers.entries()).sort((a, b) => {
                    const totalA = a[1].firstStake + a[1].secondStake;
                    const totalB = b[1].firstStake + b[1].secondStake;
                    return totalB - totalA;
                });

                return (
                    <div key={gameType} className="bg-brand-bg p-4 rounded-lg border border-brand-secondary">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="text-lg font-bold text-brand-primary">{getGameTypeDisplayName(gameType)}</h4>
                            <p className="font-semibold text-brand-text">Total Stake: <span className="font-mono">RS. {totalGameStake.toLocaleString()}</span></p>
                        </div>
                        
                        <div className="overflow-x-auto max-h-96">
                            <table className="min-w-full text-sm text-left text-brand-text-secondary">
                                <thead className="text-xs text-brand-text uppercase bg-brand-secondary/80 sticky top-0">
                                    <tr>
                                        <th scope="col" className="px-6 py-3">Number Played</th>
                                        <th scope="col" className="px-6 py-3 text-right">First (F) Stake</th>
                                        <th scope="col" className="px-6 py-3 text-right">Second (S) Stake</th>
                                        <th scope="col" className="px-6 py-3 text-right">Total Stake</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-brand-secondary/50">
                                    {sortedNumbers.map(([number, stakes]) => (
                                        <tr key={number} className="hover:bg-brand-secondary/30">
                                            <td className="px-6 py-2 font-mono font-bold text-brand-text">{number}</td>
                                            <td className="px-6 py-2 text-right font-mono">{stakes.firstStake > 0 ? stakes.firstStake.toLocaleString() : '-'}</td>
                                            <td className="px-6 py-2 text-right font-mono">{stakes.secondStake > 0 ? stakes.secondStake.toLocaleString() : '-'}</td>
                                            <td className="px-6 py-2 text-right font-mono font-semibold text-brand-text">{(stakes.firstStake + stakes.secondStake).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};


const SmartReporting = () => {
    const { draws, clients, setDeclaredNumbers, betsByDraw } = useAppContext();
    const [selectedDrawId, setSelectedDrawId] = useState('');
    const [report, setReport] = useState<SmartAnalysisReport | SmartInterimReport | string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<string>('smart-power-report');
    const [selectedCondition, setSelectedCondition] = useState<'ALL' | 'FIRST' | 'SECOND'>('ALL');
    const [detailModal, setDetailModal] = useState<{ draw: Draw; winningNumber: string } | null>(null);
    const [numbersInput, setNumbersInput] = useState('');
    const [declareError, setDeclareError] = useState('');

    const reportableDraws = useMemo(() =>
        draws.filter(d => d.status === DrawStatus.Finished || d.status === DrawStatus.Closed || d.status === DrawStatus.Declared)
            .sort((a, b) => b.drawTime.getTime() - a.drawTime.getTime()),
        [draws]
    );

    const selectedDraw = useMemo(() => reportableDraws.find(d => d.id === selectedDrawId), [reportableDraws, selectedDrawId]);
    
    // This effect now ONLY runs when the user selects a different draw.
    // This prevents background data refreshes from wiping out the user's input.
    useEffect(() => {
        if (selectedDraw && selectedDraw.winningNumbers?.length > 0) {
            setNumbersInput(selectedDraw.winningNumbers.join(' '));
        } else {
            setNumbersInput('');
        }
        setDeclareError('');
    }, [selectedDrawId]);


    const drawSpecificStats = useMemo(() => {
        if (!selectedDrawId) return null;

        const relevantBets = betsByDraw.get(selectedDrawId) || [];
        if (relevantBets.length === 0) {
            return {
                totalPlayers: 0,
                totalBets: 0,
                totalStakes: 0,
            };
        }

        const totalPlayers = new Set(relevantBets.map(b => b.clientId)).size;
        const totalBets = relevantBets.length;
        const totalStakes = relevantBets.reduce((sum, bet) => sum + bet.stake, 0);

        return { totalPlayers, totalBets, totalStakes };
    }, [selectedDrawId, betsByDraw]);


    const generateReport = async () => {
        if (!selectedDraw || (selectedDraw.status !== DrawStatus.Finished && selectedDraw.status !== DrawStatus.Closed)) {
            alert('AI analysis can only be generated for closed or finished draws.');
            return;
        }
        setIsLoading(true);
        setReport(null);

        const relevantBets = betsByDraw.get(selectedDrawId) || [];
        const analysis = await getSmartAnalysis({ draw: selectedDraw, bets: relevantBets, clients });
        setReport(analysis);

        setIsLoading(false);
    };

    const handleDeclareNumbers = async () => {
        if (!selectedDraw) return;
        setDeclareError('');
    
        const parsedNumbers = numbersInput.trim().split(/[\s,]+/).filter(n => n);
    
        if (parsedNumbers.length !== 4) {
            setDeclareError('Please provide exactly 4 winning numbers, separated by spaces or commas.');
            return;
        }
        if (parsedNumbers.some(n => !/^\d{4}$/.test(n))) {
            setDeclareError('All winning numbers must be exactly 4 digits long.');
            return;
        }
    
        const confirmation = window.confirm(
            `You are about to declare the following numbers for Draw ${selectedDraw.name}:\n\n` +
            `First (F): ${parsedNumbers[0]}\n` +
            `Second (S): ${parsedNumbers.slice(1).join(', ')}\n\n` +
            `Is this correct?`
        );
    
        if (confirmation) {
            setIsLoading(true);
            try {
                await setDeclaredNumbers(selectedDraw.id, parsedNumbers);
            } catch (error) {
                console.error("Failed to declare numbers:", error);
                setDeclareError("An error occurred. Please try again.");
            } finally {
                setIsLoading(false);
            }
        }
    };

    const gameWiseBetBreakdown = useMemo(() => {
        if (!selectedDrawId) {
            return new Map<GameType, GameBetBreakdown>();
        }

        const relevantBets = betsByDraw.get(selectedDrawId) || [];
        const breakdown: FullBetBreakdown = new Map();

        for (const bet of relevantBets) {
            if (!breakdown.has(bet.gameType)) {
                breakdown.set(bet.gameType, new Map());
            }
            const gameBreakdown = breakdown.get(bet.gameType)!;

            if (!gameBreakdown.has(bet.condition)) {
                gameBreakdown.set(bet.condition, new Map());
            }
            const conditionBreakdown = gameBreakdown.get(bet.condition)!;

            if (!conditionBreakdown.has(bet.number)) {
                conditionBreakdown.set(bet.number, { totalStake: 0, count: 0 });
            }
            const numberStats = conditionBreakdown.get(bet.number)!;
            numberStats.totalStake += bet.stake;
            numberStats.count += 1;
        }

        return breakdown;
    }, [selectedDrawId, betsByDraw]);

    const handleSelectDraw = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedDrawId(e.target.value);
        setReport(null);
        setSelectedCondition('ALL');
    };

    const totalPossibleNumbersMap: Partial<Record<GameType, number>> = {
        [GameType.FourDigits]: 10000,
        [GameType.ThreeDigits]: 1000,
        [GameType.TwoDigits]: 100,
        [GameType.OneDigit]: 10,
        [GameType.Positional]: 0,
        [GameType.Combo]: 0,
    };

    const gameTabs: GameType[] = [
        GameType.FourDigits,
        GameType.ThreeDigits,
        GameType.TwoDigits,
        GameType.OneDigit,
        GameType.Positional,
        GameType.Combo,
    ];

    const currentTabBreakdown = useMemo(() => {
        const gameBreakdown = gameWiseBetBreakdown.get(activeTab as GameType);
        if (!gameBreakdown) return new Map();

        if (selectedCondition === 'ALL') {
            const combined = new Map<string, { totalStake: number, count: number }>();
            for (const conditionBreakdown of gameBreakdown.values()) {
                for (const [number, stats] of conditionBreakdown.entries()) {
                    const existing = combined.get(number) || { totalStake: 0, count: 0 };
                    existing.totalStake += stats.totalStake;
                    existing.count += stats.count;
                    combined.set(number, existing);
                }
            }
            return combined;
        } else {
            return gameBreakdown.get(selectedCondition as BettingCondition) || new Map();
        }
    }, [gameWiseBetBreakdown, activeTab, selectedCondition]);

    const totalPossible = totalPossibleNumbersMap[activeTab as GameType];
    const bookedCount = currentTabBreakdown?.size || 0;
    const unbookedCount = totalPossible ? totalPossible - bookedCount : 0;
    const bookedPercentage = totalPossible && totalPossible > 0 ? ((bookedCount / totalPossible) * 100).toFixed(2) : '0.00';
    const unbookedPercentage = totalPossible && totalPossible > 0 ? ((unbookedCount / totalPossible) * 100).toFixed(2) : '0.00';

    const unbookedNumbers = useMemo(() => {
        const totalPossible = totalPossibleNumbersMap[activeTab as GameType];
        if (!totalPossible) return null;

        const allPossible = [];
        const numDigits = 
            activeTab === GameType.OneDigit ? 1 :
            activeTab === GameType.TwoDigits ? 2 :
            activeTab === GameType.ThreeDigits ? 3 : 4;
        
        const maxNum = Math.pow(10, numDigits);
        for (let i = 0; i < maxNum; i++) {
            allPossible.push(i.toString().padStart(numDigits, '0'));
        }
        const booked = new Set(currentTabBreakdown?.keys() || []);
        return allPossible.filter(num => !booked.has(num));
    }, [activeTab, currentTabBreakdown]);

    const handleDownloadUnbooked = () => {
        if (!unbookedNumbers || unbookedNumbers.length === 0 || !selectedDraw) return;
        const content = unbookedNumbers.join('\n');
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `unbooked_numbers_${activeTab}_draw_${selectedDraw.name}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const drawCounts = useMemo(() => ({
        finished: reportableDraws.filter(d => d.status === DrawStatus.Finished).length,
        closed: reportableDraws.filter(d => d.status === DrawStatus.Closed).length,
        declared: reportableDraws.filter(d => d.status === DrawStatus.Declared).length
    }), [reportableDraws]);

    return (
        <div>
            <h2 className="text-2xl font-bold text-brand-text mb-4">Smart-Powered Draw Reporting</h2>
            
            <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatsCard title="Finished Draws" value={drawCounts.finished.toLocaleString()} className="text-blue-400" />
                <StatsCard title="Closed for Betting" value={drawCounts.closed.toLocaleString()} className="text-yellow-400" />
                <StatsCard title="Awaiting Finalization" value={drawCounts.declared.toLocaleString()} className="text-yellow-400" />
            </div>

            <div className="bg-brand-surface p-4 rounded-lg shadow border border-brand-secondary">
                <div className="flex flex-col md:flex-row items-center gap-4">
                    <select
                        value={selectedDrawId}
                        onChange={handleSelectDraw}
                        className="w-full md:w-auto flex-grow bg-brand-bg border border-brand-secondary rounded-md py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    >
                        <option value="">Select a Reportable Draw</option>
                        {reportableDraws.map(draw => (
                            <option key={draw.id} value={draw.id}>
                                Draw {draw.name} ({draw.status}) - {draw.drawTime.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={generateReport}
                        disabled={!selectedDrawId || isLoading || (selectedDraw?.status !== DrawStatus.Finished && selectedDraw?.status !== DrawStatus.Closed)}
                        className="w-full md:w-auto bg-brand-primary text-brand-bg font-bold py-2 px-4 rounded-md disabled:bg-brand-secondary disabled:cursor-not-allowed hover:bg-yellow-400 transition-colors"
                    >
                        {isLoading ? 'Generating...' : 'Generate AI Analysis'}
                    </button>
                </div>

                {selectedDraw && drawSpecificStats && (
                    <div className="mt-4 pt-4 border-t border-brand-secondary grid grid-cols-1 md:grid-cols-3 gap-4">
                        <StatsCard title="Total Players in Draw" value={drawSpecificStats.totalPlayers.toLocaleString()} />
                        <StatsCard title="Total Bets in Draw" value={drawSpecificStats.totalBets.toLocaleString()} />
                        <StatsCard 
                            title="Total Stakes in Draw" 
                            value={`RS. ${drawSpecificStats.totalStakes.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            className="text-green-400" 
                        />
                    </div>
                )}
            </div>

            {selectedDraw && (selectedDraw.status === DrawStatus.Closed || selectedDraw.status === DrawStatus.Declared) && (
                <div className="mt-4 bg-brand-surface p-4 rounded-lg border border-brand-accent shadow">
                    <h3 className="text-lg font-bold text-brand-accent mb-2">
                        {selectedDraw.status === DrawStatus.Declared ? 'Update Declared Numbers' : 'Declare Winning Numbers'}
                    </h3>
                    <p className="text-sm text-brand-text-secondary mb-3">
                        Paste all four winning numbers below, separated by spaces or commas. The first number will be the 'First (F)' prize winner.
                    </p>
                    <div className="flex flex-col md:flex-row gap-2 items-start">
                        <textarea
                            rows={1}
                            value={numbersInput}
                            onChange={e => setNumbersInput(e.target.value)}
                            placeholder="e.g., 1234 5678 9012 3456"
                            className="w-full flex-grow bg-brand-bg border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary font-mono text-lg"
                            disabled={isLoading}
                        />
                        <button 
                            onClick={handleDeclareNumbers}
                            disabled={isLoading || !numbersInput.trim()}
                            className="w-full md:w-auto bg-brand-accent text-white font-bold py-2 px-4 rounded-lg hover:bg-sky-400 disabled:bg-brand-secondary disabled:cursor-not-allowed transition-colors"
                        >
                            {isLoading ? 'Saving...' : 'Declare/Update'}
                        </button>
                    </div>
                    {declareError && <p className="text-red-400 text-sm mt-2">{declareError}</p>}
                </div>
            )}

            {selectedDraw && (selectedDraw.status === DrawStatus.Finished || selectedDraw.status === DrawStatus.Declared) && selectedDraw.winningNumbers?.length > 0 && (
                <div className="mt-4 bg-brand-bg p-4 rounded-lg border border-brand-secondary">
                    <h3 className="text-lg font-bold text-brand-text mb-3">Declared Winning Numbers</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
                        <div className="bg-brand-surface p-3 rounded-lg">
                            <p className="text-sm font-semibold text-brand-primary">First (F)</p>
                            <button
                                onClick={() => setDetailModal({ draw: selectedDraw, winningNumber: selectedDraw.winningNumbers[0] })}
                                className="text-4xl font-bold text-brand-primary font-mono tracking-wider hover:text-yellow-300 transition-colors"
                                title="Click to view winning bet breakdown"
                            >
                                {selectedDraw.winningNumbers[0]}
                            </button>
                        </div>
                        <div className="bg-brand-surface p-3 rounded-lg">
                            <p className="text-sm font-semibold text-brand-text-secondary">Second (S)</p>
                            <div className="flex justify-center items-center gap-4 text-xl font-semibold text-brand-text-secondary font-mono tracking-wider">
                                {selectedDraw.winningNumbers.slice(1).map((num, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setDetailModal({ draw: selectedDraw, winningNumber: num })}
                                        className="hover:text-brand-text transition-colors"
                                        title="Click to view winning bet breakdown"
                                    >
                                        {num}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {selectedDraw && (
                 <div className="mt-6">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-3 gap-2">
                        <h3 className="text-xl font-bold text-brand-primary">Betting Book for Draw {selectedDraw.name}</h3>
                        <div className="flex items-center gap-2 bg-brand-secondary p-1 rounded-lg">
                            <button onClick={() => setSelectedCondition('ALL')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${selectedCondition === 'ALL' ? 'bg-brand-primary text-brand-bg' : 'text-brand-text-secondary hover:bg-brand-surface'}`}>
                                All
                            </button>
                            <button onClick={() => setSelectedCondition('FIRST')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${selectedCondition === 'FIRST' ? 'bg-brand-primary text-brand-bg' : 'text-brand-text-secondary hover:bg-brand-surface'}`}>
                                First (F)
                            </button>
                            <button onClick={() => setSelectedCondition('SECOND')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${selectedCondition === 'SECOND' ? 'bg-brand-primary text-brand-bg' : 'text-brand-text-secondary hover:bg-brand-surface'}`}>
                                Second (S)
                            </button>
                        </div>
                    </div>
                     <div className="border-b border-brand-secondary mb-4">
                        <nav className="-mb-px flex space-x-4 overflow-x-auto">
                             <button
                                onClick={() => setActiveTab('smart-power-report')}
                                className={`whitespace-nowrap px-4 py-2 font-semibold rounded-t-lg transition-colors ${activeTab === 'smart-power-report' ? 'bg-brand-surface text-brand-primary border-b-2 border-brand-primary' : 'text-brand-text-secondary hover:bg-brand-surface/50'}`}
                            >
                                Smart-Powered Report
                            </button>
                            <button
                                onClick={() => setActiveTab('winners-list')}
                                className={`whitespace-nowrap px-4 py-2 font-semibold rounded-t-lg transition-colors ${activeTab === 'winners-list' ? 'bg-brand-surface text-brand-primary border-b-2 border-brand-primary' : 'text-brand-text-secondary hover:bg-brand-surface/50'}`}
                            >
                                Winners List
                            </button>
                            <button
                                onClick={() => setActiveTab('game-sheet')}
                                className={`whitespace-nowrap px-4 py-2 font-semibold rounded-t-lg transition-colors ${activeTab === 'game-sheet' ? 'bg-brand-surface text-brand-primary border-b-2 border-brand-primary' : 'text-brand-text-secondary hover:bg-brand-surface/50'}`}
                            >
                                Game-wise Sheet
                            </button>
                            <button
                                onClick={() => setActiveTab('comprehensive')}
                                className={`whitespace-nowrap px-4 py-2 font-semibold rounded-t-lg transition-colors ${activeTab === 'comprehensive' ? 'bg-brand-surface text-brand-primary border-b-2 border-brand-primary' : 'text-brand-text-secondary hover:bg-brand-surface/50'}`}
                            >
                                Comprehensive Book
                            </button>
                           {gameTabs.map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`whitespace-nowrap px-4 py-2 font-semibold rounded-t-lg transition-colors ${activeTab === tab ? 'bg-brand-surface text-brand-primary border-b-2 border-brand-primary' : 'text-brand-text-secondary hover:bg-brand-surface/50'}`}
                                >
                                    {getGameTypeDisplayName(tab)}
                                </button>
                            ))}
                        </nav>
                    </div>
                     <div className="bg-brand-surface p-4 rounded-b-lg rounded-r-lg shadow border border-brand-secondary">
                        {activeTab === 'smart-power-report' ? (
                            <DrawProfitLossReport draw={selectedDraw} conditionFilter={selectedCondition} />
                        ) : activeTab === 'winners-list' ? (
                            <WinnersReport draw={selectedDraw} />
                        ) : activeTab === 'game-sheet' ? (
                            <GameWiseSheetComponent gameBreakdown={gameWiseBetBreakdown} selectedDraw={selectedDraw} />
                        ) : activeTab === 'comprehensive' ? (
                            <ComprehensiveBook draw={selectedDraw} conditionFilter={selectedCondition} />
                        ) : (
                            <>
                                {totalPossible && totalPossible > 0 && (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-center">
                                        <StatsCard title="Total Possible Numbers" value={totalPossible.toLocaleString()} />
                                        <StatsCard title="Unique Booked Numbers" value={`${bookedCount.toLocaleString()} (${bookedPercentage}%)`} className="text-green-400" />
                                        <StatsCard title="Unbooked Numbers" value={`${unbookedCount.toLocaleString()} (${unbookedPercentage}%)`} className="text-brand-text-secondary" />
                                    </div>
                                )}
                                {currentTabBreakdown && currentTabBreakdown.size > 0 ? (
                                    <div className="overflow-x-auto max-h-96">
                                        <table className="min-w-full text-sm text-left text-brand-text-secondary">
                                            <thead className="text-xs text-brand-text uppercase bg-brand-secondary/80 sticky top-0">
                                                <tr>
                                                    <th scope="col" className="px-6 py-3">Number</th>
                                                    <th scope="col" className="px-6 py-3 text-right">Total Stake</th>
                                                    <th scope="col" className="px-6 py-3 text-center">Times Played</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-brand-secondary/50">
                                                {Array.from(currentTabBreakdown.entries()).sort((a,b) => b[1].totalStake - a[1].totalStake).map(([number, data]) => (
                                                    <tr key={number} className="hover:bg-brand-secondary/30 transition-colors">
                                                        <td className="px-6 py-3 font-mono font-bold text-brand-text">{number}</td>
                                                        <td className="px-6 py-3 text-right font-mono">RS. {data.totalStake.toLocaleString()}</td>
                                                        <td className="px-6 py-3 text-center">{data.count}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-center text-brand-text-secondary py-4">No bets were placed for this game type in this draw.</p>
                                )}
                                {unbookedNumbers && unbookedNumbers.length > 0 && (
                                     <div className="mt-6 pt-4 border-t border-brand-secondary">
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="text-lg font-bold text-brand-text">Unbooked Numbers ({unbookedNumbers.length})</h4>
                                            {unbookedNumbers.length > 0 && (
                                                <button
                                                    onClick={handleDownloadUnbooked}
                                                    className="bg-brand-accent text-white text-sm font-bold py-1 px-3 rounded-md hover:bg-sky-400 transition-colors"
                                                >
                                                    Download List (.txt)
                                                </button>
                                            )}
                                        </div>
                                        
                                        {unbookedNumbers.length > 0 ? (
                                            <div className="flex flex-wrap gap-2 bg-brand-bg p-2 rounded-md max-h-48 overflow-y-auto">
                                                {unbookedNumbers.map(num => (
                                                    <span key={num} className="font-mono text-sm px-2 py-1 rounded bg-brand-secondary text-brand-text-secondary">
                                                        {num}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-center text-green-400 py-4">All possible numbers for this game were booked!</p>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {isLoading && !report && (
                <div className="mt-4 text-center">
                    <div role="status" className="flex justify-center items-center space-x-2">
                        <svg aria-hidden="true" className="w-8 h-8 text-brand-secondary animate-spin fill-brand-primary" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                            <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0492C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
                        </svg>
                        <span className="text-brand-text-secondary">Generating report with Gemini Smart...</span>
                    </div>
                </div>
            )}

            {report && (
                <div className="mt-6 bg-brand-surface p-6 rounded-lg shadow border border-brand-secondary animate-fade-in-down">
                    <h3 className="text-xl font-bold text-brand-primary mb-4">AI Analysis for Draw {selectedDraw?.name}</h3>
                    {typeof report === 'string' ? (
                        <p className="text-red-400">{report}</p>
                    ) : 'netProfitAnalysis' in report ? (
                        <div className="space-y-4 text-brand-text">
                            <div className="bg-brand-secondary/30 p-4 rounded-lg">
                                <h4 className="font-bold text-lg text-brand-primary">{report.headline}</h4>
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-brand-secondary/30 p-4 rounded-lg">
                                     <p className="text-sm font-bold text-brand-text-secondary mb-1">Profitability</p>
                                     <p>{report.netProfitAnalysis}</p>
                                </div>
                                <div className="bg-brand-secondary/30 p-4 rounded-lg">
                                     <p className="text-sm font-bold text-brand-text-secondary mb-1">Participation</p>
                                    <p>{report.performanceAnalysis}</p>
                                </div>
                                <div className="bg-brand-secondary/30 p-4 rounded-lg">
                                    <p className="text-sm font-bold text-brand-text-secondary mb-1">Conclusion</p>
                                    <p>{report.conclusion}</p>
                                </div>
                             </div>
                        </div>
                    ) : (
                        <div className="space-y-4 text-brand-text">
                            <div className="bg-brand-secondary/30 p-4 rounded-lg">
                                <h4 className="font-bold text-lg text-brand-primary">{report.headline}</h4>
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-brand-secondary/30 p-4 rounded-lg">
                                     <p className="text-sm font-bold text-brand-text-secondary mb-1">Risk Analysis</p>
                                     <p>{report.riskAnalysis}</p>
                                </div>
                                <div className="bg-brand-secondary/30 p-4 rounded-lg">
                                     <p className="text-sm font-bold text-brand-text-secondary mb-1">Participation Trend</p>
                                    <p>{report.participationAnalysis}</p>
                                </div>
                                <div className="bg-brand-secondary/30 p-4 rounded-lg">
                                    <p className="text-sm font-bold text-brand-text-secondary mb-1">Conclusion</p>
                                    <p>{report.conclusion}</p>
                                </div>
                             </div>
                        </div>
                    )}
                </div>
            )}

            {detailModal && (
                <Modal 
                    title={`Winning Bet Breakdown for: ${detailModal.winningNumber}`} 
                    onClose={() => setDetailModal(null)}
                >
                    <WinningNumberBreakdown draw={detailModal.draw} winningNumber={detailModal.winningNumber} />
                </Modal>
            )}
        </div>
    );
};

export default SmartReporting;