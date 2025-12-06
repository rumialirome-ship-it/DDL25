import React, { useState } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useAppContext } from '../../contexts/AppContext.tsx';
import { Role } from '../../types/index.ts';
import LockIcon from '../common/LockIcon.tsx';
import PasswordInput from '../common/PasswordInput.tsx';
import Logo from '../common/Logo.tsx';

// Icons for roles
const AdminIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066 2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const ClientIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;

const BackArrowIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
);


const Login: React.FC = () => {
    const [loginIdentifier, setLoginIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = ReactRouterDOM.useNavigate();

    const { login } = useAppContext();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRole) return;
        
        setError('');
        setIsLoading(true);

        const result = await login(loginIdentifier, password, selectedRole);
        
        // On successful login, we no longer navigate imperatively.
        // The AppRoutes component will detect the change in `currentClient`
        // and automatically redirect to the dashboard. This prevents race conditions.
        if (!result.success) {
            setError(result.message || `Invalid ${selectedRole === Role.Client ? 'Username/Client ID' : 'username'} or password for the selected role.`);
            setIsLoading(false);
        }
    };
    
    const handleRoleSelect = (role: Role) => {
        setSelectedRole(role);
        setError('');
        setLoginIdentifier('');
        setPassword('');
    };

    if (!selectedRole) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-brand-bg p-4 bg-gradient-to-br from-brand-bg via-brand-surface to-brand-bg">
                <div className="w-full max-w-md bg-brand-surface rounded-2xl shadow-2xl p-8 border border-brand-secondary text-center animate-fade-in-down relative">
                     <button
                        onClick={() => navigate('/')}
                        className="absolute top-4 left-4 text-brand-text-secondary hover:text-brand-text p-2 rounded-full"
                        aria-label="Go to homepage"
                    >
                        <BackArrowIcon />
                    </button>
                    <div className="flex flex-col items-center mb-6">
                        <Logo className="h-16 w-16 text-brand-primary" />
                        <h1 className="text-3xl font-bold text-brand-text mt-4">Daily Dubai Lottery</h1>
                        <p className="text-brand-text-secondary mt-1">Please select your login type</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button onClick={() => handleRoleSelect(Role.Admin)} className="flex flex-col items-center justify-center p-6 bg-brand-secondary/40 hover:bg-brand-secondary/80 text-brand-text font-bold rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all duration-300 transform hover:scale-105">
                            <AdminIcon />
                            Admin Login
                        </button>
                        <button onClick={() => handleRoleSelect(Role.Client)} className="flex flex-col items-center justify-center p-6 bg-brand-secondary/40 hover:bg-brand-secondary/80 text-brand-text font-bold rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all duration-300 transform hover:scale-105">
                            <ClientIcon />
                            Client Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }
    
    const isAdmin = selectedRole === Role.Admin;

    return (
        <div className="min-h-screen flex items-center justify-center bg-brand-bg p-4 bg-gradient-to-br from-brand-bg via-brand-surface to-brand-bg">
            <div className="w-full max-w-md bg-brand-surface rounded-2xl shadow-2xl p-8 border border-brand-secondary animate-fade-in-down relative">
                 <button
                    onClick={() => setSelectedRole(null)}
                    className="absolute top-4 left-4 text-brand-text-secondary hover:text-brand-text p-2 rounded-full"
                    aria-label="Go back to role selection"
                >
                    <BackArrowIcon />
                </button>
                 <div className="flex flex-col items-center mb-6">
                    <LockIcon />
                    <h1 className="text-3xl font-bold text-brand-text mt-4">{isAdmin ? 'Admin' : 'Client'} Login</h1>
                    <p className="text-brand-text-secondary mt-1">Welcome back!</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-brand-text-secondary text-sm font-bold mb-2" htmlFor="loginIdentifier">
                            {selectedRole === Role.Client ? 'Username or Client ID' : 'Username'}
                        </label>
                        <input 
                            id="loginIdentifier"
                            type="text"
                            value={loginIdentifier} 
                            onChange={(e) => setLoginIdentifier(e.target.value)} 
                            className="w-full bg-brand-bg border border-brand-secondary rounded-lg py-3 px-4 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary" 
                            placeholder={selectedRole === Role.Client ? 'Enter Username or Client ID' : 'Enter your username'} 
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label className="block text-brand-text-secondary text-sm font-bold mb-2" htmlFor="password">Password</label>
                        <PasswordInput 
                            id="password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            className="w-full bg-brand-bg border border-brand-secondary rounded-lg py-3 px-4 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary" 
                            placeholder="Enter your password" 
                            required
                            disabled={isLoading}
                        />
                    </div>
                    {error && <p className="text-danger text-xs italic text-center">{error}</p>}
                    <div className="flex flex-col space-y-4 pt-2">
                        <button type="submit" disabled={isLoading} className="w-full bg-brand-primary hover:shadow-glow text-brand-bg font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-all duration-300 disabled:bg-brand-secondary disabled:cursor-not-allowed">
                            {isLoading ? 'Signing In...' : 'Sign In'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;