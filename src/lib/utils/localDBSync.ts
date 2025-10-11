/**
 * LOCALDB SYNC UTILITIES - Ensures LocalDB and UI stores stay synchronized
 * 
 * Purpose: Force sync between LocalDB cache and Zustand stores for instant UI updates
 * Used by: Editor initialization, file operations, sync verification
 * Key Features: Two-way sync, file loading verification, store refresh, diagnostic logging
 */

import { useFilesStore } from '@/lib/stores/filesStore';
import { useProjectStore } from '@/lib/stores/projectStore';
import { localDB } from '@/lib/localdb';
import { ProjectFile } from '@/lib/types';
import { buildFileTree } from './fileSystem';

/**
 * Force sync LocalDB files to UI stores
 * This ensures UI shows the latest LocalDB data immediately
 */
export async function syncLocalDBToUI(projectId: string) {
  console.log(`[LocalDBSync] 🔄 Syncing LocalDB to UI for project: ${projectId}`);
  
  try {
    // Get files from LocalDB
    const allFiles = localDB.getAll<ProjectFile>("codeCraft_files");
    const projectFiles = allFiles.filter(f => f.projectId === projectId);
    
    console.log(`[LocalDBSync] 📂 Found ${projectFiles.length} files in LocalDB`);
    
    if (projectFiles.length === 0) {
      console.log(`[LocalDBSync] ⚠️ No files found in LocalDB for project: ${projectId}`);
      return;
    }
    
    // Update files store
    const filesStore = useFilesStore.getState();
    filesStore.setFiles(projectId, projectFiles);
    
    // Build and set file tree
    const fileTree = buildFileTree(projectFiles as any);
    filesStore.setFileTree(projectId, fileTree);
    
    // Update project store
    const projectStore = useProjectStore.getState();
    projectStore.setFiles(fileTree);
    
    console.log(`[LocalDBSync] ✅ UI synced with LocalDB - ${projectFiles.length} files, ${fileTree.length} root nodes`);
    
    // Validate file content in the tree
    const filesWithContent = projectFiles.filter(f => f.content && f.content.length > 0);
    console.log(`[LocalDBSync] 📄 Files with content in raw data: ${filesWithContent.length}/${projectFiles.length}`);
    
    // Count files with content in the tree (recursively)
    const countTreeContent = (nodes: any[]): { total: number; withContent: number } => {
      let total = 0;
      let withContent = 0;
      for (const node of nodes) {
        if (node.type === 'file') {
          total++;
          if (node.content && node.content.length > 0) {
            withContent++;
          }
        }
        if (node.children) {
          const childCounts = countTreeContent(node.children);
          total += childCounts.total;
          withContent += childCounts.withContent;
        }
      }
      return { total, withContent };
    };
    
    const treeCounts = countTreeContent(fileTree);
    console.log(`[LocalDBSync] 📄 Files with content in tree: ${treeCounts.withContent}/${treeCounts.total}`);
    
    if (treeCounts.withContent < filesWithContent.length) {
      console.error(
        `[LocalDBSync] ❌ Content loss during tree building! Raw: ${filesWithContent.length}, Tree: ${treeCounts.withContent}`
      );
    }
    
  } catch (error) {
    console.error(`[LocalDBSync] ❌ Failed to sync LocalDB to UI:`, error);
  }
}

/**
 * Validate LocalDB and UI state consistency
 */
export function validateLocalDBSync(projectId: string) {
  console.group(`[LocalDBSync] 🔍 Validating sync for project: ${projectId}`);
  
  try {
    // Get data from all sources
    const localDBFiles = localDB.getAll<ProjectFile>("codeCraft_files")
      .filter(f => f.projectId === projectId);
    
    const filesStoreFiles = useFilesStore.getState().filesByProject[projectId] || [];
    const projectStoreFiles = useProjectStore.getState().files;
    
    console.log('LocalDB files:', localDBFiles.length);
    console.log('FilesStore files:', filesStoreFiles.length);
    console.log('ProjectStore files:', projectStoreFiles.length);
    
    // Check for inconsistencies
    const issues = [];
    
    if (localDBFiles.length !== filesStoreFiles.length) {
      issues.push(`File count mismatch: LocalDB(${localDBFiles.length}) vs FilesStore(${filesStoreFiles.length})`);
    }
    
    // Check for missing files in FilesStore
    const missingInFilesStore = localDBFiles.filter(localFile => 
      !filesStoreFiles.find(storeFile => storeFile.$id === localFile.$id)
    );
    
    if (missingInFilesStore.length > 0) {
      issues.push(`${missingInFilesStore.length} files missing in FilesStore: ${missingInFilesStore.map(f => f.path).join(', ')}`);
    }
    
    // Check for content mismatches
    const contentMismatches = localDBFiles.filter(localFile => {
      const storeFile = filesStoreFiles.find(f => f.$id === localFile.$id);
      return storeFile && localFile.content !== storeFile.content;
    });
    
    if (contentMismatches.length > 0) {
      issues.push(`${contentMismatches.length} files have content mismatches`);
    }
    
    if (issues.length === 0) {
      console.log('✅ LocalDB and UI are in sync');
    } else {
      console.warn('⚠️ Sync issues found:');
      issues.forEach(issue => console.warn(`  - ${issue}`));
    }
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
  }
  
  console.groupEnd();
}

/**
 * Force refresh from LocalDB when UI seems out of sync
 */
export async function forceLocalDBRefresh(projectId: string) {
  console.log(`[LocalDBSync] 🔄 Force refreshing from LocalDB: ${projectId}`);
  
  try {
    // Clear current UI state
    const filesStore = useFilesStore.getState();
    const projectStore = useProjectStore.getState();
    
    // Reset stores
    filesStore.setFiles(projectId, []);
    filesStore.setFileTree(projectId, []);
    projectStore.setFiles([]);
    
    // Wait a tick for state to clear
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Reload from LocalDB
    await syncLocalDBToUI(projectId);
    
    console.log(`[LocalDBSync] ✅ Force refresh completed`);
    
  } catch (error) {
    console.error(`[LocalDBSync] ❌ Force refresh failed:`, error);
  }
}

/**
 * Ensure file content is available in UI
 */
export function ensureFileContentInUI(projectId: string, filePath: string): boolean {
  const projectStore = useProjectStore.getState();
  const filesStore = useFilesStore.getState();
  
  // Check if file exists in project store with content
  const projectFile = projectStore.files.find(f => f.path === filePath);
  if (projectFile && projectFile.content) {
    return true;
  }
  
  // Check if file exists in files store with content
  const filesStoreFiles = filesStore.filesByProject[projectId] || [];
  const filesStoreFile = filesStoreFiles.find(f => f.path === filePath);
  if (filesStoreFile && filesStoreFile.content) {
    // File has content in files store but not in project store
    // This indicates a sync issue - trigger a refresh
    console.warn(`[LocalDBSync] ⚠️ File content missing in project store, triggering sync: ${filePath}`);
    syncLocalDBToUI(projectId);
    return true;
  }
  
  // Check LocalDB as last resort
  const localDBFiles = localDB.getAll<ProjectFile>("codeCraft_files");
  const localDBFile = localDBFiles.find(f => f.projectId === projectId && f.path === filePath);
  if (localDBFile && localDBFile.content) {
    console.warn(`[LocalDBSync] ⚠️ File content only in LocalDB, triggering full sync: ${filePath}`);
    syncLocalDBToUI(projectId);
    return true;
  }
  
  console.error(`[LocalDBSync] ❌ File content not found anywhere: ${filePath}`);
  return false;
}

/**
 * Monitor LocalDB changes and sync to UI
 */
export function startLocalDBMonitoring(projectId: string) {
  console.log(`[LocalDBSync] 👁️ Starting LocalDB monitoring for: ${projectId}`);
  
  // Check for changes every 2 seconds
  const interval = setInterval(() => {
    validateLocalDBSync(projectId);
  }, 2000);
  
  // Return cleanup function
  return () => {
    console.log(`[LocalDBSync] 🛑 Stopping LocalDB monitoring for: ${projectId}`);
    clearInterval(interval);
  };
}

// Global functions for browser console debugging
if (typeof window !== 'undefined') {
  (window as any).syncLocalDBToUI = syncLocalDBToUI;
  (window as any).validateLocalDBSync = validateLocalDBSync;
  (window as any).forceLocalDBRefresh = forceLocalDBRefresh;
  (window as any).ensureFileContentInUI = ensureFileContentInUI;
}
