import React, { Suspense } from 'react';
import { useAppContext } from '../contexts/AppContext.tsx';
import { Role } from '../types/index.ts';
import Header from '../components/common/Header.tsx';
import MarketStatus from '../components/common/MarketStatus.tsx';
import CurrentDateDisplay from '../components/common/CurrentDateDisplay.tsx';

// --- PERFORMANCE OPTIMIZATION ---
// Lazy-load the role-specific dashboards. This creates separate JavaScript chunks for
// the admin and client dashboards. Now, a client user will only download the code
// for the ClientDashboard, significantly reducing the initial JavaScript bundle size
// and addressing the "Reduce unused JavaScript" performance warning.
const AdminDashboard = React.lazy(() => import('../components/admin/AdminDashboard.tsx'));
const ClientDashboard = React.lazy(() => import('../components/client/ClientDashboard.tsx'));

// A simple skeleton loader to show while the role-specific dashboard is loading.
const DashboardLoadingFallback = () => (
    <div className="bg-brand-surface rounded-xl p-6 border border-brand-secondary mt-8 animate-pulse">
        <div className="h-8 bg-brand-secondary rounded w-1/4 mb-6"></div>
        <div className="h-40 bg-brand-secondary rounded w-full"></div>
    </div>
);


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
                    {/* The <Suspense> component shows a fallback UI while the lazy-loaded component is fetched. */}
                    <Suspense fallback={<DashboardLoadingFallback />}>
                        {currentClient.role === Role.Admin ? <AdminDashboard /> : <ClientDashboard />}
                    </Suspense>
                </div>
                
            </main>
        </div>
    );
};

export default Dashboard;