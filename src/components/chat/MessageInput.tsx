/**
 * MessageInput - Chat message input component with fixed height
 * Handles user text input with keyboard shortcuts and submission
 * Features: Fixed height (h-32), modern scrollbar, Enter to send, Shift+Enter for new line, file attachments
 * Used in: ChatInterface for user message composition
 */
"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ArrowUp, Square, Paperclip, X, FileText, Image as ImageIcon, File, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/helpers";

export interface FileAttachment {
  name: string;
  contentType: string;
  url: string;
  size: number;
  textContent?: string;
}

interface MessageInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  disabled?: boolean;
  placeholder?: string;
  attachments?: FileAttachment[];
  onAttachmentsChange?: (attachments: FileAttachment[]) => void;
  onEnhance?: () => void;
  isEnhancing?: boolean;
}

export function MessageInput({
  value,
  onChange,
  onSubmit,
  isLoading,
  disabled,
  placeholder = "Type your message...",
  attachments = [],
  onAttachmentsChange,
  onEnhance,
  isEnhancing = false,
}: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!value.trim() && attachments.length === 0) || isLoading || disabled) return;
    onSubmit(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Handle file upload
  const uploadFiles = async (files: File[]) => {
    if (!onAttachmentsChange) return;

    const fileNames = files.map(f => f.name);
    setUploadingFiles(prev => [...prev, ...fileNames]);

    try {
      const formData = new FormData();
      files.forEach(file => formData.append("files", file));

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      onAttachmentsChange([...attachments, ...data.attachments]);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload files. Please try again.");
    } finally {
      setUploadingFiles(prev => prev.filter(name => !fileNames.includes(name)));
    }
  };

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      uploadFiles(files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle drag and drop
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      uploadFiles(files);
    }
  };

  // Handle paste
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const files = items
      .filter(item => item.kind === "file")
      .map(item => item.getAsFile())
      .filter((file): file is File => file !== null);

    if (files.length > 0) {
      e.preventDefault();
      uploadFiles(files);
    }
  };

  // Remove attachment
  const removeAttachment = (index: number) => {
    if (!onAttachmentsChange) return;
    onAttachmentsChange(attachments.filter((_, i) => i !== index));
  };

  // Get file icon
  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith("image/")) return <ImageIcon className="h-4 w-4" />;
    if (contentType.includes("pdf") || contentType.includes("document")) return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-2">
      {/* Attachments preview */}
      {(attachments.length > 0 || uploadingFiles.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {/* Uploaded files */}
          {attachments.map((attachment, index) => (
            <div
              key={index}
              className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg border border-border"
            >
              {attachment.contentType.startsWith("image/") ? (
                <img
                  src={attachment.url}
                  alt={attachment.name}
                  className="h-8 w-8 object-cover rounded"
                />
              ) : (
                getFileIcon(attachment.contentType)
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{attachment.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(attachment.size)}
                  {attachment.textContent && " • Text extracted"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeAttachment(index)}
                className="p-1 hover:bg-background rounded"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}

          {/* Uploading files */}
          {uploadingFiles.map((fileName, index) => (
            <div
              key={`uploading-${index}`}
              className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg border border-border opacity-60"
            >
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{fileName}</p>
                <p className="text-xs text-muted-foreground">Uploading...</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative flex items-end gap-2 rounded-xl overflow-hidden border bg-muted/30 px-4 py-3 transition-colors",
          isDragging ? "border-primary bg-primary/10" : "border-border"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileChange}
          className="hidden"
          accept="image/*,.pdf,.txt,.docx"
        />

        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="h-10 w-10 rounded-full flex-shrink-0"
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "flex-1 resize-none bg-transparent text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 h-32 overflow-y-auto scrollbar-modern"
          )}
        />

        {onEnhance && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={onEnhance}
            disabled={!value.trim() || isEnhancing || isLoading || disabled}
            className="h-10 w-10 rounded-full flex-shrink-0"
            title="Enhance prompt"
          >
            {isEnhancing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
          </Button>
        )}

        <Button
          type="submit"
          size="icon"
          disabled={(!value.trim() && attachments.length === 0) || isLoading || disabled}
          className="h-10 w-10 rounded-full flex-shrink-0"
        >
          {isLoading ? (
            <Square className="h-4 w-4" />
          ) : (
            <ArrowUp className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
