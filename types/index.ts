export enum Role { Admin = 'ADMIN', Client = 'CLIENT' }
export enum DrawStatus { Upcoming = 'UPCOMING', Open = 'OPEN', Closed = 'CLOSED', Finished = 'FINISHED', Suspended = 'SUSPENDED', Declared = 'DECLARED' }
export enum GameType { OneDigit = '1D', TwoDigits = '2D', ThreeDigits = '3D', FourDigits = '4D', Combo = 'COMBO', Positional = 'POSITIONAL' }
export enum BettingCondition { First = 'FIRST', Second = 'SECOND' }
export enum TransactionType { Debit = 'DEBIT', Credit = 'CREDIT' }

export interface PrizeRate {
    first: number;
    second: number;
}

export interface PositionalPrizeRates {
    1: PrizeRate; // For patterns with 1 specified digit, e.g., 'X1XX'
    2: PrizeRate; // For patterns with 2 specified digits, e.g., 'X1X2'
    3: PrizeRate; // For patterns with 3 specified digits, e.g., '71X2'
    4: PrizeRate; // For patterns with 4 specified digits, e.g., '7142'
}

export interface Client {
    id: string;
    clientId: string;
    username: string;
    password?: string; // Made optional as it won't always be sent from backend
    role: Role;
    wallet: number;
    area: string;
    contact: string;
    isActive: boolean;
    sessionId?: string;
    commissionRates?: Partial<Record<GameType, number>>;
    prizeRates?: {
        [GameType.FourDigits]: PrizeRate;
        [GameType.ThreeDigits]: PrizeRate;
        [GameType.TwoDigits]: PrizeRate;
        [GameType.OneDigit]: PrizeRate;
        [GameType.Positional]?: PositionalPrizeRates;
        [GameType.Combo]?: PrizeRate;
    };
    token?: string; // To hold JWT token
}

export interface Draw {
    id:string;
    name: string;
    drawTime: Date;
    status: DrawStatus;
    winningNumbers: string[];
}

export interface Bet {
    id: string;
    clientId: string;
    drawId: string;
    gameType: GameType;
    number: string;
    stake: number;
    createdAt: Date;
    condition: BettingCondition;
    positions?: number[];
}

export interface ParsedBet {
    number: string;
    stake: number;
    gameType: GameType;
    condition?: BettingCondition;
}

export interface Transaction {
    id: string;
    clientId: string;
    type: TransactionType;
    amount: number;
    description: string;
    balanceAfter: number;
    createdAt: Date;
    relatedId?: string;
    isReversed?: boolean;
}

export type MarketOverride = 'AUTO' | 'OPEN' | 'CLOSED';

export interface SmartAnalysisReport {
    headline: string;
    netProfitAnalysis: string;
    performanceAnalysis: string;
    conclusion: string;
}

export interface SmartInterimReport {
    headline: string;
    riskAnalysis: string;
    participationAnalysis: string;
    conclusion: string;
}

export interface ClientImportData {
    'Client ID': string;
    'Username': string;
    'Password': string;
    'Contact': string;
    'Area': string;
    'Initial Deposit': number;
    'Commission Rate (%)': number;
}

export interface AppContextType {
    isLoading: boolean;
    isSecondaryLoading: boolean;
    currentClient: Client | null;
    clients: Client[];
    draws: Draw[];
    bets: Bet[];
    betsByDraw: Map<string, Bet[]>;
    transactions: Transaction[];
    marketOverride: MarketOverride;
    setMarketOverride: (override: MarketOverride) => Promise<void>;
    login: (loginIdentifier: string, password: string, role: Role) => Promise<{ success: boolean; message?: string; }>;
    logout: () => Promise<void>;
    updateClient: (updatedClient: Client) => Promise<void>;
    placeBet: (bet: Omit<Bet, 'id' | 'clientId'>) => Promise<{ success: boolean; message: string }>;
    placeBetsForClient: (bets: Omit<Bet, 'id' | 'clientId'>[], clientId: string) => Promise<{ successCount: number; message: string }>;
    placeBulkBetsForCurrentClient: (bets: Omit<Bet, 'id' | 'clientId'>[]) => Promise<{ successCount: number; message: string }>;
    declareWinner: (drawId: string, winningNumbers: string[]) => Promise<void>;
    setDeclaredNumbers: (drawId: string, winningNumbers: string[]) => Promise<void>;
    toggleDrawStatus: (drawId: string) => Promise<void>;
    updateDrawTime: (drawId: string, newTime: Date) => Promise<void>;
    shiftAllDrawTimes: (minutes: number) => Promise<void>;
    registerClient: (clientData: Omit<Client, 'id' | 'role' | 'isActive'>) => Promise<{ success: boolean, message: string }>;
    adjustClientWallet: (clientId: string, amount: number, type: TransactionType, description: string, relatedId?: string) => Promise<{ success: boolean, message: string }>;
    getDrawStats: (drawId: string) => Promise<any>;
    getLiveDrawAnalysis: (drawId: string) => Promise<any>;
    updateClientCredentials: (data: { currentPassword: string, newUsername?: string, newPassword?: string }) => Promise<{ success: boolean, message: string }>;
    updateClientDetailsByAdmin: (clientId: string, details: { clientId?: string; username?: string; contact?: string; area?: string; }) => Promise<{ success: boolean, message: string }>;
    changeClientPasswordByAdmin: (clientId: string, newPassword: string, callback: (result: { success: boolean, message: string }) => void) => Promise<void>;
    importClientsFromCSV: (clientsData: ClientImportData[]) => Promise<{ successCount: number; errorCount: number; errorMessages: string[] }>;
    reverseWinningTransaction: (transactionId: string) => Promise<{ success: boolean, message: string }>;
}