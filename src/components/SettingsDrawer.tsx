import { useState } from "react";
import { BottomSheet } from "./primitives/BottomSheet";
import { TabList, TabListProps } from "./primitives/TabList";
import { Bell, Cog, LucideLampWallDown, Settings, Settings2 } from "lucide-react";
import { GeneralTab } from "./settings/tabs/GeneralTab";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export const SettingsDrawer = (props: Props) => {
  const tabs: TabListProps["tabs"] = [
    {
      label: "General",
      id: "general",
      icon: <Cog className="mr-2 size-4" />,
      children: <GeneralTab />,
    },
    {
      label: "Notifications",
      id: "notifications",
      icon: <Bell className="mr-2 size-4" />,
      children: <div>Notifications</div>,
    },
  ];

  const [activeTab, setActiveTab] = useState<string>(tabs[0]!.id);

  const onTabClick = (tabId: string) => {
    setActiveTab(tabId);
  };

  return (
    <BottomSheet
      open={props.isOpen}
      onDismiss={props.onClose}
      snapPoints={({ maxHeight, minHeight }) => [minHeight, maxHeight * 0.9]}
      className="overflow-hidden"
    >
      <TabList tabs={tabs} activeTab={activeTab} onTabClick={onTabClick} />
    </BottomSheet>
  );
};
