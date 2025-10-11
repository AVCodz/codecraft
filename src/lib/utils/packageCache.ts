/**
 * PACKAGE CACHE UTILITY - Caches node_modules to speed up WebContainer initialization
 * 
 * Purpose: Avoid repeated npm installs by caching dependencies per project
 * Used by: WebContainerContext during project loading and initialization
 * Key Features: Per-project caching, hash-based validation, dependency comparison, auto-cleanup
 */

import { WebContainer } from '@webcontainer/api';

interface PackageCache {
  hash: string;
  timestamp: number;
  dependencies: Record<string, string>;
  projectId: string;
}

interface ProjectCacheIndex {
  [projectId: string]: PackageCache;
}

const CACHE_INDEX_KEY = 'webcontainer_cache_index';
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days (increased from 24 hours)
const MAX_CACHED_PROJECTS = 5; // Keep cache for last 5 projects

/**
 * Generate hash from package.json dependencies
 */
function generatePackageHash(dependencies: Record<string, string>): string {
  const sortedDeps = Object.keys(dependencies)
    .sort()
    .map(key => `${key}:${dependencies[key]}`)
    .join('|');
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < sortedDeps.length; i++) {
    const char = sortedDeps.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

/**
 * Get all cached projects
 */
function getCacheIndex(): ProjectCacheIndex {
  try {
    const cached = localStorage.getItem(CACHE_INDEX_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

/**
 * Save cache index
 */
function saveCacheIndex(index: ProjectCacheIndex): void {
  try {
    localStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(index));
  } catch (error) {
    console.error('[PackageCache] Failed to save cache index:', error);
  }
}

/**
 * Get cache for a specific project
 */
function getProjectCache(projectId: string): PackageCache | null {
  const index = getCacheIndex();
  return index[projectId] || null;
}

/**
 * Save cache for a specific project
 */
function saveProjectCache(projectId: string, cache: PackageCache): void {
  const index = getCacheIndex();
  index[projectId] = cache;
  
  // Cleanup old projects if we exceed the limit
  const projects = Object.keys(index);
  if (projects.length > MAX_CACHED_PROJECTS) {
    // Sort by timestamp (oldest first)
    const sortedProjects = projects.sort((a, b) => 
      index[a].timestamp - index[b].timestamp
    );
    
    // Remove oldest projects
    const toRemove = sortedProjects.slice(0, projects.length - MAX_CACHED_PROJECTS);
    toRemove.forEach(id => {
      console.log(`[PackageCache] 🗑️ Removing old cache for project: ${id}`);
      delete index[id];
    });
  }
  
  saveCacheIndex(index);
}

/**
 * Check if cached packages are valid for a specific project
 */
export async function isCacheValid(container: WebContainer, projectId: string): Promise<boolean> {
  try {
    // Quick check: if node_modules exists and has content, assume valid
    // This is faster than checking hashes every time
    try {
      const nodeModulesStats = await container.fs.readdir('node_modules');
      if (nodeModulesStats.length > 0) {
        console.log(`[PackageCache] ⚡ Fast path: node_modules exists for project ${projectId}`);
        
        // Check project-specific cache for expiry
        const cacheData = getProjectCache(projectId);
        if (cacheData) {
          // If cache is not expired, trust node_modules
          if (Date.now() - cacheData.timestamp <= CACHE_EXPIRY) {
            console.log(`[PackageCache] ✅ Using cached packages for project ${projectId} (fast path)`);
            return true;
          }
        }
        
        // Even if cache expired or not found, still trust node_modules if it exists
        // This prevents unnecessary reinstalls
        console.log(`[PackageCache] ✅ node_modules exists for project ${projectId}, trusting it`);
        return true;
      }
    } catch {
      // node_modules doesn't exist, continue with full check
    }

    // Read package.json for full validation
    const packageJsonContent = await container.fs.readFile('package.json', 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);
    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };

    // Get project-specific cached data
    const cacheData = getProjectCache(projectId);
    if (!cacheData) {
      console.log(`[PackageCache] 📁 No cache found for project ${projectId}`);
      return false;
    }
    
    // Check if cache is expired
    if (Date.now() - cacheData.timestamp > CACHE_EXPIRY) {
      console.log(`[PackageCache] ⏰ Cache expired for project ${projectId}`);
      return false;
    }

    // Check if dependencies match
    const currentHash = generatePackageHash(dependencies);
    if (cacheData.hash !== currentHash) {
      console.log(`[PackageCache] 📦 Dependencies changed for project ${projectId}`);
      return false;
    }

    console.log(`[PackageCache] ✅ Cache is valid for project ${projectId}`);
    return true;
  } catch (error) {
    console.error('[PackageCache] ❌ Error checking cache:', error);
    return false;
  }
}

/**
 * Save package cache after successful install for a specific project
 */
export async function savePackageCache(container: WebContainer, projectId: string): Promise<void> {
  try {
    // Read package.json
    const packageJsonContent = await container.fs.readFile('package.json', 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);
    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };

    const hash = generatePackageHash(dependencies);
    const cacheData: PackageCache = {
      hash,
      timestamp: Date.now(),
      dependencies,
      projectId
    };

    saveProjectCache(projectId, cacheData);
    console.log(`[PackageCache] 💾 Cache saved for project ${projectId}`);
  } catch (error) {
    console.error('[PackageCache] ❌ Error saving cache:', error);
  }
}

/**
 * Clear all package caches
 */
export function clearAllPackageCaches(): void {
  localStorage.removeItem(CACHE_INDEX_KEY);
  console.log('[PackageCache] 🗑️ All caches cleared');
}

/**
 * Clear cache for a specific project
 */
export function clearPackageCache(projectId: string): void {
  const index = getCacheIndex();
  delete index[projectId];
  saveCacheIndex(index);
  console.log(`[PackageCache] 🗑️ Cache cleared for project ${projectId}`);
}

/**
 * Get cache info for a specific project
 */
export function getCacheInfo(projectId: string): PackageCache | null {
  return getProjectCache(projectId);
}

/**
 * Get all cached projects info
 */
export function getAllCachedProjects(): ProjectCacheIndex {
  return getCacheIndex();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  totalProjects: number;
  oldestCache: Date | null;
  newestCache: Date | null;
  totalSize: number;
} {
  const index = getCacheIndex();
  const projects = Object.values(index);
  
  if (projects.length === 0) {
    return { totalProjects: 0, oldestCache: null, newestCache: null, totalSize: 0 };
  }
  
  const timestamps = projects.map(p => p.timestamp);
  const oldestCache = new Date(Math.min(...timestamps));
  const newestCache = new Date(Math.max(...timestamps));
  const totalSize = JSON.stringify(index).length;
  
  return {
    totalProjects: projects.length,
    oldestCache,
    newestCache,
    totalSize
  };
}

// Export to window for browser console debugging
if (typeof window !== 'undefined') {
  (window as any).getCacheStats = getCacheStats;
  (window as any).getAllCachedProjects = getAllCachedProjects;
  (window as any).getCacheInfo = getCacheInfo;
  (window as any).clearPackageCache = clearPackageCache;
  (window as any).clearAllPackageCaches = clearAllPackageCaches;
  
  console.log('📦 Package cache utilities available:');
  console.log('  getCacheStats() - Get cache statistics');
  console.log('  getAllCachedProjects() - List all cached projects');
  console.log('  getCacheInfo(projectId) - Get cache for specific project');
  console.log('  clearPackageCache(projectId) - Clear cache for specific project');
  console.log('  clearAllPackageCaches() - Clear all caches');
}
