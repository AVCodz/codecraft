import { NextRequest } from "next/server";
import { Daytona } from "@daytonaio/sdk";

export async function POST(req: NextRequest) {
  try {
    const { sandboxId } = await req.json();

    if (!sandboxId) {
      return Response.json(
        { error: "Sandbox ID is required" },
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
    await sandbox.delete();

    console.log(`[Daytona] ✅ Sandbox destroyed: ${sandboxId}`);

    return Response.json({
      success: true,
    });
  } catch (error) {
    console.error("[Daytona] ❌ Failed to destroy sandbox:", error);
    return Response.json(
      { error: "Failed to destroy sandbox" },
      { status: 500 }
    );
  }
}

