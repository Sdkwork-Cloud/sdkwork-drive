import React, { useRef, useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { FileSidebar } from '../components/FileSidebar';
import { FileBrowser } from '../components/FileBrowser';
import {
  cancelTransferJob,
  applyDownloadGrantToJob,
  applyTransferFailure,
  createRetryFilesForDownloadJob,
  type DownloadJob,
  isCompletedTransferStatus,
} from 'sdkwork-drive-pc-types';
import { CreateSharedSpaceModal } from '../components/CreateSharedSpaceModal';
import type { DriveFileService, DriveStorageSummary, SharedSpace } from 'sdkwork-drive-pc-core';

const TransferPage = React.lazy(() =>
  import('sdkwork-drive-pc-transfer').then((module) => ({ default: module.TransferPage })),
);

export type DriveSection = string;

interface DrivePageProps {
  activeSection?: DriveSection;
  fileService: DriveFileService;
  storageSummary?: DriveStorageSummary;
  onOpenExternal?: (url: string) => Promise<void> | void;
  onOpenStorageSettings?: () => void;
  onSectionChange?: (section: DriveSection) => void;
}

function isDrivePageAbortError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === 'AbortError') {
    return true;
  }
  if (err instanceof Error) {
    return err.name === 'AbortError' || /\babort(?:ed)?\b/i.test(err.message);
  }
  return false;
}

export function DrivePage({
  activeSection: propActiveSection,
  fileService,
  storageSummary,
  onOpenExternal,
  onOpenStorageSettings,
  onSectionChange,
}: DrivePageProps) {
  const [localActiveSection, setLocalActiveSection] = useState<DriveSection>('my-storage');
  const activeSection = propActiveSection !== undefined ? propActiveSection : localActiveSection;
  const setActiveSection = onSectionChange !== undefined ? onSectionChange : setLocalActiveSection;
  
  const [downloadJobs, setDownloadJobs] = useState<DownloadJob[]>([]);
  const [sharedSpaces, setSharedSpaces] = useState<SharedSpace[]>([]);
  const [isCreateSpaceOpen, setIsCreateSpaceOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'err' } | null>(null);
  const uploadAbortControllersRef = useRef(new Map<string, AbortController>());
  const downloadAbortControllersRef = useRef(new Map<string, AbortController>());
  const sharedSpaceListAbortControllerRef = useRef<AbortController | null>(null);
  const createSpaceAbortControllerRef = useRef<AbortController | null>(null);
  const deleteSpaceAbortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  const triggerToast = (message: string, type: 'success' | 'err' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      sharedSpaceListAbortControllerRef.current?.abort();
      createSpaceAbortControllerRef.current?.abort();
      deleteSpaceAbortControllerRef.current?.abort();
      uploadAbortControllersRef.current.forEach((controller) => controller.abort());
      downloadAbortControllersRef.current.forEach((controller) => controller.abort());
      uploadAbortControllersRef.current.clear();
      downloadAbortControllersRef.current.clear();
    };
  }, []);

  // Initialize and load Shared Spaces
  useEffect(() => {
    let active = true;
    sharedSpaceListAbortControllerRef.current?.abort();
    const sharedSpaceListAbortController = new AbortController();
    sharedSpaceListAbortControllerRef.current = sharedSpaceListAbortController;
    setSharedSpaces(fileService.getSharedSpaces());
    fileService.listSharedSpaces({
      signal: sharedSpaceListAbortController.signal,
    })
      .then((spaces) => {
        if (active) {
          setSharedSpaces(spaces);
        }
      })
      .catch((err) => {
        if (isDrivePageAbortError(err)) {
          return;
        }
        if (active) {
          setSharedSpaces(fileService.getSharedSpaces());
        }
      })
      .finally(() => {
        if (sharedSpaceListAbortControllerRef.current === sharedSpaceListAbortController) {
          sharedSpaceListAbortControllerRef.current = null;
        }
      });
    return () => {
      active = false;
      sharedSpaceListAbortController.abort();
      if (sharedSpaceListAbortControllerRef.current === sharedSpaceListAbortController) {
        sharedSpaceListAbortControllerRef.current = null;
      }
    };
  }, [fileService]);

  // Handler to submit new space
  const handleCreateSpaceSubmit = (name: string, icon: string, color: string, description: string) => {
    createSpaceAbortControllerRef.current?.abort();
    const createSpaceAbortController = new AbortController();
    createSpaceAbortControllerRef.current = createSpaceAbortController;
    fileService.createSharedSpace(name, icon, color, description, {
      signal: createSpaceAbortController.signal,
    })
      .then((newSpace) => {
        if (!isMountedRef.current || createSpaceAbortControllerRef.current !== createSpaceAbortController) {
          return;
        }
        setSharedSpaces(fileService.getSharedSpaces());
        setIsCreateSpaceOpen(false);
        setActiveSection(newSpace.id);
        triggerToast(`Created shared space "${newSpace.name}"`);
      })
      .catch((err) => {
        if (isDrivePageAbortError(err)) {
          return;
        }
        if (!isMountedRef.current || createSpaceAbortControllerRef.current !== createSpaceAbortController) {
          return;
        }
        setSharedSpaces(fileService.getSharedSpaces());
        triggerToast(err?.message || 'Failed to create shared space', 'err');
      })
      .finally(() => {
        if (createSpaceAbortControllerRef.current === createSpaceAbortController) {
          createSpaceAbortControllerRef.current = null;
        }
      });
  };

  // Handler to delete space
  const handleDeleteSpace = (id: string) => {
    deleteSpaceAbortControllerRef.current?.abort();
    const deleteSpaceAbortController = new AbortController();
    deleteSpaceAbortControllerRef.current = deleteSpaceAbortController;
    fileService.deleteSharedSpace(id, {
      signal: deleteSpaceAbortController.signal,
    })
      .then(() => {
        if (!isMountedRef.current || deleteSpaceAbortControllerRef.current !== deleteSpaceAbortController) {
          return;
        }
        setSharedSpaces(fileService.getSharedSpaces());
        if (activeSection === id) {
          setActiveSection('my-storage');
        }
        triggerToast('Deleted shared space');
      })
      .catch((err) => {
        if (isDrivePageAbortError(err)) {
          return;
        }
        if (!isMountedRef.current || deleteSpaceAbortControllerRef.current !== deleteSpaceAbortController) {
          return;
        }
        setSharedSpaces(fileService.getSharedSpaces());
        triggerToast(err?.message || 'Failed to delete shared space', 'err');
      })
      .finally(() => {
        if (deleteSpaceAbortControllerRef.current === deleteSpaceAbortController) {
          deleteSpaceAbortControllerRef.current = null;
        }
      });
  };

  const handleClearJobs = () =>
    setDownloadJobs((prev) => prev.filter((job) => !isCompletedTransferStatus(job.status)));
  const createUploadAbortController = (jobId: string): AbortController => {
    const controller = new AbortController();
    uploadAbortControllersRef.current.set(jobId, controller);
    return controller;
  };
  const releaseUploadAbortController = (
    jobId: string,
    controller?: AbortController,
  ): void => {
    const current = uploadAbortControllersRef.current.get(jobId);
    if (!controller || current === controller) {
      uploadAbortControllersRef.current.delete(jobId);
    }
  };
  const createDownloadAbortController = (jobId: string): AbortController => {
    const controller = new AbortController();
    downloadAbortControllersRef.current.set(jobId, controller);
    return controller;
  };
  const releaseDownloadAbortController = (
    jobId: string,
    controller?: AbortController,
  ): void => {
    const current = downloadAbortControllersRef.current.get(jobId);
    if (!controller || current === controller) {
      downloadAbortControllersRef.current.delete(jobId);
    }
  };
  const handleCancelJob = (id: string) => {
    uploadAbortControllersRef.current.get(id)?.abort();
    uploadAbortControllersRef.current.delete(id);
    downloadAbortControllersRef.current.get(id)?.abort();
    downloadAbortControllersRef.current.delete(id);
    setDownloadJobs(prev => prev.map(j => j.id === id ? cancelTransferJob(j) : j));
  };
  const handleRetryJob = (job: DownloadJob) => {
    const retryFiles = createRetryFilesForDownloadJob(job);
    downloadAbortControllersRef.current.get(job.id)?.abort();
    const downloadController = createDownloadAbortController(job.id);
    setDownloadJobs(prev =>
      prev.map(item =>
        item.id === job.id
          ? {
              ...item,
              status: 'connecting',
              progress: 0,
              downloadedSize: 0,
              speed: 'Connecting...',
              timeRemaining: 'Calculating...',
              errorMessage: undefined,
            }
          : item,
      ),
    );

    const prepareDownload = job.downloadKind === 'bundle' || retryFiles.length > 1 || retryFiles[0].type === 'folder'
      ? fileService.createDownloadPackage(retryFiles, job.fileName, {
          signal: downloadController.signal,
        })
      : fileService.createDownloadUrl(retryFiles[0], {
          signal: downloadController.signal,
        });

    prepareDownload
      .then((download) => {
        if (downloadAbortControllersRef.current.get(job.id) !== downloadController) {
          return;
        }
        setDownloadJobs(prev =>
          prev.map(item =>
            item.id === job.id ? applyDownloadGrantToJob(item, download) : item,
          ),
        );
        if (download.downloadUrl) {
          void onOpenExternal?.(download.downloadUrl);
        }
      })
      .catch((err) => {
        if (isDrivePageAbortError(err)) {
          return;
        }
        if (downloadAbortControllersRef.current.get(job.id) !== downloadController) {
          return;
        }
        setDownloadJobs(prev =>
          prev.map(item =>
            item.id === job.id
              ? applyTransferFailure(item, err?.message || 'Failed to retry transfer')
              : item,
          ),
        );
      })
      .finally(() => {
        releaseDownloadAbortController(job.id, downloadController);
      });
  };

  return (
    <div className="relative flex flex-1 h-full w-full bg-white dark:bg-[#111]">
      {toast && (
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-xl border text-sm animate-in fade-in slide-in-from-top-4 duration-300 bg-white dark:bg-[#252525] border-gray-100 dark:border-neutral-800 text-gray-900 dark:text-gray-100">
          {toast.type === 'success' ? (
            <CheckCircle2 className="text-emerald-500 shrink-0" size={18} />
          ) : (
            <AlertCircle className="text-red-500 shrink-0" size={18} />
          )}
          <span>{toast.message}</span>
        </div>
      )}
      <FileSidebar 
        activeSection={activeSection} 
        onSectionChange={setActiveSection} 
        downloadJobs={downloadJobs}
        onClearJobs={handleClearJobs}
        onCancelJob={handleCancelJob}
        sharedSpaces={sharedSpaces}
        storageSummary={storageSummary}
        onAddSpaceClick={() => setIsCreateSpaceOpen(true)}
        onDeleteSpace={handleDeleteSpace}
        onOpenStorageSettings={onOpenStorageSettings}
      />
      {activeSection === 'transfer' ? (
        <React.Suspense fallback={<DriveTransferFallback />}>
          <TransferPage 
            downloadJobs={downloadJobs}
            setDownloadJobs={setDownloadJobs}
            onOpenDownload={onOpenExternal}
            onRetryJob={handleRetryJob}
            onCancelJob={handleCancelJob}
          />
        </React.Suspense>
      ) : (
        <FileBrowser 
          activeSection={activeSection} 
          fileService={fileService}
          downloadJobs={downloadJobs}
          setDownloadJobs={setDownloadJobs}
          onOpenDownload={onOpenExternal}
          onRetryJob={handleRetryJob}
          createUploadAbortController={createUploadAbortController}
          releaseUploadAbortController={releaseUploadAbortController}
          createDownloadAbortController={createDownloadAbortController}
          releaseDownloadAbortController={releaseDownloadAbortController}
          onCancelJob={handleCancelJob}
        />
      )}

      {/* Shared Space Creation Modal */}
      <CreateSharedSpaceModal 
        isOpen={isCreateSpaceOpen}
        onClose={() => setIsCreateSpaceOpen(false)}
        onSubmit={handleCreateSpaceSubmit}
      />
    </div>
  );
}

function DriveTransferFallback() {
  return (
    <div
      aria-label="Loading transfer center"
      className="flex h-full flex-1 items-center justify-center bg-white dark:bg-[#151515]"
    >
      <div className="h-6 w-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
    </div>
  );
}
