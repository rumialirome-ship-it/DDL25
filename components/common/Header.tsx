import React from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { Client, Role } from '../../types/index.ts';
import Logo from './Logo.tsx';

const BackArrowIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
);

interface HeaderProps {
    client: Client | null;
    onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ client, onLogout }) => {
    const navigate = ReactRouterDOM.useNavigate();
    const location = ReactRouterDOM.useLocation();

    const showBackButton = location.pathname !== '/';

    return (
        <header className="fixed top-0 left-0 w-full bg-brand-surface border-b border-brand-secondary z-40 shadow-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex items-center gap-4">
                        {showBackButton && (
                             <button
                                onClick={() => navigate(-1)}
                                className="text-brand-text-secondary hover:text-brand-text p-2 rounded-full -ml-2"
                                aria-label="Go back to previous page"
                            >
                                <BackArrowIcon />
                            </button>
                        )}
                        <ReactRouterDOM.Link to="/" title="Go to homepage" className="flex items-center gap-3 text-2xl font-bold text-brand-primary hover:text-yellow-300 transition-colors">
                            <Logo />
                            <span className="hidden sm:inline">Daily Dubai Lottery</span>
                        </ReactRouterDOM.Link>
                    </div>
                    <div className="flex items-center space-x-4">
                        {client ? (
                            <>
                                <div className="text-right">
                                    <span className="text-brand-text font-semibold block truncate max-w-32 sm:max-w-xs" title={client.username}>
                                        <span className="hidden sm:inline">Welcome, </span>
                                        {client.username}
                                    </span>
                                    <span className="block text-xs text-brand-text-secondary capitalize">
                                        {client.role.toLowerCase()}
                                    </span>
                                </div>
                                <button
                                    onClick={onLogout}
                                    className="bg-danger hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors"
                                >
                                    Logout
                                </button>
                            </>
                        ) : (
                           <ReactRouterDOM.Link to="/login" className="bg-brand-primary text-brand-bg font-bold py-2 px-4 rounded-lg text-sm hover:shadow-glow transition-all">
                                Login
                           </ReactRouterDOM.Link>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;