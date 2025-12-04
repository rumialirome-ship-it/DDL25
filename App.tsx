import React, { useEffect, useCallback } from 'react';
import { HashRouter } from 'react-router-dom';
import { AppProvider, useAppContext } from './contexts/AppContext.tsx';
import AppRoutes from './routes/AppRoutes.tsx';
import { Role } from './types/index.ts';

const InactivityManager: React.FC = () => {
    const { currentClient, logout } = useAppContext();

    const handleLogout = useCallback(() => {
        // This function will be called after 1 hour of inactivity.
        // The client is logged out, and the AppRoutes will handle redirection.
        logout();
    }, [logout]);

    useEffect(() => {
        // If no client is logged in, there's nothing to do.
        if (!currentClient) {
            return;
        }

        const INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 1 hour in milliseconds
        let inactivityTimer: number;

        // This function resets the inactivity timer.
        const resetTimer = () => {
            clearTimeout(inactivityTimer);
            inactivityTimer = window.setTimeout(handleLogout, INACTIVITY_TIMEOUT);
        };

        // List of events that count as client activity.
        const activityEvents: (keyof WindowEventMap)[] = [
            'mousemove',
            'mousedown',
            'keypress',
            'scroll',
            'touchstart'
        ];

        // Add event listeners for all activity events.
        activityEvents.forEach(event => {
            window.addEventListener(event, resetTimer);
        });

        // Initialize the timer when the component mounts or the client logs in.
        resetTimer();

        // Cleanup function to remove listeners and clear the timer when the
        // component unmounts or the client logs out.
        return () => {
            clearTimeout(inactivityTimer);
            activityEvents.forEach(event => {
                window.removeEventListener(event, resetTimer);
            });
        };
    }, [currentClient, handleLogout]);

    return null; // This component doesn't render anything to the DOM.
};


const App = () => {
    useEffect(() => {
        // This effect runs once after the initial render.
        // It makes the root element visible, preventing the flash of unstyled content (FOUC).
        const rootEl = document.getElementById('root');
        if (rootEl) {
            // The initial opacity is set to 0 via a style tag in index.html
            rootEl.style.opacity = '1';
        }
    }, []);
    
    return (
        <AppProvider>
            <HashRouter>
                <InactivityManager />
                <AppRoutes />
            </HashRouter>
        </AppProvider>
    );
};

export default App;