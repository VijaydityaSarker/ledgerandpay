import React from 'react';
import { Card } from '../components/ui/Card';

export default function Activity() {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                Activity
            </h2>
            {/* TODO: Add filter tabs here */}
            <Card>
                <div className="p-4 text-gray-600 dark:text-gray-300">
                    {/* Map over all expenses & settlements */}
                    No activity to show.
                </div>
            </Card>
        </div>
    );
}