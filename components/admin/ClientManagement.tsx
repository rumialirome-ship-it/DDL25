import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../../contexts/AppContext.tsx';
import { Client, Role, GameType, PrizeRate, Draw, DrawStatus, TransactionType, PositionalPrizeRates } from '../../types/index.ts';
import Modal from '../common/Modal.tsx';
import PasswordInput from '../common/PasswordInput.tsx';
import ClientDrawReport from './ClientDrawReport.tsx';
import FinancialLedger from '../common/FinancialLedger.tsx';
import { defaultPrizeRates, defaultCommissionRates } from '../../data/mockData.ts';

// --- SVG Icons for Action Menu ---
const EllipsisVerticalIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01" /></svg>;
const LedgerIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>;
const ReportIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const WalletIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>;
const RatesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 5.5l-9 9m3-9a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm-9 9a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" /></svg>;
const KeyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>;
const SuspendIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const ActivateIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const ReverseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l4-4m-4 4l4 4" /></svg>;


type ModalType = 'ADD_CLIENT' | 'MANAGE_WALLET' | 'CHANGE_PASSWORD' | 'EDIT_CLIENT' | 'EDIT_RATES' | 'CLIENT_DRAW_REPORT' | 'FINANCIAL_LEDGER' | 'REVERSE_WINNINGS';

const ClientManagement = () => {
    const { clients, draws, transactions, updateClient, registerClient, changeClientPasswordByAdmin, updateClientDetailsByAdmin, adjustClientWallet, reverseWinningTransaction } = useAppContext();
    
    const [modal, setModal] = useState<{ type: ModalType; data?: Client } | null>(null);
    const [actionsMenu, setActionsMenu] = useState<string | null>(null);
    const [selectedReportDrawId, setSelectedReportDrawId] = useState<string>('');
    const [newClientData, setNewClientData] = useState({
        clientId: '',
        username: '',
        password: '',
        contact: '',
        area: '',
        wallet: 0,
        commissionRates: { ...defaultCommissionRates },
        prizeRates: { ...defaultPrizeRates }
    });
    const [editClientData, setEditClientData] = useState({ clientId: '', username: '', contact: '', area: '' });
    const [editRatesData, setEditRatesData] = useState<{ commissionRates: Record<GameType, number>; prizeRates: typeof defaultPrizeRates }>({ commissionRates: defaultCommissionRates, prizeRates: defaultPrizeRates });
    const [walletAmount, setWalletAmount] = useState<string>('');
    const [walletAction, setWalletAction] = useState<'deposit' | 'withdraw'>('deposit');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 15;
    
    const clientsList = useMemo(() => 
        clients.filter(c => c.role === Role.Client && (c.username.toLowerCase().includes(searchTerm.toLowerCase()) || c.clientId.toLowerCase().includes(searchTerm.toLowerCase())))
    , [clients, searchTerm]);

    const paginatedClients = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return clientsList.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [clientsList, currentPage]);

    const totalPages = Math.ceil(clientsList.length / ITEMS_PER_PAGE);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    const finishedDraws = useMemo(() => 
        draws.filter(d => d.status === DrawStatus.Finished).sort((a,b) => b.drawTime.getTime() - a.drawTime.getTime()), 
    [draws]);

    const showNotification = (type: 'success' | 'error', message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 3000);
    };

    const getNextClientId = () => {
        const existingIds = clients
            .map(c => c.clientId)
            .filter(id => id.toUpperCase().startsWith('DDL'))
            .map(id => parseInt(id.replace(/[^0-9]/g, ''), 10))
            .filter(num => !isNaN(num));
        
        const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
        const nextId = maxId + 1;
        return `DDL${String(nextId).padStart(4, '0')}`;
    };

    const handleOpenModal = (type: ModalType, data?: Client) => {
        setNotification(null);
        setActionsMenu(null); // Close dropdown when modal opens
        setModal({ type, data });
        if (type === 'ADD_CLIENT') {
            setNewClientData({
                clientId: getNextClientId(),
                username: '',
                password: '',
                contact: '+92',
                area: '',
                wallet: 0,
                commissionRates: { ...defaultCommissionRates },
                prizeRates: { ...defaultPrizeRates }
            });
        }
        if (type === 'CHANGE_PASSWORD') {
            setNewPassword('');
            setConfirmPassword('');
        }
        if (type === 'MANAGE_WALLET') {
            setWalletAction('deposit');
            setWalletAmount('');
        }
        if (type === 'EDIT_CLIENT' && data) {
            setEditClientData({ clientId: data.clientId, username: data.username, contact: data.contact, area: data.area });
        }
        if (type === 'EDIT_RATES' && data) {
            setEditRatesData({ commissionRates: { ...defaultCommissionRates, ...data.commissionRates }, prizeRates: { ...defaultPrizeRates, ...(data.prizeRates || {}), [GameType.Positional]: {...defaultPrizeRates[GameType.Positional], ...data.prizeRates?.[GameType.Positional]} } });
        }
        if (type === 'CLIENT_DRAW_REPORT') {
            setSelectedReportDrawId('');
        }
    };
    
    const handleCloseModal = () => {
        setModal(null);
        setWalletAmount('');
        setNewPassword('');
        setConfirmPassword('');
        setEditClientData({ clientId: '', username: '', contact: '', area: '' });
        setEditRatesData({ commissionRates: defaultCommissionRates, prizeRates: defaultPrizeRates });
        setSelectedReportDrawId('');
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newClientData.clientId.trim()) {
            showNotification('error', "Client ID is required.");
            return;
        }
        if (newClientData.password.length < 8) {
            showNotification('error', "Password must be at least 8 characters.");
            return;
        }
        if (!newClientData.username.trim()) {
            showNotification('error', "Username is required.");
            return;
        }
        if (!/^\+923\d{9}$/.test(newClientData.contact)) {
            showNotification('error', "A valid Pakistani mobile number is required (e.g., +923001234567).");
            return;
        }


        const result = await registerClient({ 
            ...newClientData, 
            wallet: Number(newClientData.wallet) || 0,
        });
        showNotification(result.success ? 'success' : 'error', result.message);
        if (result.success) {
            handleCloseModal();
        }
    };

    const handleEditClient = async (e: React.FormEvent) => {
        e.preventDefault();
        const client = modal?.data;
        if (!client) return;

        if (!editClientData.clientId.trim() || !editClientData.username.trim()) {
            showNotification('error', "Client ID and Username cannot be empty.");
            return;
        }
        if (editClientData.contact && !/^\+923\d{9}$/.test(editClientData.contact)) {
            showNotification('error', "Please enter a valid Pakistani mobile number (e.g., +923001234567) or leave it empty.");
            return;
        }

        const result = await updateClientDetailsByAdmin(client.id, {
            clientId: editClientData.clientId,
            username: editClientData.username,
            contact: editClientData.contact,
            area: editClientData.area,
        });

        showNotification(result.success ? 'success' : 'error', result.message);
        if (result.success) {
            handleCloseModal();
        }
    };
    
    const handleEditRates = (e: React.FormEvent) => {
        e.preventDefault();
        const client = modal?.data;
        if (!client) return;

        updateClient({ ...client, commissionRates: editRatesData.commissionRates, prizeRates: editRatesData.prizeRates as any });
        showNotification('success', `Rates for ${client.username} updated successfully.`);
        handleCloseModal();
    };


    const handleChangePassword = (e: React.FormEvent) => {
        e.preventDefault();
        const client = modal?.data;
        if (!client) return;

        if (newPassword.length < 8) {
            showNotification('error', 'Password must be at least 8 characters long.');
            return;
        }
        if (newPassword !== confirmPassword) {
            showNotification('error', 'Passwords do not match.');
            return;
        }

        changeClientPasswordByAdmin(client.id, newPassword, (result) => {
            showNotification(result.success ? 'success' : 'error', result.message);
            if (result.success) {
                handleCloseModal();
            }
        });
    };

    const handleWalletUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        const client = modal?.data;
        if (!client) return;
        const amount = parseFloat(walletAmount);
        if (isNaN(amount) || amount <= 0) {
            showNotification('error', 'Please enter a valid positive amount.');
            return;
        }

        const description = walletAction === 'deposit' ? 'Deposit: Manual by Admin' : 'Withdrawal: Manual by Admin';
        const transactionType = walletAction === 'deposit' ? TransactionType.Credit : TransactionType.Debit;
        
        const result = await adjustClientWallet(client.id, amount, transactionType, description);

        if(result.success) {
            showNotification('success', `Wallet for ${client.username} updated successfully.`);
            handleCloseModal();
        } else {
            showNotification('error', result.message);
        }
    };

    const toggleClientStatus = (client: Client) => {
        setActionsMenu(null);
        updateClient({ ...client, isActive: !client.isActive });
        showNotification('success', `Status for ${client.username} has been updated.`);
    };

    const gameCategoriesForForm = [
        { key: GameType.FourDigits, label: '4 Digits', hasPrizeRate: true },
        { key: GameType.ThreeDigits, label: '3 Digits', hasPrizeRate: true },
        { key: GameType.TwoDigits, label: '2 Digits', hasPrizeRate: true },
        { key: GameType.OneDigit, label: '1 Digit', hasPrizeRate: true },
        { key: GameType.Positional, label: 'Positional', hasPrizeRate: false },
        { key: GameType.Combo, label: 'Combo', hasPrizeRate: false },
    ];

    const positionalCategoriesForForm = [
        { key: 1, label: 'Positional 1-digit (e.g. 5XXX)'},
        { key: 2, label: 'Positional 2-digits (e.g. 5X3X)'},
        { key: 3, label: 'Positional 3-digits (e.g. 5X32)'},
        { key: 4, label: 'Positional 4-digits (e.g. 5132)'},
    ];
    
    const renderModalContent = () => {
        if (!modal) return null;
        const client = modal.data;

        switch (modal.type) {
            case 'REVERSE_WINNINGS': {
                if (!client) return null;
                const reversibleTransactions = transactions.filter(tx =>
                    tx.clientId === client.id &&
                    tx.type === TransactionType.Credit &&
                    tx.description.startsWith('Win on') &&
                    !tx.isReversed
                ).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

                const handleReverse = async (txId: string) => {
                    const confirmation = window.confirm('Are you sure you want to reverse this prize winning? This will debit the client\'s wallet and cannot be undone.');
                    if (!confirmation) return;
            
                    setNotification(null);
                    const result = await reverseWinningTransaction(txId);
                    showNotification(result.success ? 'success' : 'error', result.message);
                };
            
                return (
                    <div className="space-y-4">
                        <p className="text-sm text-brand-text-secondary">
                            Below is a list of prize winnings credited to this client. Click 'Reverse' to debit the amount from the client's wallet. This action is logged and cannot be undone.
                        </p>
                        {reversibleTransactions.length === 0 ? (
                            <p className="text-center text-brand-text-secondary py-4">No reversible prize winnings found for this client.</p>
                        ) : (
                            <div className="max-h-96 overflow-y-auto border border-brand-secondary rounded-lg">
                                <ul className="divide-y divide-brand-secondary">
                                    {reversibleTransactions.map(tx => (
                                        <li key={tx.id} className="p-3 flex justify-between items-center bg-brand-bg hover:bg-brand-secondary/30">
                                            <div>
                                                <p className="font-semibold text-brand-text">{new Date(tx.createdAt).toLocaleString()}</p>
                                                <p className="text-xs text-brand-text-secondary">{tx.description}</p>
                                                <p className="text-green-400 font-bold font-mono">
                                                    Amount: RS. {tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleReverse(tx.id)}
                                                className="bg-red-600 text-white font-bold py-1 px-3 rounded-md text-sm hover:bg-red-700"
                                            >
                                                Reverse
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                );
            }
            case 'FINANCIAL_LEDGER':
                if (!client) return null;
                return <FinancialLedger clientId={client.id} />;
            case 'CLIENT_DRAW_REPORT':
                if (!client) return null;
                const selectedDraw = finishedDraws.find(d => d.id === selectedReportDrawId);
                return (
                    <div className="space-y-4">
                        <div>
                             <label htmlFor="draw-select" className="block text-sm font-bold text-brand-text-secondary mb-2">Select a Finished Draw</label>
                             <select
                                id="draw-select"
                                value={selectedReportDrawId}
                                onChange={e => setSelectedReportDrawId(e.target.value)}
                                className="w-full bg-brand-bg border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary"
                            >
                                <option value="">-- Choose a draw --</option>
                                {finishedDraws.map(draw => (
                                    <option key={draw.id} value={draw.id}>Draw {draw.name} ({draw.drawTime.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })})</option>
                                ))}
                            </select>
                        </div>
                        {selectedDraw && <ClientDrawReport client={client} draw={selectedDraw} />}
                    </div>
                )
            case 'ADD_CLIENT':
                return (
                    <form onSubmit={handleRegister} className="space-y-6">
                        <div className="p-4 bg-brand-secondary/30 rounded-lg border border-brand-secondary">
                            <h3 className="text-lg font-bold text-brand-primary mb-4">Client Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                <div>
                                    <label className="block text-brand-text-secondary text-sm font-bold mb-2">Client ID</label>
                                    <input type="text" placeholder="e.g., DDL0001" value={newClientData.clientId} onChange={e => setNewClientData(p => ({...p, clientId: e.target.value}))} className="w-full bg-brand-bg border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary" required/>
                                </div>
                                <div>
                                    <label className="block text-brand-text-secondary text-sm font-bold mb-2">Client Name</label>
                                    <input type="text" placeholder="e.g., Adnan" value={newClientData.username} onChange={e => setNewClientData(p => ({...p, username: e.target.value}))} className="w-full bg-brand-bg border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary" required/>
                                </div>
                                <div>
                                    <label className="block text-brand-text-secondary text-sm font-bold mb-2">Password</label>
                                    <PasswordInput placeholder="min. 8 chars" value={newClientData.password} onChange={e => setNewClientData(p => ({...p, password: e.target.value}))} className="w-full bg-brand-bg border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary" required/>
                                </div>
                                <div>
                                    <label className="block text-brand-text-secondary text-sm font-bold mb-2">Contact No.</label>
                                    <input type="text" placeholder="+923001234567" value={newClientData.contact} onChange={e => setNewClientData(p => ({...p, contact: e.target.value}))} className="w-full bg-brand-bg border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary" required pattern="\+923\d{9}" title="Enter a valid Pakistani mobile number, e.g., +923001234567"/>
                                </div>
                                <div>
                                    <label className="block text-brand-text-secondary text-sm font-bold mb-2">Area</label>
                                    <input type="text" placeholder="e.g., Khi" value={newClientData.area} onChange={e => setNewClientData(p => ({...p, area: e.target.value}))} className="w-full bg-brand-bg border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                                </div>
                                <div>
                                    <label className="block text-brand-text-secondary text-sm font-bold mb-2">Initial Deposit</label>
                                    <input type="number" placeholder="e.g., 10000" value={newClientData.wallet === 0 ? '' : newClientData.wallet} onFocus={(e) => { if(e.target.value === '0') e.target.select()}} onChange={e => setNewClientData(p => ({...p, wallet: Number(e.target.value)}))} className="w-full bg-brand-bg border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-brand-secondary/30 rounded-lg border border-brand-secondary">
                            <h3 className="text-lg font-bold text-brand-primary mb-4">Rates & Commission</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-brand-text">
                                    <thead className="bg-brand-secondary/50 text-brand-text-secondary text-center">
                                        <tr>
                                            <th className="py-2 px-4 font-bold border-b border-r border-brand-secondary">Game</th>
                                            <th className="py-2 px-4 font-bold border-b border-r border-brand-secondary">Commission (%)</th>
                                            <th className="py-2 px-4 font-bold border-b border-r border-brand-secondary">Prize: First (F) (%)</th>
                                            <th className="py-2 px-4 font-bold border-b border-brand-secondary">Prize: Second (S) (%)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-brand-secondary/50">
                                        {gameCategoriesForForm.map(({ key, label, hasPrizeRate }) => (
                                            <tr key={key} className="bg-brand-surface/50 text-center">
                                                <td className="py-2 px-4 text-left font-semibold text-brand-text-secondary border-r border-brand-secondary">{label}</td>
                                                <td className="py-2 px-2 border-r border-brand-secondary">
                                                    <input type="number" step="0.1" className="w-24 bg-brand-bg border border-brand-secondary rounded py-1 px-2 text-center text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-primary"
                                                     value={newClientData.commissionRates[key]}
                                                     onChange={e => setNewClientData(p => ({ ...p, commissionRates: { ...p.commissionRates, [key]: parseFloat(e.target.value) || 0 } }))}
                                                    />
                                                </td>
                                                <td className="py-2 px-2 border-r border-brand-secondary">
                                                    {hasPrizeRate ? (
                                                        <input type="number" className="w-24 bg-brand-bg border border-brand-secondary rounded py-1 px-2 text-center text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-primary"
                                                        value={(newClientData.prizeRates[key as GameType.FourDigits] as PrizeRate)?.first}
                                                        onChange={e => setNewClientData(p => ({ ...p, prizeRates: { ...p.prizeRates, [key]: { ...(p.prizeRates[key as GameType.FourDigits] as PrizeRate), first: Number(e.target.value) || 0 } } }))}
                                                        />
                                                    ) : (
                                                        <span className="text-xs text-brand-text-secondary">N/A</span>
                                                    )}
                                                </td>
                                                <td className="py-2 px-2">
                                                    {hasPrizeRate ? (
                                                        <input type="number" className="w-24 bg-brand-bg border border-brand-secondary rounded py-1 px-2 text-center text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-primary"
                                                        value={(newClientData.prizeRates[key as GameType.FourDigits] as PrizeRate)?.second}
                                                        onChange={e => setNewClientData(p => ({ ...p, prizeRates: { ...p.prizeRates, [key]: { ...(p.prizeRates[key as GameType.FourDigits] as PrizeRate), second: Number(e.target.value) || 0 } } }))}
                                                        />
                                                    ) : (
                                                         <span className="text-xs text-brand-text-secondary">N/A</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                        <button type="submit" className="w-full bg-brand-primary hover:bg-yellow-400 text-brand-bg font-bold py-3 px-4 rounded-lg mt-4">Create Client Account</button>
                    </form>
                );
            case 'EDIT_CLIENT':
                return (
                     <form onSubmit={handleEditClient} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-brand-text-secondary text-sm font-bold mb-2" htmlFor="editClientId">Client ID</label>
                                <input id="editClientId" name="clientId" type="text" value={editClientData.clientId} onChange={e => setEditClientData(p => ({...p, clientId: e.target.value}))} className="w-full bg-brand-bg border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary" required/>
                            </div>
                             <div>
                                <label className="block text-brand-text-secondary text-sm font-bold mb-2" htmlFor="editUsername">Username</label>
                                <input id="editUsername" name="username" type="text" value={editClientData.username} onChange={e => setEditClientData(p => ({...p, username: e.target.value}))} className="w-full bg-brand-bg border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary" required/>
                            </div>
                            <div>
                                <label className="block text-brand-text-secondary text-sm font-bold mb-2" htmlFor="editContact">Contact No.</label>
                                <input id="editContact" name="contact" type="text" value={editClientData.contact} onChange={e => setEditClientData(p => ({...p, contact: e.target.value}))} className="w-full bg-brand-bg border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary" pattern="\+923\d{9}" title="Enter a valid Pakistani mobile number, e.g., +923001234567" />
                            </div>
                            <div>
                                <label className="block text-brand-text-secondary text-sm font-bold mb-2" htmlFor="editArea">Area</label>
                                <input id="editArea" name="area" type="text" value={editClientData.area} onChange={e => setEditClientData(p => ({...p, area: e.target.value}))} className="w-full bg-brand-bg border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                            </div>
                        </div>
                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Update Details</button>
                    </form>
                );
            case 'EDIT_RATES':
                 const clientForRates = modal.data;
                 if (!clientForRates) return null;
                return (
                    <form onSubmit={handleEditRates} className="space-y-4">
                         <div>
                            <h3 className="text-lg font-bold text-brand-primary mb-2">Standard Game Rates</h3>
                            <div className="overflow-x-auto bg-brand-secondary/30 rounded-lg border border-brand-secondary">
                                <table className="w-full text-sm text-brand-text">
                                    <thead className="bg-brand-secondary/50 text-brand-text-secondary text-center">
                                        <tr>
                                            <th className="py-2 px-4 font-bold border-b border-r border-brand-secondary">Game</th>
                                            <th className="py-2 px-4 font-bold border-b border-r border-brand-secondary">Commission (%)</th>
                                            <th className="py-2 px-4 font-bold border-b border-r border-brand-secondary">Prize: First (F) (%)</th>
                                            <th className="py-2 px-4 font-bold border-b border-brand-secondary">Prize: Second (S) (%)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-brand-secondary/50">
                                        {gameCategoriesForForm.map(game => (
                                            <tr key={game.key} className="bg-brand-surface/50 text-center">
                                                <td className="py-2 px-4 text-left font-semibold text-brand-text-secondary border-r border-brand-secondary">{game.label}</td>
                                                <td className="py-2 px-2 border-r border-brand-secondary">
                                                    <div className="mx-auto max-w-[120px]">
                                                        <input type="number" step="0.1" value={editRatesData.commissionRates[game.key] || 0} onChange={e => setEditRatesData(p => ({...p, commissionRates: {...p.commissionRates, [game.key]: parseFloat(e.target.value) || 0 }}))} className="w-full bg-brand-surface border border-brand-secondary rounded py-1 px-2 text-center text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-primary"/>
                                                    </div>
                                                </td>
                                                <td className="py-2 px-2 border-r border-brand-secondary">
                                                    {game.hasPrizeRate ? (
                                                        <div className="mx-auto max-w-[120px]">
                                                            <input type="number" value={(editRatesData.prizeRates[game.key as GameType.FourDigits] as PrizeRate)?.first || 0} onChange={e => setEditRatesData(p => ({...p, prizeRates: {...p.prizeRates, [game.key]: {...(p.prizeRates[game.key as GameType.FourDigits] as PrizeRate), first: Number(e.target.value) || 0} }}))} className="w-full bg-brand-surface border border-brand-secondary rounded py-1 px-2 text-center text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-primary"/>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-brand-text-secondary">N/A</span>
                                                    )}
                                                </td>
                                                <td className="py-2 px-2">
                                                     {game.hasPrizeRate ? (
                                                        <div className="mx-auto max-w-[120px]">
                                                            <input type="number" value={(editRatesData.prizeRates[game.key as GameType.FourDigits] as PrizeRate)?.second || 0} onChange={e => setEditRatesData(p => ({...p, prizeRates: {...p.prizeRates, [game.key]: {...(p.prizeRates[game.key as GameType.FourDigits] as PrizeRate), second: Number(e.target.value) || 0} }}))} className="w-full bg-brand-surface border border-brand-secondary rounded py-1 px-2 text-center text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-primary"/>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-brand-text-secondary">N/A</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                        <div className="pt-4">
                            <h3 className="text-lg font-bold text-brand-primary mb-2">Positional Game Rates</h3>
                             <p className="text-sm text-brand-text-secondary mb-2">Payouts for positional bets (e.g., '5XX1') depend on the number of specified digits.</p>
                            <div className="overflow-x-auto bg-brand-secondary/30 rounded-lg border border-brand-secondary">
                                <table className="w-full text-sm text-brand-text">
                                     <thead className="bg-brand-secondary/50 text-brand-text-secondary text-center">
                                        <tr>
                                            <th className="py-2 px-4 font-bold border-b border-r border-brand-secondary">Game</th>
                                            <th className="py-2 px-4 font-bold border-b border-r border-brand-secondary">Prize: First (F) (%)</th>
                                            <th className="py-2 px-4 font-bold border-b border-brand-secondary">Prize: Second (S) (%)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-brand-secondary/50">
                                         {positionalCategoriesForForm.map(game => {
                                            const currentPositionalRates = editRatesData.prizeRates[GameType.Positional] || defaultPrizeRates[GameType.Positional];
                                            return (
                                                <tr key={game.key} className="bg-brand-surface/50 text-center">
                                                    <td className="py-2 px-4 text-left font-semibold text-brand-text-secondary border-r border-brand-secondary">{game.label}</td>
                                                    <td className="py-2 px-2 border-r border-brand-secondary">
                                                        <div className="mx-auto max-w-[120px]">
                                                            <input type="number" value={currentPositionalRates[game.key as keyof PositionalPrizeRates]?.first || 0} 
                                                               onChange={e => {
                                                                    const newRate = Number(e.target.value) || 0;
                                                                    setEditRatesData(p => {
                                                                        const positionalRates = p.prizeRates[GameType.Positional] || defaultPrizeRates[GameType.Positional];
                                                                        const updatedRateForDigitCount = { ...(positionalRates[game.key as keyof PositionalPrizeRates]), first: newRate };
                                                                        const updatedPositionalRates = { ...positionalRates, [game.key]: updatedRateForDigitCount };
                                                                        return {...p, prizeRates: {...p.prizeRates, [GameType.Positional]: updatedPositionalRates }};
                                                                    });
                                                                }}
                                                            className="w-full bg-brand-surface border border-brand-secondary rounded py-1 px-2 text-center text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-primary"/>
                                                        </div>
                                                    </td>
                                                    <td className="py-2 px-2">
                                                        <div className="mx-auto max-w-[120px]">
                                                            <input type="number" value={currentPositionalRates[game.key as keyof PositionalPrizeRates]?.second || 0}
                                                                onChange={e => {
                                                                    const newRate = Number(e.target.value) || 0;
                                                                    setEditRatesData(p => {
                                                                        const positionalRates = p.prizeRates[GameType.Positional] || defaultPrizeRates[GameType.Positional];
                                                                        const updatedRateForDigitCount = { ...(positionalRates[game.key as keyof PositionalPrizeRates]), second: newRate };
                                                                        const updatedPositionalRates = { ...positionalRates, [game.key]: updatedRateForDigitCount };
                                                                        return {...p, prizeRates: {...p.prizeRates, [GameType.Positional]: updatedPositionalRates }};
                                                                    });
                                                                }}
                                                            className="w-full bg-brand-surface border border-brand-secondary rounded py-1 px-2 text-center text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-primary"/>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                         })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg mt-4">Update Rates</button>
                    </form>
                );
            case 'MANAGE_WALLET':
                if (!client) return null;
                return (
                     <div className="space-y-4">
                        <p className="text-brand-text-secondary">Current Balance: <span className="font-bold text-brand-text">RS. {client.wallet.toFixed(2)}</span></p>
                        <div className="border-b border-brand-secondary">
                             <nav className="-mb-px flex space-x-4">
                                <button
                                    onClick={() => setWalletAction('deposit')}
                                    className={`px-3 py-2 font-semibold ${walletAction === 'deposit' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-brand-text-secondary'}`}
                                >
                                    Deposit
                                </button>
                                <button
                                    onClick={() => setWalletAction('withdraw')}
                                    className={`px-3 py-2 font-semibold ${walletAction === 'withdraw' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-brand-text-secondary'}`}
                                >
                                    Withdraw
                                </button>
                            </nav>
                        </div>
                        <form onSubmit={handleWalletUpdate} className="pt-4">
                             <div>
                                <label className="block text-brand-text-secondary text-sm font-bold mb-2" htmlFor="walletAmount">Amount</label>
                                <input id="walletAmount" type="number" value={walletAmount} onChange={e => setWalletAmount(e.target.value)} className="w-full bg-brand-bg border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary" placeholder="e.g., 500" required/>
                            </div>
                            <button
                                type="submit"
                                className={`w-full mt-4 font-bold text-white py-2 px-4 rounded-lg ${walletAction === 'deposit' ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700'}`}
                            >
                                {walletAction === 'deposit' ? 'Confirm Deposit' : 'Confirm Withdrawal'}
                            </button>
                        </form>
                    </div>
                );
            case 'CHANGE_PASSWORD':
                if (!client) return null;
                return (
                     <form onSubmit={handleChangePassword} className="space-y-4">
                        <div>
                            <label className="block text-brand-text-secondary text-sm font-bold mb-2" htmlFor="newPassword">New Password</label>
                            <PasswordInput
                                id="newPassword"
                                name="newPassword"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                className="w-full bg-brand-bg border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                required
                                autoComplete="new-password"
                            />
                        </div>
                        <div>
                            <label className="block text-brand-text-secondary text-sm font-bold mb-2" htmlFor="confirmPassword">Confirm New Password</label>
                            <PasswordInput
                                id="confirmPassword"
                                name="confirmPassword"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                className="w-full bg-brand-bg border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                required
                                autoComplete="new-password"
                            />
                        </div>
                        <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg">Update Password</button>
                    </form>
                );
            default: return null;
        }
    };

    return (
        <div>
            {notification && (
                <div className={`fixed top-28 right-8 z-50 p-4 rounded-lg shadow-lg text-sm text-center ${notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                    {notification.message}
                </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                <h2 className="text-2xl font-bold text-brand-text">Client Management ({clientsList.length})</h2>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-brand-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input 
                            type="text" 
                            placeholder="Search by username or ID..." 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            className="w-full bg-brand-surface border border-brand-secondary rounded-lg py-2 pl-10 pr-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary" 
                        />
                    </div>
                    <button onClick={() => handleOpenModal('ADD_CLIENT')} className="bg-brand-primary text-brand-bg font-bold py-2 px-4 rounded-lg hover:bg-yellow-400 transition-colors whitespace-nowrap">+ Add Client</button>
                </div>
            </div>

            <div className="overflow-x-auto bg-brand-surface rounded-lg shadow">
                <table className="min-w-full text-sm text-left text-brand-text-secondary">
                    <thead className="text-xs text-brand-text uppercase bg-brand-secondary/50">
                        <tr>
                            <th scope="col" className="px-6 py-3">Client ID</th>
                            <th scope="col" className="px-6 py-3">Username</th>
                            <th scope="col" className="px-6 py-3">Contact / Area</th>
                            <th scope="col" className="px-6 py-3">Wallet</th>
                            <th scope="col" className="px-6 py-3 text-center">Status</th>
                            <th scope="col" className="px-6 py-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedClients.map(client => (
                            <tr key={client.id} className="bg-brand-surface border-b border-brand-secondary hover:bg-brand-secondary/20 transition-colors">
                                <td className="px-6 py-4 font-mono text-brand-text-secondary">{client.clientId}</td>
                                <th scope="row" className="px-6 py-4 font-medium text-brand-text whitespace-nowrap">
                                    {client.username}
                                </th>
                                <td className="px-6 py-4">{client.contact}<br/><span className="text-xs">{client.area}</span></td>
                                <td className="px-6 py-4 font-mono text-brand-text">
                                    <button
                                        onClick={() => handleOpenModal('MANAGE_WALLET', client)}
                                        className="hover:underline hover:text-brand-primary focus:outline-none focus:text-brand-primary transition-colors cursor-pointer"
                                        title="Manage Wallet"
                                    >
                                        RS. {client.wallet.toFixed(2)}
                                    </button>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${client.isActive ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                                        {client.isActive ? 'Active' : 'Suspended'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="relative inline-block text-left">
                                        <button 
                                            onClick={() => setActionsMenu(actionsMenu === client.id ? null : client.id)}
                                            className="p-2 rounded-full text-brand-text-secondary hover:bg-brand-secondary hover:text-brand-text focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-surface focus:ring-brand-primary"
                                            aria-haspopup="true"
                                            aria-expanded={actionsMenu === client.id}
                                        >
                                            <span className="sr-only">Open actions menu for {client.username}</span>
                                            <EllipsisVerticalIcon />
                                        </button>
                                        {actionsMenu === client.id && (
                                            <div className="origin-top-right absolute right-0 mt-2 w-60 rounded-md shadow-lg bg-brand-surface ring-1 ring-brand-primary z-10">
                                                <div className="py-1" role="menu" aria-orientation="vertical">
                                                    {/* --- Financial Group --- */}
                                                    <button onClick={() => handleOpenModal('CLIENT_DRAW_REPORT', client)} className="flex items-center w-full text-left px-4 py-2 text-sm text-brand-text-secondary hover:bg-brand-secondary hover:text-brand-text">
                                                        <ReportIcon /> <span className="ml-3">View Draw Report</span>
                                                    </button>
                                                     <button onClick={() => handleOpenModal('FINANCIAL_LEDGER', client)} className="flex items-center w-full text-left px-4 py-2 text-sm text-brand-text-secondary hover:bg-brand-secondary hover:text-brand-text">
                                                        <LedgerIcon /> <span className="ml-3">View Financial Ledger</span>
                                                    </button>
                                                     <button onClick={() => handleOpenModal('MANAGE_WALLET', client)} className="flex items-center w-full text-left px-4 py-2 text-sm text-brand-text-secondary hover:bg-brand-secondary hover:text-brand-text">
                                                        <WalletIcon /> <span className="ml-3">Manage Wallet</span>
                                                    </button>
                                                    <div className="border-t border-brand-secondary my-1"></div>
                                                     {/* --- Editing Group --- */}
                                                    <button onClick={() => handleOpenModal('EDIT_CLIENT', client)} className="flex items-center w-full text-left px-4 py-2 text-sm text-brand-text-secondary hover:bg-brand-secondary hover:text-brand-text">
                                                        <EditIcon /> <span className="ml-3">Edit Details</span>
                                                    </button>
                                                    <button onClick={() => handleOpenModal('EDIT_RATES', client)} className="flex items-center w-full text-left px-4 py-2 text-sm text-brand-text-secondary hover:bg-brand-secondary hover:text-brand-text">
                                                        <RatesIcon /> <span className="ml-3">Edit Rates</span>
                                                    </button>
                                                    <button onClick={() => handleOpenModal('CHANGE_PASSWORD', client)} className="flex items-center w-full text-left px-4 py-2 text-sm text-brand-text-secondary hover:bg-brand-secondary hover:text-brand-text">
                                                        <KeyIcon /> <span className="ml-3">Change Password</span>
                                                    </button>
                                                    <div className="border-t border-brand-secondary my-1"></div>
                                                     {/* --- Admin Group --- */}
                                                    <button onClick={() => toggleClientStatus(client)} className="flex items-center w-full text-left px-4 py-2 text-sm text-yellow-400 hover:bg-brand-secondary hover:text-yellow-300">
                                                        {client.isActive ? <><SuspendIcon /> <span className="ml-3">Suspend Client</span></> : <><ActivateIcon /> <span className="ml-3">Activate Client</span></>}
                                                    </button>
                                                    <button onClick={() => handleOpenModal('REVERSE_WINNINGS', client)} className="flex items-center w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-brand-secondary hover:text-red-300">
                                                        <ReverseIcon /> <span className="ml-3">Reverse Winnings</span>
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {clientsList.length === 0 && (
                    <div className="text-center py-8">
                        <p className="text-brand-text-secondary">No clients found. {searchTerm && "Try adjusting your search."}</p>
                    </div>
                )}
            </div>
            
            {totalPages > 1 && (
                <div className="flex justify-between items-center pt-4">
                    <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="bg-brand-secondary hover:bg-opacity-80 text-brand-text font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        &larr; Previous
                    </button>
                    <span className="text-brand-text-secondary font-semibold">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="bg-brand-secondary hover:bg-opacity-80 text-brand-text font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Next &rarr;
                    </button>
                </div>
            )}
            
            {modal && (
                <Modal 
                    title={
                        modal.type === 'ADD_CLIENT' ? 'Add New Client' :
                        modal.type === 'EDIT_CLIENT' ? `Edit Details: ${modal.data?.username}` :
                        modal.type === 'EDIT_RATES' ? `Edit Rates: ${modal.data?.username}` :
                        modal.type === 'CHANGE_PASSWORD' ? `Change Password: ${modal.data?.username}` :
                        modal.type === 'CLIENT_DRAW_REPORT' ? `Bet Report: ${modal.data?.username}` :
                        modal.type === 'FINANCIAL_LEDGER' ? `Financial Ledger: ${modal.data?.username}` :
                        modal.type === 'REVERSE_WINNINGS' ? `Reverse Winnings: ${modal.data?.username}` :
                        `Manage Wallet: ${modal.data?.username}`
                    } 
                    onClose={handleCloseModal}
                >
                    {renderModalContent()}
                </Modal>
            )}
        </div>
    );
};

export default ClientManagement;