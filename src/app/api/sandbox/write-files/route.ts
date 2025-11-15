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

    // Normalize paths and batch upload using Daytona's uploadFiles API
    const uploads = (files as Array<{ path: string; content: string }>).map(
      ({ path, content }) => {
        const normalizedPath = path.startsWith("/home/daytona/")
          ? path.replace("/home/daytona/", "")
          : path.replace(/^\//, "");
        const absolutePath = `/home/daytona/${normalizedPath}`;

        return {
          source: Buffer.from(content, "utf-8"),
          destination: absolutePath,
        };
      }
    );

    await sandbox.fs.uploadFiles(uploads);

    console.log(
      `[Daytona] ✅ Files written with uploadFiles: ${files.length} success, 0 failed`
    );

    return Response.json({
      success: true,
      successCount: files.length,
      failedCount: 0,
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
