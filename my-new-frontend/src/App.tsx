// src/App.tsx
import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { Sidebar } from './components/layout/Sidebar'
import { TopNav } from './components/layout/TopNav'
import { BottomNav } from './components/layout/BottomNav'
import { FAB } from './components/layout/FAB'
import Dashboard from './pages/Dashboard'
import Groups from './pages/Groups'
import Activity from './pages/Activity'
import SettleUp from './pages/SettleUp'
import Settings from './pages/Settings'
import Settle from './pages/Settle';

export default function App() {
  return (
    <div className="min-h-screen flex bg-gray-100 dark:bg-gray-800">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <TopNav />
        <main className="p-6 flex-1 overflow-auto max-w-7xl mx-auto w-full">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/groups" element={<Groups />} />
            <Route path="/activity" element={<Activity />} />
            <Route path="/log" element={<SettleUp />} />
            <Route path="/settle" element={<Settle />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
      <FAB />
    </div>
  )
}
