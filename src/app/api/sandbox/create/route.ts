import { NextRequest } from "next/server";
import { Daytona } from "@daytonaio/sdk";

export async function POST(req: NextRequest) {
  try {
    const { projectId } = await req.json();

    if (!projectId) {
      return Response.json(
        { error: "Project ID is required" },
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

    // Create sandbox with Node.js environment
    const sandbox = await daytona.create({
      language: "typescript",
      labels: {
        projectId,
      },
      public: true,
      autoStopInterval: 30, // Auto-stop after 30 minutes of inactivity
      autoDeleteInterval: 120, // Auto-delete after 2 hours of being stopped
    });

    console.log("[Daytona] ✅ Sandbox created:", sandbox.id);

    return Response.json({
      success: true,
      sandboxId: sandbox.id,
    });
  } catch (error) {
    console.error("[Daytona] ❌ Failed to create sandbox:", error);
    return Response.json(
      { error: "Failed to create sandbox" },
      { status: 500 }
    );
  }
}

