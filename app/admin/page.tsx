'use client';

import { useState } from 'react';
import RequireAuth from '@/components/RequireAuth';
import PageTitle from '@/components/PageTitle';
import Card from '@/components/Card';

const tabs = [
  { id: 'users', label: 'Notendur' },
  { id: 'permissions', label: 'Síðuréttindi' },
  { id: 'group-access', label: 'Hópaaðgangur' },
  { id: 'update-groups', label: 'Uppfæra hópa' },
  { id: 'fetch-messages', label: 'Sækja skilaboð' },
];

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState(tabs[0].id);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'users':
        return <div>Notendur efni hér.</div>;
      case 'permissions':
        return <div>Síðuréttindi efni hér.</div>;
      case 'group-access':
        return <div>Hópaaðgangur efni hér.</div>;
      case 'update-groups':
        return <div>Uppfæra hópa efni hér.</div>;
      case 'fetch-messages':
        return <div>Sækja skilaboð efni hér.</div>;
      default:
        return null;
    }
  };

  return (
    <RequireAuth>
      <div className="max-w-screen-xl mx-auto p-4">
        <PageTitle>Stjórnborð</PageTitle>

        {/* Admin Header */}
        <div className="mb-4 p-4 bg-white rounded shadow border">
          <div className="flex gap-4 border-b border-gray-300">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`py-2 px-4 font-medium ${
                  activeTab === tab.id
                    ? 'border-b-2 border-[--pm-gray-dark] text-[--pm-black]'
                    : 'text-gray-500 hover:text-[--pm-black]'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <Card>
          {renderTabContent()}
        </Card>

        {/* Admin Footer */}
        <div className="text-sm text-gray-500 text-center mt-4">
          Stjórnborð á Signet Transfer
        </div>
      </div>
    </RequireAuth>
  );
}
