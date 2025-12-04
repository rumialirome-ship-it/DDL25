import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAppContext } from '../../contexts/AppContext.tsx';
import { Draw, DrawStatus } from '../../types/index.ts';
import * as CountdownModule from './Countdown.tsx';
const Countdown = CountdownModule.default;
import * as SpinningNumberModule from './SpinningNumber.tsx';
const SpinningNumber = SpinningNumberModule.default;

const getStatusStyles = (status: DrawStatus) => {
    switch (status) {
        case DrawStatus.Open: return { badge: 'bg-green-500/20 text-green-400', text: 'text-green-400' };
        case DrawStatus.Closed: return { badge: 'bg-yellow-500/20 text-yellow-400', text: 'text-yellow-400' };
        case DrawStatus.Declared: return { badge: 'bg-yellow-500/20 text-yellow-400', text: 'text-yellow-400' };
        case DrawStatus.Finished: return { badge: 'bg-blue-500/20 text-blue-400', text: 'text-blue-400' };
        case DrawStatus.Upcoming: return { badge: 'bg-gray-500/20 text-gray-400', text: 'text-gray-400' };
        case DrawStatus.Suspended: return { badge: 'bg-red-500/20 text-red-400', text: 'text-red-400' };
        default: return { badge: 'bg-brand-secondary text-brand-text-secondary', text: 'text-brand-text-secondary' };
    }
};

const DrawStatusCard: React.FC<{ draw: Draw; prevDraw?: Draw }> = ({ draw, prevDraw }) => {
    const styles = getStatusStyles(draw.status);
    const displayTime = draw.drawTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    type RevealStage = 'IDLE' | 'SPINNING' | 'REVEALED';
    const [stage, setStage] = useState<RevealStage>('IDLE');

    // Effect 1: Determine the current stage based on draw status changes
    useEffect(() => {
        const wasJustDeclared = (prevDraw?.status === DrawStatus.Closed || prevDraw?.status === DrawStatus.Open) && draw.status === DrawStatus.Declared;
        
        if (wasJustDeclared) {
            setStage('SPINNING');
        } else if (draw.status === DrawStatus.Finished) {
            setStage('REVEALED');
        } else if (draw.status === DrawStatus.Declared) {
            if (stage === 'IDLE') { // Handle page refresh
                setStage('SPINNING');
            }
        } else {
            setStage('IDLE');
        }
    }, [draw, prevDraw, stage]);
    
    // Effect 2: Manage the spinning duration
    useEffect(() => {
        if (stage !== 'SPINNING') {
            return;
        }

        const spinTimer = setTimeout(() => {
            setStage('REVEALED');
        }, 50000); // 50 seconds

        return () => clearTimeout(spinTimer);
    }, [stage]);

    const renderCardBody = () => {
        switch (stage) {
            case 'SPINNING':
                return (
                    <div className="w-full space-y-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mb-2 inline-block ${styles.badge}`}>
                            Revealing Soon...
                        </span>
                        <div>
                            <p className="text-xs text-brand-primary font-semibold">First (F)</p>
                            <div className="text-brand-primary font-bold text-4xl leading-tight tracking-wider font-mono h-[48px] flex items-center justify-center">
                                <SpinningNumber length={4} size="large" />
                            </div>
                        </div>
                        <div>
                            <p className="text-xs text-green-400 font-semibold">Second (S)</p>
                            <div className="flex justify-center items-center gap-2 mt-1 flex-wrap">
                                <SpinningNumber length={4} size="small" />
                                <SpinningNumber length={4} size="small" />
                                <SpinningNumber length={4} size="small" />
                            </div>
                        </div>
                    </div>
                );
            case 'REVEALED':
                const numbersToShow = draw.winningNumbers || [];
                return (
                     <div className="w-full space-y-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mb-2 inline-block ${styles.badge}`}>
                            Result Declared
                        </span>
                        <div>
                            <p className="text-xs text-brand-primary font-semibold">First (F)</p>
                            <div className="text-brand-primary font-bold text-4xl leading-tight tracking-wider font-mono animate-fade-in-down h-[48px] flex items-center justify-center">
                                {numbersToShow[0] || '----'}
                            </div>
                        </div>
                        <div>
                            <p className="text-xs text-green-400 font-semibold">Second (S)</p>
                            <div className="flex justify-center items-center gap-2 mt-1 flex-wrap text-lg font-mono">
                                <span className="animate-fade-in-down" style={{animationDelay: '0.2s'}}>{numbersToShow[1] || '----'}</span>
                                <span className="animate-fade-in-down" style={{animationDelay: '0.4s'}}>{numbersToShow[2] || '----'}</span>
                                <span className="animate-fade-in-down" style={{animationDelay: '0.6s'}}>{numbersToShow[3] || '----'}</span>
                            </div>
                        </div>
                    </div>
                );
            case 'IDLE':
            default:
                if (draw.status === DrawStatus.Open) {
                    const bettingCloseTime = new Date(draw.drawTime.getTime() - 10 * 60 * 1000);
                    return (
                        <div>
                            <span className={`text-sm font-bold px-3 py-1 rounded-full mb-2 inline-block ${styles.badge}`}>
                                {draw.status}
                            </span>
                            <div className="mt-1">
                                <p className="text-xs text-brand-text-secondary mb-1">Booking closes in:</p>
                                <Countdown targetDate={bettingCloseTime} />
                            </div>
                        </div>
                    );
                }
                return (
                     <span className={`text-sm font-bold px-3 py-1 rounded-full ${styles.badge}`}>
                        {draw.status}
                    </span>
                );
        }
    };

    return (
        <div className="bg-brand-surface border border-brand-secondary p-4 rounded-xl shadow-lg text-center flex flex-col justify-between h-full transition-all duration-300 hover:border-brand-primary/80 hover:shadow-glow transform hover:-translate-y-1">
            <div className="border-b border-brand-secondary/50 pb-2 mb-3">
                 <h3 className="font-bold text-brand-text text-lg">{`Draw ${draw.name}`}</h3>
                 <p className="text-sm text-brand-text-secondary">{displayTime}</p>
            </div>
            
            <div className="flex-grow flex flex-col items-center justify-center min-h-[100px]">
                {renderCardBody()}
            </div>
        </div>
    );
};


const MarketStatus: React.FC = () => {
    const { draws } = useAppContext();
    const prevDrawsRef = useRef<Draw[] | undefined>(undefined);

    useEffect(() => {
        prevDrawsRef.current = draws;
    }, [draws]);
    
    return (
        <div className="bg-brand-surface/50 p-6 rounded-xl shadow-lg border border-brand-secondary">
            <h2 className="text-2xl font-semibold text-brand-primary mb-4 text-center">Today's Draw Status ({draws.length > 0 ? `${draws.length} Draws` : ''})</h2>

            {draws.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                     {draws.sort((a, b) => a.drawTime.getTime() - b.drawTime.getTime()).map(draw => {
                        const prevDraw = prevDrawsRef.current?.find(d => d.id === draw.id);
                        return <DrawStatusCard key={draw.id} draw={draw} prevDraw={prevDraw} />;
                    })}
                </div>
            ) : (
                <p className="text-center text-brand-text-secondary my-4">No draws scheduled for today.</p>
            )}
        </div>
    );
};

export default MarketStatus;