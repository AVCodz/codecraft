/**
 * Generate Project Name API Route
 * Uses OpenRouter's Gemini Flash to generate a concise 2-3 word project title
 * Features: AI-powered naming, automatic project update, realtime propagation
 * Used by: AuthedLandingPage and Dashboard when creating projects from ideas
 */
import { NextRequest } from "next/server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite/config";
import { Client, Databases } from "node-appwrite";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { idea, userId } = await req.json();

    if (!idea || typeof idea !== "string" || !idea.trim()) {
      return Response.json({ error: "Idea is required" }, { status: 400 });
    }

    if (!userId) {
      return Response.json({ error: "User ID is required" }, { status: 400 });
    }

    // Create admin client for server-side operations
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
      .setKey(process.env.APPWRITE_API_KEY!);

    const databases = new Databases(client);

    // Verify project exists and belongs to user
    const project = await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.PROJECTS,
      projectId
    );

    if (project.userId !== userId) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    // Call OpenRouter to generate a concise project title
    console.log(
      `[Generate Name] Generating title for project ${projectId} with idea: ${idea.slice(
        0,
        100
      )}...`
    );

    const openRouterResponse = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://codecraft.ai",
          "X-Title": "Built-It",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "user",
              content: `Generate a concise 2-3 word product title for this project idea. Return ONLY the title with no quotes, punctuation, or extra text.

Project idea: ${idea.trim()}

Examples of good titles:
- "Task Manager Pro"
- "Weather Dashboard"
- "Recipe Finder"
- "Fitness Tracker"

Title:`,
            },
          ],
          temperature: 0.3,
          max_tokens: 20,
        }),
      }
    );

    if (!openRouterResponse.ok) {
      const errorText = await openRouterResponse.text();
      console.error("[Generate Name] OpenRouter error:", errorText);
      return Response.json(
        { error: "Failed to generate project name", title: "New Project" },
        { status: 500 }
      );
    }

    const data = await openRouterResponse.json();
    const rawTitle =
      data?.choices?.[0]?.message?.content?.trim() || "New Project";

    // Sanitize the title
    let title = rawTitle
      .replace(/^["'\s]+|["'\s]+$/g, "") // Remove quotes and leading/trailing spaces
      .replace(/[.?!]+$/g, "") // Remove trailing punctuation
      .replace(/\n/g, " ") // Replace newlines with spaces
      .trim();

    // Limit length and ensure it's not empty
    if (!title || title.length === 0) {
      title = "New Project";
    } else if (title.length > 50) {
      title = title.slice(0, 50).trim();
    }

    console.log(
      `[Generate Name] Generated title: "${title}" for project ${projectId}`
    );

    // Update the project with the new title
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.PROJECTS,
      projectId,
      {
        title,
        updatedAt: new Date().toISOString(),
      }
    );

    console.log(
      `[Generate Name] ✅ Project ${projectId} updated with title: "${title}"`
    );

    return Response.json({ success: true, title });
  } catch (error) {
    console.error("[Generate Name] Error:", error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
        title: "New Project",
      },
      { status: 500 }
    );
  }
}
