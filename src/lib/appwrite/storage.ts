import { ID } from "node-appwrite";
import { storage, BUCKETS } from "./config";

// Upload file to storage
export async function uploadFile(
  bucketId: string,
  file: File | Buffer,
  fileName?: string,
  permissions?: string[]
) {
  try {
    const fileId = ID.unique();

    // Convert Buffer to File if needed
    let fileToUpload: File;
    if (file instanceof Buffer) {
      const uint8Array = new Uint8Array(file);
      const blob = new Blob([uint8Array]);
      fileToUpload = new File([blob], fileName || "file", {
        type: "application/octet-stream",
      });
    } else {
      fileToUpload = file as File;
    }

    const uploadedFile = await storage.createFile(
      bucketId,
      fileId,
      fileToUpload,
      permissions
    );

    return { success: true, file: uploadedFile };
  } catch (error: any) {
    console.error("Error uploading file:", error);
    return { success: false, error: error.message };
  }
}

// Get file download URL
export async function getFileUrl(bucketId: string, fileId: string) {
  try {
    const url = storage.getFileDownload(bucketId, fileId);
    return { success: true, url };
  } catch (error: any) {
    console.error("Error getting file URL:", error);
    return { success: false, error: error.message };
  }
}

// Get file preview URL
export async function getFilePreview(
  bucketId: string,
  fileId: string,
  width?: number,
  height?: number,
  quality?: number
) {
  try {
    const url = storage.getFilePreview(
      bucketId,
      fileId,
      width,
      height,
      undefined, // gravity
      quality
    );
    return { success: true, url };
  } catch (error: any) {
    console.error("Error getting file preview:", error);
    return { success: false, error: error.message };
  }
}

// Delete file from storage
export async function deleteFile(bucketId: string, fileId: string) {
  try {
    await storage.deleteFile(bucketId, fileId);
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting file:", error);
    return { success: false, error: error.message };
  }
}

// Upload project export (ZIP file)
export async function uploadProjectExport(
  projectId: string,
  zipBuffer: Buffer,
  userId: string
) {
  const fileName = `project-${projectId}-${Date.now()}.zip`;
  const permissions = [`read("user:${userId}")`];

  return uploadFile(BUCKETS.PROJECT_EXPORTS, zipBuffer, fileName, permissions);
}

// Upload user avatar
export async function uploadUserAvatar(
  userId: string,
  avatarFile: File,
  permissions?: string[]
) {
  const fileName = `avatar-${userId}-${Date.now()}`;
  const defaultPermissions = [
    `read("user:${userId}")`,
    `write("user:${userId}")`,
    'read("any")',
  ];

  return uploadFile(
    BUCKETS.USER_AVATARS,
    avatarFile,
    fileName,
    permissions || defaultPermissions
  );
}

// Get user avatar URL
export async function getUserAvatarUrl(fileId: string) {
  return getFilePreview(BUCKETS.USER_AVATARS, fileId, 200, 200, 80);
}

// List files in bucket
export async function listFiles(bucketId: string, queries?: string[]) {
  try {
    const files = await storage.listFiles(bucketId, queries);
    return { success: true, files };
  } catch (error: any) {
    console.error("Error listing files:", error);
    return { success: false, error: error.message };
  }
}
