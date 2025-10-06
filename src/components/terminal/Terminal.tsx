"use client";

import { useEffect, useRef, useState } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { useUIStore } from "@/lib/stores/uiStore";
import { Button } from "@/components/ui/Button";
import { X, Maximize2, Minimize2 } from "lucide-react";
import "@xterm/xterm/css/xterm.css";

interface TerminalProps {
  className?: string;
}

export function Terminal({ className }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const { theme, toggleTerminal } = useUIStore();
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Create terminal instance
    const terminal = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: theme === "dark" ? "#0a0a0a" : "#ffffff",
        foreground: theme === "dark" ? "#ededed" : "#000000",
        cursor: theme === "dark" ? "#ededed" : "#000000",
        selectionBackground: theme === "dark" ? "#264f78" : "#0078d4",
        black: theme === "dark" ? "#000000" : "#000000",
        red: theme === "dark" ? "#cd3131" : "#cd3131",
        green: theme === "dark" ? "#0dbc79" : "#00bc00",
        yellow: theme === "dark" ? "#e5e510" : "#949800",
        blue: theme === "dark" ? "#2472c8" : "#0451a5",
        magenta: theme === "dark" ? "#bc3fbc" : "#bc05bc",
        cyan: theme === "dark" ? "#11a8cd" : "#0598bc",
        white: theme === "dark" ? "#e5e5e5" : "#555555",
        brightBlack: theme === "dark" ? "#666666" : "#666666",
        brightRed: theme === "dark" ? "#f14c4c" : "#cd3131",
        brightGreen: theme === "dark" ? "#23d18b" : "#14ce14",
        brightYellow: theme === "dark" ? "#f5f543" : "#b5ba00",
        brightBlue: theme === "dark" ? "#3b8eea" : "#0451a5",
        brightMagenta: theme === "dark" ? "#d670d6" : "#bc05bc",
        brightCyan: theme === "dark" ? "#29b8db" : "#0598bc",
        brightWhite: theme === "dark" ? "#e5e5e5" : "#a5a5a5",
      },
      allowProposedApi: true,
    });

    // Create addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    // Load addons
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);

    // Open terminal
    terminal.open(terminalRef.current);
    fitAddon.fit();

    // Store references
    xtermRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Welcome message
    terminal.writeln(
      "\x1b[1;32m╭─────────────────────────────────────╮\x1b[0m"
    );
    terminal.writeln("\x1b[1;32m│       Welcome to CodeCraft AI      │\x1b[0m");
    terminal.writeln(
      "\x1b[1;32m│         Terminal Interface          │\x1b[0m"
    );
    terminal.writeln(
      "\x1b[1;32m╰─────────────────────────────────────╯\x1b[0m"
    );
    terminal.writeln("");
    terminal.writeln(
      "\x1b[1;36mℹ\x1b[0m This terminal shows build logs and command outputs."
    );
    terminal.writeln(
      "\x1b[1;36mℹ\x1b[0m Files are automatically saved and processed by the AI."
    );
    terminal.writeln("");

    // Simulate some activity
    setTimeout(() => {
      terminal.writeln(
        "\x1b[1;33m[INFO]\x1b[0m Project initialized successfully"
      );
      terminal.writeln("\x1b[1;32m[SUCCESS]\x1b[0m Ready for development");
      terminal.write("\x1b[1;34m$\x1b[0m ");
    }, 1000);

    // Handle resize
    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    };

    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      terminal.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, [theme]);

  // Handle theme changes
  useEffect(() => {
    if (xtermRef.current) {
      xtermRef.current.options.theme = {
        background: theme === "dark" ? "#0a0a0a" : "#ffffff",
        foreground: theme === "dark" ? "#ededed" : "#000000",
        cursor: theme === "dark" ? "#ededed" : "#000000",
        selectionBackground: theme === "dark" ? "#264f78" : "#0078d4",
      };
    }
  }, [theme]);

  // Fit terminal when maximized state changes
  useEffect(() => {
    setTimeout(() => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    }, 100);
  }, [isMaximized]);

  const handleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  const writeToTerminal = (
    message: string,
    type: "info" | "success" | "error" | "warning" = "info"
  ) => {
    if (!xtermRef.current) return;

    const colors = {
      info: "\x1b[1;36m[INFO]\x1b[0m",
      success: "\x1b[1;32m[SUCCESS]\x1b[0m",
      error: "\x1b[1;31m[ERROR]\x1b[0m",
      warning: "\x1b[1;33m[WARNING]\x1b[0m",
    };

    xtermRef.current.writeln(`${colors[type]} ${message}`);
  };

  // Expose terminal methods for external use
  useEffect(() => {
    // You could expose these methods via a context or ref
    (window as any).terminalWrite = writeToTerminal;
  }, []);

  return (
    <div className={`flex flex-col h-full bg-background ${className}`}>
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <span className="text-sm font-medium">Terminal</span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={handleMaximize}
            className="h-6 w-6"
            title={isMaximized ? "Minimize" : "Maximize"}
          >
            {isMaximized ? (
              <Minimize2 className="h-3 w-3" />
            ) : (
              <Maximize2 className="h-3 w-3" />
            )}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleTerminal}
            className="h-6 w-6"
            title="Close Terminal"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Terminal Content */}
      <div
        ref={terminalRef}
        className={`flex-1 ${
          isMaximized ? "fixed inset-0 z-50 bg-background" : ""
        }`}
        style={{
          minHeight: isMaximized ? "100vh" : "200px",
          paddingTop: isMaximized ? "40px" : "0",
        }}
      />
    </div>
  );
}
