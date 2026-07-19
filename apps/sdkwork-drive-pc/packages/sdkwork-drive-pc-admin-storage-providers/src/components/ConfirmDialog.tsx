import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { DANGER_BUTTON_CLASS, ICON_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from '../utils/uiPrimitives';
import { useTranslation } from '../hooks/useTranslation';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel, variant = 'default', onConfirm, onCancel }: ConfirmDialogProps) {
  const { t } = useTranslation();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="fixed inset-0 bg-black/45" aria-label={t('cancel')} onClick={onCancel} />
      <div className="relative z-10 w-full max-w-md rounded-lg border border-neutral-200 bg-white p-5 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900" role="dialog" aria-modal="true" aria-labelledby="storage-confirm-title">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"><AlertTriangle aria-hidden="true" size={18} /></div>
          <div className="min-w-0 flex-1">
            <h3 id="storage-confirm-title" className="text-base font-semibold text-neutral-950 dark:text-white">{title}</h3>
            <p className="mt-1.5 text-sm leading-6 text-neutral-600 dark:text-neutral-400">{message}</p>
          </div>
          <button type="button" className={ICON_BUTTON_CLASS} aria-label={t('cancel')} title={t('cancel')} onClick={onCancel}><X aria-hidden="true" size={16} /></button>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={onCancel}>{t('cancel')}</button>
          <button type="button" className={variant === 'danger' ? DANGER_BUTTON_CLASS : SECONDARY_BUTTON_CLASS} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
