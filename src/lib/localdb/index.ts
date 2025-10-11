/**
 * LocalDB - Browser-based storage cache using localStorage
 * Provides instant data access and offline support with Appwrite sync
 * Features: CRUD operations, per-collection storage, last sync tracking, migrations
 * Used in: All stores for fast initial load and offline capability
 */
// LocalDB implementation using localStorage
// Collections: codeCraft_projects, codeCraft_messages, codeCraft_files

export type Collection = 'codeCraft_projects' | 'codeCraft_messages' | 'codeCraft_files';

interface StorageData<T> {
  items: T[];
  lastSync: string;
}

class LocalDB {
  private getCollectionKey(collection: Collection): string {
    return collection;
  }

  private getCollection<T>(collection: Collection): StorageData<T> {
    if (typeof window === 'undefined') {
      return { items: [], lastSync: new Date().toISOString() };
    }

    const key = this.getCollectionKey(collection);
    const data = localStorage.getItem(key);

    if (!data) {
      return { items: [], lastSync: new Date().toISOString() };
    }

    try {
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error parsing ${collection}:`, error);
      return { items: [], lastSync: new Date().toISOString() };
    }
  }

  private saveCollection<T>(collection: Collection, data: StorageData<T>): void {
    if (typeof window === 'undefined') return;

    const key = this.getCollectionKey(collection);
    localStorage.setItem(key, JSON.stringify(data));
  }

  // Get all items from a collection
  getAll<T>(collection: Collection): T[] {
    const data = this.getCollection<T>(collection);
    return data.items;
  }

  // Get a single item by ID
  getById<T extends { $id: string }>(collection: Collection, id: string): T | null {
    const items = this.getAll<T>(collection);
    return items.find(item => item.$id === id) || null;
  }

  // Get items by a filter function
  getByFilter<T>(collection: Collection, filterFn: (item: T) => boolean): T[] {
    const items = this.getAll<T>(collection);
    return items.filter(filterFn);
  }

  // Get single item by filter
  getOneByFilter<T>(collection: Collection, filterFn: (item: T) => boolean): T | null {
    const items = this.getAll<T>(collection);
    return items.find(filterFn) || null;
  }

  // Insert a new item
  insert<T extends { $id: string }>(collection: Collection, item: T): T {
    const data = this.getCollection<T>(collection);

    // Check if item already exists
    const existingIndex = data.items.findIndex(i => i.$id === item.$id);
    if (existingIndex !== -1) {
      // Update existing item
      data.items[existingIndex] = item;
    } else {
      // Add new item
      data.items.push(item);
    }

    data.lastSync = new Date().toISOString();
    this.saveCollection(collection, data);
    return item;
  }

  // Insert multiple items
  insertMany<T extends { $id: string }>(collection: Collection, items: T[]): T[] {
    const data = this.getCollection<T>(collection);

    items.forEach(item => {
      const existingIndex = data.items.findIndex(i => i.$id === item.$id);
      if (existingIndex !== -1) {
        data.items[existingIndex] = item;
      } else {
        data.items.push(item);
      }
    });

    data.lastSync = new Date().toISOString();
    this.saveCollection(collection, data);
    return items;
  }

  // Update an item
  update<T extends { $id: string }>(collection: Collection, id: string, updates: Partial<T>): T | null {
    const data = this.getCollection<T>(collection);
    const index = data.items.findIndex(item => item.$id === id);

    if (index === -1) return null;

    data.items[index] = { ...data.items[index], ...updates };
    data.lastSync = new Date().toISOString();
    this.saveCollection(collection, data);

    return data.items[index];
  }

  // Delete an item
  delete<T extends { $id: string }>(collection: Collection, id: string): boolean {
    const data = this.getCollection<T>(collection);
    const initialLength = data.items.length;

    data.items = data.items.filter(item => item.$id !== id);

    if (data.items.length < initialLength) {
      data.lastSync = new Date().toISOString();
      this.saveCollection(collection, data);
      return true;
    }

    return false;
  }

  // Delete multiple items
  deleteMany<T extends { $id: string }>(collection: Collection, ids: string[]): number {
    const data = this.getCollection<T>(collection);
    const initialLength = data.items.length;

    data.items = data.items.filter(item => !ids.includes(item.$id));

    const deletedCount = initialLength - data.items.length;
    if (deletedCount > 0) {
      data.lastSync = new Date().toISOString();
      this.saveCollection(collection, data);
    }

    return deletedCount;
  }

  // Clear entire collection
  clear(collection: Collection): void {
    this.saveCollection(collection, { items: [], lastSync: new Date().toISOString() });
  }

  // Clear all collections
  clearAll(): void {
    this.clear('codeCraft_projects');
    this.clear('codeCraft_messages');
    this.clear('codeCraft_files');
  }

  // Get last sync time
  getLastSync(collection: Collection): string {
    const data = this.getCollection(collection);
    return data.lastSync;
  }

  // Set items with sync time (used during sync)
  setItems<T>(collection: Collection, items: T[]): void {
    this.saveCollection(collection, {
      items,
      lastSync: new Date().toISOString(),
    });
  }
}

export const localDB = new LocalDB();
