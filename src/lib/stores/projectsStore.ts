/**
 * PROJECTS STORE (Plural) - Manages the collection of ALL user projects
 * 
 * Purpose: Handles listing, pagination, and syncing of all projects for the dashboard
 * Used by: Dashboard page, project list views
 * Key Features: LocalDB caching, Appwrite sync, pagination, filtering
 */

import { create } from "zustand";
import { Project } from "@/lib/types";
import { localDB } from "@/lib/localdb";

interface ProjectsState {
  // State
  projects: Project[];
  currentPage: number;
  totalProjects: number;
  hasMore: boolean;
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;

  // Actions
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  setError: (error: string | null) => void;
  setPage: (page: number) => void;

  // LocalDB + Appwrite sync methods
  loadFromLocalDB: () => void;
  syncWithAppwrite: (userId: string) => Promise<void>;
  getProjectBySlug: (slug: string) => Project | null;
  getProjectById: (id: string) => Project | null;
  getPaginatedProjects: (page: number, limit: number) => Project[];
  reset: () => void;
}

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  // Initial state
  projects: [],
  currentPage: 1,
  totalProjects: 0,
  hasMore: false,
  isLoading: false,
  isSyncing: false,
  error: null,

  // Actions
  setProjects: (projects) => {
    set({ projects, totalProjects: projects.length });
    localDB.setItems("codeCraft_projects", projects);
  },

  addProject: (project) => {
    const { projects } = get();

    // Check if project already exists to prevent duplicates
    const existingIndex = projects.findIndex((p) => p.$id === project.$id);

    let newProjects;
    if (existingIndex !== -1) {
      // Update existing project
      newProjects = projects.map((p) => (p.$id === project.$id ? project : p));
    } else {
      // Add new project at the beginning
      newProjects = [project, ...projects];
    }

    set({ projects: newProjects, totalProjects: newProjects.length });
    // Update LocalDB immediately
    localDB.insert("codeCraft_projects", project);
  },

  updateProject: (id, updates) => {
    const { projects } = get();
    const updatedProjects = projects.map((p) =>
      p.$id === id ? { ...p, ...updates } : p
    );
    set({ projects: updatedProjects });
    // Update LocalDB immediately
    localDB.update("codeCraft_projects", id, updates);
  },

  deleteProject: (id) => {
    const { projects } = get();
    const filteredProjects = projects.filter((p) => p.$id !== id);
    set({ projects: filteredProjects, totalProjects: filteredProjects.length });
    // Delete from LocalDB immediately
    localDB.delete("codeCraft_projects", id);
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setSyncing: (syncing) => set({ isSyncing: syncing }),
  setError: (error) => set({ error }),
  setPage: (page) => set({ currentPage: page }),

  // Load from LocalDB immediately (instant UI)
  loadFromLocalDB: () => {
    console.log("[ProjectsStore] 📂 Loading from LocalDB...");
    const projects = localDB.getAll<Project>("codeCraft_projects");
    // Sort by lastMessageAt descending
    const sortedProjects = projects.sort(
      (a, b) =>
        new Date(b.lastMessageAt).getTime() -
        new Date(a.lastMessageAt).getTime()
    );
    set({
      projects: sortedProjects,
      totalProjects: sortedProjects.length,
      isLoading: false,
    });
    console.log(
      "[ProjectsStore] ✅ Loaded",
      sortedProjects.length,
      "projects from LocalDB"
    );
  },

  // Sync with Appwrite in background (initial load)
  syncWithAppwrite: async (userId: string) => {
    console.log("[ProjectsStore] 🔄 Starting Appwrite sync for user:", userId);
    set({ isSyncing: true, error: null });

    try {
      const { createClientSideClient } = await import("@/lib/appwrite/config");
      const { DATABASE_ID, COLLECTIONS } = await import(
        "@/lib/appwrite/config"
      );
      const { Query } = await import("appwrite");
      const { databases } = createClientSideClient();

      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.PROJECTS,
        [
          Query.equal("userId", userId),
          Query.equal("status", "active"),
          Query.orderDesc("lastMessageAt"),
          Query.limit(100), // Get more for local cache
        ]
      );

      const projects = response.documents as unknown as Project[];

      // Deduplicate projects by $id (in case there are any issues)
      const uniqueProjects = Array.from(
        new Map(projects.map((p) => [p.$id, p])).values()
      );

      console.log(
        "[ProjectsStore] 📥 Received",
        projects.length,
        "projects from Appwrite"
      );
      console.log(
        "[ProjectsStore] ✨ After deduplication:",
        uniqueProjects.length,
        "unique projects"
      );

      // Update both state and LocalDB
      set({
        projects: uniqueProjects,
        totalProjects: uniqueProjects.length,
        isSyncing: false,
      });
      localDB.setItems("codeCraft_projects", uniqueProjects);

      console.log("[ProjectsStore] ✅ Sync complete - UI and LocalDB updated");
    } catch (error: unknown) {
      console.error("[ProjectsStore] ❌ Appwrite sync failed:", error);
      set({
        error:
          error instanceof Error ? error.message : "Failed to sync projects",
        isSyncing: false,
      });
    }
  },

  getProjectBySlug: (slug: string) => {
    const { projects } = get();
    return projects.find((p) => p.slug === slug) || null;
  },

  getProjectById: (id: string) => {
    const { projects } = get();
    return projects.find((p) => p.$id === id) || null;
  },

  getPaginatedProjects: (page: number, limit: number) => {
    const { projects } = get();
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedProjects = projects.slice(startIndex, endIndex);

    set({
      currentPage: page,
      hasMore: endIndex < projects.length,
    });

    return paginatedProjects;
  },

  reset: () => {
    set({
      projects: [],
      currentPage: 1,
      totalProjects: 0,
      hasMore: false,
      isLoading: false,
      isSyncing: false,
      error: null,
    });
  },
}));
