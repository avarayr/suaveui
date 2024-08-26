import React from "react";
import { twMerge } from "tailwind-merge";

export type Tab = {
  label: string;
  id: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
};

export type TabListProps = {
  tabs: Tab[];
  activeTab: string;
  onTabClick: (tabId: string) => void;
  className?: string;
};

export const TabList = ({ activeTab, onTabClick, tabs, className }: TabListProps) => {
  const activeTabIndex = tabs.findIndex((tab) => tab.id === activeTab);

  return (
    <div className={twMerge("flex flex-col gap-3", className)}>
      {/* Tabs */}
      <div className="flex flex-row gap-1 rounded-lg bg-black/20 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={twMerge(
              "flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-white hover:border-white",
              activeTab === tab.id && "bg-white/5",
            )}
            onClick={() => onTabClick(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-1">{tabs[activeTabIndex]?.children}</div>
    </div>
  );
};
