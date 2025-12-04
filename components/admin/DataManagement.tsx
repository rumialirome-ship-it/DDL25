

import React, { useState } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { Client, Role, ClientImportData, GameType } from '../../types';

const DATA_KEYS = ['ddl_clients', 'ddl_draws', 'ddl_bets', 'ddl_transactions', 'ddl_marketOverride'];

const DataManagement = () => {
    const { clients, importClientsFromCSV } = useAppContext();
    const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [isRestoring, setIsRestoring] = useState(false);
    const [restoreFile, setRestoreFile] = useState<File | null>(null);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [isImporting, setIsImporting] = useState(false);

    const showNotification = (type: 'success' | 'error', message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 5000);
    };

    const handleBackup = () => {
        try {
            const backupData: Record<string, any> = {};
            DATA_KEYS.forEach(key => {
                const data = localStorage.getItem(key);
                if (data) {
                    // We parse and stringify again to get a clean JSON format
                    backupData[key] = JSON.parse(data);
                }
            });

            const jsonString = JSON.stringify(backupData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const date = new Date().toISOString().split('T')[0];
            link.download = `ddl-full-data-backup-${date}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            showNotification('success', 'Full data backup downloaded successfully!');
        } catch (error) {
            console.error('Backup failed:', error);
            showNotification('error', 'An error occurred during data backup.');
        }
    };

    const handleExportClientsCSV = () => {
        const clientsToExport = clients.filter(c => c.role === Role.Client);
        if (clientsToExport.length === 0) {
            showNotification('error', 'No client data to export.');
            return;
        }

        try {
            const headers = ['Client ID', 'Username', 'Contact', 'Area', 'Wallet Balance', 'Status', 'Commission Rate (%)'];
            const clientRows = clientsToExport.map(client => [
                client.clientId,
                client.username,
                client.contact || '',
                client.area || '',
                client.wallet.toFixed(2),
                client.isActive ? 'Active' : 'Suspended',
                client.commissionRates?.[GameType.FourDigits] || 0
            ]);

            const escapeCsvField = (field: any): string => {
                const stringField = String(field);
                if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
                    return `"${stringField.replace(/"/g, '""')}"`;
                }
                return stringField;
            };
            
            const csvContent = [
                headers.join(','),
                ...clientRows.map(row => row.map(escapeCsvField).join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const date = new Date().toISOString().split('T')[0];
            link.download = `ddl-client-data-${date}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            showNotification('success', 'Client data CSV downloaded successfully!');
        } catch (error) {
            console.error('Client data export failed:', error);
            showNotification('error', 'An error occurred during client data export.');
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setRestoreFile(e.target.files[0]);
        }
    };

    const handleRestore = () => {
        if (!restoreFile) {
            showNotification('error', 'Please select a data backup file to restore.');
            return;
        }

        const confirmation = window.confirm(
            'WARNING: This will overwrite all existing application data with the content of the backup file. This action cannot be undone. Are you sure you want to proceed?'
        );

        if (!confirmation) {
            return;
        }

        setIsRestoring(true);
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') {
                    throw new Error('Failed to read file.');
                }
                const backupData = JSON.parse(text);

                const backupKeys = Object.keys(backupData);
                const hasAllKeys = DATA_KEYS.every(key => backupKeys.includes(key));
                
                if (!hasAllKeys) {
                     throw new Error('Invalid backup file. It is missing some required data keys.');
                }
                
                backupKeys.forEach(key => {
                    if (DATA_KEYS.includes(key)) {
                        localStorage.setItem(key, JSON.stringify(backupData[key]));
                    }
                });
                
                showNotification('success', 'Restore successful! The application will now reload.');

                setTimeout(() => {
                    window.location.reload();
                }, 2000);

            } catch (error: any) {
                console.error('Restore failed:', error);
                showNotification('error', `Restore failed: ${error.message || 'Invalid JSON format.'}`);
                setIsRestoring(false);
            }
        };
        
        reader.onerror = () => {
             showNotification('error', 'Failed to read the selected file.');
             setIsRestoring(false);
        };
        
        reader.readAsText(restoreFile);
    };

    const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setImportFile(e.target.files[0]);
        } else {
            setImportFile(null);
        }
    };

    const handleImport = () => {
        if (!importFile) {
            showNotification('error', 'Please select a CSV file to import.');
            return;
        }
        setIsImporting(true);
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const text = e.target?.result as string;
                const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
                if (lines.length < 1) throw new Error("CSV file is empty.");

                const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
                const expectedHeader = ['Client ID', 'Username', 'Password', 'Contact', 'Area', 'Initial Deposit', 'Commission Rate (%)'];
                
                if (header.length !== expectedHeader.length || !header.every((h, i) => h === expectedHeader[i])) {
                    throw new Error(`Invalid CSV header. Expected: ${expectedHeader.join(', ')}`);
                }
                
                const clientsData: ClientImportData[] = lines.slice(1).map((line, index) => {
                    const values = line.split(',');
                    if (values.length !== expectedHeader.length) {
                        throw new Error(`Row ${index + 2}: has incorrect number of columns. Expected ${expectedHeader.length}, got ${values.length}.`);
                    }
                    return {
                        'Client ID': values[0]?.trim(),
                        'Username': values[1]?.trim(),
                        'Password': values[2]?.trim(),
                        'Contact': values[3]?.trim(),
                        'Area': values[4]?.trim(),
                        'Initial Deposit': parseFloat(values[5]?.trim()) || 0,
                        'Commission Rate (%)': parseFloat(values[6]?.trim()) || 0,
                    };
                });
                
                if (clientsData.length === 0) throw new Error("No data rows found in the CSV file.");

                const result = await importClientsFromCSV(clientsData);

                let summaryMessage = `Import finished. ${result.successCount} clients imported successfully.`;
                if(result.errorCount > 0) {
                    summaryMessage += `\n${result.errorCount} clients failed due to errors.`;
                    console.error("Import Errors:\n" + result.errorMessages.join('\n'));
                    showNotification('error', `${summaryMessage} See browser console for details.`);
                } else {
                    showNotification('success', summaryMessage);
                }

            } catch(error: any) {
                showNotification('error', `Import failed: ${error.message}`);
            } finally {
                setIsImporting(false);
                setImportFile(null);
                const fileInput = document.getElementById('import-file-input') as HTMLInputElement;
                if(fileInput) fileInput.value = '';
            }
        };
        reader.onerror = () => {
            showNotification('error', 'Failed to read the file.');
            setIsImporting(false);
        };
        reader.readAsText(importFile);
    };


    return (
        <div className="space-y-8">
             <h2 className="text-2xl font-bold text-brand-text">Data Management</h2>

            {notification && (
                <div className={`p-4 rounded-lg text-sm text-center ${notification.type === 'success' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
                    {notification.message}
                </div>
            )}

            <div className="bg-brand-surface p-6 rounded-lg border border-brand-secondary">
                <h3 className="text-xl font-bold text-brand-text mb-2">Export Client Data (CSV)</h3>
                <p className="text-brand-text-secondary mb-4">
                    Download a CSV file containing a list of all clients and their key information, such as contact details, wallet balance, and commission rate. This is useful for offline analysis or record-keeping.
                </p>
                <button 
                    onClick={handleExportClientsCSV} 
                    className="w-full md:w-auto bg-green-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-700 transition-colors"
                >
                    Download Client Info (.csv)
                </button>
            </div>
            
             <div className="bg-brand-surface p-6 rounded-lg border border-brand-secondary">
                <h3 className="text-xl font-bold text-brand-text mb-2">Import Client Data (CSV)</h3>
                <p className="text-brand-text-secondary mb-4">
                    Upload a CSV file to bulk-create new client accounts. The file must have a header row and data in the following format. Ensure Client ID, Username, and Contact are unique.
                </p>
                <code className="block bg-brand-bg p-2 rounded-md text-brand-text-secondary text-sm mb-4 font-mono">
                    Client ID,Username,Password,Contact,Area,Initial Deposit,Commission Rate (%)
                </code>
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <input 
                        id="import-file-input"
                        type="file"
                        accept=".csv"
                        onChange={handleImportFileChange}
                        className="flex-grow w-full text-sm text-brand-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-primary file:text-brand-bg hover:file:bg-yellow-400"
                    />
                    <button
                        onClick={handleImport}
                        disabled={!importFile || isImporting}
                        className="w-full md:w-auto bg-teal-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-teal-700 transition-colors disabled:bg-brand-secondary disabled:cursor-not-allowed"
                    >
                        {isImporting ? 'Importing...' : 'Import from CSV'}
                    </button>
                </div>
            </div>

            <div className="bg-brand-surface p-6 rounded-lg border border-brand-secondary">
                <h3 className="text-xl font-bold text-brand-text mb-2">Create Full Data Backup</h3>
                <p className="text-brand-text-secondary mb-4">
                    This application runs in your browser and does not need to be downloaded to your PC.
                    <br/>
                    This button will save a <strong className="text-brand-text">JSON data file</strong> to your computer. This file contains all client accounts, betting history, and financial transactions. Keep it in a safe place.
                </p>
                <button 
                    onClick={handleBackup} 
                    className="w-full md:w-auto bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Download Full Data File (.json)
                </button>
            </div>

            <div className="bg-brand-surface p-6 rounded-lg border border-red-500/50">
                 <h3 className="text-xl font-bold text-red-400 mb-2">Restore from Data File</h3>
                 <p className="text-brand-text-secondary mb-4">
                    Upload a `.json` data file to restore all clients, bets, and transactions.
                 </p>
                 <div className="bg-red-900/30 border border-red-500/50 p-3 rounded-lg text-red-300 text-sm mb-4">
                    <strong>Warning:</strong> Restoring will completely overwrite all current data in your browser's storage. This action is irreversible.
                 </div>
                 <div className="flex flex-col md:flex-row gap-4 items-center">
                    <input 
                        type="file"
                        accept=".json"
                        onChange={handleFileChange}
                        className="flex-grow w-full text-sm text-brand-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-primary file:text-brand-bg hover:file:bg-yellow-400"
                    />
                    <button
                        onClick={handleRestore}
                        disabled={!restoreFile || isRestoring}
                        className="w-full md:w-auto bg-red-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-red-700 transition-colors disabled:bg-brand-secondary disabled:cursor-not-allowed"
                    >
                        {isRestoring ? 'Restoring...' : 'Restore Data'}
                    </button>
                 </div>
            </div>
        </div>
    );
};

export default DataManagement;