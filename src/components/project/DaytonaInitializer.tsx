"use client";

import { useEffect, useRef, useState } from "react";
import { useDaytonaContext } from "@/lib/contexts/DaytonaContext";
import { useFilesStore } from "@/lib/stores/filesStore";
import { clientAuth } from "@/lib/appwrite/auth";
import { Query } from "appwrite";
import { createClientSideClient, DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";

interface DaytonaInitializerProps {
  projectId: string;
}

export function DaytonaInitializer({ projectId }: DaytonaInitializerProps) {
  const {
    createSandbox,
    writeFiles,
    executeCommand,
    executeCommandAsync,
    exposePort,
    isReady,
    sandboxId,
    setError,
  } = useDaytonaContext();
  const { filesByProject } = useFilesStore();
  const initializedProjectRef = useRef<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  // Get userId on mount
  useEffect(() => {
    const getUserId = async () => {
      const authResult = await clientAuth.getCurrentUser();
      if (authResult.success && authResult.user) {
        setUserId(authResult.user.$id);
      }
    };
    getUserId();
  }, []);

  // Initialize project once we have userId
  useEffect(() => {
    if (!projectId || !userId || isInitializing) return;

    // Check if this project is already initialized
    if (initializedProjectRef.current === projectId && sandboxId) {
      console.log("[DaytonaInitializer] ✅ Project already initialized:", projectId);
      return;
    }

    const initializeProject = async () => {
      const storageKey = `daytona-sandbox-${projectId}`;
      const portStorageKey = `${storageKey}-port`;
      const cwdStorageKey = `${storageKey}-cwd`;

      // Check if we have files in the store (prevent premature sandbox creation for empty projects)
      const projectFilesList = filesByProject[projectId] || [];
      const hasAnyFileInStore = projectFilesList.some(f => f.type === "file");
      const existingSandboxId = localStorage.getItem(storageKey);

      // New project with no files yet -> wait for files before doing anything
      if (!existingSandboxId && !hasAnyFileInStore) {
        console.log("[DaytonaInitializer] ⏳ Waiting for files before creating sandbox...");
        setIsInitializing(false);
        return;
      }

      const waitForServerReady = async (port: number, cwd: string, timeoutMs = 45000) => {
        const startedAt = Date.now();
        while (Date.now() - startedAt < timeoutMs) {
          const result = await executeCommand(
            `sh -lc "curl -s -L -o /dev/null -w '%{http_code}' http://127.0.0.1:${port}/ || true"`,
            cwd
          );
          const statusCode = result.output.trim().slice(-3);
          const statusNum = parseInt(statusCode, 10);
          if (statusNum >= 200 && statusNum < 400) {
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        throw new Error(`Dev server on port ${port} did not become ready`);
      };

      const detectWorkingDir = async (): Promise<string> => {
        const candidates = [
          "/home/daytona/package.json",
        ];
        const findResult = await executeCommand(
          "find /home/daytona -maxdepth 3 -name package.json -type f 2>/dev/null || true",
          "/home/daytona"
        );
        const foundPaths = findResult.output.split("\n").filter(Boolean);
        candidates.push(...foundPaths);

        for (const pkgPath of candidates) {
          const checkResult = await executeCommand(
            `test -f "${pkgPath}" && echo EXISTS || echo NOT_FOUND`,
            "/home/daytona"
          );
          if (checkResult.output.includes("EXISTS")) {
            const catResult = await executeCommand(`cat "${pkgPath}"`, "/home/daytona");
            try {
              const pkg = JSON.parse(catResult.output || "{}");
              const scripts = pkg.scripts || {};
              const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
              if (scripts.dev || deps.vite || deps.next || deps["react-scripts"]) {
                const workingDir = pkgPath.replace("/package.json", "");
                console.log(`[DaytonaInitializer] 📁 Detected workingDir: ${workingDir}`);
                return workingDir;
              }
            } catch {}
          }
        }
        console.log("[DaytonaInitializer] 📁 Using default workingDir: /home/daytona");
        return "/home/daytona";
      };

      try {
        setIsInitializing(true);
        setError(null);
        console.log("[DaytonaInitializer] 🔄 Initializing project:", projectId);

        const isReusingSandbox = !!existingSandboxId;

        // Step 1: Create or reuse sandbox
        const newSandboxId = await createSandbox(projectId);
        if (!newSandboxId) {
          throw new Error("Failed to create sandbox");
        }

        // If reusing sandbox, skip file loading and setup
        if (isReusingSandbox && newSandboxId === existingSandboxId) {
          console.log("[DaytonaInitializer] ♻️ Sandbox reused, skipping file setup");
          const storedPort = Number(localStorage.getItem(portStorageKey) ?? "5173");
          const storedCwd = localStorage.getItem(cwdStorageKey) ?? "/home/daytona";
          try {
            const healthCheck = await executeCommand(
              `sh -lc "curl -s -L -o /dev/null -w '%{http_code}' http://127.0.0.1:${storedPort}/ || true"`,
              storedCwd
            );
            const statusCode = healthCheck.output.trim().slice(-3);
            const statusNum = parseInt(statusCode, 10);
            if (statusNum >= 200 && statusNum < 400) {
              const url = await exposePort(storedPort);
              if (url) {
                console.log("[DaytonaInitializer] ✅ Preview URL ready:", url);
              }
              initializedProjectRef.current = projectId;
              setIsInitializing(false);
              return;
            }
            console.log("[DaytonaInitializer] ⚠️ Existing dev server not responding, performing fresh setup");
          } catch (healthErr) {
            console.warn("[DaytonaInitializer] ⚠️ Failed health check on reused sandbox, re-running setup", healthErr);
          }
        }

        // Step 2: Load files from Appwrite (only for new sandboxes)
        console.log("[DaytonaInitializer] 📂 Loading files from Appwrite for project:", projectId);
        const { databases } = createClientSideClient();
        const response = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.PROJECT_FILES,
          [Query.equal("projectId", projectId), Query.limit(1000)]
        );

        console.log(`[DaytonaInitializer] 📁 Total documents from Appwrite: ${response.documents.length}`);
        console.log(`[DaytonaInitializer] 📁 Document types:`, response.documents.map(d => ({ path: d.path, type: d.type })));

        // If no documents in Appwrite, wait for files to be created
        if (response.documents.length === 0) {
          console.log("[DaytonaInitializer] ⏳ No files in Appwrite yet; waiting for files to be created...");
          setIsInitializing(false);
          return;
        }

        const files = response.documents
          .filter((doc) => doc.type === "file" && doc.content)
          .map((doc) => ({
            path: `/home/daytona/${doc.path}`,
            content: doc.content as string,
          }));

        console.log(`[DaytonaInitializer] 📁 Found ${files.length} files with content from Appwrite`);
        if (files.length > 0) {
          console.log(`[DaytonaInitializer] 📁 File paths:`, files.map(f => f.path));
        } else {
          console.warn(`[DaytonaInitializer] ⚠️ No file content found for project ${projectId}!`);
          setIsInitializing(false);
          return;
        }

        // Step 3: Write files to sandbox
        if (files.length > 0) {
          await writeFiles(files);

          // Verify files were written
          console.log("[DaytonaInitializer] 🔍 Verifying files were written...");
          const lsResult = await executeCommand("ls -la /home/daytona", "/home/daytona");
          console.log("[DaytonaInitializer] 📁 Directory contents:", lsResult.output);

          // Check if index.html exists
          const indexCheck = await executeCommand("test -f /home/daytona/index.html && echo 'EXISTS' || echo 'NOT FOUND'", "/home/daytona");
          console.log("[DaytonaInitializer] 📄 index.html check:", indexCheck.output);

          // Check if src/main.tsx exists
          const mainCheck = await executeCommand("test -f /home/daytona/src/main.tsx && echo 'EXISTS' || echo 'NOT FOUND'", "/home/daytona");
          console.log("[DaytonaInitializer] 📄 src/main.tsx check:", mainCheck.output);
        } else {
          console.warn("[DaytonaInitializer] ⚠️ Skipping file write - no files to write");
        }

        // Step 4: Detect working directory
        const workingDir = await detectWorkingDir();
        localStorage.setItem(cwdStorageKey, workingDir);

        // Step 5: Check if package.json or index.html exists
        const pkgCheck = await executeCommand(`test -f "${workingDir}/package.json" && echo EXISTS || echo NOT_FOUND`, workingDir);
        const htmlCheck = await executeCommand(`test -f "${workingDir}/index.html" && echo EXISTS || echo NOT_FOUND`, workingDir);

        // No package.json and no index.html -> wait for proper project structure
        if (!pkgCheck.output.includes("EXISTS") && !htmlCheck.output.includes("EXISTS")) {
          console.log("[DaytonaInitializer] ⏳ No package.json or index.html yet; waiting for complete project structure...");
          setIsInitializing(false);
          return;
        }

        // If only index.html exists (static project), skip install/start for now
        if (!pkgCheck.output.includes("EXISTS")) {
          console.log("[DaytonaInitializer] ⏸️ Static project detected (no package.json). Skipping install/start.");
          setIsInitializing(false);
          return;
        }

        // Step 6: Install dependencies (detect package manager)
        const hasPnpmLock = (await executeCommand(`test -f "${workingDir}/pnpm-lock.yaml" && echo yes || echo no`, workingDir)).output.includes("yes");
        const hasYarnLock = (await executeCommand(`test -f "${workingDir}/yarn.lock" && echo yes || echo no`, workingDir)).output.includes("yes");
        let installCmd = "npm install";
        let packageManager: "npm" | "pnpm" | "yarn" = "npm";

        if (hasPnpmLock) {
          const pnpmCheck = await executeCommand("sh -lc 'command -v pnpm'", workingDir);
          if (pnpmCheck.exitCode === 0) {
            installCmd = "pnpm install";
            packageManager = "pnpm";
          } else {
            console.warn("[DaytonaInitializer] ⚠️ pnpm-lock.yaml found but pnpm is unavailable, falling back to npm install");
          }
        } else if (hasYarnLock) {
          const yarnCheck = await executeCommand("sh -lc 'command -v yarn'", workingDir);
          if (yarnCheck.exitCode === 0) {
            installCmd = "yarn install";
            packageManager = "yarn";
          } else {
            console.warn("[DaytonaInitializer] ⚠️ yarn.lock found but yarn is unavailable, falling back to npm install");
          }
        }

        console.log(`[DaytonaInitializer] 📦 Installing deps with: ${installCmd} in ${workingDir}`);
        const installResult = await executeCommand(installCmd, workingDir);
        if (installResult.exitCode !== 0) {
          console.error(`[DaytonaInitializer] ❌ Dependency install failed (${installCmd})`, installResult.output);
          throw new Error(`Dependency installation failed (${installCmd})`);
        }
        console.log("[DaytonaInitializer] ✅ Dependencies installed");

        // Step 7: Read package.json to determine start command
        console.log("[DaytonaInitializer] 📄 Reading package.json...");
        const pkgResult = await executeCommand(`cat "${workingDir}/package.json"`, workingDir);
        let startCommand =
          packageManager === "yarn"
            ? "yarn dev"
            : packageManager === "pnpm"
              ? "pnpm run dev"
              : "npm run dev";
        let devPort = 5173;
        let devScript: string | undefined;
        let isNextDev = false;
        const isViteDev = false;
        let hasHostArg = false;
        let hasPortArg = false;
        try {
          const pkg = JSON.parse(pkgResult.output || "{}");
          const scripts = pkg.scripts || {};
          devScript = scripts.dev;
          const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) } as Record<string, string>;
          if (devScript) {
            const portMatch = devScript.match(/--port\s+(\d+)|-p\s+(\d+)/);
            if (portMatch) {
              devPort = parseInt(portMatch[1] || portMatch[2], 10);
            } else if (/next\s+dev/.test(devScript)) {
              devPort = 3000; // common default for Next.js
            }
            isNextDev = /next\s+dev/.test(devScript);
            hasHostArg = /--hostname\s+\S+|-H\s+\S+/.test(devScript);
            hasPortArg = /--port\s+\d+|-p\s+\d+/.test(devScript);
          }
          if (!devScript) {
            if (deps.vite || deps["@vitejs/plugin-react"]) {
              startCommand = "npx vite --host 0.0.0.0";
              devPort = 5173;
            } else {
              // Fallback: serve static files
              startCommand = "npx serve -l 5173 .";
              devPort = 5173;
            }
          }
        } catch {
          // If parsing fails, fallback to npx vite
          startCommand = "npx vite --host 0.0.0.0";
          devPort = 5173;
        }

        if (isNextDev) {
          const hostArg = "--hostname 0.0.0.0";
          const portArg = `--port ${devPort}`;

          if (packageManager === "yarn") {
            const extraArgs = [
              hasHostArg ? null : hostArg,
              hasPortArg ? null : portArg,
            ]
              .filter(Boolean)
              .join(" ");
            startCommand = extraArgs ? `yarn dev ${extraArgs}` : "yarn dev";
          } else {
            const runner = packageManager === "pnpm" ? "pnpm run dev" : "npm run dev";
            const extraArgs = [
              hasHostArg ? null : hostArg,
              hasPortArg ? null : portArg,
            ]
              .filter(Boolean)
              .join(" ");
            startCommand = extraArgs ? `${runner} -- ${extraArgs}` : runner;
          }
        }

        console.log(`[DaytonaInitializer] ▶️ Start command: ${startCommand}, port: ${devPort}, workingDir: ${workingDir}`);

        // Step 8: Ensure vite.config.ts has correct server config (only if Vite project)
        if (isViteDev || devPort === 5173) {
          console.log("[DaytonaInitializer] 🔧 Checking vite.config.ts...");
          const viteConfigCheck = await executeCommand(`cat "${workingDir}/vite.config.ts"`, workingDir);
          console.log("[DaytonaInitializer] 📄 Current vite.config.ts:", viteConfigCheck.output);

          if (!viteConfigCheck.output.includes('host:') && !viteConfigCheck.output.includes('0.0.0.0')) {
            console.log("[DaytonaInitializer] 🔧 Updating vite.config.ts with server config...");
            const newViteConfig = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },
})`;

            await writeFiles([{
              path: `${workingDir}/vite.config.ts`,
              content: newViteConfig,
            }]);
            console.log("[DaytonaInitializer] ✅ vite.config.ts updated");
          }
        }

        // Step 9: Start dev server
        console.log("[DaytonaInitializer] 🚀 Starting dev server...");
        await executeCommandAsync(startCommand, workingDir);

        // Wait for dev server readiness
        console.log(`[DaytonaInitializer] ⏳ Waiting for dev server on port ${devPort}...`);
        await waitForServerReady(devPort, workingDir);

        // Step 8: Expose port and get preview URL
        console.log(`[DaytonaInitializer] 🌐 Exposing port ${devPort}...`);
        const url = await exposePort(devPort);

        if (url) {
          console.log("[DaytonaInitializer] ✅ Preview URL ready:", url);
        }

        localStorage.setItem(portStorageKey, String(devPort));

        initializedProjectRef.current = projectId;
        setIsInitializing(false);
      } catch (err) {
        console.error("[DaytonaInitializer] ❌ Failed to initialize:", err);
        initializedProjectRef.current = null;
        setIsInitializing(false);
        setError(err instanceof Error ? err.message : "Failed to initialize sandbox");
      }
    };

    initializeProject();
  }, [projectId, userId, sandboxId, createSandbox, writeFiles, executeCommand, executeCommandAsync, exposePort, setError, isInitializing, filesByProject]);

  // Sync file changes to sandbox
  useEffect(() => {
    if (!isReady || !sandboxId || !projectId) return;

    const projectFiles = filesByProject[projectId];
    if (!projectFiles || projectFiles.length === 0) return;

    const syncFiles = async () => {
      const filesToSync = projectFiles
        .filter((file) => file.type === "file" && file.content)
        .map((file) => ({
          path: `/home/daytona/${file.path}`,
          content: file.content!,
        }));

      if (filesToSync.length === 0) return;

      try {
        console.log(`[DaytonaInitializer] 🔄 Syncing ${filesToSync.length} files...`);
        await writeFiles(filesToSync);
        console.log("[DaytonaInitializer] ✅ Files synced");
      } catch (err) {
        console.error("[DaytonaInitializer] ❌ Failed to sync files:", err);
      }
    };

    // Debounce file sync
    const timeoutId = setTimeout(syncFiles, 1000);
    return () => clearTimeout(timeoutId);
  }, [isReady, sandboxId, projectId, filesByProject, writeFiles]);

  return null;
}
