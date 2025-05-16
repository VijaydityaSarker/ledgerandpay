import React, { useState } from 'react';
import { Plus, X, FilePlus, Users, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function FAB() {
    const [open, setOpen] = useState(false);
    const items = [
        { icon: <Users size={20} />, label: 'New Group', onClick: () => {/*...*/ } },
        { icon: <FilePlus size={20} />, label: 'Join Group', onClick: () => {/*...*/ } },
        { icon: <DollarSign size={20} />, label: 'Log Expense', onClick: () => {/*...*/ } },
    ];

    return (
        <div className="fixed bottom-8 right-8 flex flex-col items-end">
            <AnimatePresence>
                {open &&
                    items.map((item, i) => (
                        <motion.button
                            key={item.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            transition={{ delay: i * 0.05 }}
                            onClick={item.onClick}
                            className="glass-card mb-2 flex items-center gap-2 p-3 rounded-full shadow-md hover:scale-105 transition"
                        >
                            {item.icon}
                            <span className="whitespace-nowrap font-medium text-gray-800 dark:text-gray-100">
                                {item.label}
                            </span>
                        </motion.button>
                    ))}
            </AnimatePresence>
            <button
                onClick={() => setOpen(!open)}
                className="glass-card p-4 rounded-full shadow-lg hover:scale-110 transition"
            >
                {open ? <X size={24} /> : <Plus size={24} />}
            </button>
        </div>
    );
}