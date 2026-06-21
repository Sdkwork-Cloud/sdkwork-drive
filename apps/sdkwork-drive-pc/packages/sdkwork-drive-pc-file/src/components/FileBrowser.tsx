import React, { useEffect, useRef, useState } from "react";
import {
  X,
  AlertCircle,
  CheckCircle2,
  RefreshCcw,
  FolderOpen,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  applyTransferFailure,
  applyUploadCompletionToJob,
  applyUploadProgressToJob,
  canCreateDriveFolderInSection,
  canUploadDriveFileToSection,
  createDownloadJobForFiles,
  createUploadJobForFile,
  createUploadJobForNativeFile,
  isCompletedTransferStatus,
  decodeLocalFilesystemId,
  type DriveFile,
} from "sdkwork-drive-pc-types";
import type { DriveFileService } from "sdkwork-drive-pc-core";
import { NativeLocalUploadFile, runManagedDownloadTransfer, useDriveRuntime } from "sdkwork-drive-pc-core";
import type { DriveSection } from "../pages/DrivePage";
import { DownloadManager, type DownloadJob } from "./DownloadManager";
import { FileBrowserHeader } from "./FileBrowserHeader";
import { FileDetailModal } from "./FileDetailModal";
import { Info, Star, Download, Trash2, CheckSquare, Copy, FolderInput } from "lucide-react";
import { formatDriveBytes, useTranslation } from "sdkwork-drive-pc-commons";
import { createLatestRequestGuard } from "./fileBrowserLoadGuard";
import {
  FILE_LIST_COL_ACTIONS_CLASS,
  FILE_LIST_HEADER_CLASS,
  FILE_LIST_ROW_CLASS,
} from "../utils/fileListLayout";
import { formatDriveFileTypeLabel, getDriveFileTypeSortKey } from "../utils/fileTypeLabel";

// Import newly refactored sub-components
import { FolderModal } from "./FolderModal";
import { FileRowItem } from "./FileRowItem";
import { FileGridItem } from "./FileGridItem";
import { ShareLinkModal } from "./ShareLinkModal";
import { MoveCopyModal, type MoveCopyMode } from "./MoveCopyModal";

function isDriveUploadAbortError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === "AbortError") {
    return true;
  }
  if (err instanceof Error) {
    return err.name === "AbortError" || /\babort(?:ed)?\b/i.test(err.message);
  }
  return false;
}

function isDriveDownloadAbortError(err: unknown): boolean {
  return isDriveUploadAbortError(err);
}

function getSettledBatchMessage(result: PromiseSettledResult<unknown>): string {
  if (result.status !== "rejected") {
    return "";
  }
  const reason = result.reason;
  if (reason instanceof Error && reason.message.trim()) {
    return reason.message;
  }
  return "One or more operations failed.";
}

const MAX_PARALLEL_UPLOADS = 3;

async function runWithConcurrency<T>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  if (items.length === 0) {
    return;
  }

  let nextIndex = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      await worker(items[currentIndex]!);
    }
  });
  await Promise.all(runners);
}

interface FileBrowserProps {
  activeSection: DriveSection;
  fileService: DriveFileService;
  downloadJobs: DownloadJob[];
  setDownloadJobs: React.Dispatch<React.SetStateAction<DownloadJob[]>>;
  onOpenDownload?: (url: string) => Promise<void> | void;
  onRetryJob: (job: DownloadJob) => void;
  createUploadAbortController: (jobId: string) => AbortController;
  releaseUploadAbortController: (jobId: string) => void;
  createDownloadAbortController: (jobId: string) => AbortController;
  releaseDownloadAbortController: (jobId: string) => void;
  onCancelJob: (id: string) => void;
}

export function FileBrowser({
  activeSection,
  fileService,
  downloadJobs,
  setDownloadJobs,
  onOpenDownload,
  onRetryJob,
  createUploadAbortController,
  releaseUploadAbortController,
  createDownloadAbortController,
  releaseDownloadAbortController,
  onCancelJob,
}: FileBrowserProps) {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [errorState, setErrorState] = useState<string | null>(null);
  const { t } = useTranslation();
  const { host } = useDriveRuntime();
  const canCreateFolderInActiveSection = canCreateDriveFolderInSection(activeSection);
  const canUploadToActiveSection = canUploadDriveFileToSection(activeSection);
  const latestLoadGuardRef = React.useRef(createLatestRequestGuard());
  const [isTransferPanelDismissed, setIsTransferPanelDismissed] = useState(false);
  const knownTransferJobIdsRef = useRef(new Set<string>());

  useEffect(() => {
    if (downloadJobs.length === 0) {
      knownTransferJobIdsRef.current = new Set();
      setIsTransferPanelDismissed(false);
      return;
    }

    const hasNewJob = downloadJobs.some((job) => !knownTransferJobIdsRef.current.has(job.id));
    knownTransferJobIdsRef.current = new Set(downloadJobs.map((job) => job.id));
    if (hasNewJob) {
      setIsTransferPanelDismissed(false);
    }
  }, [downloadJobs]);

  const getSectionTitle = (sectionKey: string): string => {
    switch (sectionKey) {
      case "my-storage": return t("sidebar.myStorage") || "My Storage";
      case "recent": return t("sidebar.recent") || "Recent Files";
      case "starred": return t("sidebar.starred") || "Starred Files";
      case "shared": return t("sidebar.sharedWithMe") || "Shared with me";
      case "computers": return t("sidebar.computers") || "Computers";
      case "transfer": return t("sidebar.transferCenter") || "Transfer Center";
      case "trash": return t("sidebar.trash") || "Trash";
      default: {
        const knowledgeBaseSpace = fileService.getKnowledgeBaseSpaces().find((space) => space.id === sectionKey);
        if (knowledgeBaseSpace) return knowledgeBaseSpace.name;
        const remoteSpace = fileService.getSharedSpaces().find((space) => space.id === sectionKey);
        return remoteSpace?.name || sectionKey;
      }
    }
  };

  // Server-driven pagination state
  const FILE_BROWSER_PAGE_SIZE = 50;
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pageDetectorRef, setPageDetectorRef] = useState<HTMLDivElement | null>(
    null,
  );

  const [sortBy, setSortBy] = useState<
    "name" | "owner" | "lastModified" | "size" | "type"
  >("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const handleSort = (field: "name" | "owner" | "lastModified" | "size" | "type") => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const sortedFiles = React.useMemo(() => {
    return [...files].sort((a, b) => {
      // Folders always go first (standard operating system behavior)
      if (a.type === "folder" && b.type !== "folder") return -1;
      if (a.type !== "folder" && b.type === "folder") return 1;

      let valA: any;
      let valB: any;

      switch (sortBy) {
        case "name":
          valA = a.name?.toLowerCase() || "";
          valB = b.name?.toLowerCase() || "";
          break;
        case "owner":
          valA = a.ownerId?.toLowerCase() || "";
          valB = b.ownerId?.toLowerCase() || "";
          break;
        case "lastModified":
          valA = new Date(a.updatedAt || 0).getTime();
          valB = new Date(b.updatedAt || 0).getTime();
          break;
        case "size":
          valA = a.size || 0;
          valB = b.size || 0;
          break;
        case "type":
          valA = getDriveFileTypeSortKey(a);
          valB = getDriveFileTypeSortKey(b);
          break;
        default:
          return 0;
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [files, sortBy, sortOrder]);

  const renderSortIndicator = (
    field: "name" | "owner" | "lastModified" | "size" | "type",
  ) => {
    if (sortBy !== field) {
      return (
        <ArrowUpDown
          size={11}
          className="inline-block ml-1 opacity-25 group-hover:opacity-75 transition-opacity"
        />
      );
    }
    return sortOrder === "asc" ? (
      <ArrowUp
        size={11}
        className="inline-block ml-1 text-blue-600 dark:text-blue-400 opacity-100"
      />
    ) : (
      <ArrowDown
        size={11}
        className="inline-block ml-1 text-blue-600 dark:text-blue-400 opacity-100"
      />
    );
  };

  // Subdirectory and detail modal tracking states
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbFiles, setBreadcrumbFiles] = useState<DriveFile[]>([]);
  const currentLoadScope = `${activeSection}\u0000${searchQuery}\u0000${currentFolderId ?? ""}`;
  const loadAbortControllerRef = React.useRef<AbortController | null>(null);
  const fileWriteAbortControllersRef = React.useRef(new Map<string, AbortController>());
  const createFolderInFlightRef = React.useRef(false);
  const [selectedPreviewFile, setSelectedPreviewFile] = useState<
    (DriveFile & { isStarred?: boolean; color?: string }) | null
  >(null);

  const createFileWriteAbortController = (key: string) => {
    fileWriteAbortControllersRef.current.get(key)?.abort();
    const controller = new AbortController();
    fileWriteAbortControllersRef.current.set(key, controller);
    return controller;
  };

  const releaseFileWriteAbortController = (
    key: string,
    controller?: AbortController,
  ) => {
    const current = fileWriteAbortControllersRef.current.get(key);
    if (!controller || current === controller) {
      fileWriteAbortControllersRef.current.delete(key);
    }
  };

  // Automatically reset directory node representation when side rails toggle
  useEffect(() => {
    setCurrentFolderId(null);
  }, [activeSection]);

  // Context Menu tracking state
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Multi-select state
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);

  // Inline Folder Creation state
  const [isCreatingFolderInline, setIsCreatingFolderInline] = useState(false);
  const [inlineFolderName, setInlineFolderName] = useState("");
  const inlineFolderNameRef = React.useRef("");

  useEffect(() => {
    inlineFolderNameRef.current = inlineFolderName;
  }, [inlineFolderName]);

  // Automatically reset selection and inline inputs on section or folder navigation
  useEffect(() => {
    setSelectedFileIds([]);
    setIsCreatingFolderInline(false);
    setInlineFolderName("");
  }, [activeSection, currentFolderId]);

  useEffect(() => {
    return () => {
      fileWriteAbortControllersRef.current.forEach((controller) => controller.abort());
      fileWriteAbortControllersRef.current.clear();
    };
  }, []);

  const handleToggleSelect = (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    setSelectedFileIds((prev) =>
      prev.includes(fileId)
        ? prev.filter((id) => id !== fileId)
        : [...prev, fileId],
    );
  };

  const handleSelectAllToggle = () => {
    if (sortedFiles.length === 0) return;
    if (selectedFileIds.length === sortedFiles.length) {
      setSelectedFileIds([]);
    } else {
      setSelectedFileIds(sortedFiles.map((f) => f.id));
    }
  };

  const handleBatchDelete = () => {
    if (selectedFileIds.length === 0) return;

    const isTrashSection = activeSection === "trash";
    const selectedCount = selectedFileIds.length;
    const batchDeleteController = createFileWriteAbortController("batch-delete");
    const deletePromises = selectedFileIds.map((id) => {
      return isTrashSection
        ? fileService.permanentlyDeleteFile(id, {
            signal: batchDeleteController.signal,
          })
        : fileService.deleteFile(id, {
            signal: batchDeleteController.signal,
          });
    });

    Promise.allSettled(deletePromises)
      .then((results) => {
        const failed = results.filter((result) => result.status === "rejected");
        const succeededCount = results.length - failed.length;
        if (failed.length === 0) {
          triggerToast(
            isTrashSection
              ? `Successfully deleted ${selectedCount} items permanently`
              : `Moved ${selectedCount} items to Trash`,
            "success",
          );
        } else if (succeededCount > 0) {
          triggerToast(
            `${succeededCount} succeeded, ${failed.length} failed.`,
            "info",
          );
        } else {
          triggerToast(getSettledBatchMessage(failed[0]), "err");
        }
        setSelectedFileIds([]);
        loadFiles();
      })
      .finally(() => {
        releaseFileWriteAbortController("batch-delete", batchDeleteController);
      });
  };

  const handleBatchRestore = () => {
    if (selectedFileIds.length === 0) return;

    const selectedCount = selectedFileIds.length;
    const batchRestoreController = createFileWriteAbortController("batch-restore");
    const restorePromises = selectedFileIds.map((id) =>
      fileService.restoreFile(id, {
        signal: batchRestoreController.signal,
      }),
    );

    Promise.allSettled(restorePromises)
      .then((results) => {
        const failed = results.filter((result) => result.status === "rejected");
        const succeededCount = results.length - failed.length;
        if (failed.length === 0) {
          triggerToast(
            `Successfully restored ${selectedCount} items`,
            "success",
          );
        } else if (succeededCount > 0) {
          triggerToast(
            `${succeededCount} restored, ${failed.length} failed.`,
            "info",
          );
        } else {
          triggerToast(getSettledBatchMessage(failed[0]), "err");
        }
        setSelectedFileIds([]);
        loadFiles();
      })
      .finally(() => {
        releaseFileWriteAbortController("batch-restore", batchRestoreController);
      });
  };

  const handleBatchStarToggle = () => {
    if (selectedFileIds.length === 0) return;

    const selectedFilesObj = files.filter((f) =>
      selectedFileIds.includes(f.id),
    );
    const holdsUnstarred = selectedFilesObj.some((f) => !f.isStarred);
    const selectedCount = selectedFileIds.length;
    const batchStarController = createFileWriteAbortController("batch-star");

    const starPromises = selectedFilesObj.map((f) => {
      if (f.isStarred !== holdsUnstarred) {
        return fileService.toggleStar(f.id, {
          signal: batchStarController.signal,
        });
      }
      return Promise.resolve(f.isStarred);
    });

    Promise.allSettled(starPromises)
      .then((results) => {
        const failed = results.filter((result) => result.status === "rejected");
        const succeededCount = results.length - failed.length;
        if (failed.length === 0) {
          triggerToast(
            holdsUnstarred
              ? `Successfully starred ${selectedCount} items`
              : `Removed star from ${selectedCount} items`,
            "info",
          );
        } else if (succeededCount > 0) {
          triggerToast(
            `${succeededCount} updated, ${failed.length} failed.`,
            "info",
          );
        } else {
          triggerToast(getSettledBatchMessage(failed[0]), "err");
        }
        setSelectedFileIds([]);
        loadFiles();
      })
      .finally(() => {
        releaseFileWriteAbortController("batch-star", batchStarController);
      });
  };

  const handleBatchDownload = () => {
    if (selectedFileIds.length === 0) return;

    const selectedFilesObj = files.filter((f) =>
      selectedFileIds.includes(f.id),
    );
    if (selectedFilesObj.length === 1) {
      const file = selectedFilesObj[0];
      handlePrepareDownload(file);
      setSelectedFileIds([]);
      return;
    }

    const newJob = createDownloadJobForFiles(selectedFilesObj, {
      packageName: `drive_export_${selectedFilesObj.length}_items.zip`,
      fallbackSizeBytes: 5_000_000,
    });
    setDownloadJobs((prev) => [newJob, ...prev]);
    triggerToast(
      `Compressing ${selectedFilesObj.length} files to drive_export_${selectedFilesObj.length}_items.zip for active transfers...`,
      "success",
    );
    const downloadController = createDownloadAbortController(newJob.id);
    fileService.createDownloadPackage(selectedFilesObj, newJob.fileName, {
        signal: downloadController.signal,
      })
      .then((downloadPackage) => {
        return runManagedDownloadTransfer({
          job: newJob,
          grant: downloadPackage,
          signal: downloadController.signal,
          onJobUpdate: (updater) => {
            setDownloadJobs((prev) =>
              prev.map((item) => (item.id === newJob.id ? updater(item) : item)),
            );
          },
          onOpenExternal: onOpenDownload,
          saveDownload: host.isNativeHost
            ? (fileName, blob) => host.saveDownloadFile(fileName, blob)
            : undefined,
        });
      })
      .catch((err) => {
        if (isDriveDownloadAbortError(err)) {
          return;
        }

        setDownloadJobs((prev) =>
          prev.map((job) =>
            job.id === newJob.id
              ? applyTransferFailure(job, err?.message || "Failed to prepare download bundle")
              : job,
          ),
        );
        triggerToast(err?.message || "Failed to prepare download bundle", "err");
      })
      .finally(() => {
        releaseDownloadAbortController(newJob.id);
      });
    setSelectedFileIds([]);
  };

  // Modal Dialog visibility states
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [shareFile, setShareFile] = useState<DriveFile | null>(null);
  const [moveCopyMode, setMoveCopyMode] = useState<MoveCopyMode | null>(null);
  const [moveCopyFiles, setMoveCopyFiles] = useState<DriveFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const queueUploadJobs = (
    uploadJobs: Array<{
      source: File | NativeLocalUploadFile;
      job: DownloadJob;
    }>,
    toastLabel: string,
  ) => {
    if (uploadJobs.length === 0) {
      return;
    }

    let completedUploadCount = 0;
    let shouldRefreshAfterSettled = false;

    setDownloadJobs((prev) => [
      ...uploadJobs.map(({ job }) => job),
      ...prev,
    ]);
    triggerToast(toastLabel, "info");

    const uploadTasks = uploadJobs.map(({ source, job: newUploadJob }) => ({
      source,
      job: newUploadJob,
    }));

    void runWithConcurrency(uploadTasks, MAX_PARALLEL_UPLOADS, async ({ source, job: newUploadJob }) => {
      const uploadController = createUploadAbortController(newUploadJob.id);
      try {
        const uploadedFile = await fileService.uploadFile(source, activeSection, currentFolderId, {
          taskId: newUploadJob.id,
          signal: uploadController.signal,
          onProgress: (uploadedBytes, totalBytes) => {
            setDownloadJobs((prev) =>
              prev.map((job) =>
                job.id === newUploadJob.id
                  ? applyUploadProgressToJob(job, uploadedBytes, totalBytes)
                  : job,
              ),
            );
          },
        });
        completedUploadCount += 1;
        shouldRefreshAfterSettled = true;
        setDownloadJobs((prev) =>
          prev.map((job) =>
            job.id === newUploadJob.id
              ? applyUploadCompletionToJob(job, uploadedFile)
              : job,
          ),
        );
        loadFiles();
      } catch (err) {
        if (isDriveUploadAbortError(err)) {
          return;
        }

        shouldRefreshAfterSettled = true;
        setDownloadJobs((prev) =>
          prev.map((job) =>
            job.id === newUploadJob.id
              ? applyTransferFailure(job, err instanceof Error ? err.message : t("fileBrowser.toastUploadFailed"))
              : job,
          ),
        );
        triggerToast(
          err instanceof Error ? err.message : t("fileBrowser.toastUploadFailed"),
          "err",
        );
        loadFiles();
      } finally {
        releaseUploadAbortController(newUploadJob.id);
      }
    }).then(() => {
      if (shouldRefreshAfterSettled || completedUploadCount > 0) {
        loadFiles();
      }
    });
  };

  const openMoveCopyModal = (mode: MoveCopyMode, targets: DriveFile[]) => {
    if (targets.length === 0) {
      return;
    }
    setMoveCopyMode(mode);
    setMoveCopyFiles(targets);
  };

  const handleBatchMove = () => {
    const selectedFilesObj = files.filter((file) => selectedFileIds.includes(file.id));
    openMoveCopyModal("move", selectedFilesObj);
  };

  const handleBatchCopy = () => {
    const selectedFilesObj = files.filter((file) => selectedFileIds.includes(file.id));
    openMoveCopyModal("copy", selectedFilesObj);
  };

  const handleShareFile = (file: DriveFile) => {
    setShareFile(file);
    setActiveMenuId(null);
  };

  const handleMoveFile = (file: DriveFile) => {
    openMoveCopyModal("move", [file]);
    setActiveMenuId(null);
  };

  const handleCopyFile = (file: DriveFile) => {
    openMoveCopyModal("copy", [file]);
    setActiveMenuId(null);
  };

  const handleEmptyTrash = () => {
    if (activeSection !== "trash") {
      return;
    }
    if (!window.confirm(t("fileBrowser.emptyTrashConfirm"))) {
      return;
    }

    const emptyTrashController = createFileWriteAbortController("empty-trash");
    fileService
      .emptyTrash({ signal: emptyTrashController.signal })
      .then((deletedCount) => {
        triggerToast(
          t("fileBrowser.emptyTrashCompleted", { count: deletedCount }),
          "success",
        );
        setSelectedFileIds([]);
        loadFiles();
      })
      .catch((err: unknown) => {
        triggerToast(
          err instanceof Error ? err.message : t("fileBrowser.emptyTrashFailed"),
          "err",
        );
      })
      .finally(() => {
        releaseFileWriteAbortController("empty-trash", emptyTrashController);
      });
  };

  const queueSelectedFilesForUpload = (selectedFiles: File[]) => {
    if (selectedFiles.length === 0) {
      return;
    }
    if (!canUploadDriveFileToSection(activeSection)) {
      triggerToast("This Drive view does not support uploads.", "err");
      return;
    }

    queueUploadJobs(
      selectedFiles.map((file) => ({
        source: file,
        job: createUploadJobForFile(file, {
          uploadSection: activeSection,
          uploadParentId: currentFolderId ?? null,
          uploadBlob: file,
        }),
      })),
      selectedFiles.length === 1
        ? t("fileBrowser.toastFileAdded", { name: selectedFiles[0].name })
        : `Added ${selectedFiles.length} files to active upload transfers`,
    );
  };

  const handleDragOver = (event: React.DragEvent) => {
    if (!canUploadToActiveSection) {
      return;
    }
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    if (event.currentTarget.contains(event.relatedTarget as Node)) {
      return;
    }
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    if (!canUploadToActiveSection) {
      return;
    }
    const droppedFiles = Array.from(event.dataTransfer.files);
    queueSelectedFilesForUpload(droppedFiles);
  };

  const handleUploadClick = async () => {
    if (!canUploadDriveFileToSection(activeSection)) {
      triggerToast("This Drive view does not support uploads.", "err");
      return;
    }

    if (host.isNativeHost) {
      try {
        const descriptors = await host.pickLocalUploadFiles();
        if (descriptors.length === 0) {
          return;
        }
        queueUploadJobs(
          descriptors.map((descriptor) => ({
            source: new NativeLocalUploadFile(descriptor, host),
            job: createUploadJobForNativeFile(descriptor, {
              uploadSection: activeSection,
              uploadParentId: currentFolderId ?? null,
            }),
          })),
          descriptors.length === 1
            ? t("fileBrowser.toastFileAdded", { name: descriptors[0].name })
            : `Added ${descriptors.length} files to active upload transfers`,
        );
      } catch (err) {
        triggerToast(
          err instanceof Error ? err.message : t("fileBrowser.toastUploadFailed"),
          "err",
        );
      }
      return;
    }

    fileInputRef.current?.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
    queueSelectedFilesForUpload(selectedFiles);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Custom Toast System state
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "err" | "info";
  } | null>(null);

  const triggerToast = (
    message: string,
    type: "success" | "err" | "info" = "success",
  ) => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Fetch file directory and complete items flat list
  const loadFiles = () => {
    if (!latestLoadGuardRef.current.isCurrentScope(currentLoadScope)) {
      return;
    }

    loadAbortControllerRef.current?.abort();
    const loadAbortController = new AbortController();
    loadAbortControllerRef.current = loadAbortController;
    const requestId = latestLoadGuardRef.current.begin(currentLoadScope);
    setLoading(true);
    setErrorState(null);
    setNextPageToken(undefined);
    fileService.listFilesPage(activeSection, searchQuery, currentFolderId, {
      signal: loadAbortController.signal,
      pageSize: FILE_BROWSER_PAGE_SIZE,
    })
      .then((page) => {
        if (!latestLoadGuardRef.current.isCurrent(requestId)) {
          return;
        }
        setFiles(page.files);
        setNextPageToken(page.nextPageToken);
        setLoading(false);
      })
      .catch((err: any) => {
        if (isDriveUploadAbortError(err)) {
          return;
        }
        if (!latestLoadGuardRef.current.isCurrent(requestId)) {
          return;
        }
        setErrorState(
          err?.message || "An unexpected Drive service error occurred.",
        );
        setLoading(false);
      });

    if (!currentFolderId) {
      setBreadcrumbFiles([]);
      return;
    }

    fileService.getFolderPath(currentFolderId, {
      signal: loadAbortController.signal,
    })
      .then((path) => {
        if (!latestLoadGuardRef.current.isCurrent(requestId)) {
          return;
        }
        setBreadcrumbFiles(path);
      })
      .catch((err: any) => {
        if (isDriveUploadAbortError(err)) {
          return;
        }
        if (!latestLoadGuardRef.current.isCurrent(requestId)) {
          return;
        }
        setBreadcrumbFiles([]);
      });
  };

  const loadMoreFiles = React.useCallback(() => {
    if (!nextPageToken || loadingMore || loading) {
      return;
    }

    const loadAbortController = loadAbortControllerRef.current;
    if (!loadAbortController) {
      return;
    }

    setLoadingMore(true);
    fileService.listFilesPage(activeSection, searchQuery, currentFolderId, {
      signal: loadAbortController.signal,
      pageSize: FILE_BROWSER_PAGE_SIZE,
      pageToken: nextPageToken,
    })
      .then((page) => {
        setFiles((current) => {
          const seen = new Set(current.map((file) => file.id));
          const merged = [...current];
          for (const file of page.files) {
            if (!seen.has(file.id)) {
              merged.push(file);
            }
          }
          return merged;
        });
        setNextPageToken(page.nextPageToken);
        setLoadingMore(false);
      })
      .catch((err: unknown) => {
        if (isDriveUploadAbortError(err)) {
          return;
        }
        setLoadingMore(false);
      });
  }, [
    activeSection,
    currentFolderId,
    fileService,
    loading,
    loadingMore,
    nextPageToken,
    searchQuery,
  ]);

  useEffect(() => {
    latestLoadGuardRef.current.setCurrentScope(currentLoadScope);
    loadFiles();
    return () => {
      loadAbortControllerRef.current?.abort();
      loadAbortControllerRef.current = null;
    };
  }, [activeSection, searchQuery, currentFolderId, currentLoadScope]);

  // Intersection Observer for server-driven infinite scrolling
  useEffect(() => {
    if (!pageDetectorRef || !nextPageToken || loadingMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadMoreFiles();
        }
      },
      {
        rootMargin: "100px",
      },
    );

    observer.observe(pageDetectorRef);
    return () => observer.disconnect();
  }, [pageDetectorRef, nextPageToken, loadingMore, loadMoreFiles]);

  // Close context menu dropdowns on outer clicks
  useEffect(() => {
    const handleGlobalClick = () => setActiveMenuId(null);
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);

  // Format bytes helper
  const formatSize = formatDriveBytes;

  // Format date helper
  const formatDate = (dateString: string) => {
    try {
      const d = new Date(dateString);
      return `${d.toLocaleString("default", { month: "short" })} ${d.getDate()}, ${d.getFullYear()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    } catch {
      return dateString;
    }
  };

  // Dynamic Section title translations resolver
  const getSectionLocalizedTitle = (sec: DriveSection): string => {
    switch (sec) {
      case "my-storage":
        return t("sidebar.myStorage") || "My Storage";
      case "recent":
        return t("sidebar.recent") || "Recent Files";
      case "starred":
        return t("sidebar.starred") || "Starred Files";
      case "shared":
        return t("sidebar.sharedWithMe") || "Shared with me";
      case "computers":
        return t("sidebar.computers") || "Computers";
      case "trash":
        return t("sidebar.trash") || "Trash";
      default: {
        const knowledgeBaseSpace = fileService.getKnowledgeBaseSpaces().find((s) => s.id === sec);
        if (knowledgeBaseSpace) return knowledgeBaseSpace.name;
        const customSpace = fileService.getSharedSpaces().find((s) => s.id === sec);
        if (customSpace) return customSpace.name;
        return getSectionTitle(sec) || sec;
      }
    }
  };

  const handlePreviewFile = (
    file: DriveFile & { isStarred?: boolean; color?: string },
  ) => {
    if (activeSection === "computers" && file.type === "file") {
      const localPath = decodeLocalFilesystemId(file.id);
      if (localPath) {
        void host.openLocalPath(localPath).catch((err: unknown) => {
          triggerToast(
            err instanceof Error ? err.message : "Failed to open local file",
            "err",
          );
        });
        return;
      }
    }
    setSelectedPreviewFile(file);
  };

  // Star action handler
  const handleToggleStarAction = (fileId: string, fileName: string) => {
    const starController = createFileWriteAbortController(`star-${fileId}`);
    fileService.toggleStar(fileId, {
        signal: starController.signal,
      })
      .then((starredState) => {
        triggerToast(
          starredState
            ? `Starred "${fileName}"`
            : `Removed star from "${fileName}"`,
          "info",
        );
        if (selectedPreviewFile && selectedPreviewFile.id === fileId) {
          setSelectedPreviewFile((prev) =>
            prev ? { ...prev, isStarred: starredState } : null,
          );
        }
        loadFiles();
      })
      .catch((err) => {
        if (isDriveUploadAbortError(err)) {
          return;
        }
        triggerToast(
          err.message || t("fileBrowser.toastFileStarredFailed"),
          "err",
        );
      })
      .finally(() => {
        releaseFileWriteAbortController(`star-${fileId}`, starController);
      });
  };

  const handleToggleStar = (
    e: React.MouseEvent,
    fileId: string,
    fileName: string,
  ) => {
    e.stopPropagation();
    handleToggleStarAction(fileId, fileName);
  };

  // Move to Trash or Restore Action handler
  const handleTrashAction = (e: React.MouseEvent, file: DriveFile) => {
    e.stopPropagation();
    setActiveMenuId(null);
    const trashController = createFileWriteAbortController(`trash-${file.id}`);

    if (activeSection === "trash") {
      // Restore file
      fileService.restoreFile(file.id, {
          signal: trashController.signal,
        })
        .then(() => {
          triggerToast(t("fileBrowser.toastRestored", { name: file.name }));
          loadFiles();
        })
        .catch((err) => {
          if (isDriveUploadAbortError(err)) {
            return;
          }
          triggerToast(err.message, "err");
        })
        .finally(() => {
          releaseFileWriteAbortController(`trash-${file.id}`, trashController);
        });
    } else {
      // Move to Trash
      fileService.deleteFile(file.id, {
          signal: trashController.signal,
        })
        .then(() => {
          triggerToast(
            t("fileBrowser.toastMovedToTrash", { name: file.name }),
            "info",
          );
          loadFiles();
        })
        .catch((err) => {
          if (isDriveUploadAbortError(err)) {
            return;
          }
          triggerToast(err.message, "err");
        })
        .finally(() => {
          releaseFileWriteAbortController(`trash-${file.id}`, trashController);
        });
    }
  };

  // Permanent Wipe Action handler
  const handlePermanentDelete = (e: React.MouseEvent, file: DriveFile) => {
    e.stopPropagation();
    setActiveMenuId(null);
    const trashController = createFileWriteAbortController(`trash-${file.id}`);
    fileService.permanentlyDeleteFile(file.id, {
        signal: trashController.signal,
      })
      .then(() => {
        triggerToast(
          t("fileBrowser.toastPermanentlyDeleted", { name: file.name }),
          "info",
        );
        loadFiles();
      })
      .catch((err) => {
        if (isDriveUploadAbortError(err)) {
          return;
        }
        triggerToast(err.message, "err");
      })
      .finally(() => {
        releaseFileWriteAbortController(`trash-${file.id}`, trashController);
      });
  };

  const runCreateFolder = (folderName: string, onSuccess?: () => void) => {
    if (createFolderInFlightRef.current) {
      return;
    }
    if (!canCreateDriveFolderInSection(activeSection)) {
      triggerToast("This Drive view does not support folder creation.", "err");
      return;
    }

    createFolderInFlightRef.current = true;
    const createFolderController = createFileWriteAbortController("create-folder");
    fileService.createFolder(folderName, activeSection, currentFolderId, {
        signal: createFolderController.signal,
      })
      .then((folder) => {
        triggerToast(
          t("fileBrowser.toastCreatedFolder", { name: folder.name }),
        );
        onSuccess?.();
        loadFiles();
      })
      .catch((err) => {
        if (isDriveUploadAbortError(err)) {
          return;
        }
        triggerToast(err.message, "err");
      })
      .finally(() => {
        createFolderInFlightRef.current = false;
        releaseFileWriteAbortController("create-folder", createFolderController);
      });
  };

  // Trigger New Folder Creation
  const handleCreateFolderSubmit = (folderName: string) => {
    runCreateFolder(folderName, () => {
      setIsNewFolderOpen(false);
    });
  };

  const handleInlineFolderConfirm = () => {
    if (!canCreateDriveFolderInSection(activeSection)) {
      handleInlineFolderCancel();
      triggerToast("This Drive view does not support folder creation.", "err");
      return;
    }

    const trimmed = inlineFolderName.trim();
    if (trimmed === "") {
      handleInlineFolderCancel();
      return;
    }

    setIsCreatingFolderInline(false);
    runCreateFolder(trimmed, () => {
      setInlineFolderName("");
    });
  };

  const handleInlineFolderCancel = () => {
    setIsCreatingFolderInline(false);
    setInlineFolderName("");
  };

  const handleInlineFolderBlur = () => {
    setTimeout(() => {
      setIsCreatingFolderInline((currentActive) => {
        if (currentActive) {
          if (!canCreateDriveFolderInSection(activeSection)) {
            setInlineFolderName("");
            triggerToast("This Drive view does not support folder creation.", "err");
            return false;
          }

          const trimmed = inlineFolderNameRef.current.trim();
          if (trimmed === "") {
            setInlineFolderName("");
            return false;
          } else {
            runCreateFolder(trimmed, () => {
              setInlineFolderName("");
            });
            return false;
          }
        }
        return currentActive;
      });
    }, 200);
  };

  const [inlineRenameFileId, setInlineRenameFileId] = useState<string | null>(
    null,
  );

  // Trigger Rename File Submit
  const handleInlineRenameSubmit = (
    targetId: string,
    targetOldName: string,
    newFileName: string,
  ) => {
    if (
      !newFileName ||
      newFileName.trim() === "" ||
      newFileName === targetOldName
    ) {
      setInlineRenameFileId(null);
      return;
    }

    const renameController = createFileWriteAbortController(`rename-${targetId}`);
    fileService.renameFile(targetId, newFileName.trim(), {
        signal: renameController.signal,
      })
      .then(() => {
        triggerToast(
          t("fileBrowser.toastRenamedTo", { name: newFileName.trim() }),
        );
        // Keep active detail card synchronized
        if (selectedPreviewFile && selectedPreviewFile.id === targetId) {
          setSelectedPreviewFile((prev) =>
            prev ? { ...prev, name: newFileName.trim() } : null,
          );
        }
        setInlineRenameFileId(null);
        loadFiles();
      })
      .catch((err) => {
        if (isDriveUploadAbortError(err)) {
          return;
        }
        triggerToast(err?.message || t("fileBrowser.toastRenameFailed"), "err");
        setInlineRenameFileId(null);
      })
      .finally(() => {
        releaseFileWriteAbortController(`rename-${targetId}`, renameController);
      });
  };

  const handleRenameAction = (file: DriveFile) => {
    setInlineRenameFileId(file.id);
    setActiveMenuId(null);
  };

  // Context Menu Rename triggers
  const handleRenameClick = (e: React.MouseEvent, file: DriveFile) => {
    e.stopPropagation();
    handleRenameAction(file);
  };

  // Set customized label marker color on folder metadata
  const handleSetFolderColor = (folderId: string, color: string) => {
    const colorController = createFileWriteAbortController(`folder-color-${folderId}`);
    fileService.setFolderColor(folderId, color, {
        signal: colorController.signal,
      })
      .then(() => {
        triggerToast(t("fileBrowser.toastColorChanged"), "success");
        if (selectedPreviewFile && selectedPreviewFile.id === folderId) {
          setSelectedPreviewFile((prev) => (prev ? { ...prev, color } : null));
        }
        loadFiles();
      })
      .catch((err: any) => {
        if (isDriveUploadAbortError(err)) {
          return;
        }
        triggerToast(err?.message || t("fileBrowser.toastColorFailed"), "err");
      })
      .finally(() => {
        releaseFileWriteAbortController(`folder-color-${folderId}`, colorController);
      });
  };

  // Download trigger keeps the existing transfer UI while preparing a Drive grant.
  const handlePrepareDownload = (file: DriveFile) => {
    setActiveMenuId(null);
    const newJob = createDownloadJobForFiles([file]);
    const downloadController = createDownloadAbortController(newJob.id);
    setDownloadJobs((prev) => [newJob, ...prev]);
    triggerToast(
      file.type === "folder"
        ? `Compressing folder "${file.name}" to ZIP archive for download...`
        : `Added "${file.name}" to active download transfers`,
      "success",
    );
    const prepareDownload = file.type === "folder"
      ? fileService.createDownloadPackage([file], `${file.name}.zip`, {
          signal: downloadController.signal,
        })
      : fileService.createDownloadUrl(file, {
          signal: downloadController.signal,
        });
    prepareDownload
      .then((download) => {
        return runManagedDownloadTransfer({
          job: newJob,
          grant: download,
          signal: downloadController.signal,
          onJobUpdate: (updater) => {
            setDownloadJobs((prev) =>
              prev.map((item) => (item.id === newJob.id ? updater(item) : item)),
            );
          },
          onOpenExternal: onOpenDownload,
          saveDownload: host.isNativeHost
            ? (fileName, blob) => host.saveDownloadFile(fileName, blob)
            : undefined,
        });
      })
      .catch((err) => {
        if (isDriveDownloadAbortError(err)) {
          return;
        }

        setDownloadJobs((prev) =>
          prev.map((job) =>
            job.id === newJob.id
              ? applyTransferFailure(job, err?.message || "Failed to prepare download")
              : job,
          ),
        );
        triggerToast(err?.message || "Failed to prepare download", "err");
      })
      .finally(() => {
        releaseDownloadAbortController(newJob.id);
      });
  };

  const handleDownloadClick = (e: React.MouseEvent, file: DriveFile) => {
    e.stopPropagation();
    handlePrepareDownload(file);
  };

  const handleRetryDownloadJob = (job: DownloadJob) => {
    onRetryJob(job);
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 bg-white dark:bg-[#151515] flex flex-col h-full overflow-hidden transition-colors relative">
      {/* Toast Alert popup banner */}
      {toast && (
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-xl border text-sm animate-in fade-in slide-in-from-top-4 duration-300 bg-white dark:bg-[#252525] border-gray-100 dark:border-neutral-800 text-gray-900 dark:text-gray-100">
          {toast.type === "success" && (
            <CheckCircle2 className="text-emerald-500 shrink-0" size={18} />
          )}
          {toast.type === "err" && (
            <AlertCircle className="text-red-500 shrink-0" size={18} />
          )}
          {toast.type === "info" && (
            <Info className="text-blue-500 shrink-0" size={18} />
          )}
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-202"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <FileBrowserHeader
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        sectionTitle={getSectionLocalizedTitle(activeSection)}
        canCreateFolder={canCreateFolderInActiveSection}
        canUpload={canUploadToActiveSection}
        canEmptyTrash={activeSection === "trash" && files.length > 0}
        onEmptyTrash={handleEmptyTrash}
        onCreateFolder={() => {
          setIsCreatingFolderInline(true);
          setInlineFolderName("");
        }}
        onUpload={handleUploadClick}
        currentFolderId={currentFolderId}
        breadcrumbFiles={breadcrumbFiles}
        onNavigateFolder={setCurrentFolderId}
        itemCount={!loading && !errorState ? files.length : null}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={(field, order) => {
          setSortBy(field);
          setSortOrder(order);
        }}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Main Files Work Area */}
      <div
        className="relative flex w-full flex-1 flex-col overflow-hidden"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragOver && canUploadToActiveSection ? (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center border-2 border-dashed border-blue-500 bg-blue-500/10 backdrop-blur-[1px]">
            <p className="rounded-lg bg-white/90 px-4 py-2 text-sm font-semibold text-blue-700 shadow-lg dark:bg-[#1a1a1a]/90 dark:text-blue-300">
              {t("fileBrowser.dragDropText")}
            </p>
          </div>
        ) : null}
        {/* Connection Failure Error Panel */}
        {errorState ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#fafafa] dark:bg-[#121212] transition-colors select-none">
            <div className="max-w-[420px] bg-white dark:bg-[#1a1a1a] border border-red-200 dark:border-red-950/40 rounded-2xl p-6 shadow-xl shadow-black/5 text-center flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center text-red-600 dark:text-red-400">
                <AlertCircle size={28} />
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-gray-900 dark:text-white mb-1.5">
                  {t("fileBrowser.connectionException")}
                </h3>
                <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed">
                  {errorState}
                </p>
              </div>
              <div className="flex items-center gap-3 w-full mt-2">
                <button
                  onClick={loadFiles}
                  className="w-full py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RefreshCcw size={13} className="animate-spin" />{" "}
                  {t("fileBrowser.retry")}
                </button>
              </div>
            </div>
          </div>
        ) : loading ? (
          /* Live Loading Spinner */
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 gap-3 select-none">
            <div className="w-8 h-8 rounded-full border-2 border-blue-500/30 border-t-blue-600 animate-spin" />
            <span className="text-xs font-medium tracking-wide">
              {t("fileBrowser.fetchingObjects")}
            </span>
          </div>
        ) : (
          /* Scrolled files display area */
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="sdkwork-drive-file-list-table flex min-h-0 flex-1 flex-col">
            {/* Table layout titles header */}
            {viewMode === "list" &&
              (files.length > 0 || isCreatingFolderInline) && (
                <div className={FILE_LIST_HEADER_CLASS}>
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={
                        sortedFiles.length > 0 &&
                        selectedFileIds.length === sortedFiles.length
                      }
                      onChange={handleSelectAllToggle}
                      className="h-4 w-4 cursor-pointer rounded border-gray-300 bg-white text-blue-600 focus:ring-0 dark:border-neutral-700 dark:bg-neutral-900"
                    />
                  </div>
                  <div
                    className="group flex min-w-0 cursor-pointer items-center gap-1 hover:text-gray-700 dark:hover:text-neutral-300"
                    onClick={() => handleSort("name")}
                  >
                    <span>{t("fileBrowser.name")}</span>
                    {renderSortIndicator("name")}
                  </div>
                  <div
                    className="group hidden min-w-0 cursor-pointer items-center gap-1 hover:text-gray-700 dark:hover:text-neutral-300 lg:flex"
                    onClick={() => handleSort("owner")}
                  >
                    <span>{t("fileBrowser.owner")}</span>
                    {renderSortIndicator("owner")}
                  </div>
                  <div
                    className="group flex cursor-pointer items-center justify-end gap-1 text-right hover:text-gray-700 dark:hover:text-neutral-300"
                    onClick={() => handleSort("size")}
                  >
                    <span>{t("fileBrowser.fileSize")}</span>
                    {renderSortIndicator("size")}
                  </div>
                  <div
                    className="group flex min-w-0 cursor-pointer items-center gap-1 hover:text-gray-700 dark:hover:text-neutral-300"
                    onClick={() => handleSort("type")}
                  >
                    <span>{t("fileBrowser.fileType")}</span>
                    {renderSortIndicator("type")}
                  </div>
                  <div
                    className="group hidden min-w-0 cursor-pointer items-center gap-1 hover:text-gray-700 dark:hover:text-neutral-300 lg:flex"
                    onClick={() => handleSort("lastModified")}
                  >
                    <span>{t("fileBrowser.lastModified")}</span>
                    {renderSortIndicator("lastModified")}
                  </div>
                  <div className="text-right">{t("fileBrowser.actions")}</div>
                </div>
              )}

            {/* Scroller Pane */}
            <div
              className={
                viewMode === "grid"
                  ? "sdkwork-drive-file-list-body sdkwork-drive-file-list-body--grid"
                  : "sdkwork-drive-file-list-body"
              }
            >
              {isCreatingFolderInline &&
                (viewMode === "list" ? (
                  <div className={`${FILE_LIST_ROW_CLASS} sdkwork-drive-file-list-row--inline inline-folder-container`}>
                    <div className="flex items-center justify-center">
                      <div className="h-4 w-4 rounded border border-gray-200 bg-gray-50 opacity-40 dark:border-neutral-800 dark:bg-neutral-900" />
                    </div>

                    <div className="sdkwork-drive-file-list-col-name">
                      <FolderOpen
                        size={18}
                        className="shrink-0 fill-blue-500/10 text-blue-500"
                      />
                      <input
                        type="text"
                        autoFocus
                        value={inlineFolderName}
                        onChange={(e) => setInlineFolderName(e.target.value)}
                        onBlur={handleInlineFolderBlur}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleInlineFolderConfirm();
                          } else if (e.key === "Escape") {
                            handleInlineFolderCancel();
                          }
                        }}
                        onFocus={(e) => e.target.select()}
                        placeholder={t("fileBrowser.newFolder") || "New Folder"}
                        className="w-full min-w-0 max-w-sm rounded border border-blue-500 bg-white px-2.5 py-1 text-xs font-medium text-neutral-850 outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-blue-400 dark:bg-[#18181b] dark:text-neutral-100"
                      />
                    </div>

                    <div className="sdkwork-drive-file-list-col-meta hidden lg:block">
                      {t("fileBrowser.me") || "Me"}
                    </div>
                    <div className="sdkwork-drive-file-list-col-size">--</div>
                    <div className="sdkwork-drive-file-list-col-meta">
                      {t("fileBrowser.fileTypeFolder") || "Folder"}
                    </div>
                    <div className="sdkwork-drive-file-list-col-meta hidden font-mono lg:block">
                      {t("fileBrowser.justNow") || "Just now"}
                    </div>
                    <div className={FILE_LIST_COL_ACTIONS_CLASS}>
                      <div className="sdkwork-drive-file-list-actions">
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={handleInlineFolderConfirm}
                          className="sdkwork-drive-file-list-actions__btn is-visible text-emerald-500 hover:bg-emerald-500/15 inline-folder-btn"
                          title={t("fileBrowser.create") || "Create"}
                        >
                          <CheckCircle2 size={15} />
                        </button>
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={handleInlineFolderCancel}
                          className="sdkwork-drive-file-list-actions__btn is-visible text-rose-500 hover:bg-rose-500/15 inline-folder-btn"
                          title={t("fileBrowser.cancel") || "Cancel"}
                        >
                          <X size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border border-blue-500 dark:border-blue-400 bg-blue-500/[0.04] dark:bg-blue-500/[0.04] rounded-2xl p-4 px-4.5 flex flex-col justify-between h-[145px] select-none shadow-[0_0_0_1px_rgba(59,130,246,0.3)] inline-folder-container">
                    <div className="flex items-start justify-between w-full h-10">
                      <FolderOpen
                        size={24}
                        className="text-blue-500 fill-blue-500/10 shrink-0"
                      />
                      <div className="flex items-center gap-1.5">
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={handleInlineFolderConfirm}
                          className="p-1 hover:bg-emerald-500/15 text-emerald-500 rounded transition-colors cursor-pointer inline-folder-btn"
                          title={t("fileBrowser.create") || "Create"}
                        >
                          <CheckCircle2 size={13} />
                        </button>
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={handleInlineFolderCancel}
                          className="p-1 hover:bg-rose-500/15 text-rose-500 rounded transition-colors cursor-pointer inline-folder-btn"
                          title={t("fileBrowser.cancel") || "Cancel"}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 min-w-0 w-full flex flex-col justify-end flex-1">
                      <input
                        type="text"
                        autoFocus
                        value={inlineFolderName}
                        onChange={(e) => setInlineFolderName(e.target.value)}
                        onBlur={handleInlineFolderBlur}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleInlineFolderConfirm();
                          } else if (e.key === "Escape") {
                            handleInlineFolderCancel();
                          }
                        }}
                        onFocus={(e) => e.target.select()}
                        placeholder={t("fileBrowser.newFolder") || "New Folder"}
                        className="w-full bg-white dark:bg-[#18181b] border border-blue-500 dark:border-blue-400 rounded-lg px-2 py-1.5 text-xs text-neutral-850 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                      />
                      <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-neutral-500 font-mono mt-2">
                        <span>{t("fileBrowser.me") || "Me"}</span>
                        <span>{t("fileBrowser.justNow") || "Just now"}</span>
                      </div>
                    </div>
                  </div>
                ))}

              {sortedFiles.map((file) => {
                if (viewMode === "list") {
                  return (
                    <FileRowItem
                      key={file.id}
                      file={file}
                      activeSection={activeSection}
                      activeMenuId={activeMenuId}
                      setActiveMenuId={setActiveMenuId}
                      onToggleStar={handleToggleStar}
                      onDownload={handleDownloadClick}
                      onPreview={handlePreviewFile}
                      onRename={handleRenameClick}
                      onTrashAction={handleTrashAction}
                      onPermanentDelete={handlePermanentDelete}
                      onShare={handleShareFile}
                      onMove={handleMoveFile}
                      onCopy={handleCopyFile}
                      onDrillDown={setCurrentFolderId}
                      formatDate={formatDate}
                      formatSize={formatSize}
                      isInlineEditing={inlineRenameFileId === file.id}
                      onInlineRenameSubmit={(newName) =>
                        handleInlineRenameSubmit(file.id, file.name, newName)
                      }
                      onInlineRenameCancel={() => setInlineRenameFileId(null)}
                      isSelected={selectedFileIds.includes(file.id)}
                      onToggleSelect={handleToggleSelect}
                      hasSelection={selectedFileIds.length > 0}
                      isTrashSection={activeSection === "trash"}
                    />
                  );
                } else {
                  return (
                    <FileGridItem
                      key={file.id}
                      file={file}
                      activeSection={activeSection}
                      activeMenuId={activeMenuId}
                      setActiveMenuId={setActiveMenuId}
                      onToggleStar={handleToggleStar}
                      onDownload={handleDownloadClick}
                      onPreview={handlePreviewFile}
                      onRename={handleRenameClick}
                      onTrashAction={handleTrashAction}
                      onPermanentDelete={handlePermanentDelete}
                      onShare={handleShareFile}
                      onMove={handleMoveFile}
                      onCopy={handleCopyFile}
                      onDrillDown={setCurrentFolderId}
                      formatDate={formatDate}
                      formatSize={formatSize}
                      isInlineEditing={inlineRenameFileId === file.id}
                      onInlineRenameSubmit={(newName) =>
                        handleInlineRenameSubmit(file.id, file.name, newName)
                      }
                      onInlineRenameCancel={() => setInlineRenameFileId(null)}
                      isSelected={selectedFileIds.includes(file.id)}
                      onToggleSelect={handleToggleSelect}
                      hasSelection={selectedFileIds.length > 0}
                      isTrashSection={activeSection === "trash"}
                    />
                  );
                }
              })}

              {/* Infinite Scrolling detector row */}
              {sortedFiles.length > 0 && (
                <div
                  className={`mt-4 mb-2 py-6 flex flex-col items-center justify-center gap-2 border-t border-gray-100 dark:border-neutral-800/60 w-full select-none ${viewMode === "grid" ? "col-span-full" : ""}`}
                  ref={setPageDetectorRef}
                >
                  {nextPageToken ? (
                    <div className="flex flex-col items-center gap-2.5 text-gray-400 dark:text-neutral-500 text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full border-2 border-blue-500/30 border-t-blue-600 animate-spin" />
                        <span className="font-medium tracking-wide">
                          {t("fileBrowser.loadingMore")}
                        </span>
                      </div>
                      <button
                        onClick={loadMoreFiles}
                        className="mt-1 px-3 py-1 text-[11px] font-semibold text-blue-500 hover:text-blue-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors cursor-pointer"
                      >
                        {t("fileBrowser.loadMoreBtn")}
                      </button>
                    </div>
                  ) : (
                    <div className="text-gray-400 dark:text-neutral-500 text-[11px] font-semibold py-1.5 flex items-center gap-2">
                      <span className="h-[1px] w-6 bg-neutral-200 dark:bg-neutral-800/60" />
                      <span>
                        {t("fileBrowser.allLoaded", {
                          count: sortedFiles.length,
                        })}
                      </span>
                      <span className="h-[1px] w-6 bg-neutral-200 dark:bg-neutral-800/60" />
                    </div>
                  )}
                </div>
              )}

              {/* Zero Assets Empty Workspace Layout */}
              {files.length === 0 && !isCreatingFolderInline && (
                <div className="py-20 text-center flex flex-col items-center justify-center gap-4 w-full col-span-full select-none animate-in fade-in duration-200">
                  <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 flex items-center justify-center text-gray-400 dark:text-neutral-600 relative">
                    <FolderOpen size={28} />
                    <X
                      size={14}
                      className="absolute bottom-4 right-4 stroke-[3] text-gray-300 dark:text-neutral-700"
                    />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-gray-800 dark:text-gray-200">
                      {t("fileBrowser.emptyStateTitle")}
                    </h3>
                    <p className="text-[12px] text-gray-400 dark:text-neutral-500 mt-1 max-w-[280px] mx-auto leading-relaxed">
                      {t("fileBrowser.emptyStateSub")}
                    </p>
                  </div>
                  {canUploadToActiveSection && (
                      <button
                        onClick={handleUploadClick}
                        className="mt-2 px-4.5 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/25 rounded-lg transition-all cursor-pointer"
                      >
                        {t("sidebar.upload")}
                      </button>
                    )}
                </div>
              )}
            </div>
            </div>
          </div>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        multiple
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Floating Multi-Select Toolbar Container */}
      {selectedFileIds.length > 0 && (
        <div className="fixed bottom-26 left-1/2 z-40 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-3 sm:gap-6 rounded-2xl border border-neutral-800 bg-[#131315]/95 px-4 py-3.5 text-white shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-8 fade-in duration-300 dark:bg-[#131315]/95 sm:px-6">
          <div className="flex items-center gap-2 border-r border-neutral-800 pr-5 select-none">
            <CheckSquare className="text-blue-500 shrink-0" size={17} />
            <span className="text-[13px] font-semibold text-neutral-200">
              {selectedFileIds.length}{" "}
              {selectedFileIds.length === 1 ? "item" : "items"} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            {activeSection === "trash" ? (
              <>
                <button
                  onClick={handleBatchRestore}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-neutral-800/80 text-emerald-400 border border-emerald-950/30 transition-all cursor-pointer"
                >
                  <RefreshCcw size={14} />
                  Restore Selected
                </button>
                <button
                  onClick={handleBatchDelete}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-950/20 text-red-400 border border-red-950/30 transition-all cursor-pointer"
                >
                  <Trash2 size={14} />
                  Delete Permanently
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleBatchStarToggle}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-200 hover:text-amber-400 hover:bg-neutral-800 border border-neutral-800 transition-all cursor-pointer"
                >
                  <Star size={14} className="fill-none hover:fill-amber-400" />
                  Toggle Star
                </button>
                <button
                  onClick={handleBatchMove}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-200 hover:text-blue-400 hover:bg-neutral-800 border border-neutral-800 transition-all cursor-pointer"
                >
                  <FolderInput size={14} />
                  {t("fileBrowser.move")}
                </button>
                <button
                  onClick={handleBatchCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-200 hover:text-blue-400 hover:bg-neutral-800 border border-neutral-800 transition-all cursor-pointer"
                >
                  <Copy size={14} />
                  {t("fileBrowser.copy")}
                </button>
                <button
                  onClick={handleBatchDownload}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-200 hover:text-blue-400 hover:bg-neutral-800 border border-neutral-800 transition-all cursor-pointer"
                >
                  <Download size={14} />
                  Download Bundle
                </button>
                <button
                  onClick={handleBatchDelete}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-950/20 text-red-500 hover:text-red-400 border border-red-950/30 transition-all cursor-pointer"
                >
                  <Trash2 size={14} />
                  Trash Checked
                </button>
              </>
            )}
          </div>

          <div className="h-4 w-px bg-neutral-800" />

          <button
            onClick={() => setSelectedFileIds([])}
            className="text-neutral-400 hover:text-white hover:bg-neutral-850 p-1.5 rounded-lg transition-all cursor-pointer"
            title="Clear Selection"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* ==================================== MODAL DIALOGS ==================================== */}

      {/* Modal 1: New Folder Dialog */}
      <FolderModal
        isOpen={isNewFolderOpen}
        onClose={() => setIsNewFolderOpen(false)}
        onSubmit={handleCreateFolderSubmit}
      />

      <ShareLinkModal
        isOpen={shareFile !== null}
        file={shareFile}
        fileService={fileService}
        onClose={() => setShareFile(null)}
        onToast={triggerToast}
      />

      <MoveCopyModal
        isOpen={moveCopyMode !== null && moveCopyFiles.length > 0}
        mode={moveCopyMode || "move"}
        files={moveCopyFiles}
        activeSection={activeSection}
        fileService={fileService}
        onClose={() => {
          setMoveCopyMode(null);
          setMoveCopyFiles([]);
        }}
        onCompleted={() => {
          setSelectedFileIds([]);
          loadFiles();
        }}
        onToast={triggerToast}
      />

      {/* Property details panel */}
      {selectedPreviewFile && (
        <FileDetailModal
          file={selectedPreviewFile}
          fileService={fileService}
          onClose={() => setSelectedPreviewFile(null)}
          onSetColor={handleSetFolderColor}
          onDownload={handlePrepareDownload}
          onToggleStar={handleToggleStarAction}
          onRename={handleRenameAction}
          files={files}
          isTrashSection={activeSection === "trash"}
          onNavigatePreview={(targetFile) => {
            setSelectedPreviewFile(targetFile);
          }}
          onRefreshFolderContent={loadFiles}
        />
      )}

      {/* Transfer activity logs drawer */}
      {!isTransferPanelDismissed && (
        <DownloadManager
          jobs={downloadJobs}
          onOpenDownload={onOpenDownload}
          onClearJobs={() =>
            setDownloadJobs((prev) =>
              prev.filter(
                (job) =>
                  !isCompletedTransferStatus(job.status) &&
                  job.status !== "failed" &&
                  job.status !== "cancelled",
              ),
            )
          }
          onDismissPanel={() => setIsTransferPanelDismissed(true)}
          onCancelJob={onCancelJob}
          onRetryJob={handleRetryDownloadJob}
        />
      )}
    </div>
  );
}
