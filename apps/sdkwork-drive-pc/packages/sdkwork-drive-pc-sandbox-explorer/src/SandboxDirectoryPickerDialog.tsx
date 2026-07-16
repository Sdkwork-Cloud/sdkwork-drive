import { X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import type { SandboxExplorerPort, SandboxSelection } from './contracts';
import { SandboxExplorerView } from './SandboxExplorerView';

export interface SandboxDirectoryPickerDialogProps {
  readonly open: boolean;
  readonly port?: SandboxExplorerPort;
  readonly title?: string;
  readonly onCancel: () => void;
  readonly onDirectorySelected: (selection: SandboxSelection) => void;
}

export function SandboxDirectoryPickerDialog({
  open,
  port,
  title = 'Select server directory',
  onCancel,
  onDirectorySelected,
}: SandboxDirectoryPickerDialogProps) {
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    globalThis.addEventListener('keydown', handleKeyDown);
    closeButtonRef.current?.focus();
    return () => {
      globalThis.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [onCancel, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/55 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex h-[min(44rem,calc(100vh-2rem))] w-[min(60rem,calc(100vw-2rem))] min-w-0 flex-col overflow-hidden rounded-lg border border-slate-300 bg-white text-slate-900 shadow-2xl"
        onKeyDown={(event) => {
          if (event.key !== 'Tab') return;
          const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
            'button:not([disabled]), select:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
          );
          if (!focusable?.length) {
            event.preventDefault();
            return;
          }
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
      >
        <header className="flex min-h-12 items-center gap-3 border-b border-slate-200 px-4">
          <h2 id={titleId} className="min-w-0 flex-1 truncate text-base font-semibold">
            {title}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            title="Close"
            aria-label="Close"
            className="grid size-8 shrink-0 place-items-center hover:bg-slate-100"
            onClick={onCancel}
          >
            <X size={17} />
          </button>
        </header>
        <SandboxExplorerView
          className="flex min-h-0 flex-1 flex-col bg-white text-sm text-slate-900"
          mode="select-directory"
          port={port}
          onDirectorySelected={onDirectorySelected}
        />
      </section>
    </div>
  );
}
