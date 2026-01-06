'use client';

import { useState } from 'react';
import RequireAuth from '@/components/RequireAuth';
import Tabs from '@/components/Tabs';
import FilesTable from '@/components/FilesTable';
import SendMessageForm from '@/components/SendMessageForm';
import WaitingListPage from '@/components/waitinglistclient';

type TabKey = 'received' | 'sent' | 'send' | 'umbod_starfsmenn' | 'waitinglist' | 'formrequestadmin' | 'adhdworkupadmin';

export default function SignetPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('received');

  return (
    <RequireAuth>
      <div className="max-w-screen-xl mx-auto px-4 pt-4">
        <Tabs
          tabs={[
            { key: 'received', label: 'Móttaka' },
            { key: 'sent', label: 'Sent' },
            { key: 'send', label: 'Senda nýja skrá' },
              { key: 'waitinglist', label: 'Skilaboð á biðlista' },
          ] as const}
          active={activeTab}
          onChange={(key) => setActiveTab(key as TabKey)}
          // If Tabs is generic (see below), you can just do: onChange={setActiveTab}
        />
        {activeTab === 'received' && (
          <FilesTable apiPath="/signet/transfer/getReceived" emptyMessage="Engar mótteknar skrár" />
        )}
        {activeTab === 'sent' && (
          <FilesTable apiPath="/signet/transfer/getSent" emptyMessage="Engar sendar skrár" />
        )}
        {activeTab === 'send' && <SendMessageForm />}
          {activeTab === 'waitinglist' && <WaitingListPage />}
      </div>
    </RequireAuth>
  );
}
