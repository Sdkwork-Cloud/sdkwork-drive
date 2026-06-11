import React, { useEffect, useState } from 'react';
import {
  Bell,
  HardDrive,
  Info,
  Languages,
  LogOut,
  Monitor,
  Moon,
  Shield,
  Sun,
  UserRound,
  X,
} from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { useTranslation } from './LanguageProvider';
import type { DriveSidebarAccount } from './UserProfileModal';

export type SettingsTab = 'account' | 'general' | 'notifications' | 'security' | 'storage' | 'about';

interface SettingsModalProps {
  isOpen: boolean;
  initialTab?: SettingsTab;
  onClose: () => void;
  account?: DriveSidebarAccount;
  onSignOut?: () => void | Promise<void>;
  runtimeMode?: string;
  appApiBaseUrl?: string;
}

export function SettingsModal({
  isOpen,
  initialTab,
  onClose,
  account,
  onSignOut,
  runtimeMode,
  appApiBaseUrl,
}: SettingsModalProps) {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useTranslation();
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab ?? 'account');

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  if (!isOpen) return null;

  const activeTitle: Record<SettingsTab, string> = {
    account: '账号信息',
    general: t('commons.general'),
    notifications: t('commons.notifications'),
    security: '隐私安全',
    storage: t('commons.storage'),
    about: '关于 Drive',
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-label={t('commons.settings')}
        className="flex h-[75vh] min-h-[520px] w-[900px] max-w-[calc(100vw-32px)] overflow-hidden rounded-2xl border border-white/10 bg-[#181818] text-gray-200 shadow-2xl"
      >
        <div className="flex w-[210px] shrink-0 flex-col border-r border-white/5 bg-[#1e1e1e]">
          <div className="flex h-[72px] items-center px-6">
            <span className="text-lg font-semibold tracking-wide">{t('commons.settings')}</span>
          </div>
          <div className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
            <SettingsNavItem
              icon={<UserRound size={16} />}
              label="账号信息"
              active={activeTab === 'account'}
              onClick={() => setActiveTab('account')}
            />
            <SettingsNavItem
              icon={<Languages size={16} />}
              label={t('commons.general')}
              active={activeTab === 'general'}
              onClick={() => setActiveTab('general')}
            />
            <SettingsNavItem
              icon={<Bell size={16} />}
              label={t('commons.notifications')}
              active={activeTab === 'notifications'}
              onClick={() => setActiveTab('notifications')}
            />
            <SettingsNavItem
              icon={<Shield size={16} />}
              label="隐私安全"
              active={activeTab === 'security'}
              onClick={() => setActiveTab('security')}
            />
            <SettingsNavItem
              icon={<HardDrive size={16} />}
              label={t('commons.storage')}
              active={activeTab === 'storage'}
              onClick={() => setActiveTab('storage')}
            />
            <SettingsNavItem
              icon={<Info size={16} />}
              label="关于 Drive"
              active={activeTab === 'about'}
              onClick={() => setActiveTab('about')}
            />
          </div>
          <div className="border-t border-white/5 p-3">
            <button
              onClick={() => {
                onClose();
                void onSignOut?.();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
            >
              <LogOut size={16} />
              退出登录
            </button>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col bg-[#181818]">
          <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-white/5 px-8">
            <h2 className="text-lg font-medium tracking-wide text-gray-100">
              {activeTitle[activeTab]}
            </h2>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-all hover:bg-white/10 hover:text-gray-100"
              title={t('commons.close')}
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="w-full p-8 pb-16">
              {activeTab === 'account' && <AccountSettings account={account} />}
              {activeTab === 'general' && (
                <GeneralSettings
                  language={language}
                  setLanguage={setLanguage}
                  theme={theme}
                  setTheme={setTheme}
                  t={t}
                />
              )}
              {activeTab === 'notifications' && <NotificationSettings t={t} />}
              {activeTab === 'security' && <SecuritySettings account={account} />}
              {activeTab === 'storage' && <StorageSettings account={account} t={t} />}
              {activeTab === 'about' && (
                <AboutSettings runtimeMode={runtimeMode} appApiBaseUrl={appApiBaseUrl} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AccountSettings({ account }: { account?: DriveSidebarAccount }) {
  return (
    <div className="space-y-6">
      <SettingsSection title="账号资料" description="来自 SDKWork IAM 会话的当前登录身份。">
        <KeyValueRow label="显示名称" value={account?.displayName ?? 'SDKWork Drive User'} />
        <KeyValueRow label="邮箱" value={account?.email ?? '--'} />
        <KeyValueRow label="账号 ID" value={account?.id ?? '--'} mono />
        <KeyValueRow label="租户 ID" value={account?.tenantId ?? '--'} mono />
        <KeyValueRow label="组织 ID" value={account?.organizationId ?? '--'} mono />
      </SettingsSection>
      <SettingsSection title="当前会话" description="Drive 会在请求 SDKWork API 时携带这些上下文字段。">
        <KeyValueRow label="会话 ID" value={account?.sessionId ?? '--'} mono />
        <KeyValueRow label="认证等级" value={account?.authLevel ?? 'standard'} />
        <KeyValueRow label="运行环境" value={account?.environmentLabel ?? 'standard'} />
      </SettingsSection>
    </div>
  );
}

function GeneralSettings({
  language,
  setLanguage,
  theme,
  setTheme,
  t,
}: {
  language: 'en' | 'zh';
  setLanguage: (language: 'en' | 'zh') => void;
  theme: 'dark' | 'light' | 'system';
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  return (
    <div className="space-y-6">
      <SettingsSection title={t('commons.selectLanguage')} description={t('commons.languageDesc')}>
        <div className="grid grid-cols-2 gap-4">
          <LanguageCard
            active={language === 'en'}
            onClick={() => setLanguage('en')}
            title={t('commons.english')}
            localeCode="EN"
          />
          <LanguageCard
            active={language === 'zh'}
            onClick={() => setLanguage('zh')}
            title={t('commons.chinese')}
            localeCode="中文"
          />
        </div>
      </SettingsSection>
      <SettingsSection title={t('commons.themePreferences')} description="选择 Drive PC 的界面主题。">
        <div className="grid grid-cols-3 gap-3">
          <ThemeCard
            active={theme === 'light'}
            onClick={() => setTheme('light')}
            icon={<Sun size={20} />}
            title={t('commons.light')}
          />
          <ThemeCard
            active={theme === 'dark'}
            onClick={() => setTheme('dark')}
            icon={<Moon size={20} />}
            title={t('commons.dark')}
          />
          <ThemeCard
            active={theme === 'system'}
            onClick={() => setTheme('system')}
            icon={<Monitor size={20} />}
            title={t('commons.system')}
          />
        </div>
      </SettingsSection>
      <SettingsSection title={t('commons.compactMode')} description={t('commons.compactDescription')}>
        <NotificationToggle
          label={t('commons.enableCompact')}
          desc="减少文件列表和操作区的垂直间距。"
          defaultChecked
        />
      </SettingsSection>
    </div>
  );
}

function NotificationSettings({
  t,
}: {
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  return (
    <SettingsSection title={t('commons.alertNotifications')} description="控制传输、分享和安全检查相关提醒。">
      <div className="space-y-4">
        <NotificationToggle
          label={t('commons.transferStartAlert')}
          desc={t('commons.transferStartAlertDesc')}
          defaultChecked
        />
        <NotificationToggle
          label={t('commons.systemDialogVerification')}
          desc={t('commons.systemDialogVerificationDesc')}
          defaultChecked={false}
        />
        <NotificationToggle
          label={t('commons.malwareCheckBanners')}
          desc={t('commons.malwareCheckBannersDesc')}
          defaultChecked
        />
      </div>
    </SettingsSection>
  );
}

function SecuritySettings({ account }: { account?: DriveSidebarAccount }) {
  return (
    <div className="space-y-6">
      <SettingsSection title="登录与设备" description="Drive 的登录态由宿主 IAM 统一管理。">
        <KeyValueRow label="认证模式" value={account?.authLevel ?? 'standard'} />
        <KeyValueRow label="当前设备" value="Drive PC" />
        <KeyValueRow label="数据范围" value="Drive workspace" />
      </SettingsSection>
      <SettingsSection title="安全偏好" description="这些设置会影响敏感操作提示和本地缓存行为。">
        <div className="space-y-4">
          <NotificationToggle label="删除和外链分享前二次确认" desc="高风险文件操作需要再次确认。" defaultChecked />
          <NotificationToggle label="本地预览缓存自动清理" desc="关闭窗口后清理临时预览缓存。" defaultChecked />
        </div>
      </SettingsSection>
    </div>
  );
}

function StorageSettings({
  account,
  t,
}: {
  account?: DriveSidebarAccount;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const storageUsedLabel = account?.storageUsedLabel ?? '--';
  const storageTotalLabel = account?.storageTotalLabel ?? '--';
  const storageUsagePercent = Math.min(100, Math.max(0, account?.storageUsagePercent ?? 0));

  return (
    <SettingsSection title={t('commons.drivePartitionDetails')} description="当前账号的 Drive 空间和本地传输缓存。">
      <div className="rounded-xl border border-white/5 bg-[#202020] p-5">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-gray-100">
              {account?.planLabel ?? 'Drive'}
            </div>
            <div className="mt-1 text-xs text-gray-500">我的云盘与共享空间统一额度</div>
          </div>
          <div className="shrink-0 text-sm font-semibold text-blue-400">
            {storageUsedLabel} / {storageTotalLabel}
          </div>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-blue-500"
            style={{ width: `${storageUsagePercent}%` }}
          />
        </div>
      </div>
      <KeyValueRow label={t('commons.cachePackets')} value="--" />
      <KeyValueRow label={t('commons.activeCompressedDir')} value="--" />
      <KeyValueRow label={t('commons.quotaLimits')} value={storageTotalLabel} />
    </SettingsSection>
  );
}

function AboutSettings({
  runtimeMode,
  appApiBaseUrl,
}: {
  runtimeMode?: string;
  appApiBaseUrl?: string;
}) {
  return (
    <div className="space-y-6">
      <SettingsSection title="SDKWork Drive PC" description="网盘 PC 客户端运行时信息。">
        <KeyValueRow label="应用" value="SDKWork Drive" />
        <KeyValueRow label="运行模式" value={runtimeMode ?? '--'} />
        <KeyValueRow label="App API" value={appApiBaseUrl ?? '--'} mono />
        <KeyValueRow label="身份集成" value="SDKWork IAM / Appbase" />
      </SettingsSection>
      <SettingsSection title="能力范围" description="当前 PC 端通过 SDK 调用 Drive Rust 后端能力。">
        <KeyValueRow label="文件管理" value="上传、下载、批量打包、分享、回收站" />
        <KeyValueRow label="存储后端" value="Local / S3 compatible" />
        <KeyValueRow label="同步状态" value="安全同步" />
      </SettingsSection>
    </div>
  );
}

function SettingsNavItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all ${
        active
          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
          : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
      }`}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-100">{title}</h3>
        {description && <p className="mt-1 text-xs leading-5 text-gray-500">{description}</p>}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function KeyValueRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-white/5 bg-[#202020] px-4 py-3">
      <span className="w-32 shrink-0 text-xs text-gray-500">{label}</span>
      <span className={`min-w-0 flex-1 truncate text-sm text-gray-200 ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  );
}

function ThemeCard({
  active,
  onClick,
  icon,
  title,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex h-20 w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 transition-all ${
        active
          ? 'border-blue-500 bg-blue-500/10 font-semibold text-blue-400'
          : 'border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-200'
      }`}
    >
      {icon}
      <span className="text-xs">{title}</span>
    </button>
  );
}

function LanguageCard({
  active,
  onClick,
  title,
  localeCode,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  localeCode: string;
}) {
  const { t } = useTranslation();
  return (
    <button
      onClick={onClick}
      className={`flex w-full cursor-pointer items-center gap-4 rounded-xl border-2 p-4 text-left transition-all ${
        active
          ? 'border-blue-500 bg-blue-500/10 font-bold text-blue-400'
          : 'border-white/10 text-gray-200 hover:border-white/20'
      }`}
    >
      <div
        className={`flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-lg text-xs font-bold ${
          active ? 'bg-blue-500 text-white' : 'bg-neutral-800 text-gray-400'
        }`}
      >
        {localeCode}
      </div>
      <div className="min-w-0">
        <div className="truncate text-xs font-medium">{title}</div>
        <div className="mt-0.5 truncate text-[10px] text-gray-500">
          {localeCode === 'EN' ? t('commons.bilingualDescEn') : t('commons.bilingualDescZh')}
        </div>
      </div>
    </button>
  );
}

function NotificationToggle({
  label,
  desc,
  defaultChecked,
}: {
  label: string;
  desc: string;
  defaultChecked: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <label className="flex cursor-pointer select-none items-start justify-between gap-4 rounded-xl border border-white/5 bg-[#202020] px-4 py-3">
      <div className="space-y-0.5">
        <span className="block text-xs font-semibold text-gray-200">{label}</span>
        <span className="block text-[10px] text-gray-500">{desc}</span>
      </div>
      <div className="relative shrink-0 pt-0.5">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(event) => setChecked(event.target.checked)}
        />
        <div className="h-4 w-8 rounded-full bg-gray-700 peer-checked:bg-blue-500 after:absolute after:left-[2px] after:top-[4px] after:h-3 after:w-3 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white" />
      </div>
    </label>
  );
}
