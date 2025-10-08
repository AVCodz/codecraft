'use client';

import { useState } from 'react';
import { FileTreeNode } from './FileTreeNode';
import { useProjectStore } from '@/lib/stores/projectStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { 
  Plus, 
  FolderPlus, 
  Search, 
  ChevronDown, 
  ChevronRight 
} from 'lucide-react';
import { cn } from '@/lib/utils/helpers';

interface FileTreeProps {
  className?: string;
}

export function FileTree({ className }: FileTreeProps) {
  const { files, createFile, selectedFile } = useProjectStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState<'file' | 'folder' | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['/']));

  // Filter files based on search query
  const filteredFiles = files.filter(file => 
    file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateItem = (type: 'file' | 'folder') => {
    setIsCreating(type);
    setNewItemName('');
  };

  const handleConfirmCreate = () => {
    if (!newItemName.trim() || !isCreating) return;

    const path = `/${newItemName.trim()}`;
    createFile(path, isCreating, isCreating === 'file' ? '' : undefined);
    
    setIsCreating(null);
    setNewItemName('');
  };

  const handleCancelCreate = () => {
    setIsCreating(null);
    setNewItemName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirmCreate();
    } else if (e.key === 'Escape') {
      handleCancelCreate();
    }
  };

  const toggleFolder = (path: string) => {
    console.log('[FileTree] 🔽 Toggling folder:', path);
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
      console.log('[FileTree] ➖ Collapsed:', path);
    } else {
      newExpanded.add(path);
      console.log('[FileTree] ➕ Expanded:', path);
    }
    setExpandedFolders(newExpanded);
  };

  return (
    <div className={cn('flex flex-col h-full bg-background border-r border-border', className)}>
      {/* Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Files</h3>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => handleCreateItem('file')}
              className="h-6 w-6"
              title="New File"
            >
              <Plus className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => handleCreateItem('folder')}
              className="h-6 w-6"
              title="New Folder"
            >
              <FolderPlus className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 h-7 text-xs"
          />
        </div>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* New item input */}
        {isCreating && (
          <div className="mb-2 pl-4">
            <div className="flex items-center gap-1">
              {isCreating === 'folder' ? (
                <FolderPlus className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Plus className="h-4 w-4 text-muted-foreground" />
              )}
              <Input
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleCancelCreate}
                placeholder={`New ${isCreating}...`}
                className="h-6 text-xs"
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Files */}
        {filteredFiles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-4xl mb-2">📁</div>
            <p className="text-sm">No files yet</p>
            <p className="text-xs">Create your first file to get started</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredFiles.map((file) => (
              <FileTreeNode
                key={file.id}
                file={file}
                isSelected={file.path === selectedFile}
                isExpanded={expandedFolders.has(file.path)}
                onToggle={() => toggleFolder(file.path)}
                level={0}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-border text-xs text-muted-foreground">
        {files.length} {files.length === 1 ? 'item' : 'items'}
      </div>
    </div>
  );
}
