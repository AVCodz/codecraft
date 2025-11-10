import { NextRequest } from "next/server";
import { getProject, getProjectFiles } from "@/lib/appwrite/database";
import { getCurrentUser } from "@/lib/appwrite/auth";
import { getSessionFromCookies } from "@/lib/appwrite/session";
import { createProjectZipBuffer } from "@/lib/utils/zipExport";

// GET /api/projects/[id]/export - Export project as ZIP
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get session from cookies
    const session = await getSessionFromCookies();
    
    if (!session) {
      console.error('[Export API] No session found in cookies');
      return new Response("Unauthorized - No session cookie", { status: 401 });
    }

    // Verify user authentication
    const userResult = await getCurrentUser(session);
    if (!userResult.success || !userResult.user) {
      console.error('[Export API] Failed to get user:', userResult.error);
      return new Response("Unauthorized - Invalid session", { status: 401 });
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

    console.log(`[Export API] Exporting project: ${project.title} (${files.length} files)`);

    // Create ZIP buffer
    const zipBuffer = await createProjectZipBuffer(project, files);

    // Return ZIP file
    const fileName = `${project.title || project.slug || "project"}.zip`;

    // Convert Buffer to Uint8Array for Response
    const uint8Array = new Uint8Array(zipBuffer);

    console.log(`[Export API] ZIP created successfully: ${fileName} (${zipBuffer.length} bytes)`);

    return new Response(uint8Array, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": zipBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("[Export API] Error exporting project:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to export project";
    return new Response(errorMessage, { status: 500 });
  }
}
