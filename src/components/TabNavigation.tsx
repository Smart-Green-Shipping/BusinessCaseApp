import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface Tab {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface TabNavigationProps {
  tabs: readonly Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function TabNavigation({ tabs, activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="flex space-x-1">
      {tabs.map(({ id, label, icon: Icon }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`
              flex items-center gap-2 px-6 py-3 font-medium text-sm transition-colors rounded-t-lg
              border-x border-t
              ${isActive 
                ? 'bg-mist text-deep-blue border-deep-blue/20' 
                : 'text-deep-blue hover:bg-mist/50 border-transparent'
              }
            `}
          >
            <Icon className={`w-4 h-4 ${isActive ? 'text-action-green' : 'text-deep-blue'}`} />
            {label}
          </button>
        );
      })}
    </div>
  );
}