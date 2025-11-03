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

    // Create a session for async execution
    const sessionId = `exec-${Date.now()}`;
    await sandbox.process.createSession(sessionId);

    // Execute command asynchronously (don't wait for completion)
    const workingDir = typeof cwd === "string" && cwd.trim().length > 0 ? cwd : "/home/daytona";
    const escapePath = (input: string) => input.replace(/'/g, "'\\''");
    const commandWithCwd = `cd '${escapePath(workingDir)}' && ${command}`;

    const result = await sandbox.process.executeSessionCommand(sessionId, {
      command: commandWithCwd,
      runAsync: true,
    });

    console.log(`[Daytona] ✅ Command started (async): ${command}`);

    return Response.json({
      success: true,
      sessionId,
      cmdId: result.cmdId,
    });
  } catch (error) {
    console.error("[Daytona] ❌ Failed to execute command:", error);
    return Response.json(
      { error: "Failed to execute command" },
      { status: 500 }
    );
  }
}
