import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Users, Slash, CreditCard, Settings } from 'lucide-react';

const links = [
    { to: '/', icon: <Home size={20} />, label: 'Dashboard' },
    { to: '/groups', icon: <Users size={20} />, label: 'Groups' },
    { to: '/activity', icon: <Slash size={20} />, label: 'Activity' },
    { to: '/log', icon: <CreditCard />, label: 'Log an Expense' },
    { to: '/settle', label: 'Settle Up', icon: <CreditCard /> },
    { to: '/settings', icon: <Settings size={20} />, label: 'Settings' },
];

export function Sidebar() {
    return (
        <nav className="hidden md:flex flex-col w-60 bg-white/20 dark:bg-gray-900/20 backdrop-blur-lg p-4">
            {links.map(({ to, icon, label }) => (
                <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                        `flex items-center gap-3 p-3 rounded-lg transition ${isActive
                            ? 'bg-primary-light/20 dark:bg-primary-dark/20 text-primary-light dark:text-primary-dark'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-white hover:bg-opacity-30 dark:hover:bg-gray-800 dark:hover:bg-opacity-30'
                        }`
                    }
                >
                    {icon}
                    <span className="font-medium">{label}</span>
                </NavLink>
            ))}
        </nav>
    );
}