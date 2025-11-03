/**
 * ENHANCE PROMPT API ROUTE
 *
 * Purpose: Enhance user prompts using AI to make them clearer and more actionable
 * Model: google/gemini-2.5-flash-lite
 * Features: Context-aware enhancement based on project summary
 */

import { NextRequest, NextResponse } from "next/server";

const MODEL = "google/gemini-2.5-flash-lite";

const SYSTEM_PROMPT = `You are an expert at refining prompts for AI-powered development tools.

Your task: Enhance the user's prompt to be:
1. Clear and specific about what needs to be built
2. Include relevant technical details
3. Structured and actionable
4. Comprehensive but concise (under 200 words)

Guidelines:
- Preserve the user's original intent
- Add technical context where appropriate
- Specify expected behavior and features
- DO NOT change the core request
- Return ONLY the enhanced prompt in PLAIN TEXT
- DO NOT use markdown formatting (**, *, lists, etc.)
- Write in clear, natural sentences without special formatting`;

export async function POST(req: NextRequest) {
  try {
    const { prompt, projectSummary, isFirstMessage } = await req.json();

    if (!prompt?.trim()) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const userPrompt = isFirstMessage
      ? `Enhance this prompt for building a new project:\n\nOriginal: "${prompt}"\n\nMake it clear, specific, and actionable.`
      : `Enhance this prompt for an existing project:\n\nProject Context: ${projectSummary || "No context available"}\n\nOriginal: "${prompt}"\n\nMake it clear how this relates to the project and what specific changes are needed.`;

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://codecraft.ai",
          "X-Title": "CodeCraft AI",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const enhancedPrompt = data.choices?.[0]?.message?.content?.trim();

    if (!enhancedPrompt) {
      throw new Error("No enhanced prompt returned");
    }

    return NextResponse.json({
      success: true,
      enhancedPrompt,
    });
  } catch (error) {
    console.error("[Enhance Prompt] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to enhance prompt",
      },
      { status: 500 }
    );
  }
}
