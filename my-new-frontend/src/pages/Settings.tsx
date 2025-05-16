import React from 'react';
import { Card } from '../components/ui/Card';

export default function Settings() {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                Settings
            </h2>
            <Card>
                <div className="space-y-4 p-4 text-gray-700 dark:text-gray-300">
                    {/* TODO: Add profile, wallet management, theme toggle */}
                    <p>Profile settings go here.</p>
                </div>
            </Card>
        </div>
    );
}
