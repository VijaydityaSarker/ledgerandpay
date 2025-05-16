// src/pages/Dashboard.tsx
import React from 'react';
import { Card } from '../components/ui/Card';
import { Line } from 'recharts'; // placeholder if you use Recharts

export default function Dashboard() {
    // TODO: Replace with real data via hooks (expenses, settlements)
    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                        You’re Owed
                    </h2>
                    <p className="mt-2 text-2xl font-bold text-primary-light dark:text-primary-dark">
                        120.50 USDC
                    </p>
                </Card>
                <Card>
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                        You Owe
                    </h2>
                    <p className="mt-2 text-2xl font-bold text-primary-light dark:text-primary-dark">
                        75.00 USDC
                    </p>
                </Card>
                <Card>
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                        Pending Settlements
                    </h2>
                    <p className="mt-2 text-2xl font-bold text-primary-light dark:text-primary-dark">
                        3
                    </p>
                </Card>
            </div>

            {/* Activity Placeholder */}
            <section>
                <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">
                    Recent Activity
                </h3>
                <Card>
                    <div className="p-4 text-gray-600 dark:text-gray-300">
                        {/* Map over recent events here */}
                        No recent activity.
                    </div>
                </Card>
            </section>
        </div>
    );
}