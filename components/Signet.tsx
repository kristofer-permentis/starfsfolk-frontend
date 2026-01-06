'use client';

import { useState } from 'react';
import RequireAuth from '@/components/RequireAuth';
import Tabs from '@/components/Tabs';
import FilesTable from '@/components/FilesTable';
import SendMessageForm from '@/components/SendMessageForm';
import WaitingListPage from '@/components/waitinglistclient';
import StaffFinance from '@/components/StaffFinance';
import ADHDWorkupAdmin from '@/components/ADHDWorkupAdmin';

type TabKey = 'received' | 'sent' | 'send' | 'waitinglist' | 'starfsmenn';
type StaffSubTab = 'fjarmal' | 'adhdworkup';

export default function SignetPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('received');
  const [staffSubTab, setStaffSubTab] = useState<StaffSubTab>('fjarmal');

  return (
    <RequireAuth>
      <div className="max-w-screen-xl mx-auto px-4 pt-4">
        <Tabs
          tabs={[
            { key: 'received', label: 'Móttaka' },
            { key: 'sent', label: 'Sent' },
            { key: 'send', label: 'Senda nýja skrá' },
            { key: 'waitinglist', label: 'Skilaboð á biðlista' },
            { key: 'starfsmenn', label: 'Starfsmenn' },
          ] as const}
          active={activeTab}
          onChange={(key) => setActiveTab(key as TabKey)}
        />
        {activeTab === 'received' && (
          <FilesTable apiPath="/signet/transfer/getReceived" emptyMessage="Engar mótteknar skrár" />
        )}
        {activeTab === 'sent' && (
          <FilesTable apiPath="/signet/transfer/getSent" emptyMessage="Engar sendar skrár" />
        )}
        {activeTab === 'send' && <SendMessageForm />}
        {activeTab === 'waitinglist' && <WaitingListPage />}
        {activeTab === 'starfsmenn' && (
          <div className="space-y-4">
            {/* Staff sub-navigation */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
              <button
                onClick={() => setStaffSubTab('fjarmal')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  staffSubTab === 'fjarmal'
                    ? 'bg-white text-[--pm-blue] shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Fjármál
              </button>
              <button
                onClick={() => setStaffSubTab('adhdworkup')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  staffSubTab === 'adhdworkup'
                    ? 'bg-white text-[--pm-blue] shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                ADHD Workup
              </button>
            </div>

            {/* Staff sub-content */}
            {staffSubTab === 'fjarmal' && (
              <div>
                <div className="mb-4">
                  <h2 className="text-xl font-semibold">Fjármál</h2>
                  <p className="text-sm text-gray-600">Sjá reikninga og færslur skjólstæðings</p>
                </div>
                <StaffFinance />
              </div>
            )}
            {staffSubTab === 'adhdworkup' && <ADHDWorkupAdmin />}
          </div>
        )}
      </div>
    </RequireAuth>
  );
}
