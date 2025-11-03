import { NextRequest } from "next/server";
import { Daytona } from "@daytonaio/sdk";

export async function POST(req: NextRequest) {
  try {
    const { sandboxId, command, cwd } = await req.json();

    if (!sandboxId || !command) {
      return Response.json(
        { error: "Sandbox ID and command are required" },
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

    // Execute command in sandbox
    const response = await sandbox.process.executeCommand(
      command,
      cwd || "/home/daytona",
      undefined,
      300 // 5 minutes timeout
    );

    console.log(`[Daytona] ✅ Command executed: ${command}`);

    return Response.json({
      success: true,
      exitCode: response.exitCode,
      output: response.result,
    });
  } catch (error) {
    console.error("[Daytona] ❌ Failed to execute command:", error);
    return Response.json(
      { error: "Failed to execute command" },
      { status: 500 }
    );
  }
}

