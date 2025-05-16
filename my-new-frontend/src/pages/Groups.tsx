import React from 'react';
import CreateGroup from '../components/CreateGroup';
import JoinGroup from '../components/JoinGroup';
import ViewMyGroups from '../components/ViewMyGroups';
import { Card } from '../components/ui/Card';

export default function Groups() {
    return (
        <div className="space-y-8">
            {/* Create & Join */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CreateGroup />
                </Card>
                <Card>
                    <JoinGroup />
                </Card>
            </div>

            {/* My Groups */}
            <section>
                <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">
                    My Groups
                </h2>
                <ViewMyGroups />
            </section>
        </div>
    );
}