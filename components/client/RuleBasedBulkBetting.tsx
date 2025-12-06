import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { parseMessageWithRules } from '../../services/RuleBasedParser';
import { ParsedBet, GameType, BettingCondition } from '../../types';
import { getGameTypeDisplayName } from '../../utils/helpers';
import Countdown from '../common/Countdown.tsx';

const RuleBasedBulkBetting = () => {
    const { currentClient, draws, placeBulkBetsForCurrentClient } = useAppContext();
    const [selectedDrawId, setSelectedDrawId] = useState('');
    const [message, setMessage] = useState('');
    const [parsedBets, setParsedBets] = useState<ParsedBet[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [manualNumber, setManualNumber] = useState('');
    const [manualStake, setManualStake] = useState('5');
    const [selectedCondition, setSelectedCondition] = useState<BettingCondition>(BettingCondition.First);

    const openDraws = draws.filter(d => d.status === 'OPEN');

    useEffect(() => {
        if (openDraws.length > 0 && !openDraws.find(d => d.id === selectedDrawId)) {
            setSelectedDrawId(openDraws[0].id);
        } else if (openDraws.length === 0) {
            setSelectedDrawId('');
        }
    }, [openDraws, selectedDrawId]);

    const handleParseMessage = () => {
        if (!message.trim()) {
            setNotification({ type: 'error', message: 'Message cannot be empty.' });
            return;
        }
        setIsLoading(true);
        setNotification(null);
        try {
            const { parsedBets: bets, errors } = parseMessageWithRules(message);

            if (errors.length > 0) {
                // Display validation errors to the user.
                setNotification({ type: 'error', message: errors.join('\n') });
            } else if (bets.length === 0) {
                // Only show this if there are no validation errors but also no bets.
                setNotification({ type: 'error', message: "Parser could not find any valid bets in the message. Please check the format." });
            }
            
            setParsedBets(bets);
        } catch (error) {
            console.error(error);
            setNotification({ type: 'error', message: "An error occurred while parsing the message." });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handlePlaceBets = async () => {
        if (!currentClient) {
            setNotification({ type: 'error', message: "You must be logged in." });
            return;
        }
        if (!selectedDrawId) {
            setNotification({ type: 'error', message: "Please select an open draw." });
            return;
        }
        if (parsedBets.length === 0) {
            setNotification({ type: 'error', message: "No bets to place." });
            return;
        }

        setIsLoading(true);

        try {
            const betsToPlace = parsedBets.map(b => ({
                drawId: selectedDrawId,
                gameType: b.gameType,
                number: b.number,
                stake: b.stake,
                createdAt: new Date(),
                condition: b.condition || selectedCondition,
            }));
            
            const result = await placeBulkBetsForCurrentClient(betsToPlace);
            setNotification({ type: result.successCount > 0 ? 'success' : 'error', message: result.message });
            if (result.successCount > 0) {
                setParsedBets([]);
                setMessage('');
                setManualNumber('');
                setManualStake('5');
            }
        } finally {
            setIsLoading(false);
        }
    };
    
    const getGameTypeForNumber = (numStr: string): GameType => {
        switch (numStr.length) {
            case 1: return GameType.OneDigit;
            case 2: return GameType.TwoDigits;
            case 3: return GameType.ThreeDigits;
            default: return GameType.FourDigits;
        }
    };

    const handleManualAdd = (e: React.FormEvent) => {
        e.preventDefault();
        const stake = parseInt(manualStake, 10);
        if (manualNumber.length > 0 && manualNumber.length <= 4 && stake > 0) {
            const newBet = {
                number: manualNumber,
                stake: stake,
                gameType: getGameTypeForNumber(manualNumber)
            };
            setParsedBets(prev => [...prev, newBet]);
            setManualNumber('');
            setManualStake('5');
        }
    };

    const totalStake = parsedBets.reduce((sum, bet) => sum + bet.stake, 0);

    return (
        <div>
            <h2 className="text-xl font-bold text-brand-text mb-4">Rule-Based Bulk Betting</h2>
            {openDraws.length > 0 && currentClient ? (
                <div className="space-y-6">
                     <div>
                        <label className="block text-sm font-bold text-brand-text-secondary mb-2">Select an Open Draw</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {openDraws.map(draw => {
                                const isSelected = draw.id === selectedDrawId;
                                const bettingCloseTime = new Date(draw.drawTime.getTime() - 10 * 60 * 1000);
                                return (
                                    <button
                                        key={draw.id}
                                        onClick={() => setSelectedDrawId(draw.id)}
                                        className={`p-3 rounded-lg border text-center transition-all duration-200 ${isSelected ? 'bg-brand-primary/20 border-brand-primary ring-2 ring-brand-primary shadow-lg' : 'bg-brand-surface border-brand-secondary hover:border-brand-primary/50'}`}
                                    >
                                        <h4 className="font-bold text-brand-text">Draw {draw.name}</h4>
                                        <p className="text-xs text-brand-text-secondary mb-2">Time: {draw.drawTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                        <Countdown targetDate={bettingCloseTime} />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                   
                    <div>
                        <label htmlFor="bet-message" className="block text-sm font-bold text-brand-text-secondary mb-2">
                            Paste Your Message
                        </label>
                        <textarea
                            id="bet-message"
                            rows={6}
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            placeholder="Paste your full betting message here, then click 'Parse Message' below."
                            className="w-full bg-brand-bg border border-brand-secondary rounded-lg py-3 px-4 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary font-mono"
                            disabled={isLoading}
                        />
                         <button 
                            onClick={handleParseMessage} 
                            disabled={isLoading || !message.trim() || !selectedDrawId}
                            className="mt-2 w-full bg-brand-accent text-white font-bold py-2 px-4 rounded-lg hover:bg-sky-400 disabled:bg-brand-secondary disabled:cursor-not-allowed transition-colors"
                        >
                            {isLoading ? 'Parsing...' : 'Parse Message'}
                        </button>
                    </div>

                    <div className="text-center text-brand-text-secondary">or</div>

                    <div>
                        <label className="block text-sm font-bold text-brand-text-secondary mb-2">Add Bets Manually</label>
                        <form onSubmit={handleManualAdd} className="flex flex-wrap gap-4 items-end bg-brand-bg p-4 rounded-lg border border-brand-secondary">
                            <div className="flex-grow">
                                <label className="text-xs font-bold text-brand-text-secondary">Number (1-4 digits)</label>
                                <input type="text" value={manualNumber} onChange={e => setManualNumber(e.target.value.replace(/[^0-9]/g, ''))} maxLength={4} className="w-full bg-brand-surface border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary font-mono text-lg" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-brand-text-secondary">Stake</label>
                                <input type="number" value={manualStake} min="1" step="1" onChange={e => setManualStake(e.target.value)} className="w-full bg-brand-surface border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                            </div>
                            <button type="submit" disabled={!manualNumber || manualNumber.length === 0} className="bg-brand-accent text-white font-bold py-2 px-4 rounded-lg hover:bg-sky-400 disabled:bg-brand-secondary">Add Bet</button>
                        </form>
                    </div>

                    {parsedBets.length > 0 && (
                        <div className="bg-brand-bg p-4 rounded-lg border border-brand-secondary">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-lg font-bold text-brand-primary">Review Bets</h3>
                                <button onClick={() => setParsedBets([])} className="text-xs text-red-400 hover:text-red-300">Clear All Bets</button>
                            </div>
                            <div className="overflow-x-auto max-h-64">
                                <table className="min-w-full text-sm text-left text-brand-text-secondary">
                                    <thead className="text-xs text-brand-text uppercase bg-brand-secondary/50 sticky top-0">
                                        <tr>
                                            <th scope="col" className="px-6 py-3">Number</th>
                                            <th scope="col" className="px-6 py-3">Game Type</th>
                                            <th scope="col" className="px-6 py-3">Condition</th>
                                            <th scope="col" className="px-6 py-3 text-right">Stake</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-brand-surface">
                                        {parsedBets.map((bet, index) => (
                                            <tr key={index} className="border-b border-brand-secondary hover:bg-brand-secondary/20">
                                                <td className="px-6 py-2 font-mono text-brand-text">{bet.number}</td>
                                                <td className="px-6 py-2">{getGameTypeDisplayName(bet.gameType)}</td>
                                                <td className="px-6 py-2">{bet.condition || selectedCondition}</td>
                                                <td className="px-6 py-2 text-right font-mono">{bet.stake.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-4 pt-4 border-t border-brand-secondary flex flex-col md:flex-row justify-between items-center gap-4">
                               <div className="text-lg font-bold">
                                   <span>Total Bets: <span className="text-brand-primary">{parsedBets.length}</span></span>
                                   <span className="mx-4">|</span>
                                   <span>Total Stake: <span className="text-brand-primary">RS. {totalStake.toLocaleString('en-US',{minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></span>
                               </div>
                               <button onClick={handlePlaceBets} disabled={isLoading || !selectedDrawId} className="w-full md:w-auto bg-brand-primary hover:bg-yellow-400 text-brand-bg font-bold py-3 px-6 rounded-lg disabled:bg-brand-secondary disabled:cursor-not-allowed transition-colors">
                                   {isLoading ? 'Placing Bets...' : 'Confirm & Place Bets'}
                               </button>
                            </div>
                        </div>
                    )}
                    {notification && (
                        <div className={`mt-4 p-3 rounded-lg text-sm text-center ${notification.type === 'success' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
                            {notification.message}
                        </div>
                    )}
                </div>
            ) : (
                <p className="text-center text-yellow-400 font-semibold p-4 bg-brand-surface rounded-lg">The market is currently closed. Bulk betting is disabled.</p>
            )}
        </div>
    );
};

export default RuleBasedBulkBetting;
