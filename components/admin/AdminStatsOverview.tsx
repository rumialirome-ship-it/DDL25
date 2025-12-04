import React, { useMemo } from 'react';
import { useAppContext } from '../../contexts/AppContext.tsx';
import { Role, DrawStatus } from '../../types/index.ts';
import AdminStatsCard from './AdminStatsCard.tsx';


// Icons for the stat cards
const ClientsStatIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
const DrawsStatIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const RevenueStatIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" /></svg>;


const AdminStatsOverview: React.FC = () => {
    const { clients, draws, bets } = useAppContext();

    const totalClients = clients.filter(c => c.role === Role.Client).length;
    const openDrawsCount = draws.filter(d => d.status === DrawStatus.Open).length;

    const todaysTotalStake = useMemo(() => {
        // The `draws` from context are already scoped to the current lottery day.
        const todaysDrawIds = new Set(draws.map(d => d.id));
        return bets
            .filter(b => todaysDrawIds.has(b.drawId))
            .reduce((sum, bet) => sum + bet.stake, 0);
    }, [draws, bets]);

    return (
        <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <AdminStatsCard 
                    title="Total Clients" 
                    value={totalClients.toLocaleString()} 
                    icon={<ClientsStatIcon />}
                />
                <AdminStatsCard 
                    title="Active Draws" 
                    value={openDrawsCount.toLocaleString()} 
                    icon={<DrawsStatIcon />}
                />
                <AdminStatsCard 
                    title="Today's Total Stakes" 
                    value={`RS. ${todaysTotalStake.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                    className="text-green-400"
                    icon={<RevenueStatIcon />}
                />
            </div>
        </div>
    );
};

export default AdminStatsOverview;