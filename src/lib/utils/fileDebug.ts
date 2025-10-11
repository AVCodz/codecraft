/**
 * FILE DEBUG UTILITIES - Diagnostic tools for troubleshooting file-related issues
 * 
 * Purpose: Debug file state, content loading, and sync issues across stores
 * Used by: Developer tools, troubleshooting file preview/loading problems
 * Key Features: File state inspection, content verification, store comparison, console helpers
 */

import { useProjectStore } from '@/lib/stores/projectStore';
import { useFilesStore } from '@/lib/stores/filesStore';
import { findFileNode } from './fileSystem';

/**
 * Debug file state across all stores
 */
export function debugFileState(projectId: string, filePath?: string) {
  const projectStore = useProjectStore.getState();
  const filesStore = useFilesStore.getState();

  console.group(`[FileDebug] 🔍 File State Analysis ${filePath ? `for ${filePath}` : ''}`);

  // Project Store State
  console.group('📁 Project Store');
  console.log('Current Project:', projectStore.currentProject?.$id);
  console.log('Selected File:', projectStore.selectedFile);
  console.log('Open Files:', projectStore.openFiles);
  console.log('Files in Tree:', projectStore.files.length);
  
  if (filePath) {
    const fileInTree = findFileNode(projectStore.files, filePath);
    console.log(`File "${filePath}" in tree:`, fileInTree ? {
      path: fileInTree.path,
      type: fileInTree.type,
      hasContent: !!fileInTree.content,
      contentLength: fileInTree.content?.length || 0
    } : 'NOT FOUND');
  }
  console.groupEnd();

  // Files Store State
  console.group('📂 Files Store');
  const rawFiles = filesStore.filesByProject[projectId] || [];
  const fileTree = filesStore.fileTreeByProject[projectId] || [];
  
  console.log('Raw Files:', rawFiles.length);
  console.log('File Tree Nodes:', fileTree.length);
  console.log('Is Loading:', filesStore.isLoading);
  console.log('Is Syncing:', filesStore.isSyncing);
  console.log('Error:', filesStore.error);

  if (filePath) {
    const rawFile = rawFiles.find(f => f.path === filePath);
    console.log(`Raw file "${filePath}":`, rawFile ? {
      path: rawFile.path,
      type: rawFile.type,
      hasContent: !!rawFile.content,
      contentLength: rawFile.content?.length || 0,
      updatedAt: rawFile.updatedAt
    } : 'NOT FOUND');

    const treeFile = findFileNode(fileTree, filePath);
    console.log(`Tree file "${filePath}":`, treeFile ? {
      path: treeFile.path,
      type: treeFile.type,
      hasContent: !!treeFile.content,
      contentLength: treeFile.content?.length || 0
    } : 'NOT FOUND');
  }
  console.groupEnd();

  // Sync Status
  console.group('🔄 Sync Status');
  const syncMeta = filesStore.syncMetadata;
  console.log('Sync Metadata Entries:', syncMeta.size);
  
  if (filePath) {
    const rawFile = rawFiles.find(f => f.path === filePath);
    if (rawFile) {
      const meta = syncMeta.get(rawFile.$id);
      console.log(`Sync status for "${filePath}":`, meta);
    }
  }
  console.groupEnd();

  console.groupEnd();
}

/**
 * Debug file content loading issues
 */
export function debugFileContent(projectId: string, filePath: string) {
  console.group(`[FileDebug] 📄 Content Analysis for ${filePath}`);

  const projectStore = useProjectStore.getState();
  const filesStore = useFilesStore.getState();

  // Check all possible sources of file content
  const sources = {
    projectStoreTree: findFileNode(projectStore.files, filePath),
    filesStoreRaw: filesStore.filesByProject[projectId]?.find(f => f.path === filePath),
    filesStoreTree: findFileNode(filesStore.fileTreeByProject[projectId] || [], filePath)
  };

  Object.entries(sources).forEach(([source, file]) => {
    console.log(`${source}:`, file ? {
      exists: true,
      hasContent: !!file.content,
      contentLength: file.content?.length || 0,
      contentPreview: file.content?.substring(0, 100) + (file.content && file.content.length > 100 ? '...' : ''),
      type: file.type,
      language: file.language
    } : { exists: false });
  });

  // Recommendations
  console.group('💡 Recommendations');
  if (!sources.projectStoreTree) {
    console.warn('❌ File not found in project store tree - check file tree synchronization');
  } else if (!sources.projectStoreTree.content && sources.filesStoreRaw?.content) {
    console.warn('⚠️ File exists but content missing in project store - tree building issue');
  } else if (!sources.filesStoreRaw) {
    console.warn('❌ File not found in files store - check Appwrite sync');
  } else if (!sources.filesStoreRaw.content) {
    console.warn('❌ File exists but has no content - check Appwrite data');
  }
  console.groupEnd();

  console.groupEnd();
}

/**
 * Force file content refresh
 */
export async function forceFileRefresh(projectId: string, filePath: string) {
  console.log(`[FileDebug] 🔄 Forcing refresh for ${filePath}`);
  
  const filesStore = useFilesStore.getState();
  const projectStore = useProjectStore.getState();

  try {
    // Force sync with Appwrite
    await filesStore.syncWithAppwrite(projectId);
    
    // Refresh project files
    await projectStore.refreshFiles(projectId);
    
    console.log(`[FileDebug] ✅ Refresh completed for ${filePath}`);
    
    // Debug the result
    debugFileContent(projectId, filePath);
  } catch (error) {
    console.error(`[FileDebug] ❌ Refresh failed for ${filePath}:`, error);
  }
}

/**
 * Validate file tree consistency
 */
export function validateFileTreeConsistency(projectId: string) {
  console.group('[FileDebug] 🔍 File Tree Consistency Check');
  
  const filesStore = useFilesStore.getState();
  const projectStore = useProjectStore.getState();
  
  const rawFiles = filesStore.filesByProject[projectId] || [];
  const treeFiles = projectStore.files;
  
  console.log(`Raw files: ${rawFiles.length}, Tree files: ${treeFiles.length}`);
  
  // Check for missing files in tree
  const missingInTree = rawFiles.filter(rawFile => 
    !findFileNode(treeFiles, rawFile.path)
  );
  
  if (missingInTree.length > 0) {
    console.warn('❌ Files missing in project tree:', missingInTree.map(f => f.path));
  }
  
  // Check for files with missing content
  const missingContent = rawFiles.filter(rawFile => {
    const treeFile = findFileNode(treeFiles, rawFile.path);
    return rawFile.content && treeFile && !treeFile.content;
  });
  
  if (missingContent.length > 0) {
    console.warn('⚠️ Files with missing content in tree:', missingContent.map(f => f.path));
  }
  
  if (missingInTree.length === 0 && missingContent.length === 0) {
    console.log('✅ File tree consistency check passed');
  }
  
  console.groupEnd();
}

// Global debug functions for browser console
if (typeof window !== 'undefined') {
  (window as any).debugFileState = debugFileState;
  (window as any).debugFileContent = debugFileContent;
  (window as any).forceFileRefresh = forceFileRefresh;
  (window as any).validateFileTreeConsistency = validateFileTreeConsistency;
}
