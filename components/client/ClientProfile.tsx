import React from 'react';
import { useAppContext } from '../../contexts/AppContext';

const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-brand-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const ClientProfile: React.FC = () => {
    const { currentClient } = useAppContext();

    if (!currentClient) return null;

    const handleUploadClick = () => {
        alert("Profile picture upload feature is coming soon!");
    };

    return (
        <div>
            <h2 className="text-xl font-bold text-brand-text mb-4">Your Profile</h2>
            <div className="bg-brand-bg p-6 rounded-lg border border-brand-secondary flex flex-col md:flex-row items-center gap-8">
                <div className="flex-shrink-0">
                    <div className="relative w-40 h-40 rounded-full bg-brand-surface border-2 border-brand-secondary flex items-center justify-center">
                        <UserIcon />
                        {/* Placeholder for actual image */}
                    </div>
                    <button
                        onClick={handleUploadClick}
                        className="w-full mt-4 bg-brand-accent hover:bg-sky-400 text-white text-sm font-bold py-2 px-4 rounded-lg"
                    >
                        Upload Picture
                    </button>
                </div>
                <div className="flex-grow w-full">
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-bold text-brand-text-secondary">Username</label>
                            <p className="text-lg text-brand-text p-2 bg-brand-surface rounded">{currentClient.username}</p>
                        </div>
                         <div>
                            <label className="text-sm font-bold text-brand-text-secondary">Client ID</label>
                            <p className="text-lg text-brand-text p-2 bg-brand-surface rounded font-mono">{currentClient.clientId}</p>
                        </div>
                        <div>
                            <label className="text-sm font-bold text-brand-text-secondary">Contact Number</label>
                            <p className="text-lg text-brand-text p-2 bg-brand-surface rounded">{currentClient.contact || 'Not provided'}</p>
                        </div>
                        <div>
                            <label className="text-sm font-bold text-brand-text-secondary">Area</label>
                            <p className="text-lg text-brand-text p-2 bg-brand-surface rounded">{currentClient.area || 'Not provided'}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClientProfile;