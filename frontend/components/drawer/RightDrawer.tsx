"use client";
import { useState, FC, ReactNode } from 'react';

interface Tab {
  key: string;
  label: string;
  content: ReactNode;
}

interface Props {
  tabs: Tab[];
}

const RightDrawer: FC<Props> = ({ tabs }) => {
  const [activeKey, setActiveKey] = useState(tabs[0]?.key);
  return (
    <aside className="bg-white border-l w-72 flex flex-col h-full">
      <div className="flex border-b">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveKey(tab.key)}
            className={`flex-1 px-2 py-2 text-sm ${activeKey === tab.key ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-2 text-sm">
        {tabs.find(t => t.key === activeKey)?.content || null}
      </div>
    </aside>
  );
};

export default RightDrawer;