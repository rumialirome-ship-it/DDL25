import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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
            <Routes>
                <Route path="/" element={currentClient ? <Navigate to="/dashboard" /> : <LandingPage />} />
                <Route path="/login" element={currentClient ? <Navigate to="/dashboard" /> : <Login />} />
                <Route path="/dashboard" element={currentClient ? <Dashboard /> : <Navigate to="/login" />} />
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </Suspense>
    );
};

export default AppRoutes;