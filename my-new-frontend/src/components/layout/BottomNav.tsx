import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Users, Slash, CreditCard, Settings } from 'lucide-react';

export function BottomNav() {
    const links = [
        { to: '/', icon: <Home size={24} /> },
        { to: '/groups', icon: <Users size={24} /> },
        { to: '/activity', icon: <Slash size={24} /> },
        { to: '/log', icon: <CreditCard />, label: 'Log an Expense' },
        { to: '/settle', label: 'Settle Up', icon: <CreditCard /> },
        { to: '/settings', icon: <Settings size={24} /> },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 flex justify-around bg-white/90 dark:bg-gray-900/90 backdrop-blur-md p-2 md:hidden">
            {links.map(({ to, icon }) => (
                <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                        `p-2 rounded-lg transition ${isActive
                            ? 'bg-primary-light/20 dark:bg-primary-dark/20 text-primary-light dark:text-primary-dark'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-white hover:bg-opacity-30 dark:hover:bg-gray-800 dark:hover:bg-opacity-30'
                        }`
                    }
                >
                    {icon}
                </NavLink>
            ))}
        </nav>
    );
}