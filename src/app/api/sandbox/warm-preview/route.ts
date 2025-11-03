import { NextRequest } from "next/server";

const DAYTONA_HOST_REGEX = /\.proxy\.daytona\.(works|io)$/i;

export async function GET(req: NextRequest) {
  try {
    const urlParam = req.nextUrl.searchParams.get("url");
    const token = req.nextUrl.searchParams.get("token");

    if (!urlParam) {
      return Response.json(
        { error: "Missing required query parameter 'url'" },
        { status: 400 }
      );
    }

    let parsed: URL;
    try {
      parsed = new URL(urlParam);
    } catch {
      return Response.json({ error: "Invalid preview URL" }, { status: 400 });
    }

    if (
      parsed.protocol !== "https:" &&
      parsed.protocol !== "http:"
    ) {
      return Response.json({ error: "Unsupported protocol" }, { status: 400 });
    }

    if (!DAYTONA_HOST_REGEX.test(parsed.hostname)) {
      return Response.json({ error: "Preview URL host is not allowed" }, { status: 400 });
    }

    await fetch(parsed.toString(), {
      headers: {
        "X-Daytona-Skip-Preview-Warning": "true",
        ...(token ? { "X-Daytona-Preview-Token": token } : {}),
      },
      cache: "no-store",
      redirect: "follow",
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("[WarmPreview] Failed to warm preview link:", error);
    return Response.json(
      { error: "Failed to warm preview link" },
      { status: 502 }
    );
  }
}

