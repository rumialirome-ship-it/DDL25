import React from 'react';

// This schedule reflects the 13 daily draws.
// The schedule has been corrected to ensure all times are accurate.
const drawSchedule = [
    { name: 'Draw 1', time: '11:00 AM', close: '10:50 AM' },
    { name: 'Draw 2', time: '12:00 PM', close: '11:50 AM' },
    { name: 'Draw 3', time: '01:00 PM', close: '12:50 PM' },
    { name: 'Draw 4', time: '02:00 PM', close: '01:50 PM' },
    { name: 'Draw 5', time: '03:00 PM', close: '02:50 PM' },
    { name: 'Draw 6', time: '04:00 PM', close: '03:50 PM' },
    { name: 'Draw 7', time: '05:00 PM', close: '04:50 PM' },
    { name: 'Draw 8', time: '06:00 PM', close: '05:50 PM' },
    { name: 'Draw 9', time: '07:00 PM', close: '06:50 PM' },
    { name: 'Draw 10', time: '08:00 PM', close: '07:50 PM' },
    { name: 'Draw 11', time: '09:00 PM', close: '08:50 PM' },
    { name: 'Draw 12', time: '10:00 PM', close: '09:50 PM' },
    { name: 'Draw 13', time: '11:00 PM', close: '10:50 PM' },
];

const MarketTimings = () => (
    <div className="bg-brand-surface rounded-xl shadow-lg border border-brand-secondary text-brand-text-secondary max-w-lg mx-auto">
        <h3 className="text-lg font-bold text-center text-brand-text bg-gray-600 p-2 rounded-t-xl tracking-wider">
            DAILY DRAWS TIMINGS
        </h3>
        <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
                <thead>
                    <tr className="bg-brand-primary text-brand-bg text-sm">
                        <th className="py-2 px-4 font-bold uppercase border-r border-gray-700/50 text-left">DRAW NAMES</th>
                        <th className="py-2 px-4 font-bold uppercase border-r border-gray-700/50 text-left">DRAW TIMINGS</th>
                        <th className="py-2 px-4 font-bold uppercase text-left">BETTING CLOSING TIME</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-brand-secondary">
                    {drawSchedule.map((draw, index) => (
                        <tr key={index} className="text-brand-text">
                            <td className="py-2 px-4 border-r border-brand-secondary font-medium">{draw.name}</td>
                            <td className="py-2 px-4 border-r border-brand-secondary font-medium">{draw.time}</td>
                            <td className="py-2 px-4 font-medium">{draw.close}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

export default MarketTimings;