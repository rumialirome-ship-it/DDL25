import React from 'react';

const Footer = () => (
    <footer className="bg-brand-surface border-t border-brand-secondary mt-auto">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
            <div className="flex justify-center space-x-6">
                <a href="#" className="text-brand-text-secondary hover:text-brand-text text-sm">Terms of Service</a>
                <a href="#" className="text-brand-text-secondary hover:text-brand-text text-sm">Privacy Policy</a>
                <a href="#" className="text-brand-text-secondary hover:text-brand-text text-sm">Contact Us</a>
            </div>
            <p className="mt-4 text-center text-sm text-brand-text-secondary">&copy; 2011 Daily Dubai Lottery. All rights reserved.</p>
        </div>
    </footer>
);

export default Footer;