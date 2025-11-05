"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

interface DeleteProjectDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectTitle: string;
  onDeleteComplete: () => void;
}

export function DeleteProjectDialog({
  isOpen,
  onOpenChange,
  projectId,
  projectTitle,
  onDeleteComplete,
}: DeleteProjectDialogProps) {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const expectedText = `delete:${projectTitle}`;
  const isConfirmValid = confirmText === expectedText;

  const handleDelete = async () => {
    if (!isConfirmValid) {
      toast.error("Please enter the correct confirmation text", {
        duration: 3000,
        position: "top-right",
        style: {
          background: "#1f2937",
          color: "#fff",
          border: "1px solid #374151",
        },
      });
      return;
    }

    setIsDeleting(true);

    try {
      const { createClientSideClient } = await import("@/lib/appwrite/config");
      const { DATABASE_ID, COLLECTIONS } = await import(
        "@/lib/appwrite/config"
      );
      const { Query } = await import("appwrite");
      const { databases } = createClientSideClient();

      const [filesResponse, messagesResponse] = await Promise.all([
        databases.listDocuments(DATABASE_ID, COLLECTIONS.PROJECT_FILES, [
          Query.equal("projectId", projectId),
          Query.limit(1000),
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTIONS.MESSAGES, [
          Query.equal("projectId", projectId),
          Query.limit(1000),
        ]),
      ]);

      const fileDeletePromises = filesResponse.documents.map((file) =>
        databases.deleteDocument(
          DATABASE_ID,
          COLLECTIONS.PROJECT_FILES,
          file.$id
        )
      );

      const messageDeletePromises = messagesResponse.documents.map((message) =>
        databases.deleteDocument(DATABASE_ID, COLLECTIONS.MESSAGES, message.$id)
      );

      const projectDeletePromise = databases.deleteDocument(
        DATABASE_ID,
        COLLECTIONS.PROJECTS,
        projectId
      );

      await Promise.all([
        ...fileDeletePromises,
        ...messageDeletePromises,
        projectDeletePromise,
      ]);

      onDeleteComplete();

      toast.success("Project deleted successfully", {
        duration: 3000,
        position: "top-right",
        style: {
          background: "#1f2937",
          color: "#fff",
          border: "1px solid #374151",
        },
      });

      setConfirmText("");
      onOpenChange(false);
      router.push("/dashboard");
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error("Failed to delete project. Please try again.", {
        duration: 4000,
        position: "top-right",
        style: {
          background: "#1f2937",
          color: "#fff",
          border: "1px solid #374151",
        },
      });
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    setConfirmText("");
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1">
              <DialogTitle>Delete Project</DialogTitle>
              <DialogDescription className="mt-2">
                This action cannot be undone. This will permanently delete the
                project &quot;{projectTitle}&quot; and remove all associated
                files, messages, and data.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              To confirm deletion, please type:{" "}
              <span className="font-mono font-semibold text-foreground">
                {expectedText}
              </span>
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isConfirmValid) {
                  handleDelete();
                }
              }}
              placeholder={expectedText}
              className="w-full font-mono"
              disabled={isDeleting}
              autoFocus
            />
          </div>

          {confirmText && !isConfirmValid && (
            <p className="text-sm text-destructive">
              The confirmation text doesn&apos;t match
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={handleCancel}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmValid || isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Project
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
