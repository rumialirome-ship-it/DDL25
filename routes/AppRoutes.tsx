import React, { Suspense } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext.tsx';

// --- PERFORMANCE OPTIMIZATION: LAZY LOADING ---
// Instead of loading all components upfront in one large bundle, we now
// lazy-load the main page components. This splits the code into smaller chunks
// that are downloaded only when they are needed.
const LandingPage = React.lazy(() => import('../pages/LandingPage.tsx'));
const Login = React.lazy(() => import('../components/auth/Login.tsx'));
const Dashboard = React.lazy(() => import('../pages/Dashboard.tsx'));

// A simple, themed loading component to show while a lazy-loaded chunk is being downloaded.
const LoadingFallback = () => (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="text-brand-primary text-xl">Loading...</div>
    </div>
);

const AppRoutes = () => {
    const { currentClient } = useAppContext();
    return (
        // The <Suspense> component is required by React.lazy. It allows us to
        // show a fallback UI (like our LoadingFallback component) while the
        // requested component code is being downloaded from the server.
        <Suspense fallback={<LoadingFallback />}>
            <ReactRouterDOM.Routes>
                <ReactRouterDOM.Route path="/" element={currentClient ? <ReactRouterDOM.Navigate to="/dashboard" /> : <LandingPage />} />
                <ReactRouterDOM.Route path="/login" element={currentClient ? <ReactRouterDOM.Navigate to="/dashboard" /> : <Login />} />
                <ReactRouterDOM.Route path="/dashboard" element={currentClient ? <Dashboard /> : <ReactRouterDOM.Navigate to="/login" />} />
                <ReactRouterDOM.Route path="*" element={<ReactRouterDOM.Navigate to="/" />} />
            </ReactRouterDOM.Routes>
        </Suspense>
    );
};

export default AppRoutes;