'use client';

import { useState } from 'react';
import RequireAuth from '@/components/RequireAuth';
import Tabs from '@/components/Tabs';
import FilesTable from '@/components/FilesTable';
import SendMessageForm from '@/components/SendMessageForm';
import UmbodTable from '@/components/umbod_starfsmenn';
import WaitingListPage from '@/components/waitinglistclient';
import FormRequestAdmin from '@/components/formrequestadmin';
import ADHDWorkupAdminTable from "@/components/adhdworkupadmin";

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
            { key: 'umbod_starfsmenn', label: 'Umboðskerfi' },
              { key: 'waitinglist', label: 'Skilaboð á biðlista' },
              { key: 'formrequestadmin', label: 'Setja spurningalista á skjólstæðing' },
              { key: 'adhdworkupadmin', label: 'ADHD uppvinnslur' },
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
        {activeTab === 'umbod_starfsmenn' && <UmbodTable />}
          {activeTab === 'waitinglist' && <WaitingListPage />}
          {activeTab === 'formrequestadmin' && <FormRequestAdmin />}
          {activeTab === 'adhdworkupadmin' && <ADHDWorkupAdminTable />}
      </div>
    </RequireAuth>
  );
}
