import React, { useState, useContext, createContext, useMemo, useCallback, useEffect, useRef } from 'react';
import { Client, Draw, Bet, Role, AppContextType, DrawStatus, BettingCondition, GameType, MarketOverride, Transaction, TransactionType, ClientImportData } from '../types/index.ts';
import { normalizeClientData } from '../utils/helpers.ts';
import { defaultPrizeRates, defaultCommissionRates } from '../data/mockData.ts';

const AppContext = createContext<AppContextType | null>(null);

// Helper for API calls
const apiFetch = async (path: string, options: RequestInit = {}) => {
    const API_BASE_URL = ''; // Backend server address is relative
    const token = localStorage.getItem('ddl_token');
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');

    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api${path}`, { ...options, headers });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred.' }));
            throw new Error(errorData.message || `Request failed with status ${response.status}`);
        }
        if (response.status === 204) { // Handle No Content response
            return null;
        }
        return response.json();
    } catch (error) {
        console.error(`API call to ${API_BASE_URL}/api${path} failed:`, error);
        throw error;
    }
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [clients, setClients] = useState<Client[]>([]);
    const [draws, setDraws] = useState<Draw[]>([]);
    const [bets, setBets] = useState<Bet[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [marketOverride, setMarketOverrideState] = useState<MarketOverride>('AUTO');
    const [currentClient, setCurrentClient] = useState<Client | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSecondaryLoading, setIsSecondaryLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const pollingTimeoutRef = useRef<number | null>(null);

    const logout = useCallback(async () => {
        localStorage.removeItem('ddl_token');
        setCurrentClient(null);
        setClients([]);
        setBets([]);
        setTransactions([]);
    }, []);

    const refreshCurrentClient = useCallback(async () => {
        if (!localStorage.getItem('ddl_token')) {
            return;
        }
        try {
            const userData = await apiFetch('/auth/me');
            if (userData) {
                setCurrentClient(normalizeClientData(userData));
            } else {
                 await logout(); // Token is invalid
            }
        } catch (error) {
            console.error("Failed to refresh current client, logging out.", error);
            await logout();
        }
    }, [logout]);
    
    const fetchSecondaryData = useCallback(async (client: Client) => {
        try {
            if (client.role === Role.Admin) {
                const [clientsResult, betsResult, transactionsResult, marketDataResult] = await Promise.allSettled([
                    apiFetch('/admin/clients'),
                    apiFetch('/admin/bets'),
                    apiFetch('/admin/transactions'),
                    apiFetch('/admin/market-override'),
                ]);

                if (clientsResult.status === 'fulfilled' && clientsResult.value) {
                    setClients(clientsResult.value.map(normalizeClientData));
                } else {
                    console.error("Failed to fetch clients:", clientsResult.status === 'rejected' ? clientsResult.reason : 'No data');
                    setClients([]);
                }
                
                if (betsResult.status === 'fulfilled' && betsResult.value) {
                    setBets(betsResult.value.map((b: any) => ({...b, stake: Number(b.stake), createdAt: new Date(b.createdAt)})));
                } else {
                    console.error("Failed to fetch bets:", betsResult.status === 'rejected' ? betsResult.reason : 'No data');
                    setBets([]);
                }

                if (transactionsResult.status === 'fulfilled' && transactionsResult.value) {
                    setTransactions(transactionsResult.value.map((t: any) => ({...t, amount: Number(t.amount), balanceAfter: Number(t.balanceAfter), createdAt: new Date(t.createdAt), isReversed: !!t.isReversed })));
                } else {
                    console.error("Failed to fetch transactions:", transactionsResult.status === 'rejected' ? transactionsResult.reason : 'No data');
                    setTransactions([]);
                }

                if (marketDataResult.status === 'fulfilled' && marketDataResult.value) {
                    setMarketOverrideState(marketDataResult.value.override);
                } else {
                    console.error("Failed to fetch market override:", marketDataResult.status === 'rejected' ? marketDataResult.reason : 'No data');
                }

            } else {
                const [clientBets, clientTransactions] = await Promise.all([
                    apiFetch('/client/bets'),
                    apiFetch('/client/transactions')
                ]);
                setClients([]); // Clients don't see other clients
                setBets(clientBets.map((b: any) => ({...b, stake: Number(b.stake), createdAt: new Date(b.createdAt)})));
                setTransactions(clientTransactions.map((t: any) => ({...t, amount: Number(t.amount), balanceAfter: Number(t.balanceAfter), createdAt: new Date(t.createdAt), isReversed: !!t.isReversed })));
            }
        } catch (error) {
             console.error("An error occurred in fetchSecondaryData:", error);
        }
    }, []);


    // --- PERFORMANCE OPTIMIZATION ---
    // This effect has been refactored to fetch data incrementally.
    // `isLoading` is set to false after essential data (draws/auth) loads,
    // allowing the UI to render while secondary data loads in the background.
    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;
    
        const initialLoad = async () => {
            try {
                if (error) setError(null);
    
                // --- Parallel Fetching of critical data ---
                const drawsPromise = apiFetch('/draws', { signal });
                const authPromise = localStorage.getItem('ddl_token') ? apiFetch('/auth/me', { signal }) : Promise.resolve(null);
    
                const [drawsResult, authResult] = await Promise.allSettled([drawsPromise, authPromise]);
    
                // --- Process Draw Data ---
                if (drawsResult.status === 'fulfilled' && drawsResult.value) {
                    setDraws(drawsResult.value.map((d: Draw) => ({ ...d, drawTime: new Date(d.drawTime) })));
                } else {
                    console.error("Failed to fetch draws:", drawsResult.status === 'rejected' ? drawsResult.reason : 'No data');
                    throw new Error("Could not fetch draw information.");
                }
                
                // --- UNBLOCK UI RENDER ---
                // The main app can now render with public draw data.
                setIsLoading(false);
    
                // --- Process Authentication & Fetch Secondary Data ---
                if (authResult.status === 'fulfilled' && authResult.value) {
                    const loggedInClient = normalizeClientData(authResult.value);
                    setCurrentClient(loggedInClient);
                    setIsSecondaryLoading(true);
                    await fetchSecondaryData(loggedInClient);
                    setIsSecondaryLoading(false);
                } else {
                    if (authResult.status === 'rejected') {
                        console.error("Session restore failed, logging out.", authResult.reason);
                        await logout();
                    }
                    setIsSecondaryLoading(false); // No user, so no secondary data to load.
                }
    
            } catch (err: any) {
                if (err.name !== 'AbortError') {
                    console.error("Initial data load failed:", err);
                    setError("Could not connect to the server. Please check your connection and try again.");
                    setIsLoading(false);
                    setIsSecondaryLoading(false);
                }
            }
        };
    
        const pollData = async () => {
            try {
                const drawsData = await apiFetch('/draws', { signal });
                setDraws(drawsData.map((d: Draw) => ({ ...d, drawTime: new Date(d.drawTime) })));
                
                if (localStorage.getItem('ddl_token')) {
                    await refreshCurrentClient();
                }
    
            } catch (err: any) {
                 if (err.name !== 'AbortError') {
                    console.error("Data polling failed:", err);
                 }
            } finally {
                if (!signal.aborted) {
                    pollingTimeoutRef.current = window.setTimeout(pollData, 15000);
                }
            }
        };
    
        const runInitialLoadAndStartPolling = async () => {
            await initialLoad();
            if (!signal.aborted) {
                pollingTimeoutRef.current = window.setTimeout(pollData, 15000);
            }
        };
    
        runInitialLoadAndStartPolling();
    
        return () => {
            controller.abort();
            if (pollingTimeoutRef.current) {
                clearTimeout(pollingTimeoutRef.current);
            }
        };
    }, [logout, fetchSecondaryData, refreshCurrentClient, error]);

    const login = useCallback(async (loginIdentifier: string, password: string, role: Role): Promise<{ success: boolean; message?: string }> => {
        try {
            const data = await apiFetch('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ loginIdentifier, password, role }),
            });
            localStorage.setItem('ddl_token', data.token);

            const userData = await apiFetch('/auth/me');
            if(!userData) {
                throw new Error('Login succeeded but failed to retrieve user profile. Please try again.');
            }
            
            const normalized = normalizeClientData(userData);
            setCurrentClient(normalized);

            // Fetch secondary data in the background after login
            setIsSecondaryLoading(true);
            await fetchSecondaryData(normalized);
            setIsSecondaryLoading(false);

            const drawsData = await apiFetch('/draws');
            setDraws(drawsData.map((d: Draw) => ({ ...d, drawTime: new Date(d.drawTime) })));

            return { success: true };
        } catch (error: any) {
            await logout();
            setIsSecondaryLoading(false); // Ensure this is reset on error
            return { success: false, message: error.message };
        }
    }, [fetchSecondaryData, logout]);
    
    const placeBulkBetsForCurrentClient = useCallback(async (betsToPlace: Omit<Bet, 'id' | 'clientId'>[]): Promise<{ successCount: number; message: string; }> => {
        if (!currentClient || currentClient.role !== Role.Client) {
            return { successCount: 0, message: "This feature is for clients only." };
        }
        try {
            const result = await apiFetch('/client/bets', {
                method: 'POST',
                body: JSON.stringify({ bets: betsToPlace }),
            });
            
            setCurrentClient(result.updatedClient);
            setBets(prev => [...prev, ...result.newBets.map((b: any) => ({...b, stake: Number(b.stake), createdAt: new Date(b.createdAt)}))]);
            setTransactions(prev => [...prev, ...result.newTransactions.map((t: any) => ({...t, amount: Number(t.amount), balanceAfter: Number(t.balanceAfter), createdAt: new Date(t.createdAt), isReversed: !!t.isReversed }))]);

            return { successCount: result.newBets.length, message: result.message };
        } catch (error: any) {
             return { successCount: 0, message: error.message };
        }
    }, [currentClient]);
    
    const setDeclaredNumbers = useCallback(async (drawId: string, winningNumbers: string[]): Promise<void> => {
        try {
            await apiFetch(`/admin/draws/${drawId}/declared-numbers`, {
                method: 'PUT',
                body: JSON.stringify({ winningNumbers }),
            });
            const drawsData = await apiFetch('/draws');
            setDraws(drawsData.map((d: Draw) => ({ ...d, drawTime: new Date(d.drawTime) })));
            alert(`Declared numbers for draw ${drawId} updated successfully!`);
        } catch (error: any) {
            alert(`Failed to set declared numbers: ${error.message}`);
        }
    }, []);

    const declareWinner = useCallback(async (drawId: string, winningNumbers: string[]): Promise<void> => {
         try {
            await apiFetch(`/admin/draws/${drawId}/declare-winner`, {
                method: 'POST',
                body: JSON.stringify({ winningNumbers }),
            });
            
            const [drawsData, clientsData, betsData, transactionsData] = await Promise.all([
                apiFetch('/draws'),
                apiFetch('/admin/clients'),
                apiFetch('/admin/bets'),
                apiFetch('/admin/transactions')
            ]);
            
            setDraws(drawsData.map((d: Draw) => ({ ...d, drawTime: new Date(d.drawTime) })));
            setClients(clientsData.map(normalizeClientData));
            setBets(betsData.map((b: any) => ({...b, stake: Number(b.stake), createdAt: new Date(b.createdAt)})));
            setTransactions(transactionsData.map((t: any) => ({...t, amount: Number(t.amount), balanceAfter: Number(t.balanceAfter), createdAt: new Date(t.createdAt), isReversed: !!t.isReversed })));

            alert(`Winners for draw ${drawId} declared successfully!`);
        } catch (error: any) {
            alert(`Failed to declare winner: ${error.message}`);
        }
    }, []);
    
    const registerClient = useCallback(async (clientData: Omit<Client, 'id' | 'role' | 'isActive'>): Promise<{ success: boolean, message: string }> => {
        try {
            const newClient = await apiFetch('/admin/clients', {
                method: 'POST',
                body: JSON.stringify(clientData),
            });
            setClients(prev => [...prev, normalizeClientData(newClient)]);
            return { success: true, message: 'Client registered successfully.' };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }, []);
    
    const adjustClientWallet = useCallback(async (clientId: string, amount: number, type: TransactionType, description: string): Promise<{ success: boolean, message: string }> => {
        try {
            const updatedClientData = await apiFetch(`/admin/clients/${clientId}/wallet`, {
                method: 'POST',
                body: JSON.stringify({ amount, type, description }),
            });
            const updatedClient = normalizeClientData(updatedClientData);

            setClients(prev => prev.map(c => c.id === clientId ? updatedClient : c));
            if (currentClient?.id === clientId) {
                setCurrentClient(updatedClient);
            }

            const transactionsResult = await apiFetch('/admin/transactions');
            setTransactions(transactionsResult.map((t: any) => ({...t, amount: Number(t.amount), balanceAfter: Number(t.balanceAfter), createdAt: new Date(t.createdAt), isReversed: !!t.isReversed })));
            
            return { success: true, message: 'Wallet updated successfully.' };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }, [currentClient]);
    
    const updateClientDetailsByAdmin = useCallback(async (clientId: string, details: { clientId?: string; username?: string; contact?: string; area?: string; }): Promise<{ success: boolean, message: string }> => {
         try {
            const updatedClient = await apiFetch(`/admin/clients/${clientId}`, {
                method: 'PUT',
                body: JSON.stringify(details),
            });
            setClients(prev => prev.map(c => c.id === clientId ? normalizeClientData(updatedClient) : c));
            return { success: true, message: 'Client details updated successfully.' };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }, []);

    const changeClientPasswordByAdmin = useCallback(async (clientId: string, newPassword: string, callback: (result: { success: boolean, message: string }) => void): Promise<void> => {
        try {
            await apiFetch(`/admin/clients/${clientId}/password`, {
                method: 'PUT',
                body: JSON.stringify({ newPassword }),
            });
            callback({ success: true, message: 'Password updated successfully.' });
        } catch (error: any) {
            callback({ success: false, message: error.message });
        }
    }, []);

    const updateClientCredentials = useCallback(async (data: { currentPassword: string, newUsername?: string, newPassword?: string }) => {
        if (!currentClient) {
            return { success: false, message: 'No user is currently logged in.' };
        }
        const apiPath = currentClient.role === Role.Admin
            ? '/admin/profile/credentials'
            : '/client/credentials';
            
        try {
            const updatedUser = await apiFetch(apiPath, {
                method: 'PUT',
                body: JSON.stringify(data),
            });
            setCurrentClient(normalizeClientData(updatedUser));
            return { success: true, message: 'Credentials updated successfully.' };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }, [currentClient]);

    const placeBetsForClient = useCallback(async (betsToPlace: Omit<Bet, 'id' | 'clientId'>[], clientId: string): Promise<{ successCount: number; message: string; }> => {
        try {
            const result = await apiFetch(`/admin/bets`, {
                method: 'POST',
                body: JSON.stringify({ bets: betsToPlace, clientId }),
            });
            
            setClients(prev => prev.map(c => c.id === clientId ? result.updatedClient : c));
            setBets(prev => [...prev, ...result.newBets.map((b: any) => ({...b, stake: Number(b.stake), createdAt: new Date(b.createdAt)}))]);
            setTransactions(prev => [...prev, ...result.newTransactions.map((t: any) => ({...t, amount: Number(t.amount), balanceAfter: Number(t.balanceAfter), createdAt: new Date(t.createdAt), isReversed: !!t.isReversed }))]);

            return { successCount: result.newBets.length, message: result.message };
        } catch (error: any) {
            return { successCount: 0, message: error.message };
        }
    }, []);
    
    const getDrawStats = useCallback(async (drawId: string): Promise<any> => {
        return apiFetch(`/admin/reports/draw/${drawId}`);
    }, []);
    
    const getLiveDrawAnalysis = useCallback(async (drawId: string): Promise<any> => {
        return apiFetch(`/admin/reports/live/${drawId}`);
    }, []);
    
    const updateClient = useCallback(async (updatedClient: Client): Promise<void> => {
        try {
            const result = await apiFetch(`/admin/clients/${updatedClient.id}`, {
                method: 'PUT',
                body: JSON.stringify(updatedClient),
            });
            setClients(prev => prev.map(c => c.id === updatedClient.id ? normalizeClientData(result) : c));
        } catch (error: any) {
             console.error("Failed to update client:", error.message);
        }
    }, []);

    const updateDrawTime = useCallback(async (drawId: string, newTime: Date) => {
        try {
            await apiFetch(`/admin/draws/${drawId}/time`, {
                method: 'PUT',
                body: JSON.stringify({ newTime: newTime.toISOString() }),
            });
            const drawsData = await apiFetch('/draws');
            setDraws(drawsData.map((d: Draw) => ({ ...d, drawTime: new Date(d.drawTime) })));
            alert('Draw time updated successfully.');
        } catch (error: any) {
            alert(`Failed to update draw time: ${error.message}`);
        }
    }, []);

    const shiftAllDrawTimes = useCallback(async (minutes: number) => {
        try {
            await apiFetch('/admin/draws/shift-all', {
                method: 'POST',
                body: JSON.stringify({ minutes }),
            });
            const drawsData = await apiFetch('/draws');
            setDraws(drawsData.map((d: Draw) => ({ ...d, drawTime: new Date(d.drawTime) })));
            alert('All draw times shifted successfully.');
        } catch (error: any) {
            alert(`Failed to shift draw times: ${error.message}`);
        }
    }, []);


    const setMarketOverride = useCallback(async (override: MarketOverride) => {
        try {
            await apiFetch('/admin/market-override', {
                method: 'POST',
                body: JSON.stringify({ override }),
            });
            setMarketOverrideState(override);
            const drawsData = await apiFetch('/draws');
            setDraws(drawsData.map((d: Draw) => ({ ...d, drawTime: new Date(d.drawTime) })));
        } catch (error: any) {
            alert(`Failed to set market override: ${error.message}`);
        }
    }, []);
    
    const reverseWinningTransaction = useCallback(async (transactionId: string): Promise<{ success: boolean, message: string }> => {
        try {
            await apiFetch(`/admin/transactions/${transactionId}/reverse`, {
                method: 'POST',
            });
            
            const [clientsData, transactionsData] = await Promise.all([
                apiFetch('/admin/clients'),
                apiFetch('/admin/transactions')
            ]);
            setClients(clientsData.map(normalizeClientData));
            setTransactions(transactionsData.map((t: any) => ({...t, amount: Number(t.amount), balanceAfter: Number(t.balanceAfter), createdAt: new Date(t.createdAt), isReversed: !!t.isReversed })));

            return { success: true, message: 'Transaction reversed successfully.' };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }, []);

    const toggleDrawStatus = async (drawId: string) => { console.warn("toggleDrawStatus not implemented"); };
    const importClientsFromCSV = async (clientsData: ClientImportData[]) => { console.warn("importClientsFromCSV not implemented"); return { successCount: 0, errorCount: clientsData.length, errorMessages: ["Not implemented"] }; };

    const placeBet = useCallback(async (bet: Omit<Bet, 'id' | 'clientId'>): Promise<{ success: boolean; message: string }> => {
        const result = await placeBulkBetsForCurrentClient([bet]);
        return {
            success: result.successCount > 0,
            message: result.message,
        };
    }, [placeBulkBetsForCurrentClient]);

    const betsByDraw = useMemo(() => {
        const map = new Map<string, Bet[]>();
        for (const bet of bets) {
            const drawBets = map.get(bet.drawId);
            if (drawBets) {
                drawBets.push(bet);
            } else {
                map.set(bet.drawId, [bet]);
            }
        }
        return map;
    }, [bets]);

    const value: AppContextType = useMemo(() => ({
        isLoading, isSecondaryLoading,
        currentClient, clients, draws, bets, betsByDraw, transactions, marketOverride,
        login, logout, setMarketOverride, placeBulkBetsForCurrentClient,
        declareWinner, registerClient, adjustClientWallet, updateClientDetailsByAdmin,
        changeClientPasswordByAdmin, toggleDrawStatus, updateClientCredentials,
        getDrawStats, getLiveDrawAnalysis, importClientsFromCSV,
        placeBetsForClient, updateDrawTime, shiftAllDrawTimes,
        updateClient,
        placeBet,
        setDeclaredNumbers,
        reverseWinningTransaction,
    }), [
        isLoading, isSecondaryLoading,
        currentClient, clients, draws, bets, betsByDraw, transactions, marketOverride,
        login, logout, placeBulkBetsForCurrentClient,
        declareWinner, registerClient, adjustClientWallet, updateClientDetailsByAdmin,
        changeClientPasswordByAdmin, updateClientCredentials,
        getDrawStats, getLiveDrawAnalysis,
        placeBetsForClient, updateDrawTime, shiftAllDrawTimes,
        updateClient, placeBet, setDeclaredNumbers, setMarketOverride, reverseWinningTransaction
    ]);
    
    if (error && !currentClient) {
        return (
           <div className="min-h-screen bg-brand-bg flex items-center justify-center text-brand-text p-4">
               <div className="bg-brand-surface p-8 rounded-lg border border-danger max-w-lg text-center shadow-lg animate-fade-in-down">
                   <h1 className="text-2xl font-bold text-danger mb-4">Connection Error</h1>
                   <p className="mb-4">{error}</p>
                   <p className="text-sm text-brand-text-secondary">Please try refreshing the page after ensuring the backend server is running.</p>
               </div>
           </div>
       );
   }

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = (): AppContextType => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};