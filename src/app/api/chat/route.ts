/**
 * CHAT API ROUTE - AI SDK Streaming with Tool Calling (OpenRouter provider)
 *
 * Purpose: Stream AI responses with automatic tool execution via AI SDK
 * Used by: ChatInterface component
 * Key Features: AI SDK streamText, multi-step tool calls, structured NDJSON streaming
 */

import { NextRequest } from "next/server";
import { DEFAULT_MODEL, getModelConfig, openrouter } from "@/lib/ai/openrouter";
import { SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { toolDefinitions } from "@/lib/ai/toolDefinitions";
import { executeToolCall } from "@/lib/ai/toolExecutor";
import {
  createMessage,
  updateProject,
  getProjectFiles,
  getProject,
} from "@/lib/appwrite/database";
import { encodeStreamMessage } from "@/lib/types/streaming";
import type { StreamMessage } from "@/lib/types/streaming";
import { streamText, tool, jsonSchema, stepCountIs } from "ai";

export interface FileAttachment {
  name: string;
  contentType: string;
  url: string;
  size: number;
  textContent?: string;
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
            metadata:
              typedAttachments.length > 0
                ? ({ attachments: typedAttachments } as any)
                : undefined,
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

    // Prepare messages for AI SDK
    const lastUserMessage = messages[messages.length - 1];
    const projectContext = `\n\n## PROJECT SUMMARY\n\n${projectSummary}${projectFilesContext}`;
    let attachmentsContext = "";
    const imageAttachments: FileAttachment[] = [];

    // Separate text and image attachments
    for (const attachment of typedAttachments) {
      if (attachment.textContent) {
        attachmentsContext += `\n\n## ATTACHED FILE: ${attachment.name}\n\n${attachment.textContent}\n`;
      } else if (attachment.contentType.startsWith("image/")) {
        imageAttachments.push(attachment);
      } else {
        attachmentsContext += `\n\n## ATTACHED FILE: ${attachment.name}\nFile URL: ${attachment.url}\nType: ${attachment.contentType}\n`;
      }
    }

    // Build AI SDK user content parts
    const aiUserContent: any =
      imageAttachments.length > 0
        ? [
            { type: "text", text: lastUserMessage.content },
            ...imageAttachments.map((img) => ({
              type: "image",
              image: img.url,
            })),
          ]
        : lastUserMessage.content;

    console.log("[Chat API] 📝 Context prepared:", {
      systemPromptLength: (SYSTEM_PROMPT + projectContext).length,
      fileCount: (projectFilesContext.match(/- \//g) || []).length,
    });

    // Track for later saving
    let assistantContent = "";
    const allToolCalls = new Map<string, { id: string; name: string; arguments: Record<string, unknown>; result?: unknown }>();

    // Helper to stream JSON messages
    const encoder = new TextEncoder();
    const streamMessage = (msg: StreamMessage) =>
      encoder.encode(encodeStreamMessage(msg));

    // Create AI SDK tools from existing toolDefinitions
    const aiTools: Record<string, any> = {};
    for (const def of toolDefinitions) {
      const name = def.function.name;
      aiTools[name] = tool({
        description: def.function.description,
        inputSchema: jsonSchema(def.function.parameters as any),
        execute: async (args: any, options: any) => {
          const result = await executeToolCall(
            {
              id: options.toolCallId,
              type: "function",
              function: { name, arguments: JSON.stringify(args) },
            } as any,
            { projectId, userId }
          );
          try {
            return JSON.parse(result.content);
          } catch {
            return result.content;
          }
        },
      } as any);
    }

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const thinkingStartTime = Date.now();
          let hasEmittedThinkingEnd = false;

          // thinking-start
          controller.enqueue(
            streamMessage({
              type: "thinking-start",
              timestamp: thinkingStartTime,
            })
          );

          // Track args deltas per tool call for progress
          const argsLengthByTool: Record<string, number> = {};

          const modelConfig = getModelConfig(model);

          const result = streamText({
            model: openrouter.chat(model),
            system: SYSTEM_PROMPT + projectContext + attachmentsContext,
            messages: [{ role: "user" as const, content: aiUserContent }],
            tools: aiTools,
            temperature: modelConfig.temperature,
            topP: modelConfig.topP,
            stopWhen: stepCountIs(50),
          });

          // Use fullStream to get all events
          for await (const part of result.fullStream) {
            const p: any = part;
            switch (p.type) {
              case "text-delta": {
                // thinking-end on first token
                if (!hasEmittedThinkingEnd) {
                  hasEmittedThinkingEnd = true;
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
                const textDelta = p.text || "";
                assistantContent += textDelta;
                controller.enqueue(
                  streamMessage({ type: "text", content: textDelta })
                );
                break;
              }
              case "tool-call-streaming-start": {
                controller.enqueue(
                  streamMessage({
                    type: "tool-call-preview",
                    id: p.toolCallId,
                    name: p.toolName,
                    status: "planned",
                  })
                );
                argsLengthByTool[p.toolCallId] = 0;
                break;
              }
              case "tool-call-delta": {
                const delta = p.argsTextDelta || "";
                argsLengthByTool[p.toolCallId] =
                  (argsLengthByTool[p.toolCallId] || 0) + delta.length;
                controller.enqueue(
                  streamMessage({
                    type: "tool-call-building",
                    id: p.toolCallId,
                    name: p.toolName,
                    status: "building",
                    progress: {
                      nameComplete: true,
                      argsComplete: false,
                      argsLength: argsLengthByTool[p.toolCallId],
                    },
                  })
                );
                break;
              }
              case "tool-call": {
                allToolCalls.set(p.toolCallId, {
                  id: p.toolCallId,
                  name: p.toolName,
                  arguments: p.input || {},
                });
                controller.enqueue(
                  streamMessage({
                    type: "tool-call",
                    id: p.toolCallId,
                    name: p.toolName,
                    status: "start",
                    args: p.input || {},
                  })
                );
                break;
              }
              case "tool-result": {
                const toolCall = allToolCalls.get(p.toolCallId);
                if (toolCall) {
                  toolCall.result = p.output;
                }
                controller.enqueue(
                  streamMessage({
                    type: "tool-call",
                    id: p.toolCallId,
                    name: p.toolName,
                    status: "complete",
                    result: p.output,
                  })
                );
                break;
              }
              case "error": {
                controller.enqueue(
                  streamMessage({
                    type: "error",
                    error: String(p.error ?? "Unknown error"),
                    recoverable: false,
                  })
                );
                break;
              }
            }
          }

          // Final text from result
          const finalText = await result.text;
          assistantContent = finalText;

          // done
          controller.enqueue(streamMessage({ type: "done" }));

          // Save message and summary in background
          (async () => {
            try {
              console.log(
                "[Chat API] 💾 Saving assistant message and summary..."
              );

              // Generate updated summary
              let newSummary = projectSummary;
              try {
                const summaryPrompt = `Based on the conversation, generate a concise project summary (max 200 words):\n\nPrevious summary: ${projectSummary}\nUser request: ${
                  lastUserMessage.content
                }\nTools executed: ${Array.from(allToolCalls.values())
                  .map((tc) => tc.name)
                  .join(", ")}\n\nRespond with ONLY the updated summary text.`;

                const summaryResponse = await fetch(
                  "https://openrouter.ai/api/v1/chat/completions",
                  {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                      "Content-Type": "application/json",
                      "HTTP-Referer": "https://vibeit.ai",
                      "X-Title": "VibeIt",
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
                content: assistantContent.trim() || "Task completed successfully.",
                metadata: {
                  model,
                  toolCalls: Array.from(allToolCalls.values()) as any,
                  iterations: allToolCalls.size,
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
