/**
 * Package Cache Utility
 * Caches node_modules to avoid repeated npm installs
 */

import { WebContainer } from '@webcontainer/api';

interface PackageCache {
  hash: string;
  timestamp: number;
  dependencies: Record<string, string>;
}

const CACHE_KEY = 'webcontainer_package_cache';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

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
 * Check if cached packages are valid
 */
export async function isCacheValid(container: WebContainer): Promise<boolean> {
  try {
    // Read package.json
    const packageJsonContent = await container.fs.readFile('package.json', 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);
    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };

    // Get cached data
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return false;

    const cacheData: PackageCache = JSON.parse(cached);
    
    // Check if cache is expired
    if (Date.now() - cacheData.timestamp > CACHE_EXPIRY) {
      console.log('[PackageCache] ⏰ Cache expired');
      return false;
    }

    // Check if dependencies match
    const currentHash = generatePackageHash(dependencies);
    if (cacheData.hash !== currentHash) {
      console.log('[PackageCache] 📦 Dependencies changed');
      return false;
    }

    // Check if node_modules exists
    try {
      const nodeModulesStats = await container.fs.readdir('node_modules');
      if (nodeModulesStats.length === 0) {
        console.log('[PackageCache] 📁 node_modules empty');
        return false;
      }
    } catch {
      console.log('[PackageCache] 📁 node_modules not found');
      return false;
    }

    console.log('[PackageCache] ✅ Cache is valid');
    return true;
  } catch (error) {
    console.error('[PackageCache] ❌ Error checking cache:', error);
    return false;
  }
}

/**
 * Save package cache after successful install
 */
export async function savePackageCache(container: WebContainer): Promise<void> {
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
      dependencies
    };

    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    console.log('[PackageCache] 💾 Cache saved');
  } catch (error) {
    console.error('[PackageCache] ❌ Error saving cache:', error);
  }
}

/**
 * Clear package cache
 */
export function clearPackageCache(): void {
  localStorage.removeItem(CACHE_KEY);
  console.log('[PackageCache] 🗑️ Cache cleared');
}

/**
 * Get cache info for debugging
 */
export function getCacheInfo(): PackageCache | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}
