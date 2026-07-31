import React from 'react';
import { useTranslation } from 'react-i18next';
import { Database } from 'lucide-react';

export const CloudDriveHeaderStats: React.FC = () => {
  const { t } = useTranslation();
return (
    <div className="bg-primary-blue px-6 pt-4 pb-12 text-white">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 opacity-90" />
          <span className="font-medium text-[16px]">{t('drive.storage_space')}</span>
        </div>
        <div className="text-[14px] opacity-80 font-mono">
          15.4 GB / 100 GB
        </div>
      </div>
      <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden mb-2">
        <div className="bg-white h-full rounded-full w-[15.4%]" />
      </div>
      <div className="flex justify-between text-[12px] opacity-70">
        <span>{t('drive.storage_used', { percent: 15.4 })}</span>
        <span>{t('drive.storage_available', { available: 84.6 })}</span>
      </div>
    </div>
  );
};
