"use client";

import { useState } from "react";

interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface TabInterfaceProps {
  tabs: Tab[];
  className?: string;
}

export default function TabInterface({ tabs, className = "" }: TabInterfaceProps) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id || "");

  return (
    <div className={`bg-white/90 backdrop-blur-sm rounded-lg shadow-lg ${className}`}>
      {/* Tab Headers */}
      <div className="flex border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {tabs.find(tab => tab.id === activeTab)?.content}
      </div>
    </div>
  );
}