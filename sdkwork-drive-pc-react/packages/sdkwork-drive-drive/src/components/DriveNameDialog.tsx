import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from '@sdkwork/drive-ui';

export interface DriveNameDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  initialValue?: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (value: string) => Promise<void>;
}

export function DriveNameDialog({
  open,
  title,
  description,
  confirmLabel,
  initialValue = '',
  onOpenChange,
  onConfirm,
}: DriveNameDialogProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState(initialValue);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue, open]);

  async function handleConfirm() {
    const normalizedValue = value.trim();
    if (!normalizedValue || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(normalizedValue);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <Input
          autoFocus
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void handleConfirm();
            }
          }}
          placeholder={t('drive.dialogs.namePlaceholder')}
        />

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => void handleConfirm()} disabled={!value.trim() || isSubmitting}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
