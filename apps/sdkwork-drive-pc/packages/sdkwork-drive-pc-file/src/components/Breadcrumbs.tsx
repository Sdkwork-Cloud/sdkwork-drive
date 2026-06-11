import React from 'react';
import { ChevronRight, Home, Folder, HardDrive } from 'lucide-react';
import type { DriveFile } from 'sdkwork-drive-pc-types';

interface BreadcrumbsProps {
  currentFolderId: string | null;
  allFiles: DriveFile[];
  sectionTitle: string;
  onNavigate: (folderId: string | null) => void;
}

export function Breadcrumbs({ 
  currentFolderId, 
  allFiles, 
  sectionTitle, 
  onNavigate 
}: BreadcrumbsProps) {
  
  // Backwards resolve the path trail recursively
  const getPathTrail = () => {
    const trail: { id: string; name: string }[] = [];
    if (!currentFolderId) return trail;

    let searchId: string | undefined = currentFolderId;
    let safeguard = 0; // Prevent infinite loops
    
    while (searchId && safeguard < 20) {
      const folder = allFiles.find(f => f.id === searchId && f.type === 'folder');
      if (folder) {
        trail.unshift({ id: folder.id, name: folder.name });
        searchId = folder.parentId;
      } else {
        break;
      }
      safeguard++;
    }
    
    return trail;
  };

  const trail = getPathTrail();

  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-medium py-1 px-3 bg-gray-50/50 dark:bg-[#1a1a1a]/30 border border-gray-100 dark:border-neutral-800/40 rounded-xl select-none w-fit transition-all max-w-full overflow-x-auto whitespace-nowrap scrollbar-none">
      
      {/* Root Section node link */}
      <button
        onClick={() => onNavigate(null)}
        className="flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors uppercase tracking-wider font-bold text-[10.5px] cursor-pointer"
      >
        <HardDrive size={13} className="text-gray-400 shrink-0" />
        <span>{sectionTitle}</span>
      </button>

      {/* Trailing folder node links */}
      {trail.map((folder, index) => {
        const isLastItem = index === trail.length - 1;
        
        return (
          <React.Fragment key={folder.id}>
            <ChevronRight size={12} className="text-gray-300 dark:text-neutral-700 shrink-0" />
            <button
              onClick={() => onNavigate(folder.id)}
              disabled={isLastItem}
              className={`flex items-center gap-1 transition-colors cursor-pointer ${
                isLastItem 
                  ? 'text-gray-900 dark:text-white font-bold text-[12.5px]' 
                  : 'hover:text-blue-600 dark:hover:text-blue-400 font-medium'
              }`}
            >
              {index < trail.length - 1 && <Folder size={12} className="text-amber-500 fill-amber-500 shrink-0" />}
              <span>{folder.name}</span>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}
