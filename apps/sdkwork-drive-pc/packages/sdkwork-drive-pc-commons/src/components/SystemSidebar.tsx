import React, { useState } from 'react';
import { HardDrive, Settings, Activity, ServerCog, Link2 } from 'lucide-react';
import type { SettingsTab } from './SettingsModal';
import {
  AccountAvatar,
  type DriveSidebarAccount,
  UserProfileModal,
} from './UserProfileModal';
import { useTranslation } from './LanguageProvider';

interface SystemSidebarProps {
  activeSection?: string;
  onSectionChange?: (section: any) => void;
  account: DriveSidebarAccount;
  onSignOut?: () => void | Promise<void>;
  isSettingsOpen?: boolean;
  onOpenSettings?: (tab?: SettingsTab) => void;
  runtimeMode?: string;
  appApiBaseUrl?: string;
}

export function SystemSidebar({
  activeSection = 'my-storage',
  onSectionChange,
  account,
  onSignOut,
  isSettingsOpen,
  onOpenSettings,
}: SystemSidebarProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { t } = useTranslation();

  const handleOpenSettings = () => {
    onOpenSettings?.();
  };

  const isStorageActive = activeSection !== 'transfer' && activeSection !== 'admin-storage-providers' && activeSection !== 'admin-storage-bindings';
  const isTransferActive = activeSection === 'transfer';
  const isAdminStorageProvidersActive = activeSection === 'admin-storage-providers';
  const isAdminStorageBindingsActive = activeSection === 'admin-storage-bindings';

  return (
    <>
    <div className="w-[60px] h-full bg-[#2e2e2e] flex flex-col items-center py-6 gap-8 select-none shrink-0 z-50">
      <div className="flex flex-col gap-5 w-full items-center">
        {/* User / App Avatar */}
        <button
          type="button"
          className="mb-2 rounded-lg transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
          onClick={() => setIsProfileOpen(true)}
          title="账号菜单"
        >
          <AccountAvatar account={account} sizeClassName="h-10 w-10 rounded-lg text-sm" />
        </button>
        
        {/* Navigation Routes */}
        <SidebarIcon 
          icon={<HardDrive size={22} />} 
          title={t('sidebar.myStorage')} 
          active={isStorageActive} 
          onClick={() => onSectionChange?.('my-storage')}
        />
        <SidebarIcon 
          icon={<Activity size={22} />} 
          title={t('sidebar.transferCenter')} 
          active={isTransferActive} 
          onClick={() => onSectionChange?.('transfer')}
        />
        <SidebarIcon
          icon={<ServerCog size={22} />}
          title="Storage Providers"
          active={isAdminStorageProvidersActive}
          onClick={() => onSectionChange?.('admin-storage-providers')}
        />
        <SidebarIcon
          icon={<Link2 size={22} />}
          title="Storage Bindings"
          active={isAdminStorageBindingsActive}
          onClick={() => onSectionChange?.('admin-storage-bindings')}
        />
      </div>
      <div className="flex flex-col gap-5 w-full items-center mt-auto mb-4">
         <SidebarIcon 
           sidebarIconId="sidebar-settings-button"
           icon={<Settings size={22} />} 
           title={t('commons.settings')} 
           active={isSettingsOpen}
           onClick={handleOpenSettings}
         />
      </div>
    </div>
    
    <UserProfileModal
      isOpen={isProfileOpen}
      onClose={() => setIsProfileOpen(false)}
      account={account}
      onOpenSettings={handleOpenSettings}
      onOpenStarred={() => onSectionChange?.('starred')}
      onSignOut={onSignOut}
    />
    </>
  );
}

interface SidebarIconProps {
  icon: React.ReactNode;
  title: string;
  active?: boolean;
  onClick?: () => void;
  sidebarIconId?: string;
}

function SidebarIcon({ icon, title, active, onClick, sidebarIconId }: SidebarIconProps) {
  return (
    <button 
      id={sidebarIconId}
      title={title} 
      onClick={onClick}
      className={`w-10 h-10 rounded-lg flex items-center justify-center cursor-pointer transition-all ${
        active 
          ? 'bg-white/10 text-white opacity-100 shadow-sm' 
          : 'text-white/60 hover:text-white hover:bg-white/5 active:bg-white/10'
      }`}
    >
      {icon}
    </button>
  );
}
