import React, { useState } from 'react';
import { useAppContext } from '../../contexts/AppContext.tsx';
import * as ModalModule from '../common/Modal.tsx';
const Modal = ModalModule.default;

const WalletManagement: React.FC = () => {
    const { currentClient } = useAppContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState({ title: '', body: '' });

    if (!currentClient) return null;

    const handleDeposit = () => {
        setModalContent({
            title: 'How to Deposit Funds',
            body: 'To add funds to your wallet, please contact your administrator directly via WhatsApp. They will assist you with the deposit process.'
        });
        setIsModalOpen(true);
    };

    return (
        <div>
            <h2 className="text-xl font-bold text-brand-text mb-4">Manage Your Wallet</h2>
            <div className="bg-brand-bg p-6 rounded-lg border border-brand-secondary space-y-6">
                <div>
                    <p className="text-brand-text-secondary text-sm">Current Balance</p>
                    <p className="text-3xl font-bold text-brand-primary">
                        RS. {currentClient.wallet.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="flex flex-col">
                    <button
                        onClick={handleDeposit}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                    >
                        Deposit Funds
                    </button>
                </div>
                 <p className="text-xs text-brand-text-secondary text-center pt-4">
                    All deposits are handled securely through your administrator.
                </p>
            </div>

            {isModalOpen && (
                <Modal title={modalContent.title} onClose={() => setIsModalOpen(false)}>
                    <p className="text-brand-text-secondary">{modalContent.body}</p>
                     <a href="https://wa.me/447879144354" target="_blank" rel="noopener noreferrer" className="mt-4 inline-block bg-green-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-600">
                        Contact on WhatsApp
                    </a>
                </Modal>
            )}
        </div>
    );
};

export default WalletManagement;