/**
 * FILE TREE DEBUG UTILITIES - Browser console helpers for file tree debugging
 * 
 * Purpose: Debug file paths, tree structure, and content loading in browser console
 * Used by: Developer tools, accessible via window.debug object
 * Key Features: Path debugging, tree inspection, content verification, store comparison
 */

import { useProjectStore } from '@/lib/stores/projectStore';
import { useFilesStore } from '@/lib/stores/filesStore';
import { findFileNode, flattenFileTree } from './fileSystem';

/**
 * Debug a specific file path to see where it exists and its content
 */
export function debugFilePath(filePath: string) {
  console.group(`[FileTreeDebug] 🔍 Debugging: ${filePath}`);
  
  const projectStore = useProjectStore.getState();
  const filesStore = useFilesStore.getState();
  const currentProject = projectStore.currentProject;
  
  if (!currentProject) {
    console.error('No current project loaded');
    console.groupEnd();
    return;
  }
  
  console.log('📊 File Path Analysis:');
  console.log('  Path:', filePath);
  console.log('  Is nested:', filePath.split('/').filter(Boolean).length > 1);
  console.log('  Path segments:', filePath.split('/').filter(Boolean));
  
  // Check in project store tree
  console.log('\n🌳 Project Store Tree:');
  const treeFile = findFileNode(projectStore.files, filePath, true);
  if (treeFile) {
    console.log('  ✅ Found in tree');
    console.log('  Type:', treeFile.type);
    console.log('  Has content:', !!treeFile.content);
    console.log('  Content length:', treeFile.content?.length || 0);
  } else {
    console.log('  ❌ Not found in tree');
  }
  
  // Check in files store raw files
  console.log('\n📂 Files Store Raw Files:');
  const rawFiles = filesStore.filesByProject[currentProject.$id] || [];
  const rawFile = rawFiles.find(f => f.path === filePath);
  if (rawFile) {
    console.log('  ✅ Found in raw files');
    console.log('  Type:', rawFile.type);
    console.log('  Has content:', !!rawFile.content);
    console.log('  Content length:', rawFile.content?.length || 0);
    console.log('  Last updated:', rawFile.updatedAt);
  } else {
    console.log('  ❌ Not found in raw files');
  }
  
  // Check in files store tree
  console.log('\n🌲 Files Store Tree:');
  const filesStoreTree = filesStore.fileTreeByProject[currentProject.$id] || [];
  const filesStoreTreeFile = findFileNode(filesStoreTree, filePath, false);
  if (filesStoreTreeFile) {
    console.log('  ✅ Found in files store tree');
    console.log('  Has content:', !!filesStoreTreeFile.content);
    console.log('  Content length:', filesStoreTreeFile.content?.length || 0);
  } else {
    console.log('  ❌ Not found in files store tree');
  }
  
  console.groupEnd();
}

/**
 * List all files in the current project tree
 */
export function listAllFiles() {
  const projectStore = useProjectStore.getState();
  const files = flattenFileTree(projectStore.files);
  
  console.group(`[FileTreeDebug] 📋 All Files (${files.length} total)`);
  
  const filesList = files.filter(f => f.type === 'file');
  const foldersList = files.filter(f => f.type === 'folder');
  
  console.log(`📁 Folders: ${foldersList.length}`);
  foldersList.forEach(folder => {
    console.log(`  ${folder.path}`);
  });
  
  console.log(`\n📄 Files: ${filesList.length}`);
  filesList.forEach(file => {
    const hasContent = file.content && file.content.length > 0;
    const contentInfo = hasContent ? `(${file.content!.length} chars)` : '(no content)';
    const icon = hasContent ? '✅' : '❌';
    console.log(`  ${icon} ${file.path} ${contentInfo}`);
  });
  
  const filesWithoutContent = filesList.filter(f => !f.content || f.content.length === 0);
  if (filesWithoutContent.length > 0) {
    console.log(`\n⚠️ Files without content: ${filesWithoutContent.length}`);
    filesWithoutContent.forEach(f => console.log(`  ${f.path}`));
  }
  
  console.groupEnd();
}

/**
 * Compare project store tree with files store raw files
 */
export function compareStores() {
  const projectStore = useProjectStore.getState();
  const filesStore = useFilesStore.getState();
  const currentProject = projectStore.currentProject;
  
  if (!currentProject) {
    console.error('No current project loaded');
    return;
  }
  
  console.group('[FileTreeDebug] 🔄 Store Comparison');
  
  const treeFiles = flattenFileTree(projectStore.files).filter(f => f.type === 'file');
  const rawFiles = filesStore.filesByProject[currentProject.$id] || [];
  
  console.log('📊 Summary:');
  console.log(`  Tree files: ${treeFiles.length}`);
  console.log(`  Raw files: ${rawFiles.length}`);
  
  // Files in raw but not in tree
  const missingInTree = rawFiles.filter(rawFile => 
    !treeFiles.find(treeFile => treeFile.path === rawFile.path)
  );
  
  if (missingInTree.length > 0) {
    console.log(`\n❌ Files in raw store but NOT in tree: ${missingInTree.length}`);
    missingInTree.forEach(f => console.log(`  ${f.path}`));
  } else {
    console.log('\n✅ All raw files are in tree');
  }
  
  // Files in tree but not in raw
  const missingInRaw = treeFiles.filter(treeFile =>
    !rawFiles.find(rawFile => rawFile.path === treeFile.path)
  );
  
  if (missingInRaw.length > 0) {
    console.log(`\n⚠️ Files in tree but NOT in raw store: ${missingInRaw.length}`);
    missingInRaw.forEach(f => console.log(`  ${f.path}`));
  } else {
    console.log('✅ All tree files are in raw store');
  }
  
  // Files with content mismatch
  const contentMismatches = treeFiles.filter(treeFile => {
    const rawFile = rawFiles.find(rf => rf.path === treeFile.path);
    if (!rawFile) return false;
    
    const treeHasContent = !!treeFile.content && treeFile.content.length > 0;
    const rawHasContent = !!rawFile.content && rawFile.content.length > 0;
    
    return treeHasContent !== rawHasContent;
  });
  
  if (contentMismatches.length > 0) {
    console.log(`\n⚠️ Files with content mismatches: ${contentMismatches.length}`);
    contentMismatches.forEach(treeFile => {
      const rawFile = rawFiles.find(rf => rf.path === treeFile.path);
      console.log(`  ${treeFile.path}:`);
      console.log(`    Tree: ${treeFile.content?.length || 0} chars`);
      console.log(`    Raw:  ${rawFile?.content?.length || 0} chars`);
    });
  } else {
    console.log('✅ All files have matching content availability');
  }
  
  console.groupEnd();
}

// Export to window for browser console access
if (typeof window !== 'undefined') {
  (window as any).debugFilePath = debugFilePath;
  (window as any).listAllFiles = listAllFiles;
  (window as any).compareStores = compareStores;
  
  console.log('🛠️ File tree debugging tools available:');
  console.log('  debugFilePath("path/to/file") - Debug a specific file path');
  console.log('  listAllFiles() - List all files in the current project');
  console.log('  compareStores() - Compare project store tree with files store');
}
