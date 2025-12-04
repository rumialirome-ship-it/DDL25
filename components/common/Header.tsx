import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Client, Role } from '../../types/index.ts';

// Replaced the app logo with the GitHub logo to link to the project repository.
const GitHubLogo: React.FC<{ className?: string }> = ({ className = 'h-8 w-8 text-brand-primary' }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className={className} 
        viewBox="0 0 16 16" 
        fill="currentColor"
        aria-label="GitHub Project Link"
    >
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
    </svg>
);


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
    const navigate = useNavigate();
    const location = useLocation();

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
                        <a href="https://github.com/rumialirome-ship-it/DDL-2" target="_blank" rel="noopener noreferrer" title="View Project on GitHub" className="flex items-center gap-3 text-2xl font-bold text-brand-primary hover:text-yellow-300 transition-colors">
                            <GitHubLogo />
                            <span className="hidden sm:inline">Daily Dubai Lottery</span>
                        </a>
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
                           <Link to="/login" className="bg-brand-primary text-brand-bg font-bold py-2 px-4 rounded-lg text-sm hover:shadow-glow transition-all">
                                Login
                           </Link>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;