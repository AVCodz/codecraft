"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/authStore";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  Dropdown,
  DropdownItem,
  DropdownSeparator,
} from "@/components/ui/Dropdown";
import Logo from "@/components/ui/icon/logo";
import {
  Save,
  Trash2,
  Calendar,
  LogOut,
  LayoutDashboard,
  ArrowLeft,
  Edit3,
  User as UserIcon,
  Lock,
  AlertTriangle,
} from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";

export default function UserSettingsPage() {
  const router = useRouter();
  const { user, checkAuth } = useAuthStore();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsSavingProfile(true);

    try {
      const { createClientSideClient } = await import("@/lib/appwrite/config");
      const { account } = createClientSideClient();

      await account.updateName(name);

      await checkAuth();
      setIsEditingProfile(false);

      toast.success("Profile updated successfully", {
        duration: 3000,
        position: "top-right",
        style: {
          background: "#1f2937",
          color: "#fff",
          border: "1px solid #374151",
        },
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile", {
        duration: 3000,
        position: "top-right",
        style: {
          background: "#1f2937",
          color: "#fff",
          border: "1px solid #374151",
        },
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user) return;

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match", {
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

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters", {
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

    setIsSavingPassword(true);

    try {
      const { createClientSideClient } = await import("@/lib/appwrite/config");
      const { account } = createClientSideClient();

      await account.updatePassword(newPassword, currentPassword);

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setIsEditingPassword(false);

      toast.success("Password changed successfully", {
        duration: 3000,
        position: "top-right",
        style: {
          background: "#1f2937",
          color: "#fff",
          border: "1px solid #374151",
        },
      });
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error("Failed to change password. Check your current password.", {
        duration: 3000,
        position: "top-right",
        style: {
          background: "#1f2937",
          color: "#fff",
          border: "1px solid #374151",
        },
      });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== `delete:${user?.email}`) {
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

      const [projectsResponse, filesResponse, messagesResponse] =
        await Promise.all([
          databases.listDocuments(DATABASE_ID, COLLECTIONS.PROJECTS, [
            Query.equal("userId", user?.$id || ""),
            Query.limit(1000),
          ]),
          databases.listDocuments(DATABASE_ID, COLLECTIONS.PROJECT_FILES, [
            Query.equal("userId", user?.$id || ""),
            Query.limit(1000),
          ]),
          databases.listDocuments(DATABASE_ID, COLLECTIONS.MESSAGES, [
            Query.equal("userId", user?.$id || ""),
            Query.limit(1000),
          ]),
        ]);

      const projectDeletePromises = projectsResponse.documents.map(
        (project: { $id: string }) =>
          databases.deleteDocument(
            DATABASE_ID,
            COLLECTIONS.PROJECTS,
            project.$id
          )
      );

      const fileDeletePromises = filesResponse.documents.map(
        (file: { $id: string }) =>
          databases.deleteDocument(
            DATABASE_ID,
            COLLECTIONS.PROJECT_FILES,
            file.$id
          )
      );

      const messageDeletePromises = messagesResponse.documents.map(
        (message: { $id: string }) =>
          databases.deleteDocument(DATABASE_ID, COLLECTIONS.MESSAGES, message.$id)
      );

      await Promise.all([
        ...projectDeletePromises,
        ...fileDeletePromises,
        ...messageDeletePromises,
      ]);

      await fetch("/api/auth/logout", { method: "POST" });

      toast.success("Account deleted successfully", {
        duration: 3000,
        position: "top-right",
        style: {
          background: "#1f2937",
          color: "#fff",
          border: "1px solid #374151",
        },
      });

      router.push("/");
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error("Failed to delete account. Please try again.", {
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

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const expectedDeleteText = `delete:${user.email}`;

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 border-b border-border bg-background/95 backdrop-blur z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="grid grid-cols-3 items-center">
            <button
              onClick={() => router.push("/")}
              className="flex cursor-pointer items-center gap-2 hover:opacity-80 transition-opacity w-fit"
            >
              <Logo size={24} className="text-primary flex-shrink-0" />
              <span className="font-brand text-xl font-bold">VibeIt</span>
            </button>

            <div className="flex justify-center">
              <h1 className="text-lg font-semibold">Account Settings</h1>
            </div>

            <div className="flex justify-end">
              <Dropdown
                align="right"
                trigger={
                  <button
                    className="flex cursor-pointer items-center gap-2 bg-muted/60 hover:bg-muted/40 rounded-lg transition-colors"
                    title={user?.email}
                  >
                    <span className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary text-white font-semibold text-lg">
                      {user?.name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 1) || "U"}
                    </span>
                  </button>
                }
              >
                <DropdownItem onClick={() => router.push("/dashboard")}>
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </DropdownItem>
                <DropdownSeparator />
                <DropdownItem onClick={handleSignOut}>
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </DropdownItem>
              </Dropdown>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl pt-24">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Account Settings</h2>
            <p className="text-muted-foreground mt-2">
              Manage your account information and preferences
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push("/")}
            className="cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-card border border-border rounded-lg p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <UserIcon className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">Profile Information</h2>
                </div>
                {!isEditingProfile ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingProfile(true)}
                    className="cursor-pointer"
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile}
                    className="cursor-pointer"
                  >
                    {isSavingProfile ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-background border-t-transparent mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Full Name
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    disabled={!isEditingProfile}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Email Address
                  </label>
                  <Input value={email} disabled />
                  <p className="text-xs text-muted-foreground mt-1">
                    Email cannot be changed
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-card border border-border rounded-lg p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">Change Password</h2>
                </div>
                {!isEditingPassword && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingPassword(true)}
                    className="cursor-pointer"
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Change
                  </Button>
                )}
              </div>

              {isEditingPassword && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Current Password
                    </label>
                    <Input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      New Password
                    </label>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Must be at least 8 characters
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Confirm New Password
                    </label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={handleChangePassword}
                      disabled={isSavingPassword}
                      className="cursor-pointer"
                    >
                      {isSavingPassword ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-background border-t-transparent mr-2" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Update Password
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditingPassword(false);
                        setCurrentPassword("");
                        setNewPassword("");
                        setConfirmPassword("");
                      }}
                      className="cursor-pointer"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {!isEditingPassword && (
                <p className="text-sm text-muted-foreground">
                  Click &quot;Change&quot; to update your password
                </p>
              )}
            </motion.div>
          </div>

          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-card border border-border rounded-lg p-6"
            >
              <h2 className="text-lg font-semibold mb-4">Account Details</h2>
              <div className="space-y-3 text-sm">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Member Since</span>
                  </div>
                  <span className="pl-6">
                    {formatDate(
                      (user as { registration?: string }).registration
                    )}
                  </span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="bg-destructive/10 border border-destructive/20 rounded-lg p-6"
            >
              <h2 className="text-lg font-semibold mb-2 text-destructive">
                Danger Zone
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Once you delete your account, there is no going back. All your
                projects, files, and data will be permanently deleted.
              </p>
              <Button
                variant="destructive"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="w-full cursor-pointer"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account
              </Button>
            </motion.div>
          </div>
        </div>
      </div>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1">
                <DialogTitle>Delete Account</DialogTitle>
                <DialogDescription className="mt-2">
                  This action cannot be undone. This will permanently delete
                  your account and remove all associated projects, files,
                  messages, and data.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                To confirm deletion, please type:{" "}
                <span className="font-mono font-semibold text-foreground">
                  {expectedDeleteText}
                </span>
              </p>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    deleteConfirmText === expectedDeleteText
                  ) {
                    handleDeleteAccount();
                  }
                }}
                placeholder={expectedDeleteText}
                className="w-full font-mono"
                disabled={isDeleting}
                autoFocus
              />
            </div>

            {deleteConfirmText &&
              deleteConfirmText !== expectedDeleteText && (
                <p className="text-sm text-destructive">
                  The confirmation text doesn&apos;t match
                </p>
              )}
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setDeleteConfirmText("");
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={
                deleteConfirmText !== expectedDeleteText || isDeleting
              }
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-background border-t-transparent mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
