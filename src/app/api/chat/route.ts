/**
 * CHAT API ROUTE - OpenRouter with Manual Tool Calling Loop
 *
 * Purpose: Stream AI responses with tool execution following OpenRouter's documented approach
 * Used by: ChatInterface component
 * Key Features: Direct OpenRouter API, manual tool loop (max 50 iterations), structured streaming
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
import { encodeStreamMessage } from "@/lib/types/streaming";
import type { StreamMessage } from "@/lib/types/streaming";

export interface FileAttachment {
  name: string;
  contentType: string;
  url: string;
  size: number;
  textContent?: string;
}

interface OpenRouterMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null | Array<{ type: string; text?: string; image_url?: { url: string } }>;
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
      attachments = [],
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
      } else {
        projectFilesContext = `\n\n## CURRENT PROJECT FILES\n\nNo files exist in this project yet. This is a fresh project - start by creating the initial project structure and files based on the user's requirements.`;
      }
    } catch (error) {
      console.error("[Chat API] Failed to get project files:", error);
    }

    // Process attachments early
    const typedAttachments = attachments as FileAttachment[];

    // Save user message to database (skip if it's the first message as it's already saved)
    if (messages.length > 1) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "user") {
        try {
          await createMessage({
            projectId,
            userId,
            role: "user",
            content: lastMessage.content,
            sequence: messages.length - 1,
            metadata: typedAttachments.length > 0 ? { attachments: typedAttachments } as any : undefined,
          });
          console.log("[Chat API] ✅ User message saved");
        } catch (error) {
          console.error("[Chat API] Failed to save user message:", error);
        }
      }
    } else {
      console.log(
        "[Chat API] ℹ️ Skipping save for first message (already in DB)"
      );
    }

    // Prepare messages for OpenRouter
    const lastUserMessage = messages[messages.length - 1];
    const projectContext = `\n\n## PROJECT SUMMARY\n\n${projectSummary}${projectFilesContext}`;
    let attachmentsContext = "";
    const imageAttachments: FileAttachment[] = [];

    // Separate text and image attachments
    for (const attachment of typedAttachments) {
      if (attachment.textContent) {
        // Text-based files: inject into system prompt
        attachmentsContext += `\n\n## ATTACHED FILE: ${attachment.name}\n\n${attachment.textContent}\n`;
      } else if (attachment.contentType.startsWith("image/")) {
        // Images: will be sent as multi-modal content
        imageAttachments.push(attachment);
      } else {
        // Other files: just mention them
        attachmentsContext += `\n\n## ATTACHED FILE: ${attachment.name}\nFile URL: ${attachment.url}\nType: ${attachment.contentType}\n`;
      }
    }

    // Build user message content
    let userMessageContent: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;

    if (imageAttachments.length > 0) {
      // Multi-modal content with images
      userMessageContent = [
        { type: "text", text: lastUserMessage.content },
        ...imageAttachments.map(img => ({
          type: "image_url" as const,
          image_url: { url: img.url }
        }))
      ];
    } else {
      // Plain text content
      userMessageContent = lastUserMessage.content;
    }

    const conversationMessages: OpenRouterMessage[] = [
      {
        role: "system",
        content: SYSTEM_PROMPT + projectContext + attachmentsContext,
      },
      {
        role: "user",
        content: userMessageContent,
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

    // Helper to stream JSON messages
    const encoder = new TextEncoder();
    const streamMessage = (msg: StreamMessage) => {
      return encoder.encode(encodeStreamMessage(msg));
    };

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let continueLoop = true;
          let iterationCount = 0;
          const maxIterations = 50;
          const thinkingStartTime = Date.now();

          // Stream thinking start
          controller.enqueue(
            streamMessage({
              type: "thinking-start",
              timestamp: thinkingStartTime,
            })
          );

          while (continueLoop && iterationCount < maxIterations) {
            iterationCount++;
            console.log(`[Chat API] 🔄 Iteration ${iterationCount}/50`);

            // Call OpenRouter API with streaming
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
                  stream: true, // Enable streaming
                  provider: {
                    sort: "throughput",
                  },
                }),
              }
            );

            if (!response.ok) {
              const errorText = await response.text();
              console.error("[Chat API] OpenRouter error:", errorText);
              controller.enqueue(
                streamMessage({
                  type: "error",
                  error: `API error: ${response.status}`,
                  recoverable: true,
                })
              );
              break;
            }

            // Parse SSE stream from OpenRouter
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let currentContent = "";
            const currentToolCalls: ToolCall[] = [];
            let finishReason = "";

            if (!reader) {
              controller.enqueue(
                streamMessage({
                  type: "error",
                  error: "No response stream",
                  recoverable: true,
                })
              );
              break;
            }

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                if (!line.trim() || line.startsWith(":")) continue;
                if (!line.startsWith("data: ")) continue;

                const data = line.slice(6);
                if (data === "[DONE]") continue;

                try {
                  const parsed = JSON.parse(data);
                  const delta = parsed.choices?.[0]?.delta;
                  finishReason =
                    parsed.choices?.[0]?.finish_reason || finishReason;

                  // Stream text content in real-time
                  if (delta?.content) {
                    currentContent += delta.content;
                    assistantContent += delta.content;

                    // Stream thinking end on first content
                    if (
                      iterationCount === 1 &&
                      currentContent.length === delta.content.length
                    ) {
                      const thinkingDuration = Math.floor(
                        (Date.now() - thinkingStartTime) / 1000
                      );
                      controller.enqueue(
                        streamMessage({
                          type: "thinking-end",
                          duration: thinkingDuration,
                        })
                      );
                    }

                    // Stream text chunk
                    controller.enqueue(
                      streamMessage({
                        type: "text",
                        content: delta.content,
                      })
                    );
                  }

                  // Collect tool calls
                  if (delta?.tool_calls) {
                    for (const toolCallDelta of delta.tool_calls) {
                      const index = toolCallDelta.index;
                      if (!currentToolCalls[index]) {
                        currentToolCalls[index] = {
                          id: toolCallDelta.id || `tool_${index}`,
                          type: "function",
                          function: {
                            name: toolCallDelta.function?.name || "",
                            arguments: toolCallDelta.function?.arguments || "",
                          },
                        };
                      } else {
                        if (toolCallDelta.function?.name) {
                          currentToolCalls[index].function.name +=
                            toolCallDelta.function.name;
                        }
                        if (toolCallDelta.function?.arguments) {
                          currentToolCalls[index].function.arguments +=
                            toolCallDelta.function.arguments;
                        }
                      }
                    }
                  }
                } catch (e) {
                  console.error("[Chat API] Failed to parse SSE:", e);
                }
              }
            }

            // Build assistant message
            const assistantMessage: OpenRouterMessage = {
              role: "assistant",
              content: currentContent || null,
              tool_calls:
                currentToolCalls.length > 0 ? currentToolCalls : undefined,
            };

            // Add assistant message to conversation
            conversationMessages.push(assistantMessage);

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
                let args: Record<string, unknown> = {};

                try {
                  args = JSON.parse(toolCall.function.arguments);
                } catch {
                  args = {};
                }

                // Stream tool call start
                controller.enqueue(
                  streamMessage({
                    type: "tool-call",
                    id: toolCall.id,
                    name: toolName,
                    status: "start",
                    args,
                  })
                );

                // Execute the tool
                let result;
                let toolError: string | undefined;
                try {
                  const toolResult = await executeToolCall(toolCall, {
                    projectId,
                    userId,
                  });

                  // Parse tool result
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
                  allToolCalls.push({ name: toolName, args });

                  // Add tool result to conversation
                  conversationMessages.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    content: toolResult.content,
                  });

                  if (!result.success) {
                    toolError = result.error || "Unknown error";
                  }
                } catch (error) {
                  console.error(`[Chat API] Tool execution error:`, error);
                  toolError =
                    error instanceof Error
                      ? error.message
                      : "Tool execution failed";
                  result = { success: false, error: toolError };

                  // Still add to conversation so AI knows it failed
                  conversationMessages.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(result),
                  });
                }

                // Stream tool call end
                controller.enqueue(
                  streamMessage({
                    type: "tool-call",
                    id: toolCall.id,
                    name: toolName,
                    status: result?.success ? "complete" : "error",
                    result: result?.success ? result : undefined,
                    error: toolError,
                  })
                );
              }

              // Continue loop to get next response
              continueLoop = true;
            } else {
              // No more tool calls, we're done
              continueLoop = false;
            }

            // Check finish reason from stream
            if (finishReason === "stop" || finishReason === "end_turn") {
              continueLoop = false;
            }
          }

          if (iterationCount >= maxIterations) {
            controller.enqueue(
              streamMessage({
                type: "error",
                error: "Reached maximum iterations (50). Stopping.",
                recoverable: false,
              })
            );
            console.warn("[Chat API] Reached max iterations");
          }

          // Stream done message
          controller.enqueue(
            streamMessage({
              type: "done",
            })
          );

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
                      "HTTP-Referer": "https://codecraft.ai",
                      "X-Title": "CodeCraft AI",
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
            streamMessage({
              type: "error",
              error: error instanceof Error ? error.message : String(error),
              recoverable: false,
            })
          );
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
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
