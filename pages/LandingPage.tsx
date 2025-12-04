import React from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext.tsx';
import Header from '../components/common/Header.tsx';
import Footer from '../components/common/Footer.tsx';
import MarketStatus from '../components/common/MarketStatus.tsx';
import CurrentDateDisplay from '../components/common/CurrentDateDisplay.tsx';
import MarketTimings from '../components/common/MarketTimings.tsx';

const LandingPage = () => {
    const { currentClient, logout } = useAppContext();
    
    return (
        <div className="min-h-screen bg-brand-bg flex flex-col text-brand-text pt-20">
            <Header client={currentClient} onLogout={logout} />
            <main className="flex-grow flex flex-col items-center justify-center p-4">
                <div className="text-center max-w-7xl w-full">
                    <h1 className="text-5xl md:text-6xl font-extrabold text-brand-primary my-6 animate-fade-in-down">
                        Welcome to Daily Dubai Lottery
                    </h1>
                    <CurrentDateDisplay className="mb-4" />
                    <p className="text-lg md:text-xl text-brand-text-secondary mb-4 max-w-2xl mx-auto">
                        Your trusted platform for daily draws. Play responsibly and win big.
                    </p>
                    <p className="text-lg text-brand-text mb-8">
                        For New Registration, please message us on WhatsApp: <a href="https://wa.me/447879144354" target="_blank" rel="noopener noreferrer" className="text-green-400 font-bold hover:underline">+44 7879 144354</a>
                    </p>
                    <div className="mb-8">
                      <MarketStatus />
                    </div>
                    
                    {!currentClient && (
                        <div className="mt-12">
                            <Link to="/login" className="bg-brand-primary text-brand-bg font-bold py-3 px-8 rounded-lg text-lg hover:shadow-glow transition-all transform hover:scale-105">
                                Login to Play
                            </Link>
                        </div>
                    )}

                    <div className="my-12">
                        <MarketTimings />
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    )
}

export default LandingPage;