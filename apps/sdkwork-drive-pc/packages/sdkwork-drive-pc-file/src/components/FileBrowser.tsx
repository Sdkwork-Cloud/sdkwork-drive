import React, { useEffect, useState } from "react";
import {
  Search,
  FolderPlus,
  ChevronRight,
  Grid,
  LayoutList,
  Plus,
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
  applyDownloadGrantToJob,
  applyTransferFailure,
  applyUploadCompletionToJob,
  canCreateDriveFolderInSection,
  canUploadDriveFileToSection,
  createDownloadJobForFiles,
  createUploadJobForFile,
  isCompletedTransferStatus,
  type DriveFile,
} from "sdkwork-drive-pc-types";
import type { DriveFileService } from "sdkwork-drive-pc-core";
import type { DriveSection } from "../pages/DrivePage";
import { Breadcrumbs } from "./Breadcrumbs";
import { DownloadManager, type DownloadJob } from "./DownloadManager";
import { FileDetailModal } from "./FileDetailModal";
import { Info, Star, Download, Trash2, CheckSquare } from "lucide-react";
import { useTranslation } from "sdkwork-drive-pc-commons";
import { createLatestRequestGuard } from "./fileBrowserLoadGuard";

// Import newly refactored sub-components
import { FolderModal } from "./FolderModal";
import { FileRowItem } from "./FileRowItem";
import { FileGridItem } from "./FileGridItem";

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
  const canCreateFolderInActiveSection = canCreateDriveFolderInSection(activeSection);
  const canUploadToActiveSection = canUploadDriveFileToSection(activeSection);
  const latestLoadGuardRef = React.useRef(createLatestRequestGuard());

  const getSectionTitle = (sectionKey: string): string => {
    switch (sectionKey) {
      case "my-storage": return t("sidebar.myStorage") || "My Storage";
      case "kb-engineering": return t("sidebar.kbEngineering") || "Engineering Knowledge Base";
      case "kb-product": return t("sidebar.kbProduct") || "Product Specs";
      case "kb-design": return t("sidebar.kbDesign") || "Design System";
      case "recent": return t("sidebar.recent") || "Recent Files";
      case "starred": return t("sidebar.starred") || "Starred Files";
      case "shared": return t("sidebar.sharedWithMe") || "Shared with me";
      case "computers": return t("sidebar.computers") || "Computers";
      case "transfer": return t("sidebar.transferCenter") || "Transfer Center";
      case "trash": return t("sidebar.trash") || "Trash";
      default: {
        const remoteSpace = fileService.getSharedSpaces().find((space) => space.id === sectionKey);
        return remoteSpace?.name || sectionKey;
      }
    }
  };

  // Infinite scroll / pagination states and detectors
  const [visibleCount, setVisibleCount] = useState(15);
  const [isPaging, setIsPaging] = useState(false);
  const [pageDetectorRef, setPageDetectorRef] = useState<HTMLDivElement | null>(
    null,
  );

  const [sortBy, setSortBy] = useState<
    "name" | "owner" | "lastModified" | "size"
  >("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const handleSort = (field: "name" | "owner" | "lastModified" | "size") => {
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
        default:
          return 0;
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [files, sortBy, sortOrder]);

  const renderSortIndicator = (
    field: "name" | "owner" | "lastModified" | "size",
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
  const [allWorkspaceFiles, setAllWorkspaceFiles] = useState<DriveFile[]>([]);
  const [breadcrumbFiles, setBreadcrumbFiles] = useState<DriveFile[]>([]);
  const currentLoadScope = `${activeSection}\u0000${searchQuery}\u0000${currentFolderId ?? ""}`;
  const loadAbortControllerRef = React.useRef<AbortController | null>(null);
  const fileWriteAbortControllersRef = React.useRef(new Map<string, AbortController>());
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

    Promise.all(deletePromises)
      .then(() => {
        triggerToast(
          isTrashSection
            ? `Successfully deleted ${selectedCount} items permanently`
            : `Moved ${selectedCount} items to Trash`,
          "success",
        );
        setSelectedFileIds([]);
        loadFiles();
      })
      .catch((err) => {
        if (isDriveUploadAbortError(err)) {
          return;
        }
        triggerToast(err.message || "Failed to delete selected items", "err");
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

    Promise.all(restorePromises)
      .then(() => {
        triggerToast(
          `Successfully restored ${selectedCount} items`,
          "success",
        );
        setSelectedFileIds([]);
        loadFiles();
      })
      .catch((err) => {
        if (isDriveUploadAbortError(err)) {
          return;
        }
        triggerToast(err.message || "Failed to restore selected items", "err");
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

    Promise.all(starPromises)
      .then(() => {
        triggerToast(
          holdsUnstarred
            ? `Successfully starred ${selectedCount} items`
            : `Removed star from ${selectedCount} items`,
          "info",
        );
        setSelectedFileIds([]);
        loadFiles();
      })
      .catch((err) => {
        if (isDriveUploadAbortError(err)) {
          return;
        }
        triggerToast(err.message || "Failed to update star state", "err");
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
        setDownloadJobs((prev) =>
          prev.map((job) =>
            job.id === newJob.id
              ? applyDownloadGrantToJob(job, downloadPackage)
              : job,
          ),
        );
        if (downloadPackage.downloadUrl) {
          void onOpenDownload?.(downloadPackage.downloadUrl);
        }
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
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
    if (selectedFiles.length === 0) return;
    if (!canUploadDriveFileToSection(activeSection)) {
      triggerToast("This Drive view does not support uploads.", "err");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const uploadJobs = selectedFiles.map((file) => ({
      file,
      job: createUploadJobForFile(file),
    }));
    let completedUploadCount = 0;

    setDownloadJobs((prev) => [
      ...uploadJobs.map(({ job }) => job),
      ...prev,
    ]);
    triggerToast(
      selectedFiles.length === 1
        ? t("fileBrowser.toastFileAdded", { name: selectedFiles[0].name })
        : `Added ${selectedFiles.length} files to active upload transfers`,
      "info",
    );

    const uploadTasks = uploadJobs.map(({ file, job: newUploadJob }) => {
      const uploadController = createUploadAbortController(newUploadJob.id);
      return fileService.uploadFile(file, activeSection, currentFolderId, {
          signal: uploadController.signal,
        })
        .then((uploadedFile) => {
          completedUploadCount += 1;
          setDownloadJobs((prev) =>
            prev.map((job) =>
              job.id === newUploadJob.id
                ? applyUploadCompletionToJob(job, uploadedFile)
                : job,
            ),
          );
        })
        .catch((err) => {
          if (isDriveUploadAbortError(err)) {
            return;
          }

          setDownloadJobs((prev) =>
            prev.map((job) =>
              job.id === newUploadJob.id
                ? applyTransferFailure(job, err?.message || t("fileBrowser.toastUploadFailed"))
                : job,
            ),
          );
          triggerToast(
            err?.message || t("fileBrowser.toastUploadFailed"),
            "err",
          );
        })
        .finally(() => {
          releaseUploadAbortController(newUploadJob.id);
        });
    });

    Promise.allSettled(uploadTasks)
      .then(() => {
        if (completedUploadCount > 0) {
          loadFiles();
        }
      })
      .finally(() => {
        if (fileInputRef.current) fileInputRef.current.value = "";
      });
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
    fileService.listFiles(activeSection, searchQuery, currentFolderId, {
      signal: loadAbortController.signal,
    })
      .then((data) => {
        if (!latestLoadGuardRef.current.isCurrent(requestId)) {
          return;
        }
        setFiles(data);
        setVisibleCount(15); // Reset visibleCount on fetch reload
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

    // Load full cached map for Breadcrumb recursive walking
    fileService.getAllWorkspaceFiles({
      signal: loadAbortController.signal,
    })
      .then((data) => {
        if (!latestLoadGuardRef.current.isCurrent(requestId)) {
          return;
        }
        setAllWorkspaceFiles(data);
      })
      .catch((err: any) => {
        if (isDriveUploadAbortError(err)) {
          return;
        }
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

  useEffect(() => {
    latestLoadGuardRef.current.setCurrentScope(currentLoadScope);
    loadFiles();
    return () => {
      loadAbortControllerRef.current?.abort();
      loadAbortControllerRef.current = null;
    };
  }, [activeSection, searchQuery, currentFolderId, currentLoadScope]);

  // Intersection Observer for infinite scrolling
  useEffect(() => {
    if (!pageDetectorRef || visibleCount >= sortedFiles.length) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isPaging) {
          setIsPaging(true);
          setVisibleCount((prev) => Math.min(sortedFiles.length, prev + 15));
          setIsPaging(false);
        }
      },
      {
        rootMargin: "100px", // trigger load early for seamless 60FPS fluid scroll
      },
    );

    observer.observe(pageDetectorRef);
    return () => observer.disconnect();
  }, [pageDetectorRef, visibleCount, sortedFiles.length, isPaging]);

  // Close context menu dropdowns on outer clicks
  useEffect(() => {
    const handleGlobalClick = () => setActiveMenuId(null);
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);

  // Format bytes helper
  const formatSize = (bytes?: number) => {
    if (!bytes) return "--";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1024 * 1024 * 1024)
      return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
  };

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
        const customSpace = fileService.getSharedSpaces().find((s) => s.id === sec);
        if (customSpace) return customSpace.name;
        return getSectionTitle(sec) || sec;
      }
    }
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

  // Trigger New Folder Creation
  const handleCreateFolderSubmit = (folderName: string) => {
    if (!canCreateDriveFolderInSection(activeSection)) {
      triggerToast("This Drive view does not support folder creation.", "err");
      return;
    }

    const createFolderController = createFileWriteAbortController("create-folder");
    fileService.createFolder(folderName, activeSection, currentFolderId, {
        signal: createFolderController.signal,
      })
      .then((folder) => {
        triggerToast(
          t("fileBrowser.toastCreatedFolder", { name: folder.name }),
        );
        setIsNewFolderOpen(false);
        loadFiles();
      })
      .catch((err) => {
        if (isDriveUploadAbortError(err)) {
          return;
        }
        triggerToast(err.message, "err");
      })
      .finally(() => {
        releaseFileWriteAbortController("create-folder", createFolderController);
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
    const createFolderController = createFileWriteAbortController("create-folder");
    fileService.createFolder(trimmed, activeSection, currentFolderId, {
        signal: createFolderController.signal,
      })
      .then((folder) => {
        triggerToast(
          t("fileBrowser.toastCreatedFolder", { name: folder.name }),
        );
        setInlineFolderName("");
        loadFiles();
      })
      .catch((err) => {
        if (isDriveUploadAbortError(err)) {
          return;
        }
        triggerToast(err.message, "err");
      })
      .finally(() => {
        releaseFileWriteAbortController("create-folder", createFolderController);
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
            const createFolderController = createFileWriteAbortController("create-folder");
            fileService.createFolder(trimmed, activeSection, currentFolderId, {
                signal: createFolderController.signal,
              })
              .then((folder) => {
                triggerToast(
                  t("fileBrowser.toastCreatedFolder", { name: folder.name }),
                );
                setInlineFolderName("");
                loadFiles();
              })
              .catch((err) => {
                if (isDriveUploadAbortError(err)) {
                  return;
                }
                triggerToast(err.message || "Error occurred", "err");
              })
              .finally(() => {
                releaseFileWriteAbortController("create-folder", createFolderController);
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
        const downloadPackage = download as Awaited<ReturnType<DriveFileService["createDownloadPackage"]>>;
        setDownloadJobs((prev) =>
          prev.map((job) =>
            job.id === newJob.id
              ? applyDownloadGrantToJob(job, downloadPackage)
              : job,
          ),
        );
        if (downloadPackage.downloadUrl) {
          void onOpenDownload?.(downloadPackage.downloadUrl);
        }
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
    <div className="flex-1 bg-white dark:bg-[#151515] flex flex-col h-full overflow-hidden transition-colors relative">
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

      {/* Unified Toolbar Panel Header */}
      <div className="h-20 border-b border-[#f0f0f0] dark:border-[#222] flex items-center justify-between px-6 shrink-0 bg-white dark:bg-[#151515] transition-colors select-none">
        {/* Left pane: Breadcrumbs and details */}
        <div className="flex items-center gap-3.5">
          <Breadcrumbs
            currentFolderId={currentFolderId}
            allFiles={breadcrumbFiles}
            sectionTitle={getSectionLocalizedTitle(activeSection)}
            onNavigate={(id) => setCurrentFolderId(id)}
          />
          {!loading && !errorState && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-gray-400 transition-all">
              {files.length}{" "}
              {files.length === 1
                ? t("fileBrowser.itemsSingular")
                : t("fileBrowser.itemsPlural")}
            </span>
          )}
        </div>

        {/* Center pane: Search bar */}
        <div className="relative w-[340px] xl:w-[420px] mx-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              t("fileBrowser.searchPlaceholder") +
              " " +
              getSectionLocalizedTitle(activeSection) +
              "..."
            }
            className="w-full bg-[#f4f4f4] dark:bg-[#222] border border-transparent dark:border-[#2a2a2a] rounded-lg py-2 pl-[42px] pr-8 text-[13px] text-gray-800 dark:text-gray-200 focus:bg-white dark:focus:bg-[#1a1a1a] focus:border-blue-500 dark:focus:border-blue-500 focus:shadow-[0_0_0_4px_rgba(59,130,246,0.08)] outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-650"
          />
          <Search
            className="absolute left-[14px] top-[9px] text-[#999] dark:text-[#666]"
            size={17}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Right pane: Mode items & actions */}
        <div className="flex items-center gap-2.5">
          {canCreateFolderInActiveSection && (
            <button
              onClick={() => {
                setIsCreatingFolderInline(true);
                setInlineFolderName("");
              }}
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-[#282828] rounded-lg transition-transform hover:scale-105 cursor-pointer mr-1"
              title={t("fileBrowser.createFolder")}
            >
              <FolderPlus size={19} />
            </button>
          )}

          {/* Sort Dropdown Selector */}
          <div className="relative flex items-center pr-1.5 border-r border-[#e8e8e8] dark:border-[#222] mr-1">
            <span className="text-[11px] font-bold text-gray-400 mr-2 uppercase tracking-wide">
              {t("fileBrowser.sortBy")}:
            </span>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split("-") as [any, any];
                setSortBy(field);
                setSortOrder(order);
              }}
              className="bg-[#f4f4f4] dark:bg-[#222] text-gray-700 dark:text-gray-300 border border-transparent rounded-lg py-1.5 px-3 pr-7 text-xs font-semibold focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer hover:bg-gray-200 dark:hover:bg-[#2e2e2e] transition-all appearance-none"
              title={t("fileBrowser.sortBy")}
            >
              <option value="name-asc">
                {t("fileBrowser.sortByName")} (A-Z)
              </option>
              <option value="name-desc">
                {t("fileBrowser.sortByName")} (Z-A)
              </option>
              <option value="lastModified-desc">
                {t("fileBrowser.sortByModified")} (Newest)
              </option>
              <option value="lastModified-asc">
                {t("fileBrowser.sortByModified")} (Oldest)
              </option>
              <option value="size-desc">
                {t("fileBrowser.sortBySize")} (Largest)
              </option>
              <option value="size-asc">
                {t("fileBrowser.sortBySize")} (Smallest)
              </option>
              <option value="owner-asc">
                {t("fileBrowser.sortByOwner")} (A-Z)
              </option>
              <option value="owner-desc">
                {t("fileBrowser.sortByOwner")} (Z-A)
              </option>
            </select>
            <div className="pointer-events-none absolute right-3 text-gray-400">
              <ArrowUpDown size={10} />
            </div>
          </div>

          {/* Grid vs List View Mode Switches */}
          <div className="flex items-center p-1 bg-[#f4f4f4] dark:bg-[#222] rounded-lg text-gray-500 dark:text-gray-400">
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${viewMode === "list" ? "bg-white dark:bg-[#2d2d2d] shadow-sm text-blue-600 dark:text-blue-400" : "hover:text-gray-900 dark:hover:text-gray-205"}`}
              title="List layout"
            >
              <LayoutList size={16} />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${viewMode === "grid" ? "bg-white dark:bg-[#2d2d2d] shadow-sm text-blue-600 dark:text-blue-400" : "hover:text-gray-900 dark:hover:text-gray-205"}`}
              title="Grid layout"
            >
              <Grid size={16} />
            </button>
          </div>

          {canUploadToActiveSection && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="ml-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-semibold tracking-wide shadow-sm cursor-pointer hover:shadow hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5"
            >
              <Plus size={14} className="stroke-[3]" /> {t("sidebar.upload")}
            </button>
          )}
        </div>
      </div>

      {/* Main Files Work Area */}
      <div className="flex-1 overflow-hidden flex flex-col w-full relative">
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
            {/* Table layout titles header */}
            {viewMode === "list" &&
              (files.length > 0 || isCreatingFolderInline) && (
                <div className="grid grid-cols-[40px_1.8fr_1fr_1.2fr_0.8fr_0.1fr] px-2 sm:px-4 py-2 border-b border-[#f3f3f3] dark:border-[#1e1e1e] text-[11px] uppercase tracking-wider text-gray-400 dark:text-[#666] font-semibold bg-[#fafafa] dark:bg-[#121212] select-none transition-colors items-center">
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={
                        sortedFiles.length > 0 &&
                        selectedFileIds.length === sortedFiles.length
                      }
                      onChange={handleSelectAllToggle}
                      className="w-4 h-4 rounded border-gray-300 dark:border-neutral-700 text-blue-600 bg-white dark:bg-neutral-900 cursor-pointer focus:ring-0"
                    />
                  </div>
                  <div
                    className="cursor-pointer group flex items-center gap-1 hover:text-gray-700 dark:hover:text-neutral-300"
                    onClick={() => handleSort("name")}
                  >
                    <span>{t("fileBrowser.name")}</span>
                    {renderSortIndicator("name")}
                  </div>
                  <div
                    className="cursor-pointer group flex items-center gap-1 hover:text-gray-700 dark:hover:text-neutral-300"
                    onClick={() => handleSort("owner")}
                  >
                    <span>{t("fileBrowser.owner")}</span>
                    {renderSortIndicator("owner")}
                  </div>
                  <div
                    className="cursor-pointer group flex items-center gap-1 hover:text-gray-700 dark:hover:text-neutral-300"
                    onClick={() => handleSort("lastModified")}
                  >
                    <span>{t("fileBrowser.lastModified")}</span>
                    {renderSortIndicator("lastModified")}
                  </div>
                  <div
                    className="cursor-pointer group flex items-center justify-end gap-1 hover:text-gray-700 dark:hover:text-neutral-300 text-right pr-1"
                    onClick={() => handleSort("size")}
                  >
                    <span>{t("fileBrowser.fileSize")}</span>
                    {renderSortIndicator("size")}
                  </div>
                  <div></div>
                </div>
              )}

            {/* Scroller Pane */}
            <div
              className={`flex-1 overflow-y-auto ${viewMode === "grid" ? "px-4 py-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 content-start" : "px-0 py-1 flex flex-col gap-0.5"}`}
            >
              {isCreatingFolderInline &&
                (viewMode === "list" ? (
                  <div className="grid grid-cols-[40px_1.8fr_1fr_1.2fr_0.8fr_0.1fr] items-center py-2 border-b border-blue-200/40 dark:border-blue-800/40 bg-blue-500/[0.04] dark:bg-blue-500/[0.04] px-2 sm:px-4 rounded-lg mb-1.5 select-none inline-folder-container">
                    <div className="flex items-center justify-center">
                      <div className="w-4 h-4 rounded border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900 opacity-40" />
                    </div>

                    <div className="flex items-center gap-3 ml-1 min-w-0 pr-4">
                      <FolderOpen
                        size={18}
                        className="text-blue-500 fill-blue-500/10 shrink-0"
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
                        className="bg-white dark:bg-[#18181b] border border-blue-500 dark:border-blue-400 rounded px-2.5 py-1 text-xs text-neutral-850 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-blue-500/20 w-48 font-medium"
                      />
                    </div>

                    <div className="text-xs text-gray-400 dark:text-neutral-500 font-medium ml-1">
                      {t("fileBrowser.me") || "Me"}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-neutral-500 font-mono">
                      {t("fileBrowser.justNow") || "Just now"}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-neutral-500 font-mono text-right pr-2">
                      --
                    </div>
                    <div className="flex items-center justify-end gap-1.5 pr-2">
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={handleInlineFolderConfirm}
                        className="p-1 hover:bg-emerald-500/15 text-emerald-500 rounded transition-colors cursor-pointer inline-folder-btn"
                        title={t("fileBrowser.create") || "Create"}
                      >
                        <CheckCircle2 size={15} />
                      </button>
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={handleInlineFolderCancel}
                        className="p-1 hover:bg-rose-500/15 text-rose-500 rounded transition-colors cursor-pointer inline-folder-btn"
                        title={t("fileBrowser.cancel") || "Cancel"}
                      >
                        <X size={15} />
                      </button>
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

              {sortedFiles.slice(0, visibleCount).map((file) => {
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
                      onPreview={setSelectedPreviewFile}
                      onRename={handleRenameClick}
                      onTrashAction={handleTrashAction}
                      onPermanentDelete={handlePermanentDelete}
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
                      onPreview={setSelectedPreviewFile}
                      onRename={handleRenameClick}
                      onTrashAction={handleTrashAction}
                      onPermanentDelete={handlePermanentDelete}
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
                  {visibleCount < sortedFiles.length ? (
                    <div className="flex flex-col items-center gap-2.5 text-gray-400 dark:text-neutral-500 text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full border-2 border-blue-500/30 border-t-blue-600 animate-spin" />
                        <span className="font-medium tracking-wide">
                          {t("fileBrowser.loadingMore")}
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          setVisibleCount((prev) =>
                            Math.min(sortedFiles.length, prev + 15),
                          )
                        }
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
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-2 px-4.5 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/25 rounded-lg transition-all cursor-pointer"
                      >
                        {t("sidebar.upload")}
                      </button>
                    )}
                </div>
              )}
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
        <div className="fixed bottom-26 left-1/2 -translate-x-1/2 z-40 bg-[#131315]/95 dark:bg-[#131315]/95 border border-neutral-800 text-white shadow-2xl rounded-2xl py-3.5 px-6 flex items-center gap-6 animate-in slide-in-from-bottom-8 fade-in duration-300 backdrop-blur-md">
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
      <DownloadManager
        jobs={downloadJobs}
        onOpenDownload={onOpenDownload}
        onClearJobs={() =>
          setDownloadJobs((prev) =>
            prev.filter((job) => !isCompletedTransferStatus(job.status)),
          )
        }
        onCancelJob={onCancelJob}
        onRetryJob={handleRetryDownloadJob}
      />
    </div>
  );
}
