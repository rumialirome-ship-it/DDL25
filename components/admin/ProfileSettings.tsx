import React, { useState } from 'react';
import { useAppContext } from '../../contexts/AppContext.tsx';
import PasswordInput from '../common/PasswordInput.tsx';

const ProfileSettings = () => {
    const { currentClient, updateClientCredentials } = useAppContext();
    const [newUsername, setNewUsername] = useState('');
    const [currentPasswordForUser, setCurrentPasswordForUser] = useState('');
    const [currentPasswordForPass, setCurrentPasswordForPass] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

    const handleChangeUsername = async (e: React.FormEvent) => {
        e.preventDefault();
        setNotification(null);
        if (!newUsername || !currentPasswordForUser) {
            setNotification({ type: 'error', message: "All fields are required." });
            return;
        }
        const result = await updateClientCredentials({ currentPassword: currentPasswordForUser, newUsername });
        setNotification({ type: result.success ? 'success' : 'error', message: result.message });
        if (result.success) {
            setNewUsername('');
            setCurrentPasswordForUser('');
        }
    };
    
    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setNotification(null);
        if (!currentPasswordForPass || !newPassword || !confirmNewPassword) {
            setNotification({ type: 'error', message: "All fields are required." });
            return;
        }
        if (newPassword.length < 8) {
            setNotification({ type: 'error', message: "New password must be at least 8 characters long." });
            return;
        }
        if (newPassword !== confirmNewPassword) {
            setNotification({ type: 'error', message: "New passwords do not match." });
            return;
        }
        const result = await updateClientCredentials({ currentPassword: currentPasswordForPass, newPassword });
        setNotification({ type: result.success ? 'success' : 'error', message: result.message });
        if (result.success) {
            setCurrentPasswordForPass('');
            setNewPassword('');
            setConfirmNewPassword('');
        }
    };

    if (!currentClient) return null;

    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-bold text-brand-text">Profile Settings</h2>

            {notification && (
                <div className={`p-4 rounded-lg text-sm text-center ${notification.type === 'success' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
                    {notification.message}
                </div>
            )}
            
            <div className="bg-brand-surface p-6 rounded-lg border border-brand-secondary">
                <h3 className="text-xl font-bold text-brand-text mb-4">Change Username</h3>
                <form onSubmit={handleChangeUsername} className="space-y-4">
                    <div>
                        <label className="block text-brand-text-secondary text-sm font-bold mb-2" htmlFor="newUsername">New Username</label>
                        <input id="newUsername" type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)} className="w-full bg-brand-bg border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary" required />
                    </div>
                    <div>
                        <label className="block text-brand-text-secondary text-sm font-bold mb-2" htmlFor="currentPasswordForUser">Current Password to Confirm</label>
                        <PasswordInput id="currentPasswordForUser" value={currentPasswordForUser} onChange={e => setCurrentPasswordForUser(e.target.value)} className="w-full bg-brand-bg border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary" required/>
                    </div>
                    <button type="submit" className="w-full md:w-auto bg-brand-primary text-brand-bg font-bold py-2 px-6 rounded-lg hover:bg-yellow-400 transition-colors">Update Username</button>
                </form>
            </div>
            
             <div className="bg-brand-surface p-6 rounded-lg border border-brand-secondary">
                <h3 className="text-xl font-bold text-brand-text mb-4">Change Password</h3>
                <form onSubmit={handleChangePassword} className="space-y-4">
                     <div>
                        <label className="block text-brand-text-secondary text-sm font-bold mb-2" htmlFor="currentPasswordForPass">Current Password</label>
                        <PasswordInput id="currentPasswordForPass" value={currentPasswordForPass} onChange={e => setCurrentPasswordForPass(e.target.value)} className="w-full bg-brand-bg border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary" required/>
                    </div>
                     <div>
                        <label className="block text-brand-text-secondary text-sm font-bold mb-2" htmlFor="newPassword">New Password</label>
                        <PasswordInput id="newPassword" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-brand-bg border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary" required/>
                    </div>
                     <div>
                        <label className="block text-brand-text-secondary text-sm font-bold mb-2" htmlFor="confirmNewPassword">Confirm New Password</label>
                        <PasswordInput id="confirmNewPassword" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} className="w-full bg-brand-bg border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary" required/>
                    </div>
                    <button type="submit" className="w-full md:w-auto bg-brand-primary text-brand-bg font-bold py-2 px-6 rounded-lg hover:bg-yellow-400 transition-colors">Update Password</button>
                </form>
            </div>
        </div>
    );
};

export default ProfileSettings;