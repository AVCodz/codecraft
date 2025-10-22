"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";

interface DaytonaContextValue {
  sandboxId: string | null;
  isBooting: boolean;
  isReady: boolean;
  previewUrl: string | null;
  error: string | null;
  setError: (error: string | null) => void;
  createSandbox: (projectId: string) => Promise<string | null>;
  writeFiles: (files: Array<{ path: string; content: string }>) => Promise<void>;
  executeCommand: (command: string, cwd?: string) => Promise<{ exitCode: number; output: string }>;
  executeCommandAsync: (command: string, cwd?: string) => Promise<void>;
  exposePort: (port: number) => Promise<string | null>;
  destroySandbox: () => Promise<void>;
  restartDevServer: () => Promise<void>;
}

const DaytonaContext = createContext<DaytonaContextValue | undefined>(
  undefined
);

export function DaytonaProvider({ children }: { children: React.ReactNode }) {
  const [sandboxId, setSandboxId] = useState<string | null>(null);
  const [isBooting, setIsBooting] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sandboxIdRef = useRef<string | null>(null);

  const createSandbox = useCallback(async (projectId: string) => {
    try {
      setIsBooting(true);
      setError(null);

      // Check localStorage for existing sandbox
      const storageKey = `daytona-sandbox-${projectId}`;
      const existingSandboxId = localStorage.getItem(storageKey);

      if (existingSandboxId) {
        console.log("[Daytona] 🔍 Found existing sandbox in localStorage:", existingSandboxId);

        // Verify sandbox still exists
        try {
          const statusResponse = await fetch("/api/sandbox/status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sandboxId: existingSandboxId }),
          });

          if (statusResponse.ok) {
            console.log("[Daytona] ♻️ Reusing existing sandbox:", existingSandboxId);
            setSandboxId(existingSandboxId);
            sandboxIdRef.current = existingSandboxId;
            setIsReady(true);
            setIsBooting(false);
            return existingSandboxId;
          } else {
            console.log("[Daytona] ⚠️ Existing sandbox not found, creating new one");
            localStorage.removeItem(storageKey);
          }
        } catch (_err) {
          console.log("[Daytona] ⚠️ Failed to verify sandbox, creating new one");
          localStorage.removeItem(storageKey);
        }
      }

      console.log("[Daytona] 🚀 Creating new sandbox for project:", projectId);

      const response = await fetch("/api/sandbox/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        throw new Error("Failed to create sandbox");
      }

      const data = await response.json();
      const newSandboxId = data.sandboxId;

      // Store in localStorage for reuse
      localStorage.setItem(storageKey, newSandboxId);

      setSandboxId(newSandboxId);
      sandboxIdRef.current = newSandboxId;
      setIsReady(true);
      setIsBooting(false);

      console.log("[Daytona] ✅ Sandbox created and saved:", newSandboxId);
      return newSandboxId;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      console.error("[Daytona] ❌ Failed to create sandbox:", err);
      setError(errorMsg);
      setIsBooting(false);
      setIsReady(false);
      return null;
    }
  }, []);

  const writeFiles = useCallback(
    async (files: Array<{ path: string; content: string }>) => {
      if (!sandboxIdRef.current) {
        throw new Error("Sandbox not ready");
      }

      try {
        console.log(`[Daytona] 📁 Writing ${files.length} files...`);

        const response = await fetch("/api/sandbox/write-files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sandboxId: sandboxIdRef.current,
            files,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to write files");
        }

        const data = await response.json();
        console.log(
          `[Daytona] ✅ Files written: ${data.successCount}/${data.total}`
        );
      } catch (err) {
        console.error("[Daytona] ❌ Failed to write files:", err);
        throw err;
      }
    },
    []
  );

  const executeCommand = useCallback(
    async (command: string, cwd?: string) => {
      if (!sandboxIdRef.current) {
        throw new Error("Sandbox not ready");
      }

      try {
        console.log(`[Daytona] 🔧 Executing: ${command}`);

        const response = await fetch("/api/sandbox/exec", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sandboxId: sandboxIdRef.current,
            command,
            cwd,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to execute command");
        }

        const data = await response.json();
        console.log(`[Daytona] ✅ Command completed with exit code: ${data.exitCode}`);

        return {
          exitCode: data.exitCode,
          output: data.output,
        };
      } catch (err) {
        console.error("[Daytona] ❌ Failed to execute command:", err);
        throw err;
      }
    },
    []
  );

  const executeCommandAsync = useCallback(
    async (command: string, cwd?: string) => {
      if (!sandboxIdRef.current) {
        throw new Error("Sandbox not ready");
      }

      try {
        console.log(`[Daytona] 🔧 Executing (async): ${command}`);

        const response = await fetch("/api/sandbox/exec-async", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sandboxId: sandboxIdRef.current,
            command,
            cwd,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to execute command");
        }

        console.log(`[Daytona] ✅ Command started (async): ${command}`);
      } catch (err) {
        console.error("[Daytona] ❌ Failed to execute command:", err);
        throw err;
      }
    },
    []
  );

  const waitForServerReady = useCallback(
    async (port: number, timeoutMs: number = 45000) => {
      const startedAt = Date.now();
      while (Date.now() - startedAt < timeoutMs) {
        const result = await executeCommand(
          `sh -lc "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:${port}/ || true"`,
          "/home/daytona"
        );
        const statusCode = result.output.trim().slice(-3);
        if (statusCode === "200") {
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      throw new Error(`Dev server on port ${port} did not become ready`);
    },
    [executeCommand]
  );

  const exposePort = useCallback(
    async (port: number) => {
      if (!sandboxIdRef.current) {
        throw new Error("Sandbox not ready");
      }

      try {
        console.log(`[Daytona] 🌐 Exposing port ${port}...`);

        const response = await fetch("/api/sandbox/expose-port", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sandboxId: sandboxIdRef.current,
            port,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to expose port");
        }

        const data = await response.json();
        const daytonaUrl = data.previewUrl;
        const previewToken = data.previewToken ?? null;

        setPreviewUrl(daytonaUrl);
        console.log(`[Daytona] ✅ Preview URL: ${daytonaUrl}`);

        try {
          const params = new URLSearchParams({ url: daytonaUrl });
          if (previewToken) {
            params.set("token", previewToken);
          }
          await fetch(`/api/sandbox/warm-preview?${params.toString()}`, {
            method: "GET",
          }).catch(() => undefined);
        } catch (warmErr) {
          console.warn("[Daytona] ⚠️ Failed to warm preview URL", warmErr);
        }

        return daytonaUrl;
      } catch (err) {
        console.error("[Daytona] ❌ Failed to expose port:", err);
        setError(err instanceof Error ? err.message : "Failed to expose port");
        throw err;
      }
    },
    []
  );

  const destroySandbox = useCallback(async () => {
    if (!sandboxIdRef.current) {
      return;
    }

    try {
      console.log("[Daytona] 🗑️ Destroying sandbox:", sandboxIdRef.current);

      await fetch("/api/sandbox/destroy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sandboxId: sandboxIdRef.current,
        }),
      });

      setSandboxId(null);
      sandboxIdRef.current = null;
      setIsReady(false);
      setPreviewUrl(null);
      setError(null);

      console.log("[Daytona] ✅ Sandbox destroyed");
    } catch (err) {
      console.error("[Daytona] ❌ Failed to destroy sandbox:", err);
    }
  }, []);

  const restartDevServer = useCallback(async () => {
    if (!sandboxIdRef.current) {
      throw new Error("Sandbox not ready");
    }

    try {
      console.log("[Daytona] 🔄 Restarting dev server...");
      setIsBooting(true);

      // Install deps (detect package manager)
      const hasPnpmLock = (await executeCommand("test -f /home/daytona/pnpm-lock.yaml && echo yes || echo no", "/home/daytona")).output.includes("yes");
      const hasYarnLock = (await executeCommand("test -f /home/daytona/yarn.lock && echo yes || echo no", "/home/daytona")).output.includes("yes");
      let installCmd = "npm install";
      let packageManager: "npm" | "pnpm" | "yarn" = "npm";

      if (hasPnpmLock) {
        const pnpmCheck = await executeCommand("sh -lc 'command -v pnpm'", "/home/daytona");
        if (pnpmCheck.exitCode === 0) {
          installCmd = "pnpm install";
          packageManager = "pnpm";
        } else {
          console.warn("[Daytona] ⚠️ pnpm-lock.yaml found but pnpm is unavailable, falling back to npm install");
        }
      } else if (hasYarnLock) {
        const yarnCheck = await executeCommand("sh -lc 'command -v yarn'", "/home/daytona");
        if (yarnCheck.exitCode === 0) {
          installCmd = "yarn install";
          packageManager = "yarn";
        } else {
          console.warn("[Daytona] ⚠️ yarn.lock found but yarn is unavailable, falling back to npm install");
        }
      }

      console.log(`[Daytona] 📦 Installing deps with: ${installCmd}`);
      const installResult = await executeCommand(installCmd, "/home/daytona");
      if (installResult.exitCode !== 0) {
        console.error(`[Daytona] ❌ Dependency install failed (${installCmd})`, installResult.output);
        throw new Error(`Dependency installation failed (${installCmd})`);
      }

      // Kill existing dev server process
      console.log("[Daytona] 🛑 Stopping dev server...");
      await executeCommandAsync("pkill -f 'npm\\|node\\|vite'", "/home/daytona").catch(() => {
        // Ignore errors if process doesn't exist
      });

      // Wait for process to die
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Determine start command from package.json
      console.log("[Daytona] 📄 Reading package.json to determine start command...");
      const pkg = await executeCommand("cat /home/daytona/package.json", "/home/daytona");
      let startCommand =
        packageManager === "yarn"
          ? "yarn dev"
          : packageManager === "pnpm"
            ? "pnpm run dev"
            : "npm run dev";
      let devPort = 5173;
      let devScript: string | undefined;
      let isNextDev = false;
      let hasHostArg = false;
      let hasPortArg = false;
      try {
        const json = JSON.parse(pkg.output || "{}");
        const scripts = json.scripts || {};
        devScript = scripts.dev;
        const deps = { ...(json.dependencies || {}), ...(json.devDependencies || {}) } as Record<string, string>;
        if (!scripts.dev) {
          if (deps.vite || deps["@vitejs/plugin-react"]) {
            startCommand = "npx vite --host 0.0.0.0";
          } else {
            startCommand = "npx serve -l 5173 .";
          }
        }
        if (devScript) {
          const portMatch = devScript.match(/--port\s+(\d+)|-p\s+(\d+)/);
          if (portMatch) devPort = parseInt(portMatch[1] || portMatch[2], 10);
          else if (/next\s+dev/.test(devScript)) devPort = 3000;
          isNextDev = /next\s+dev/.test(devScript);
          hasHostArg = /--hostname\s+\S+|-H\s+\S+/.test(devScript);
          hasPortArg = /--port\s+\d+|-p\s+\d+/.test(devScript);
        }
      } catch {
        startCommand = "npx vite --host 0.0.0.0";
      }
      console.log(`[Daytona] ▶️ Start command: ${startCommand}`);

      // Determine dev port for exposure
      try {
        if (!devScript) {
          const json = JSON.parse(pkg.output || "{}");
          devScript = (json.scripts || {}).dev;
        }
        const m = devScript?.match(/--port\s+(\d+)|-p\s+(\d+)/);
        if (m) devPort = parseInt(m[1] || m[2], 10);
        else if (/next\s+dev/.test(devScript || "")) devPort = 3000;
      } catch {}

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

      // Start dev server again
      console.log("[Daytona] 🚀 Starting dev server...");
      await executeCommandAsync(startCommand, "/home/daytona");

      console.log(`[Daytona] ⏳ Waiting for dev server on port ${devPort}...`);
      await waitForServerReady(devPort);

      // Expose the (possibly new) port so previewUrl points to the right server
      try {
        await exposePort(devPort);
      } catch (e) {
        console.warn("[Daytona] ⚠️ Failed to expose port after restart", e);
      }

      console.log("[Daytona] ✅ Dev server restarted");
      setIsBooting(false);
    } catch (err) {
      console.error("[Daytona] ❌ Failed to restart dev server:", err);
      setIsBooting(false);
      setError(err instanceof Error ? err.message : "Failed to restart dev server");
      throw err;
    }
  }, [executeCommand, executeCommandAsync, exposePort, waitForServerReady]);

  return (
    <DaytonaContext.Provider
      value={{
        sandboxId,
        isBooting,
        isReady,
        previewUrl,
        error,
        setError,
        createSandbox,
        writeFiles,
        executeCommand,
        executeCommandAsync,
        exposePort,
        destroySandbox,
        restartDevServer,
      }}
    >
      {children}
    </DaytonaContext.Provider>
  );
}

export function useDaytonaContext() {
  const context = useContext(DaytonaContext);
  if (!context) {
    throw new Error("useDaytonaContext must be used within DaytonaProvider");
  }
  return context;
}
