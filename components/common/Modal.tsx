import React from 'react';

const Modal: React.FC<{onClose: () => void, children: React.ReactNode, title: string}> = ({ onClose, children, title }) => (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 transition-opacity" onClick={onClose}>
        <div className="bg-brand-surface rounded-xl shadow-2xl p-6 border border-brand-primary/50 w-full max-w-3xl max-h-[90vh] flex flex-col animate-fade-in-down" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-brand-secondary pb-3 mb-4">
                <h2 className="text-2xl font-bold text-brand-primary">{title}</h2>
                <button onClick={onClose} className="text-brand-text-secondary hover:text-brand-text transition-colors" aria-label="Close modal">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
            <div className="overflow-y-auto pr-2">{children}</div>
        </div>
    </div>
);

export default Modal;