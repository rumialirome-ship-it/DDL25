

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAppContext } from '../../contexts/AppContext.tsx';
import { Draw, Bet, GameType, BettingCondition, Client, PrizeRate, PositionalPrizeRates } from '../../types/index.ts';
import * as SortableHeaderModule from '../common/SortableHeader.tsx';
const SortableHeader = SortableHeaderModule.default;
import * as ModalModule from '../common/Modal.tsx';
const Modal = ModalModule.default;
import * as DrawProfitLossDetailModule from './DrawProfitLossDetail.tsx';
const DrawProfitLossDetail = DrawProfitLossDetailModule.default;
import ReportWorker from '../../workers/report-worker.ts?worker';

// Data structure for each row in the report
export interface ReportRow {
    playedNumber: string;
    source1D: string[];
    source2D: string[];
    source3D: string[];
    source4D: string[];
    totalStake: number;
    totalCommission: number;
    potentialPrize: number;
}

type SortKey = 'playedNumber' | 'totalStake' | 'totalCommission' | 'potentialPrize' | 'netTotal';

const formatCurrency = (amount: number) => {
    if (amount === 0) return '-';
    return amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

const DetailIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline ml-2 opacity-60 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);


const DrawProfitLossReport: React.FC<{ draw: Draw; conditionFilter: 'ALL' | 'FIRST' | 'SECOND' }> = ({ draw, conditionFilter }) => {
    const { betsByDraw, clients } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [sort, setSort] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'potentialPrize', direction: 'desc' });
    const [currentPage, setCurrentPage] = useState(1);
    const [detailsForNumber, setDetailsForNumber] = useState<string | null>(null);
    const [processedData, setProcessedData] = useState<ReportRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const workerRef = useRef<Worker | null>(null);
    const ITEMS_PER_PAGE = 100;

    useEffect(() => {
        const worker = new ReportWorker();
        workerRef.current = worker;
        
        worker.onmessage = (event: MessageEvent) => {
            if (event.data.type === 'PROFIT_LOSS_REPORT_RESULT') {
                setProcessedData(event.data.payload);
                setIsLoading(false);
            }
        };

        return () => {
            worker.terminate();
        };
    }, []);

    useEffect(() => {
        if (workerRef.current && draw) {
            setIsLoading(true);
            const relevantBets = betsByDraw.get(draw.id) || [];
            workerRef.current.postMessage({
                type: 'PROFIT_LOSS_REPORT',
                payload: {
                    draw,
                    bets: relevantBets,
                    clients,
                    conditionFilter
                }
            });
        }
    }, [draw, betsByDraw, clients, conditionFilter]);

    const displayedData = useMemo(() => {
        let data = [...processedData];
        if (searchTerm) {
            data = data.filter(item => item.playedNumber.includes(searchTerm));
        }

        data.sort((a, b) => {
            let valA, valB;
            const key = sort.key;
            if (key === 'netTotal') {
                valA = a.totalStake - a.totalCommission - a.potentialPrize;
                valB = b.totalStake - b.totalCommission - b.potentialPrize;
            } else {
                valA = a[key as keyof ReportRow];
                valB = b[key as keyof ReportRow];
            }
            if (typeof valA === 'object') valA = (valA as string[]).length;
            if (typeof valB === 'object') valB = (valB as string[]).length;

            if (valA < valB) return sort.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sort.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return data;
    }, [processedData, searchTerm, sort]);

    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return displayedData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [displayedData, currentPage]);
    
    const totalPages = Math.ceil(displayedData.length / ITEMS_PER_PAGE);

    const handleSort = (key: SortKey) => {
        setSort(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
        setCurrentPage(1);
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, draw.id, conditionFilter]);

    const winningNumbersSet = new Set(draw.winningNumbers || []);

    if (isLoading) {
        return (
            <div className="text-center py-10">
                <p className="text-brand-text-secondary animate-pulse">Calculating smart-powered report...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
             <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <input
                    type="text"
                    placeholder="Search for a played number..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full md:w-72 bg-brand-bg border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
                <p className="text-sm text-brand-text-secondary">
                    Showing {paginatedData.length} of {displayedData.length} potential outcomes
                </p>
            </div>
            <div className="overflow-x-auto max-h-[60vh]">
                 <table className="min-w-full text-sm text-left text-brand-text-secondary whitespace-nowrap">
                    <thead className="text-xs text-brand-text uppercase bg-brand-secondary/80 sticky top-0">
                        <tr>
                            <SortableHeader onClick={() => handleSort('playedNumber')} sortKey="playedNumber" currentSort={sort.key} direction={sort.direction}>Played Number</SortableHeader>
                            <th className="px-4 py-3" title="Original 1-digit bets (e.g., '1') that contributed to this outcome.">Contributing 1D Bets</th>
                            <th className="px-4 py-3" title="Original 2-digit or positional bets (e.g., '12', 'X1X2') that contributed to this outcome.">Contributing 2D/Positional Bets</th>
                            <th className="px-4 py-3" title="Original 3-digit or positional bets that contributed to this outcome.">Contributing 3D/Positional Bets</th>
                            <th className="px-4 py-3" title="Original 4-digit or positional bets that match this outcome.">Contributing 4D/Positional Bets</th>
                            <SortableHeader onClick={() => handleSort('totalStake')} sortKey="totalStake" currentSort={sort.key} direction={sort.direction} className="text-right">Stake Amount (₨)</SortableHeader>
                            <SortableHeader onClick={() => handleSort('totalCommission')} sortKey="totalCommission" currentSort={sort.key} direction={sort.direction} className="text-right">Commission (₨)</SortableHeader>
                            <SortableHeader onClick={() => handleSort('potentialPrize')} sortKey="potentialPrize" currentSort={sort.key} direction={sort.direction} className="text-right">Potential Prize (₨)</SortableHeader>
                            <SortableHeader onClick={() => handleSort('netTotal')} sortKey="netTotal" currentSort={sort.key} direction={sort.direction} className="text-right">Net Result (₨)</SortableHeader>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-secondary/50">
                       {paginatedData.map(item => {
                           const netTotal = item.totalStake - item.totalCommission - item.potentialPrize;
                           const isWinner = winningNumbersSet.has(item.playedNumber);

                           return (
                            <tr key={item.playedNumber} className={`hover:bg-brand-secondary/30 ${isWinner ? 'bg-yellow-400/20' : ''}`}>
                                <td className={`px-4 py-2 font-mono font-bold`}>
                                    <button 
                                        onClick={() => setDetailsForNumber(item.playedNumber)} 
                                        className={`group w-full text-left flex items-center ${isWinner ? 'text-brand-primary' : 'text-brand-text'} hover:underline transition-colors`}
                                        title={`View details for ${item.playedNumber}`}
                                    >
                                        {item.playedNumber}
                                        <DetailIcon />
                                    </button>
                                </td>
                                <td className="px-4 py-2 font-mono">{item.source1D.join(', ')}</td>
                                <td className="px-4 py-2 font-mono">{item.source2D.join(', ')}</td>
                                <td className="px-4 py-2 font-mono">{item.source3D.join(', ')}</td>
                                <td className="px-4 py-2 font-mono">{item.source4D.join(', ')}</td>
                                <td className="px-4 py-2 font-mono text-right">{formatCurrency(item.totalStake)}</td>
                                <td className="px-4 py-2 font-mono text-right text-blue-400">{formatCurrency(item.totalCommission)}</td>
                                <td className="px-4 py-2 font-mono text-right text-yellow-400">{formatCurrency(item.potentialPrize)}</td>
                                <td className={`px-4 py-2 font-mono text-right font-bold ${netTotal >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(netTotal)}</td>
                            </tr>
                           )
                       })}
                    </tbody>
                </table>
                 {displayedData.length === 0 && (
                    <div className="text-center py-8">
                        <p className="text-brand-text-secondary">No betting data found{searchTerm && ' with the current filter'}.</p>
                    </div>
                )}
            </div>
             {totalPages > 1 && (
                <div className="flex justify-between items-center pt-2">
                    <button
                        onClick={() => setCurrentPage(p => p - 1)}
                        disabled={currentPage === 1}
                        className="bg-brand-secondary hover:bg-opacity-80 text-brand-text font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                    >
                        &larr; Previous
                    </button>
                    <span className="font-semibold text-brand-text-secondary">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(p => p + 1)}
                        disabled={currentPage === totalPages}
                        className="bg-brand-secondary hover:bg-opacity-80 text-brand-text font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                    >
                        Next &rarr;
                    </button>
                </div>
            )}

            {detailsForNumber && (
                <Modal title={`Bet Details for Number: ${detailsForNumber}`} onClose={() => setDetailsForNumber(null)}>
                    <DrawProfitLossDetail 
                        draw={draw}
                        playedNumber={detailsForNumber}
                        conditionFilter={conditionFilter}
                    />
                </Modal>
            )}
        </div>
    );
};

export default DrawProfitLossReport;