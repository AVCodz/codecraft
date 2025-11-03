import { NextRequest } from "next/server";
import { Daytona } from "@daytonaio/sdk";

export async function POST(req: NextRequest) {
  try {
    const { sandboxId, port } = await req.json();

    if (!sandboxId || !port) {
      return Response.json(
        { error: "Sandbox ID and port are required" },
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

    // Get preview URL for the port
    const previewInfo = await sandbox.getPreviewLink(port);
    const previewUrl = previewInfo.url;
    const previewToken = previewInfo.token;

    console.log(`[Daytona] ✅ Port ${port} exposed: ${previewUrl}`);

    return Response.json({
      success: true,
      previewUrl,
      previewToken,
      port,
    });
  } catch (error) {
    console.error("[Daytona] ❌ Failed to expose port:", error);
    return Response.json(
      { error: "Failed to expose port" },
      { status: 500 }
    );
  }
}

