import { NextRequest } from "next/server";
import { DEFAULT_MODEL } from "@/lib/ai/openrouter";
import { SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { toolDefinitions } from "@/lib/ai/toolDefinitions";
import { executeToolCall } from "@/lib/ai/toolExecutor";
import { createMessage, updateProject, getProjectFiles } from "@/lib/appwrite/database";

interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
}

export async function POST(req: NextRequest) {
  try {
    const {
      messages,
      projectId,
      userId,
      model = DEFAULT_MODEL,
    } = await req.json();

    console.log("[Chat API] Request:", {
      projectId,
      userId,
      model,
      messageCount: messages.length,
    });

    if (!userId || !projectId) {
      console.error("[Chat API] Missing fields:", { userId, projectId });
      return new Response("Missing required fields", { status: 400 });
    }

    // Get current project files for context
    let projectFilesContext = "";
    try {
      const files = await getProjectFiles(projectId);
      if (files.length > 0) {
        projectFilesContext = `\n\n## CURRENT PROJECT FILES\n\nThe project currently contains ${files.length} file(s):\n${files
          .map(
            (f) =>
              `- ${f.path} (${f.type}, ${f.language || "unknown"}, ${
                f.size || 0
              } bytes, updated: ${f.updatedAt})`
          )
          .join("\n")}\n\nUse the list_project_files tool to get the complete list, and read_file to see their contents.`;
      }
    } catch (error) {
      console.error("[Chat API] Failed to get project files:", error);
    }

    // Save user message to database (only if it's a new message from frontend)
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
          console.log("[Chat API] User message saved");
        } catch (error) {
          console.error("[Chat API] Failed to save user message:", error);
        }
      }
    }

    // Prepare messages with system prompt
    const conversationMessages: Message[] = [
      {
        role: "system",
        content: SYSTEM_PROMPT + projectFilesContext,
      },
      ...messages,
    ];

    const encoder = new TextEncoder();
    let fullAssistantResponse = "";
    let allToolCalls: any[] = [];

    // Smart iteration limits based on task complexity
    const userMessage = messages[messages.length - 1]?.content?.toLowerCase() || "";
    const complexityKeywords = ["full", "complete", "entire", "comprehensive", "multiple pages", "e-commerce", "dashboard", "admin panel"];
    const isComplexTask = complexityKeywords.some(keyword => userMessage.includes(keyword));
    const maxIterations = isComplexTask ? 30 : 15; // 15 for MVP, 30 for complex

    const stream = new ReadableStream<Uint8Array>({
      start: async (controller) => {
        try {
          let continueLoop = true;
          let iterationCount = 0;

          while (continueLoop && iterationCount < maxIterations) {
            iterationCount++;
            console.log(`[Chat API] Iteration ${iterationCount}`);

            // Make API call to OpenRouter
            const response = await fetch(
              "https://openrouter.ai/api/v1/chat/completions",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                  "Content-Type": "application/json",
                  "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "",
                  "X-Title": "Built-It",
                },
                body: JSON.stringify({
                  model,
                  messages: conversationMessages,
                  tools: toolDefinitions,
                  temperature: 0.1,
                  // No max_tokens limit - let the model generate as much as needed
                }),
              }
            );

            if (!response.ok) {
              const errorText = await response.text();
              console.error("[Chat API] OpenRouter error:", errorText);
              throw new Error(`OpenRouter API error: ${response.status}`);
            }

            let data;
            try {
              const responseText = await response.text();
              if (!responseText || responseText.trim() === '') {
                throw new Error("Empty response from OpenRouter");
              }
              data = JSON.parse(responseText);
            } catch (parseError: any) {
              console.error("[Chat API] Failed to parse OpenRouter response:", {
                error: parseError.message,
                status: response.status
              });
              throw new Error(`Failed to parse OpenRouter response: ${parseError.message}`);
            }

            const assistantMessage = data.choices?.[0]?.message;

            if (!assistantMessage) {
              console.error("[Chat API] No assistant message in response:", data);
              throw new Error("No assistant message in response");
            }

            console.log("[Chat API] Assistant message:", {
              content: assistantMessage.content?.substring(0, 100),
              hasToolCalls: !!assistantMessage.tool_calls,
              toolCallsCount: assistantMessage.tool_calls?.length || 0,
              finishReason: data.choices[0]?.finish_reason,
            });

            // Add assistant message to conversation
            conversationMessages.push(assistantMessage);

            // Stream assistant content if any
            if (assistantMessage.content) {
              const content = assistantMessage.content;
              fullAssistantResponse += content + "\n\n";
              controller.enqueue(encoder.encode(content + "\n\n"));
            }

            // Handle tool calls
            if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
              console.log(
                `[Chat API] Processing ${assistantMessage.tool_calls.length} tool call(s)`
              );

              for (const toolCall of assistantMessage.tool_calls) {
                allToolCalls.push(toolCall);

                const toolName = toolCall.function.name;

                // Stream tool execution notification
                const toolNotification = `\n🔧 Executing: ${toolName}\n`;
                controller.enqueue(encoder.encode(toolNotification));
                fullAssistantResponse += toolNotification;

                // Execute the tool
                const toolResult = await executeToolCall(toolCall, {
                  projectId,
                  userId,
                });

                // Parse tool result safely
                let result;
                try {
                  // Ensure content exists and is not empty
                  if (!toolResult.content || toolResult.content.trim() === '') {
                    console.error("[Chat API] Empty tool result content");
                    result = {
                      success: false,
                      error: "Tool returned empty result"
                    };
                  } else {
                    result = JSON.parse(toolResult.content);
                  }
                } catch (parseError) {
                  console.error("[Chat API] Failed to parse tool result:", {
                    error: parseError,
                    content: toolResult.content?.substring(0, 200),
                    toolName
                  });
                  result = {
                    success: false,
                    error: "Failed to parse tool result"
                  };
                }

                console.log("[Chat API] Tool result:", {
                  toolName,
                  success: result.success,
                });

                // Add tool result to conversation
                conversationMessages.push(toolResult);

                // Stream tool result
                let resultMessage = "";

                if (result.success) {
                  resultMessage = `✅ ${result.message || "Success"}\n`;
                  if (result.description) {
                    resultMessage += `   ${result.description}\n`;
                  }

                  // If a file was created/updated, send a refresh signal
                  if (toolName === "create_file" || toolName === "update_file") {
                    resultMessage += `[FILE_UPDATED:${result.file?.path || "unknown"}]\n`;
                  }
                } else {
                  resultMessage = `❌ Error: ${result.error || "Unknown error"}\n`;
                }

                controller.enqueue(encoder.encode(resultMessage));
                fullAssistantResponse += resultMessage;
              }

              // Continue the loop to get the next response
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
            const warningMsg = "\n\n⚠️ Reached maximum iterations. Stopping.\n";
            controller.enqueue(encoder.encode(warningMsg));
            fullAssistantResponse += warningMsg;
          }

          // Save assistant message to database
          try {
            await createMessage({
              projectId,
              userId,
              role: "assistant",
              content: fullAssistantResponse.trim(),
              metadata: {
                model,
                toolCalls: allToolCalls,
                iterations: iterationCount,
              },
              sequence: messages.length,
            });

            await updateProject(projectId, {
              lastMessageAt: new Date().toISOString(),
            });

            console.log("[Chat API] Assistant message saved");
          } catch (error) {
            console.error("[Chat API] Failed to save assistant message:", error);
          }

          controller.close();
        } catch (error: any) {
          console.error("[Chat API] Streaming error:", error);
          controller.enqueue(
            encoder.encode(
              `\n\n❌ An error occurred: ${error.message}\n`
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
  } catch (error: any) {
    console.error("[Chat API] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal Server Error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
