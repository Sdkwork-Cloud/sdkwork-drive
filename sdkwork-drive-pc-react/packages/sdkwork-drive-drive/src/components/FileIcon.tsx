import type { ComponentType } from 'react';
import {
  Archive,
  File,
  FileCode2,
  FileSpreadsheet,
  FileText,
  FolderClosed,
  ImageIcon,
  Music4,
  Presentation,
  Video,
} from 'lucide-react';
import type { DriveItem } from '../entities/drive.entity.ts';

function resolveIcon(item: DriveItem): ComponentType<{ className?: string }> {
  if (item.type === 'folder') {
    return FolderClosed;
  }

  const name = item.name.toLowerCase();
  const mimeType = (item.mimeType || '').toLowerCase();

  if (mimeType.startsWith('image/') || /\.(png|jpg|jpeg|gif|svg|webp|bmp|ico)$/.test(name)) {
    return ImageIcon;
  }
  if (mimeType.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm)$/.test(name)) {
    return Video;
  }
  if (mimeType.startsWith('audio/') || /\.(mp3|wav|ogg|flac|m4a|aac)$/.test(name)) {
    return Music4;
  }
  if (/\.(xls|xlsx|csv|tsv|ods)$/.test(name)) {
    return FileSpreadsheet;
  }
  if (/\.(ppt|pptx|odp)$/.test(name)) {
    return Presentation;
  }
  if (mimeType.includes('pdf') || /\.(pdf|doc|docx|txt|md|rtf|odt)$/.test(name)) {
    return FileText;
  }
  if (mimeType.includes('zip') || /\.(zip|tar|gz|rar|7z)$/.test(name)) {
    return Archive;
  }
  if (/\.(ts|tsx|js|jsx|json|html|css|py|rs|go|java|c|cpp|h|xml|yaml|yml)$/.test(name)) {
    return FileCode2;
  }

  return File;
}

export interface FileIconProps {
  item: DriveItem;
  className?: string;
}

export function FileIcon({ item, className }: FileIconProps) {
  const Icon = resolveIcon(item);
  return <Icon className={className} />;
}
