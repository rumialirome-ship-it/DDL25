import React from 'react';
import { useAppContext } from '../contexts/AppContext.tsx';
import { Role } from '../types/index.ts';
import Header from '../components/common/Header.tsx';
import MarketStatus from '../components/common/MarketStatus.tsx';
import AdminDashboard from '../components/admin/AdminDashboard.tsx';
import ClientDashboard from '../components/client/ClientDashboard.tsx';
import CurrentDateDisplay from '../components/common/CurrentDateDisplay.tsx';


const Dashboard: React.FC = () => {
    const { currentClient, logout } = useAppContext();
    
    if (!currentClient) return null;

    return (
        <div className="min-h-screen bg-brand-bg pt-16">
            <Header onLogout={logout} client={currentClient} />
            <main className="p-4 md:p-8 max-w-7xl mx-auto">
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold text-brand-text mb-2">Welcome back, {currentClient.username}!</h1>
                    <CurrentDateDisplay />
                </div>
                
                {/* Display Market Status for all logged-in users */}
                <div className="mb-8">
                    <MarketStatus />
                </div>
                
                <div className="mt-8">
                    {currentClient.role === Role.Admin ? <AdminDashboard /> : <ClientDashboard />}
                </div>
                
            </main>
        </div>
    );
};

export default Dashboard;