import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../contexts/AppContext.tsx';
import { Draw, DrawStatus, MarketOverride } from '../../types/index.ts';
import Modal from '../common/Modal.tsx';
import DrawReport from './DrawReport.tsx';
import LiveBettingReport from './LiveBettingReport.tsx';


const DrawManagement = () => {
    const { draws, declareWinner, setDeclaredNumbers, marketOverride, setMarketOverride, updateDrawTime } = useAppContext();
    const [winningNumbers, setWinningNumbers] = useState<{ [key: string]: string[] }>({});
    const [selectedReportDraw, setSelectedReportDraw] = useState<Draw | null>(null);
    const [selectedLiveReportDraw, setSelectedLiveReportDraw] = useState<Draw | null>(null);
    const [timeModalState, setTimeModalState] = useState<{ draw: Draw } | null>(null);
    const [newTimeValue, setNewTimeValue] = useState('');
    const [editingDrawId, setEditingDrawId] = useState<string | null>(null);


    useEffect(() => {
        setWinningNumbers(currentNumbers => {
            const newNumbersState = { ...currentNumbers };
            let hasChanged = false;
            for (const draw of draws) {
                if (!Object.prototype.hasOwnProperty.call(newNumbersState, draw.id)) {
                    // Initialize with existing declared numbers if they exist, otherwise empty strings
                    newNumbersState[draw.id] = draw.winningNumbers?.length === 4 ? draw.winningNumbers : ['', '', '', ''];
                    hasChanged = true;
                }
            }
            return hasChanged ? newNumbersState : currentNumbers;
        });
    }, [draws]);

    const validateNumbers = (numbersToValidate: string[]): boolean => {
        if (!Array.isArray(numbersToValidate) || numbersToValidate.length !== 4 || numbersToValidate.some(n => !/^\d{4}$/.test(n))) {
            alert('Error: All four fields must be filled with a 4-digit number.');
            return false;
        }
        return true;
    };

    const handleSetDeclaredNumbers = (drawId: string) => {
        const numbersForThisDraw = winningNumbers[drawId];
        if (!validateNumbers(numbersForThisDraw)) return;
        setDeclaredNumbers(drawId, numbersForThisDraw);
    };

    const handleFinalizeAndPay = (drawId: string) => {
        const numbersForThisDraw = winningNumbers[drawId];
        if (!validateNumbers(numbersForThisDraw)) return;
        declareWinner(drawId, numbersForThisDraw);
        setEditingDrawId(null);
    };
    
    const handleNumberChange = (drawId: string, value: string, index: number) => {
        const currentNumbers = [...(winningNumbers[drawId] || ['', '', '', ''])];
        currentNumbers[index] = value.replace(/[^0-9]/g, '').slice(0, 4);
        setWinningNumbers(prev => ({ ...prev, [drawId]: currentNumbers }));
    };

    const handleStartEdit = (draw: Draw) => {
        setEditingDrawId(draw.id);
        const existingNumbers = draw.winningNumbers || [];
        const numbersForEditing = [
            existingNumbers[0] || '',
            existingNumbers[1] || '',
            existingNumbers[2] || '',
            existingNumbers[3] || '',
        ];
        setWinningNumbers(prev => ({ ...prev, [draw.id]: numbersForEditing }));
    };
    
    const handleCancelEdit = () => {
        setEditingDrawId(null);
    };

    const getStatusColor = (status: DrawStatus) => {
        switch (status) {
            case DrawStatus.Open: return 'text-green-400';
            case DrawStatus.Closed: return 'text-yellow-400';
            case DrawStatus.Declared: return 'text-yellow-400';
            case DrawStatus.Finished: return 'text-blue-400';
            case DrawStatus.Upcoming: return 'text-gray-400';
            case DrawStatus.Suspended: return 'text-gray-500';
        }
    };

    const handleViewReport = (draw: Draw) => {
        if(draw.status === DrawStatus.Finished) {
            setSelectedReportDraw(draw);
        }
    };

    const handleViewLiveReport = (e: React.MouseEvent, draw: Draw) => {
        e.stopPropagation();
        if (draw.status === DrawStatus.Open || draw.status === DrawStatus.Closed || draw.status === DrawStatus.Declared) {
            setSelectedLiveReportDraw(draw);
        }
    };

    const handleOpenTimeModal = (draw: Draw) => {
        const timeString = draw.drawTime.toTimeString().substring(0, 5); // HH:mm format
        setNewTimeValue(timeString);
        setTimeModalState({ draw });
    };
    
    const handleUpdateTime = () => {
        if (timeModalState?.draw && newTimeValue) {
            const draw = timeModalState.draw;
            const [hours, minutes] = newTimeValue.split(':').map(Number);
            const newDate = new Date(draw.drawTime);
            newDate.setHours(hours, minutes, 0, 0);
            updateDrawTime(draw.id, newDate);
            setTimeModalState(null);
        }
    };
    
    const handleReopenDraw = (draw: Draw) => {
        const confirmation = window.confirm(
            `Are you sure you want to re-open Draw ${draw.name} by delaying its time by 15 minutes?`
        );
        if (confirmation) {
            const newTime = new Date(draw.drawTime.getTime() + 15 * 60 * 1000);
            updateDrawTime(draw.id, newTime);
        }
    };

    const handleSetMarketOverride = (mode: MarketOverride) => {
        if (mode === 'AUTO') {
            setMarketOverride(mode);
            return;
        }

        const action = mode === 'OPEN' ? 'open' : 'close';
        const confirmation = window.confirm(
            `Are you sure you want to forcefully ${action} the market for all draws? This will override the automatic schedule.`
        );

        if (confirmation) {
            setMarketOverride(mode);
        }
    };


    const MarketControlButton = ({ mode, label }: { mode: MarketOverride, label: string }) => {
        const isActive = marketOverride === mode;
        const baseClasses = "font-bold py-2 px-4 rounded-lg transition-colors flex-1";
        const activeClasses = "bg-brand-primary text-brand-bg shadow-lg";
        const inactiveClasses = "bg-brand-secondary hover:bg-opacity-80 text-brand-text-secondary";

        return (
            <button onClick={() => handleSetMarketOverride(mode)} className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}>
                {label}
            </button>
        );
    };
    
    const getMarketStatusDescription = () => {
        switch(marketOverride) {
            case 'OPEN': return { text: 'Market is Manually OPEN', color: 'text-green-400' };
            case 'CLOSED': return { text: 'Market is Manually CLOSED', color: 'text-red-400' };
            default: return { text: 'Market is running on Automatic schedule', color: 'text-blue-400' };
        }
    }

    const marketStatusInfo = getMarketStatusDescription();

    const renderTimeModalContent = () => {
        if (!timeModalState) return null;
    
        return (
            <div className="space-y-4">
                <p className="text-brand-text-secondary">Current draw time: {timeModalState.draw.drawTime.toLocaleTimeString()}</p>
                <div>
                    <label className="block text-brand-text-secondary text-sm font-bold mb-2" htmlFor="newTime">New Draw Time</label>
                    <input id="newTime" type="time" value={newTimeValue} onChange={e => setNewTimeValue(e.target.value)} className="w-full bg-brand-bg border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                </div>
                <button onClick={handleUpdateTime} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Save Time</button>
            </div>
        );
    };

    const numberInputLabels = [
        'First (F) Number',
        'Second (S) #1',
        'Second (S) #2',
        'Second (S) #3'
    ];

    return (
        <div>
            <h2 className="text-2xl font-bold text-brand-text mb-4">Draw Management</h2>
            
            <div className="bg-brand-surface p-4 rounded-lg border border-brand-secondary mb-6">
                <h3 className="text-lg font-bold text-brand-text mb-2">Global Market Control</h3>
                <p className={`text-sm mb-4 font-semibold ${marketStatusInfo.color}`}>{marketStatusInfo.text}</p>
                <div className="flex flex-col md:flex-row gap-2">
                    <MarketControlButton mode="AUTO" label="Set to Automatic" />
                    <MarketControlButton mode="OPEN" label="Force Open Market" />
                    <MarketControlButton mode="CLOSED" label="Force Close Market" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {draws.map(draw => {
                    const isEditing = editingDrawId === draw.id;
                    const isFinished = draw.status === DrawStatus.Finished;
                    const isSuspended = draw.status === DrawStatus.Suspended;
                    const isClosed = draw.status === DrawStatus.Closed;
                    const isDeclared = draw.status === DrawStatus.Declared;
                    const shouldShowNumbers = (isFinished || isDeclared) && !isEditing;
                    const canEnterNumbers = isClosed || isDeclared || isEditing;
                    const isFinalized = isFinished || isSuspended;

                    return (
                        <div
                            key={draw.id}
                            className={`bg-brand-surface rounded-lg shadow p-4 border flex flex-col ${isEditing ? 'border-brand-primary shadow-glow' : 'hover:border-brand-primary/80 border-brand-secondary'} ${shouldShowNumbers && isFinished ? 'cursor-pointer' : ''}`}
                            onClick={() => shouldShowNumbers && isFinished && handleViewReport(draw)}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="font-bold text-brand-text text-lg">Draw {draw.name}</h3>
                                    <p className={`text-sm font-semibold ${getStatusColor(draw.status)}`}>
                                        {draw.status}
                                        {isEditing && <span className="text-yellow-400"> (Editing)</span>}
                                    </p>
                                </div>
                                <span className="text-sm text-brand-text-secondary font-mono">{draw.drawTime.toLocaleTimeString()}</span>
                            </div>
                            
                            <div className="flex-grow mt-2">
                                {shouldShowNumbers ? (
                                    <div>
                                        <p className="text-brand-text-secondary text-sm mb-1">Winning Numbers:</p>
                                        {draw.winningNumbers && draw.winningNumbers.length > 0 ? (
                                            <>
                                                <p className="text-3xl font-bold text-brand-primary font-mono" title="First Position Number (F)">
                                                    {draw.winningNumbers[0]} <span className="text-xs text-yellow-500">(F)</span>
                                                </p>
                                                {draw.winningNumbers.length > 1 && (
                                                    <div className="text-brand-text-secondary text-sm font-mono mt-1" title="Second Position Numbers (S)">
                                                        {draw.winningNumbers.slice(1).join(' • ')} <span className="text-xs">(S)</span>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <p className="text-brand-text-secondary text-sm font-mono">(Numbers Missing)</p>
                                        )}
                                        <div className="flex justify-between items-center mt-3">
                                            <p className="text-xs text-brand-text-secondary">{isFinished ? 'Click card to view report' : 'Numbers are now public.'}</p>
                                            <button onClick={(e) => { e.stopPropagation(); handleStartEdit(draw); }} className="bg-brand-accent text-white font-bold py-1 px-3 rounded-md hover:bg-sky-400 text-sm transition-colors">
                                                Edit
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {!isFinalized && (
                                            <div className="flex flex-wrap gap-2">
                                                <button onClick={() => handleOpenTimeModal(draw)} className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-3 rounded-md transition-colors text-sm">Adjust Time</button>
                                                <button onClick={() => handleReopenDraw(draw)} className="flex-1 bg-teal-600 hover:bg-teal-500 text-white font-bold py-2 px-3 rounded-md transition-colors text-sm">Re-open (Delay 15m)</button>
                                            </div>
                                        )}
                                        
                                        {canEnterNumbers && (
                                             <div className="space-y-2 pt-4 border-t border-brand-secondary/50">
                                                {numberInputLabels.map((label, index) => (
                                                    <input
                                                        key={index} type="text" maxLength={4} placeholder={label}
                                                        value={(winningNumbers[draw.id] || [])[index] || ''}
                                                        onChange={(e) => handleNumberChange(draw.id, e.target.value, index)}
                                                        className="w-full bg-brand-bg border border-brand-secondary rounded-md py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                                        disabled={isFinished && !isEditing}
                                                    />
                                                ))}
                                                <div className="flex gap-2 items-center flex-wrap pt-2">
                                                    {isEditing ? (
                                                        <>
                                                            <button onClick={(e) => { e.stopPropagation(); handleFinalizeAndPay(draw.id); }} className="flex-grow bg-green-600 text-white font-bold py-2 px-4 rounded-md hover:bg-green-700 transition-colors">
                                                                Update & Finalize
                                                            </button>
                                                            <button onClick={(e) => { e.stopPropagation(); handleCancelEdit(); }} className="bg-gray-500 text-white p-2 rounded-md hover:bg-gray-600 transition-colors" title="Cancel Edit">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"/></svg>
                                                            </button>
                                                        </>
                                                    ) : (
                                                    <>
                                                            <button onClick={() => handleSetDeclaredNumbers(draw.id)} className="flex-grow bg-brand-accent text-white font-bold py-2 px-3 rounded-md hover:bg-sky-400 transition-colors">Declare Numbers</button>
                                                            <button onClick={() => handleFinalizeAndPay(draw.id)} disabled={!(isClosed || isDeclared)} className="flex-grow bg-brand-primary text-brand-bg font-bold py-2 px-3 rounded-md disabled:bg-brand-secondary disabled:cursor-not-allowed hover:bg-yellow-400 transition-colors">Finalize & Pay</button>
                                                    </>
                                                    )}
                                                    
                                                    {(draw.status === DrawStatus.Open || draw.status === DrawStatus.Closed || isDeclared) && (
                                                        <button onClick={(e) => handleViewLiveReport(e, draw)} className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 transition-colors" title="View Live Trend Report">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M11 2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v12h.5a.5.5 0 0 1 0 1H.5a.5.5 0 0 1 0-1H1v-3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3h1V7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7h1V2z"/></svg>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
             {selectedReportDraw && (
                <Modal title={`Report for Draw ${selectedReportDraw.name}`} onClose={() => setSelectedReportDraw(null)}>
                    <DrawReport draw={selectedReportDraw} />
                </Modal>
            )}
             {selectedLiveReportDraw && (
                <Modal title={`Live Trend Report for Draw ${selectedLiveReportDraw.name}`} onClose={() => setSelectedLiveReportDraw(null)}>
                    <LiveBettingReport draw={selectedLiveReportDraw} />
                </Modal>
            )}
             {timeModalState && (
                <Modal 
                    title={`Edit Time for Draw ${timeModalState.draw.name}`} 
                    onClose={() => setTimeModalState(null)}
                >
                    {renderTimeModalContent()}
                </Modal>
            )}
        </div>
    );
};

export default DrawManagement;