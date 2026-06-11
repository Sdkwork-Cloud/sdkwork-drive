import React, { useState } from 'react';
import { Clock, Star, Share2, Trash2, Cloud, HardDrive, Filter, Download, Play, Pause, X, CheckCircle, RefreshCcw, Activity, ChevronRight, ChevronDown, Book, Megaphone, Palette, LineChart, Plus, Folder } from 'lucide-react';
import type { DriveSection } from '../pages/DrivePage';
import type { DownloadJob } from 'sdkwork-drive-pc-types';
import { useTranslation } from 'sdkwork-drive-pc-commons';
import type { DriveStorageSummary, SharedSpace } from 'sdkwork-drive-pc-core';
import { SPACE_ICONS } from './CreateSharedSpaceModal';
import {
  canCancelTransferJob,
  canPauseTransferJob,
  canResumeTransferJob,
  isActiveTransferStatus,
  isCompletedTransferStatus,
} from 'sdkwork-drive-pc-types';

interface FileSidebarProps {
  activeSection: DriveSection;
  onSectionChange: (section: DriveSection) => void;
  downloadJobs: DownloadJob[];
  onClearJobs: () => void;
  onPauseJob?: (id: string) => void;
  onResumeJob?: (id: string) => void;
  onCancelJob: (id: string) => void;
  sharedSpaces?: SharedSpace[];
  storageSummary?: DriveStorageSummary;
  onAddSpaceClick?: () => void;
  onDeleteSpace?: (id: string) => void;
  onOpenStorageSettings?: () => void;
}

export function FileSidebar({ 
  activeSection, 
  onSectionChange,
  downloadJobs = [],
  onClearJobs,
  onPauseJob,
  onResumeJob,
  onCancelJob,
  sharedSpaces = [],
  storageSummary,
  onAddSpaceClick,
  onDeleteSpace,
  onOpenStorageSettings
}: FileSidebarProps) {
  const { t } = useTranslation();
  const [isKbExpanded, setIsKbExpanded] = useState(false);
  
  const activeJobs = downloadJobs.filter(j => isActiveTransferStatus(j.status));
  const controllableJobs = downloadJobs.filter(j => canCancelTransferJob(j));
  
  const completedCount = downloadJobs.filter(j => isCompletedTransferStatus(j.status)).length;
  const totalJobCount = downloadJobs.length;
  const storageUsedLabel = storageSummary ? formatStorageSize(storageSummary.usedBytes) : '--';
  const storageTotalLabel = storageSummary?.totalBytes ? formatStorageSize(storageSummary.totalBytes) : '--';
  const storageUsagePercent = Math.min(100, Math.max(0, storageSummary?.usagePercent ?? 0));

  return (
    <div className="w-[260px] h-full bg-[#f2f2f2] dark:bg-[#1b1b1b] border-r border-[#d6d6d6] dark:border-[#2a2a2a] flex flex-col shrink-0 transition-colors select-none">
      <div className="p-6 h-20 flex items-center">
        <span className="text-lg font-semibold tracking-tight text-[#1a1a1a] dark:text-[#eee]">Sdkwork Drive</span>
      </div>
      
      <div className="flex-1 overflow-y-auto px-3 space-y-1 flex flex-col">
        <SidebarItem icon={<Cloud size={18} />} label={t('sidebar.myStorage')} active={activeSection === 'my-storage'} onClick={() => onSectionChange('my-storage')} />
        
        <div className="mt-1 space-y-0.5">
          <button 
            onClick={() => setIsKbExpanded(!isKbExpanded)}
            className="w-full px-3 py-2 rounded-md flex items-center justify-between text-sm cursor-pointer transition-colors text-left hover:bg-[#e8e8e8] dark:hover:bg-[#2a2a2a] text-[#555] dark:text-[#aaa]"
          >
            <div className="flex items-center gap-3">
              <span className="opacity-60 text-[#555] dark:text-[#999]"><Book size={18} /></span>
              <span>{t('sidebar.knowledgeBase')}</span>
            </div>
            <span className="opacity-50">
              {isKbExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          </button>
          
          {isKbExpanded && (
            <div className="pl-9 pr-2 py-1 space-y-0.5 border-l-2 border-gray-200 dark:border-neutral-800 ml-4 mb-2">
              <button onClick={() => onSectionChange('kb-engineering')} className={`block w-full text-left text-[12.5px] px-2 py-1.5 rounded transition-colors truncate ${activeSection === 'kb-engineering' ? 'bg-[#e2e2e2] dark:bg-[#2c3140] text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-600 dark:text-neutral-400 hover:bg-gray-200/50 dark:hover:bg-neutral-800'}`}>{t('sidebar.kbEngineering')}</button>
              <button onClick={() => onSectionChange('kb-product')} className={`block w-full text-left text-[12.5px] px-2 py-1.5 rounded transition-colors truncate ${activeSection === 'kb-product' ? 'bg-[#e2e2e2] dark:bg-[#2c3140] text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-600 dark:text-neutral-400 hover:bg-gray-200/50 dark:hover:bg-neutral-800'}`}>{t('sidebar.kbProduct')}</button>
              <button onClick={() => onSectionChange('kb-design')} className={`block w-full text-left text-[12.5px] px-2 py-1.5 rounded transition-colors truncate ${activeSection === 'kb-design' ? 'bg-[#e2e2e2] dark:bg-[#2c3140] text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-600 dark:text-neutral-400 hover:bg-gray-200/50 dark:hover:bg-neutral-800'}`}>{t('sidebar.kbDesign')}</button>
            </div>
          )}
        </div>

        <SidebarItem icon={<Clock size={18} />} label={t('sidebar.recent')} active={activeSection === 'recent'} onClick={() => onSectionChange('recent')} />
        <SidebarItem icon={<Star size={18} />} label={t('sidebar.starred')} active={activeSection === 'starred'} onClick={() => onSectionChange('starred')} />
        
        <div className="border-t border-[#dbdbdb] dark:border-[#333] my-4 mx-2" />
        
        <div 
          onClick={onAddSpaceClick}
          className="flex items-center justify-between px-3 pb-2 text-[11px] font-semibold text-[#888] dark:text-[#666] uppercase tracking-wider group cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors" 
          title="Create new Shared Space"
        >
          <span>{t('sidebar.sharedSpaces')}</span>
          <Plus size={13} className="opacity-100 sm:opacity-0 group-hover:opacity-100 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-opacity" />
        </div>

        {sharedSpaces.map(space => {
          const IconComponent = SPACE_ICONS[space.icon] || Folder;
          return (
            <SidebarItem 
              key={space.id} 
              icon={<IconComponent size={18} />} 
              label={space.name} 
              active={activeSection === space.id} 
              onClick={() => onSectionChange(space.id)}
              onDelete={space.isCustom ? () => onDeleteSpace?.(space.id) : undefined}
            />
          );
        })}
        
        <SidebarItem icon={<Share2 size={18} />} label={t('sidebar.sharedWithMe')} active={activeSection === 'shared'} onClick={() => onSectionChange('shared')} />
        
        <div className="border-t border-[#dbdbdb] dark:border-[#333] my-4 mx-2" />
        
        <SidebarItem icon={<HardDrive size={18} />} label={t('sidebar.computers')} active={activeSection === 'computers'} onClick={() => onSectionChange('computers')} />
        <SidebarItem icon={<Activity size={18} />} label={t('sidebar.transferCenter')} active={activeSection === 'transfer'} onClick={() => onSectionChange('transfer')} />
        <SidebarItem icon={<Trash2 size={18} />} label={t('sidebar.trash')} active={activeSection === 'trash'} onClick={() => onSectionChange('trash')} />
      </div>

      {/* Dynamic Transfers Manager Section / Package */}
      <div className="p-4 mx-3 mb-3 bg-[#e6e6e6]/50 dark:bg-[#222]/30 border border-[#d2d2d2] dark:border-neutral-800/60 rounded-xl select-none transition-all">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Download size={14} className={activeJobs.length > 0 ? "text-blue-500 animate-bounce" : "text-[#555] dark:text-[#aaa]"} />
            <span className="text-[11px] uppercase tracking-wider text-[#555] dark:text-[#aaa] font-bold">{t('sidebar.transferCenter')}</span>
          </div>
          {totalJobCount > 0 && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${activeJobs.length > 0 ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-450 animate-pulse' : 'bg-gray-200 dark:bg-[#333] text-gray-500'}`}>
              {activeJobs.length > 0 ? `${activeJobs.length} ${t('sidebar.active')}` : `${completedCount}/${totalJobCount}`}
            </span>
          )}
        </div>

        {downloadJobs.length === 0 ? (
          <div className="text-[11px] text-gray-400 dark:text-neutral-500 py-1 flex items-center gap-1.5 justify-center">
            <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-neutral-600"></span>
            {t('sidebar.noTransfers')}
          </div>
        ) : (
          <div className="space-y-2 max-h-[140px] overflow-y-auto scrollbar-none">
            {/* Show top active jobs or list latest downloads */}
            {downloadJobs.slice(0, 2).map((job) => {
              const isWorking = isActiveTransferStatus(job.status);
              const canCancel = canCancelTransferJob(job);
              const canPause = canPauseTransferJob(job);
              const canResume = canResumeTransferJob(job);
              
              // Localized status representations
              let localStatus: string = job.status;
              if (job.status === 'connecting') localStatus = t('downloadManager.connecting');
              else if (job.status === 'compressing') localStatus = t('downloadManager.compressing');
              else if (job.status === 'downloading') localStatus = t('downloadManager.downloading');
              else if (job.status === 'uploading') localStatus = t('downloadManager.uploading');
              else if (job.status === 'checking') localStatus = t('downloadManager.scanningVirus');
              else if (job.status === 'ready') localStatus = t('downloadManager.ready');
              else if (job.status === 'completed') localStatus = t('downloadManager.completed');
              else if (job.status === 'paused') localStatus = t('downloadManager.paused');
              else if (job.status === 'cancelled') localStatus = t('downloadManager.cancelled');
              else if (job.status === 'failed') localStatus = t('downloadManager.failed');

              return (
                <div key={job.id} className="text-xs bg-white/70 dark:bg-[#1a1a1a]/60 p-2 rounded-lg border border-gray-200/50 dark:border-neutral-800/40 animate-in fade-in duration-250">
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <span className="font-semibold text-gray-800 dark:text-gray-200 truncate max-w-[120px]" title={job.fileName}>
                      {job.fileName}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {canCancel || canPause || canResume ? (
                        <>
                          {canResume && (
                            <button 
                              onClick={() => onResumeJob?.(job.id)}
                              className="p-1 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-blue-600 rounded cursor-pointer transition-colors"
                              title="Resume"
                            >
                              <Play size={10} className="fill-current" />
                            </button>
                          )}
                          {canPause && (
                            <button 
                              onClick={() => onPauseJob?.(job.id)}
                              className="p-1 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-600 rounded cursor-pointer transition-colors"
                              title="Pause"
                            >
                              <Pause size={10} className="fill-current" />
                            </button>
                          )}
                          {canCancel && (
                            <button 
                              onClick={() => onCancelJob(job.id)}
                              className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 rounded cursor-pointer transition-colors"
                              title="Cancel"
                            >
                              <X size={10} />
                            </button>
                          )}
                        </>
                      ) : (
                        (job.status === 'ready' || job.status === 'completed') && <CheckCircle className="text-emerald-500 shrink-0" size={11} />
                      )}
                    </div>
                  </div>

                  {/* Rating / Speed info */}
                  <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-neutral-500 mb-1 font-medium font-sans">
                    <span className="capitalize">
                      {localStatus}
                    </span>
                    <span>
                      {job.status === 'downloading' ? job.speed : job.status === 'uploading' ? job.speed : job.status === 'ready' ? t('downloadManager.ready') : '--'}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-100 dark:bg-neutral-800 h-1 rounded-full overflow-hidden relative">
                    <div 
                      className={`h-full absolute left-0 top-0 transition-all duration-300 ${
                        job.status === 'completed' || job.status === 'ready' ? 'bg-emerald-500' :
                        job.status === 'paused' ? 'bg-gray-400' :
                        job.status === 'cancelled' || job.status === 'failed' ? 'bg-rose-500' :
                        'bg-blue-500'
                      }`}
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {downloadJobs.length > 2 && (
              <div className="text-center text-[10px] text-gray-400 dark:text-neutral-500 font-medium pt-0.5">
                {t('sidebar.moreTransfers', { count: downloadJobs.length - 2 })}
              </div>
            )}

            {/* Clear transfers option if none are active */}
            {controllableJobs.length === 0 && completedCount > 0 && (
              <button 
                onClick={onClearJobs}
                className="w-full text-center text-[10px] font-bold text-gray-500 dark:text-neutral-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors py-1.5 bg-white/50 dark:bg-black/10 border border-gray-200 dark:border-neutral-800/40 rounded-md cursor-pointer flex items-center justify-center gap-1 mt-1"
              >
                <RefreshCcw size={8} /> {t('sidebar.clearFinished')}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="p-6 bg-[#ebebeb] dark:bg-[#1a1a1a]">
        <div className="text-[11px] uppercase tracking-wider text-[#888] dark:text-[#666] font-bold mb-2">
          {t('sidebar.storageTitle')}
        </div>
        <div className="w-full bg-[#d6d6d6] dark:bg-[#333] h-1.5 rounded-full overflow-hidden mb-2 relative">
          <div
            className="bg-blue-600 dark:bg-blue-500 h-full absolute left-0 top-0 transition-all duration-500 ease-out"
            style={{ width: `${storageUsagePercent}%` }}
          />
        </div>
        <div className="text-xs text-[#777] dark:text-[#999]">
          {t('sidebar.storageUsed', { used: storageUsedLabel, total: storageTotalLabel })}
        </div>
        <button
          onClick={onOpenStorageSettings}
          className="mt-4 w-full py-2 px-4 rounded border border-[#d6d6d6] dark:border-[#444] bg-white dark:bg-[#222] text-[#444] dark:text-[#ddd] text-xs font-medium hover:bg-gray-50 dark:hover:bg-[#333] transition-colors cursor-pointer text-center"
        >
          {t('sidebar.getMoreStorage')}
        </button>
      </div>
    </div>
  );
}

function formatStorageSize(bytes: number): string {
  const value = Number.isFinite(bytes) && bytes > 0 ? bytes : 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${trimStorageNumber(value / 1024)} KB`;
  if (value < 1024 * 1024 * 1024) return `${trimStorageNumber(value / (1024 * 1024))} MB`;
  if (value < 1024 * 1024 * 1024 * 1024) {
    return `${trimStorageNumber(value / (1024 * 1024 * 1024))} GB`;
  }
  return `${trimStorageNumber(value / (1024 * 1024 * 1024 * 1024))} TB`;
}

function trimStorageNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function UsersShare({ size }: { size: number }) {
  return (
    <svg fill="currentColor" viewBox="0 0 24 24" style={{ width: size, height: size }}><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
  );
}

function SidebarItem({ 
  icon, 
  label, 
  active, 
  onClick,
  onDelete 
}: { 
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="group/item relative w-full animate-in slide-in-from-left-2 duration-200">
      <button 
        onClick={onClick}
        className={`w-full px-3 py-2 rounded-md flex items-center gap-3 text-sm cursor-pointer transition-all text-left ${
          active 
            ? 'bg-[#e2e2e2] dark:bg-[#2c3140] text-blue-600 dark:text-blue-400 font-semibold shadow-sm' 
            : 'hover:bg-[#e8e8e8] dark:hover:bg-[#2a2a2a] text-[#555] dark:text-[#aaa]'
        }`}
      >
        <span className={active ? 'opacity-100 text-blue-600 dark:text-blue-400' : 'opacity-60 text-[#555] dark:text-[#999]'}>
          {icon}
        </span>
        <span className="truncate pr-5 text-[13.5px]" title={label}>{label}</span>
      </button>
      
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute right-2 top-[8px] p-1 text-gray-400 hover:text-red-500 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded opacity-0 group-hover/item:opacity-100 transition-opacity cursor-pointer flex items-center justify-center"
          title="Delete shared space"
        >
          <Trash2 size={12} className="stroke-[2.5]" />
        </button>
      )}
    </div>
  );
}
