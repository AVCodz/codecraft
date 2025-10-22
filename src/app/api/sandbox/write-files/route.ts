import { NextRequest } from "next/server";
import { Daytona } from "@daytonaio/sdk";

export async function POST(req: NextRequest) {
  try {
    const { sandboxId, files } = await req.json();

    if (!sandboxId || !files || !Array.isArray(files)) {
      return Response.json(
        { error: "Sandbox ID and files array are required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.NEXT_PUBLIC_DAYTONA_API_KEY;
    const apiUrl = process.env.NEXT_PUBLIC_DAYTONA_API_URL;

    if (!apiKey) {
      return Response.json(
        { error: "Daytona API key not configured" },
        { status: 500 }
      );
    }

    const daytona = new Daytona({
      apiKey,
      apiUrl,
    });

    const sandbox = await daytona.get(sandboxId);

    console.log(`[Daytona] 📝 Writing ${files.length} files to sandbox ${sandboxId}`);
    console.log(`[Daytona] 📝 File paths:`, files.map((f: { path: string }) => f.path));

    // Upload files to sandbox
    let successCount = 0;
    let failedCount = 0;

    for (const file of files) {
      try {
        const { path, content } = file as { path: string; content: string };

        // Normalize path for Daytona FS (relative to workspace root)
        const normalizedPath = path.startsWith('/home/daytona/')
          ? path.replace('/home/daytona/', '')
          : path.replace(/^\//, '');
        const absolutePath = `/home/daytona/${normalizedPath}`;

        // Create directory structure if needed
        const dirPath = absolutePath.substring(0, absolutePath.lastIndexOf("/"));
        if (dirPath && dirPath !== "/home/daytona") {
          try {
            await sandbox.process.executeCommand(`mkdir -p ${dirPath}`, "/home/daytona");
          } catch (err) {
            // Directory might already exist, ignore error
          }
        }

        // Write file at absolute workspace path
        const buffer = Buffer.from(content, "utf-8");
        await sandbox.fs.uploadFile(buffer, absolutePath);
        successCount++;
      } catch (err) {
        console.error(`[Daytona] Failed to write file ${file.path}:`, err);
        failedCount++;
      }
    }

    console.log(
      `[Daytona] ✅ Files written: ${successCount} success, ${failedCount} failed`
    );

    return Response.json({
      success: true,
      successCount,
      failedCount,
      total: files.length,
    });
  } catch (error) {
    console.error("[Daytona] ❌ Failed to write files:", error);
    return Response.json(
      { error: "Failed to write files" },
      { status: 500 }
    );
  }
}

