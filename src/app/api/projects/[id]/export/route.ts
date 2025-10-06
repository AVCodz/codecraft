import { NextRequest } from "next/server";
import { getProject, getProjectFiles } from "@/lib/appwrite/database";
import { getCurrentUser } from "@/lib/appwrite/auth";
import { createProjectZipBuffer } from "@/lib/utils/zipExport";

// GET /api/projects/[id]/export - Export project as ZIP
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify user authentication
    const userResult = await getCurrentUser();
    if (!userResult.success || !userResult.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { id: projectId } = await params;

    // Get project and files
    const [project, files] = await Promise.all([
      getProject(projectId),
      getProjectFiles(projectId),
    ]);

    if (!project) {
      return new Response("Project not found", { status: 404 });
    }

    // Verify user owns the project
    if (project.userId !== userResult.user.$id) {
      return new Response("Forbidden", { status: 403 });
    }

    // Create ZIP buffer
    const zipBuffer = await createProjectZipBuffer(project, files);

    // Return ZIP file
    const fileName = `${project.slug || "project"}-${Date.now()}.zip`;

    // Convert Buffer to Uint8Array for Response
    const uint8Array = new Uint8Array(zipBuffer);

    return new Response(uint8Array, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": zipBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error exporting project:", error);
    return new Response("Failed to export project", { status: 500 });
  }
}
