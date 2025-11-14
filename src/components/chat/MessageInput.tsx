/**
 * MessageInput - Chat message input component with fixed height
 * Handles user text input with keyboard shortcuts and submission
 * Features: Fixed height (h-32), modern scrollbar, Enter to send, Shift+Enter for new line, file attachments
 * Used in: ChatInterface for user message composition
 */
"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
  File,
  Sparkles,
  Send,
  Loader2,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils/helpers";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip } from "@/components/ui/Tooltip";
import { useProjectStore } from "@/lib/stores/projectStore";
import { useFilesStore } from "@/lib/stores/filesStore";
import { useFileMention } from "@/lib/hooks/useFileMention";
import { FileMentionTag } from "./FileMentionTag";
import { FileMentionDropdown } from "./FileMentionDropdown";

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
  onSubmit: (
    e: React.FormEvent,
    message?: string,
    mentionedFiles?: string[]
  ) => void;
  isLoading: boolean;
  disabled?: boolean;
  placeholder?: string;
  attachments?: FileAttachment[];
  onAttachmentsChange?: (attachments: FileAttachment[]) => void;
  onEnhance?: () => void;
  isEnhancing?: boolean;
  isPlanMode?: boolean;
  onPlanModeChange?: (value: boolean) => void;
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
  isPlanMode = false,
  onPlanModeChange,
}: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);

  const { currentProject } = useProjectStore();
  const { getFiles, getFileTree } = useFilesStore();
  const projectFiles = currentProject ? getFiles(currentProject.$id) : [];
  const fileTree = currentProject ? getFileTree(currentProject.$id) : [];

  const fileMention = useFileMention(
    value,
    textareaRef,
    projectFiles,
    fileTree,
    onChange
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!value.trim() && attachments.length === 0) || isLoading || disabled)
      return;

    const mentionedFilePaths = fileMention.mentionedFiles.map((f) => f.path);
    onSubmit(e, value, mentionedFilePaths);
    fileMention.clearMentions();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    fileMention.handleKeyDown(e);

    if (fileMention.showDropdown) {
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Handle file upload
  const uploadFiles = async (files: File[]) => {
    if (!onAttachmentsChange) return;

    const fileNames = files.map((f) => f.name);
    setUploadingFiles((prev) => [...prev, ...fileNames]);

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));

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
      setUploadingFiles((prev) =>
        prev.filter((name) => !fileNames.includes(name))
      );
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
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
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
    if (contentType.startsWith("image/"))
      return <ImageIcon className="h-4 w-4" />;
    if (contentType.includes("pdf") || contentType.includes("document"))
      return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  return (
    <div className="space-y-2">
      {/* Attachments preview */}
      <AnimatePresence>
        {(attachments.length > 0 || uploadingFiles.length > 0) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-2"
          >
            <div className="flex flex-wrap gap-3">
              {/* Uploaded files */}
              {attachments.map((attachment, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="relative group"
                >
                  {/* File Preview Card */}
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-border bg-background/50 flex items-center justify-center">
                    {attachment.contentType.startsWith("image/") ? (
                      <Image
                        src={attachment.url}
                        alt={attachment.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex items-center justify-center">
                        {getFileIcon(attachment.contentType)}
                      </div>
                    )}
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => removeAttachment(index)}
                    className="absolute -top-2 -right-2 p-1 rounded-full bg-background border border-border hover:bg-red-500 hover:border-red-500 transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>

                  {/* File Name Tooltip */}
                  <div className="absolute bottom-0 left-0 right-0 bg-background/90 backdrop-blur-sm px-2 py-1 text-xs truncate rounded-b-xl opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    {attachment.name}
                  </div>
                </motion.div>
              ))}

              {/* Uploading files */}
              {uploadingFiles.map((fileName, index) => (
                <motion.div
                  key={`uploading-${index}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="relative"
                >
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-border bg-background/50 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>

                  {/* File Name */}
                  <div className="absolute bottom-0 left-0 right-0 bg-background/90 backdrop-blur-sm px-2 py-1 text-xs truncate rounded-b-xl">
                    {fileName}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File Mentions Section with Dropdown */}
      <div className="relative">
        {/* File Mention Dropdown - Positioned above file mentions */}
        <AnimatePresence>
          {fileMention.showDropdown && (
            <div className="absolute bottom-full left-0 right-0 mb-2 z-50">
              <FileMentionDropdown
                files={fileMention.filteredFiles}
                folders={fileMention.filteredFolders}
                onSelect={fileMention.handleSelect}
                onClose={() => fileMention.setShowDropdown(false)}
                position={fileMention.dropdownPosition}
                selectedIndex={fileMention.selectedIndex}
              />
            </div>
          )}
        </AnimatePresence>

        {/* File Mentions */}
        {fileMention.mentionedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {fileMention.mentionedFiles.map((mention) => (
              <FileMentionTag
                key={mention.path}
                path={mention.path}
                type={mention.type}
                onRemove={() => fileMention.removeMention(mention.path)}
              />
            ))}
          </div>
        )}
      </div>

      <div
        className={cn(
          "relative rounded-xl border bg-muted/30 px-4 py-3 transition-colors",
          isDragging ? "border-primary bg-primary/10" : "border-border"
        )}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileChange}
          className="hidden"
          accept="image/*,.pdf,.txt,.docx"
        />

        <textarea
          ref={textareaRef}
          value={value}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "w-full px-1 py-2 bg-transparent border-none text-sm focus:outline-none resize-none text-foreground placeholder:text-muted-foreground placeholder:text-sm  min-h-[100px]",
            isDragging && "opacity-50"
          )}
        />

        {isDragging && (
          <div className="absolute inset-0 border-2 border-dashed border-primary rounded-lg bg-primary/5 flex items-center justify-center">
            <p className="text-sm text-primary font-medium">Drop files here</p>
          </div>
        )}

        {/* Bottom Actions Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-xl p-2 bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Attach files"
            >
              <Paperclip className="w-4 h-4" />
              Attach
            </motion.button>

            {onPlanModeChange && (
              <button
                type="button"
                onClick={() => onPlanModeChange(!isPlanMode)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors",
                  isPlanMode
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-border bg-muted/60 text-muted-foreground"
                )}
              >
                <ClipboardList className="h-4 w-4" />
                {isPlanMode ? "Plan mode on" : "Plan mode off"}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onEnhance && (
              <Tooltip
                label="Enhance Prompt"
                position="top"
                disabled={!value.trim() || isEnhancing || isLoading || disabled}
              >
                <motion.button
                  type="button"
                  onClick={onEnhance}
                  disabled={
                    !value.trim() || isEnhancing || isLoading || disabled
                  }
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  whileTap={{ scale: 0.95, rotate: -5 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  className="flex cursor-pointer items-center justify-center w-10 h-10 rounded-full bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isEnhancing ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                </motion.button>
              </Tooltip>
            )}

            <motion.button
              onClick={handleSubmit}
              disabled={
                (!value.trim() && attachments.length === 0) ||
                isLoading ||
                disabled
              }
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="flex cursor-pointer items-center justify-center w-10 h-10 rounded-full bg-primary hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Send message"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-muted-foreground border-t-transparent" />
              ) : (
                <Send className="w-4 h-4 text-foreground" />
              )}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
