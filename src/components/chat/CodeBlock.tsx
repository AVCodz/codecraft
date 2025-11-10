/**
 * CodeBlock - Syntax highlighted code block with Shiki
 * Displays code with proper syntax highlighting matching the app theme
 * Features: Shiki highlighting, copy button, language badge, horizontal scroll
 * Used in: Chat messages for displaying code snippets
 */
"use client";

import { useState, useEffect } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/helpers";
import { codeToHtml } from "shiki";

interface CodeBlockProps {
  children: string;
  className?: string;
  inline?: boolean;
}

const VALID_LANGUAGES = new Set([
  "javascript",
  "js",
  "typescript",
  "ts",
  "jsx",
  "tsx",
  "python",
  "py",
  "java",
  "c",
  "cpp",
  "c++",
  "csharp",
  "cs",
  "go",
  "rust",
  "php",
  "ruby",
  "swift",
  "kotlin",
  "dart",
  "html",
  "css",
  "scss",
  "sass",
  "less",
  "json",
  "xml",
  "yaml",
  "yml",
  "markdown",
  "md",
  "sql",
  "graphql",
  "bash",
  "sh",
  "shell",
  "dockerfile",
  "docker",
  "nginx",
  "apache",
  "plaintext",
]);

export function CodeBlock({ children, className, inline }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [highlightedCode, setHighlightedCode] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  const language = className?.replace(/language-/, "") || "text";
  const isValidLanguage = VALID_LANGUAGES.has(language.toLowerCase());

  useEffect(() => {
    if (!isValidLanguage) {
      setIsLoading(false);
      return;
    }

    const highlightCode = async () => {
      setIsLoading(true);
      try {
        const html = await codeToHtml(children.trim(), {
          lang: language === "text" ? "plaintext" : language,
          themes: {
            light: "github-light",
            dark: "github-dark",
          },
          defaultColor: false,
        });
        setHighlightedCode(html);
      } catch (error) {
        console.error("Failed to highlight code:", error);
        setHighlightedCode(
          `<pre><code>${children
            .trim()
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")}</code></pre>`
        );
      } finally {
        setIsLoading(false);
      }
    };

    highlightCode();
  }, [children, language, isValidLanguage]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (inline) {
    return (
      <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono border border-border">
        {children}
      </code>
    );
  }

  if (!isValidLanguage) {
    return (
      <div className="relative group my-4 w-full max-w-full min-w-0">
        <div className="relative w-full max-w-full min-w-0 border border-border rounded-lg overflow-x-auto bg-muted/30 p-4">
          <strong className="font-semibold text-foreground whitespace-pre-wrap break-words">
            {children}
          </strong>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group my-4 w-full max-w-full min-w-0">
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border border-border rounded-t-lg">
        <span className="text-xs font-medium text-muted-foreground uppercase">
          {language}
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCopy}
          className="h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 mr-1" />
              <span className="text-xs">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3 mr-1" />
              <span className="text-xs">Copy</span>
            </>
          )}
        </Button>
      </div>

      <div className="relative w-full max-w-full min-w-0 border border-t-0 border-border rounded-b-lg overflow-x-auto bg-[#ffffff] dark:bg-muted/15">
        {isLoading ? (
          <div className="p-4">
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "scrollbar-modern",
              // Ensure the inner <pre> fills container width and scrolls horizontally when needed
              "[&>pre]:!m-0 [&>pre]:!p-4 [&>pre]:!w-full [&>pre]:!min-w-0 [&>pre]:!overflow-x-auto",
              "[&>pre]:!bg-transparent",
              "[&>pre]:!rounded-none",
              "[&>pre>code]:!bg-transparent",
              "[&>pre>code]:!text-sm",
              "[&>pre>code]:!font-mono",
              "[&>pre>code]:!leading-relaxed"
            )}
            dangerouslySetInnerHTML={{ __html: highlightedCode }}
          />
        )}
      </div>
    </div>
  );
}
