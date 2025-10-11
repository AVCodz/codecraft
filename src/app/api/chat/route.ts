/**
 * CHAT API ROUTE - OpenRouter with Manual Tool Calling Loop
 *
 * Purpose: Stream AI responses with tool execution following OpenRouter's documented approach
 * Used by: ChatInterface component
 * Key Features: Direct OpenRouter API, manual tool loop (max 50 iterations), streaming
 */

import { NextRequest } from "next/server";
import { DEFAULT_MODEL } from "@/lib/ai/openrouter";
import { SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { toolDefinitions } from "@/lib/ai/toolDefinitions";
import { executeToolCall } from "@/lib/ai/toolExecutor";
import type { ToolCall } from "@/lib/ai/toolDefinitions";
import {
  createMessage,
  updateProject,
  getProjectFiles,
  getProject,
} from "@/lib/appwrite/database";

interface OpenRouterMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export async function POST(req: NextRequest) {
  try {
    const {
      messages,
      projectId,
      userId,
      model = DEFAULT_MODEL,
    } = await req.json();

    console.log("[Chat API] 🚀 Request:", {
      projectId,
      userId,
      model,
      messageCount: messages.length,
    });

    if (!userId || !projectId) {
      console.error("[Chat API] ❌ Missing fields:", { userId, projectId });
      return new Response("Missing required fields", { status: 400 });
    }

    // Get project context
    const project = await getProject(projectId);
    const projectSummary =
      project?.summary || "New project - no previous work completed yet.";

    // Get current project files for context
    let projectFilesContext = "";
    try {
      const files = await getProjectFiles(projectId);
      if (files.length > 0) {
        projectFilesContext = `\n\n## CURRENT PROJECT FILES\n\nThe project currently contains ${
          files.length
        } file(s):\n${files
          .map(
            (f) =>
              `- ${f.path} (${f.type}, ${f.language || "unknown"}, ${
                f.size || 0
              } bytes)`
          )
          .join("\n")}\n\nUse list_project_files to get the complete list.`;
      }
    } catch (error) {
      console.error("[Chat API] Failed to get project files:", error);
    }

    // Save user message to database
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "user") {
        try {
          await createMessage({
            projectId,
            userId,
            role: "user",
            content: lastMessage.content,
            sequence: messages.length - 1,
          });
          console.log("[Chat API] ✅ User message saved");
        } catch (error) {
          console.error("[Chat API] Failed to save user message:", error);
        }
      }
    }

    // Prepare messages for OpenRouter
    const lastUserMessage = messages[messages.length - 1];
    const projectContext = `\n\n## PROJECT SUMMARY\n\n${projectSummary}${projectFilesContext}`;

    const conversationMessages: OpenRouterMessage[] = [
      {
        role: "system",
        content: SYSTEM_PROMPT + projectContext,
      },
      {
        role: "user",
        content: lastUserMessage.content,
      },
    ];

    console.log("[Chat API] 📝 Context prepared:", {
      systemPromptLength: (SYSTEM_PROMPT + projectContext).length,
      fileCount: (projectFilesContext.match(/- \//g) || []).length,
    });

    // Track for later saving
    let assistantContent = "";
    const allToolCalls: Array<{ name: string; args: Record<string, unknown> }> =
      [];

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let continueLoop = true;
          let iterationCount = 0;
          const maxIterations = 50; // Limit to 50 tool call rounds

          while (continueLoop && iterationCount < maxIterations) {
            iterationCount++;
            console.log(`[Chat API] 🔄 Iteration ${iterationCount}/50`);

            // Call OpenRouter API
            const response = await fetch(
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
                  model,
                  messages: conversationMessages,
                  tools: toolDefinitions,
                  temperature: 0.1,
                  topP: 0.9,
                }),
              }
            );

            if (!response.ok) {
              const errorText = await response.text();
              console.error("[Chat API] OpenRouter error:", errorText);
              controller.enqueue(
                encoder.encode(`\n\n⚠️ API error: ${response.status}\n`)
              );
              break;
            }

            const data = await response.json();
            const assistantMessage = data.choices?.[0]?.message;

            if (!assistantMessage) {
              console.error("[Chat API] No assistant message in response");
              controller.enqueue(
                encoder.encode("\n\n⚠️ Invalid response from model\n")
              );
              break;
            }

            // Add assistant message to conversation
            conversationMessages.push(assistantMessage);

            // Stream assistant content if any
            if (assistantMessage.content) {
              const content = assistantMessage.content;
              assistantContent += content + "\n\n";
              controller.enqueue(encoder.encode(content + "\n\n"));
            }

            // Handle tool calls
            if (
              assistantMessage.tool_calls &&
              assistantMessage.tool_calls.length > 0
            ) {
              console.log(
                `[Chat API] 🔧 Processing ${assistantMessage.tool_calls.length} tool call(s)`
              );

              for (const toolCall of assistantMessage.tool_calls) {
                const toolName = toolCall.function.name;

                // Stream tool execution notification
                const toolNotification = `\n${toolName}...\n`;
                controller.enqueue(encoder.encode(toolNotification));

                // Execute the tool
                const toolResult = await executeToolCall(toolCall, {
                  projectId,
                  userId,
                });

                // Parse tool result
                let result;
                try {
                  result = JSON.parse(toolResult.content);
                } catch (parseError) {
                  console.error(
                    "[Chat API] Failed to parse tool result:",
                    parseError
                  );
                  result = {
                    success: false,
                    error: "Failed to parse tool result",
                  };
                }

                console.log(
                  `[Chat API] ${result.success ? "✅" : "❌"} ${toolName}`
                );

                // Track tool call
                try {
                  const args = JSON.parse(toolCall.function.arguments);
                  allToolCalls.push({ name: toolName, args });
                } catch {
                  allToolCalls.push({ name: toolName, args: {} });
                }

                // Add tool result to conversation
                conversationMessages.push({
                  role: "tool",
                  tool_call_id: toolCall.id,
                  content: toolResult.content,
                });

                // Stream success/error message
                if (result.success) {
                  const msg = result.message || `${toolName} completed`;
                  controller.enqueue(encoder.encode(`✅ ${msg}\n`));
                } else {
                  const msg = result.error || "Unknown error";
                  controller.enqueue(encoder.encode(`❌ Error: ${msg}\n`));
                }
              }

              // Continue loop to get next response
              continueLoop = true;
            } else {
              // No more tool calls, we're done
              continueLoop = false;
            }

            // Check finish reason
            const finishReason = data.choices[0]?.finish_reason;
            if (finishReason === "stop" || finishReason === "end_turn") {
              continueLoop = false;
            }
          }

          if (iterationCount >= maxIterations) {
            const warningMsg =
              "\n\n⚠️ Reached maximum iterations (50). Stopping.\n";
            controller.enqueue(encoder.encode(warningMsg));
            console.warn("[Chat API] Reached max iterations");
          }

          // Save message and summary in background
          (async () => {
            try {
              console.log(
                "[Chat API] 💾 Saving assistant message and summary..."
              );

              // Generate updated summary
              let newSummary = projectSummary;
              try {
                const summaryPrompt = `Based on the conversation, generate a concise project summary (max 200 words):

Previous summary: ${projectSummary}
User request: ${lastUserMessage.content}
Tools executed: ${allToolCalls.map((tc) => tc.name).join(", ")}

Respond with ONLY the updated summary text.`;

                const summaryResponse = await fetch(
                  "https://openrouter.ai/api/v1/chat/completions",
                  {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      model: "google/gemini-2.5-flash-lite",
                      messages: [{ role: "user", content: summaryPrompt }],
                      temperature: 0.3,
                      max_tokens: 300,
                    }),
                  }
                );

                if (summaryResponse.ok) {
                  const summaryData = await summaryResponse.json();
                  newSummary =
                    summaryData.choices?.[0]?.message?.content?.trim() ||
                    projectSummary;
                }
              } catch (error) {
                console.error("[Chat API] Failed to generate summary:", error);
              }

              // Save assistant message
              await createMessage({
                projectId,
                userId,
                role: "assistant",
                content:
                  assistantContent.trim() || "Task completed successfully.",
                metadata: {
                  model,
                  toolCalls: allToolCalls as any,
                  iterations: allToolCalls.length,
                },
                sequence: messages.length,
              });

              // Update project summary
              await updateProject(projectId, {
                summary: newSummary,
                lastMessageAt: new Date().toISOString(),
              });

              console.log("[Chat API] ✅ Message and summary saved");
            } catch (error) {
              console.error("[Chat API] Failed to save message:", error);
            }
          })();

          controller.close();
        } catch (error: unknown) {
          console.error("[Chat API] Streaming error:", error);
          controller.enqueue(
            encoder.encode(
              `\n\n⚠️ Error: ${
                error instanceof Error ? error.message : String(error)
              }\n`
            )
          );
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: unknown) {
    console.error("[Chat API] ❌ Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal Server Error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
