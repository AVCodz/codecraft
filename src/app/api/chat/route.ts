import { NextRequest } from "next/server";
import { DEFAULT_MODEL } from "@/lib/ai/openrouter";
import { SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { toolDefinitions } from "@/lib/ai/toolDefinitions";
import { executeToolCall } from "@/lib/ai/toolExecutor";
import {
  createMessage,
  updateProject,
  getProjectFiles,
  getProject,
} from "@/lib/appwrite/database";

interface ToolCall {
  id?: string;
  type?: string;
  function?: {
    name?: string;
    arguments?: string;
  };
}

interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
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

    // Get project for summary
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
              } bytes, updated: ${f.updatedAt})`
          )
          .join(
            "\n"
          )}\n\nUse the list_project_files tool to get the complete list, and read_file to see their contents.`;
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

    // Use ONLY the latest user message + project summary for context
    // This drastically reduces context size and prevents timeout issues
    const lastUserMessage = messages[messages.length - 1];

    const projectContext = `\n\n## PROJECT SUMMARY\n\n${projectSummary}${projectFilesContext}`;

    const conversationMessages: Message[] = [
      {
        role: "system",
        content: SYSTEM_PROMPT + projectContext,
      },
      {
        role: "user",
        content: lastUserMessage.content,
      },
    ];

    console.log("[Chat API] 📝 Context Summary:", {
      projectId,
      systemPromptLength: (SYSTEM_PROMPT + projectFilesContext).length,
      fileContextLength: projectFilesContext.length,
      conversationLength: conversationMessages.length,
      lastUserMessage: messages[messages.length - 1]?.content?.substring(
        0,
        100
      ),
    });

    const encoder = new TextEncoder();
    let cleanAssistantContent = ""; // For storing in DB (only LLM's actual responses)
    let fullAssistantResponse = ""; // Full response including tool outputs and errors
    const allToolCalls: ToolCall[] = [];

    // Smart iteration limits based on task complexity
    const userMessage =
      messages[messages.length - 1]?.content?.toLowerCase() || "";
    const complexityKeywords = [
      "full",
      "complete",
      "entire",
      "comprehensive",
      "multiple pages",
      "e-commerce",
      "dashboard",
      "admin panel",
    ];
    const isComplexTask = complexityKeywords.some((keyword) =>
      userMessage.includes(keyword)
    );
    const maxIterations = isComplexTask ? 30 : 15; // 15 for MVP, 30 for complex

    const stream = new ReadableStream<Uint8Array>({
      start: async (controller) => {
        try {
          let continueLoop = true;
          let iterationCount = 0;

          while (continueLoop && iterationCount < maxIterations) {
            iterationCount++;
            console.log(`[Chat API] Iteration ${iterationCount}`);

            // Make API call to OpenRouter with timeout
            const abortController = new AbortController();
            const timeoutId = setTimeout(() => abortController.abort(), 120000); // 2 min timeout

            let response;
            try {
              response = await fetch(
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
                    max_tokens: 4096, // Add reasonable limit to prevent timeouts
                  }),
                  signal: abortController.signal,
                }
              );
            } catch (fetchError: unknown) {
              clearTimeout(timeoutId);
              if (fetchError instanceof Error && fetchError.name === "AbortError") {
                console.error("[Chat API] Request timed out after 120s");
                const errorMsg = "\n\n⚠️ Request timed out after 2 minutes. The work completed so far has been saved.\n";
                controller.enqueue(encoder.encode(errorMsg));
                fullAssistantResponse += errorMsg;
                continueLoop = false;
                break;
              }
              // Handle other fetch errors
              console.error("[Chat API] Fetch error:", fetchError);
              const errorMessage = fetchError instanceof Error ? fetchError.message : "Unknown error";
              const errorMsg = `\n\n⚠️ Network error: ${errorMessage}. The work completed so far has been saved.\n`;
              controller.enqueue(encoder.encode(errorMsg));
              fullAssistantResponse += errorMsg;
              continueLoop = false;
              break;
            }
            clearTimeout(timeoutId);

            if (!response.ok) {
              const errorText = await response.text();
              console.error("[Chat API] OpenRouter error:", errorText);
              const errorMsg = `\n\n⚠️ API error (${response.status}). The work completed so far has been saved.\n`;
              controller.enqueue(encoder.encode(errorMsg));
              fullAssistantResponse += errorMsg;
              continueLoop = false;
              break;
            }

            let data;
            let responseText = "";
            try {
              responseText = await response.text();
              console.log(
                "[Chat API] OpenRouter response length:",
                responseText.length
              );

              if (!responseText || responseText.trim() === "") {
                console.error("[Chat API] Empty response from OpenRouter:", {
                  status: response.status,
                  headers: Object.fromEntries(response.headers.entries()),
                  iteration: iterationCount,
                  conversationLength: conversationMessages.length,
                  lastMessageTokenEstimate:
                    JSON.stringify(
                      conversationMessages[conversationMessages.length - 1]
                    ).length / 4,
                });

                // Gracefully end the stream instead of throwing
                const errorMsg = "\n\n⚠️ The model stopped responding due to context size limits. The work completed so far has been saved.\n";
                controller.enqueue(encoder.encode(errorMsg));
                fullAssistantResponse += errorMsg;
                continueLoop = false;
                break; // Exit the while loop
              }

              data = JSON.parse(responseText);

              // Check for OpenRouter-specific error structure
              if (data.error) {
                console.error("[Chat API] OpenRouter API error:", data.error);
                const errorMsg = `\n\n⚠️ API Error: ${data.error.message || "Unknown error"}. Work completed so far has been saved.\n`;
                controller.enqueue(encoder.encode(errorMsg));
                fullAssistantResponse += errorMsg;
                continueLoop = false;
                break;
              }
            } catch (parseError: unknown) {
              console.error("[Chat API] Failed to parse OpenRouter response:", {
                error: parseError instanceof Error ? parseError.message : String(parseError),
                status: response.status,
                responsePreview: responseText?.substring(0, 500),
              });

              // Gracefully handle parse errors
              const errorMsg = "\n\n⚠️ Unable to process model response. The work completed so far has been saved.\n";
              controller.enqueue(encoder.encode(errorMsg));
              fullAssistantResponse += errorMsg;
              continueLoop = false;
              break;
            }

            const assistantMessage = data.choices?.[0]?.message;

            if (!assistantMessage) {
              console.error(
                "[Chat API] No assistant message in response:",
                data
              );
              const errorMsg = "\n\n⚠️ Invalid response from model. The work completed so far has been saved.\n";
              controller.enqueue(encoder.encode(errorMsg));
              fullAssistantResponse += errorMsg;
              continueLoop = false;
              break;
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
              cleanAssistantContent += content + "\n\n"; // Store only LLM's actual content
              controller.enqueue(encoder.encode(content + "\n\n"));
            }

            // Handle tool calls
            if (
              assistantMessage.tool_calls &&
              assistantMessage.tool_calls.length > 0
            ) {
              console.log(
                `[Chat API] Processing ${assistantMessage.tool_calls.length} tool call(s)`
              );

              for (const toolCall of assistantMessage.tool_calls) {
                allToolCalls.push(toolCall);

                const toolName = toolCall.function.name;

                // Stream tool execution notification with user-friendly message
                const getToolMessage = (toolName: string) => {
                  switch (toolName) {
                    case "read_file":
                      return "Reading file...";
                    case "create_file":
                      return "Creating file...";
                    case "update_file":
                      return "Updating file...";
                    case "list_project_files":
                      return "Listing project files...";
                    case "run_command":
                      return "Running command...";
                    case "search_files":
                      return "Searching files...";
                    default:
                      return `Executing ${toolName}...`;
                  }
                };

                const toolNotification = `\n${getToolMessage(toolName)}\n`;
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
                  if (!toolResult.content || toolResult.content.trim() === "") {
                    console.error("[Chat API] Empty tool result content");
                    result = {
                      success: false,
                      error: "Tool returned empty result",
                    };
                  } else {
                    result = JSON.parse(toolResult.content);
                  }
                } catch (parseError) {
                  console.error("[Chat API] Failed to parse tool result:", {
                    error: parseError,
                    content: toolResult.content?.substring(0, 200),
                    toolName,
                  });
                  result = {
                    success: false,
                    error: "Failed to parse tool result",
                  };
                }

                console.log("[Chat API] Tool result:", {
                  toolName,
                  success: result.success,
                });

                // Add tool result to conversation
                conversationMessages.push(toolResult);

                // Stream tool result with user-friendly messages
                let resultMessage = "";

                if (result.success) {
                  const getSuccessMessage = (toolName: string, result: Record<string, unknown>) => {
                    const file = result.file as { path?: string } | undefined;
                    const files = result.files as unknown[] | undefined;
                    const message = result.message as string | undefined;
                    
                    switch (toolName) {
                      case "read_file":
                        return `Successfully read ${file?.path || "file"}`;
                      case "create_file":
                        return `Successfully created ${file?.path || "file"}`;
                      case "update_file":
                        return `Successfully updated ${file?.path || "file"}`;
                      case "list_project_files":
                        return `Found ${files?.length || 0} files`;
                      case "run_command":
                        return `Command completed successfully`;
                      case "search_files":
                        return `Search completed`;
                      default:
                        return message || "Task completed successfully";
                    }
                  };

                  resultMessage = `${getSuccessMessage(toolName, result)}\n`;
                  if (result.description) {
                    resultMessage += `${result.description}\n`;
                  }

                  // If a file was created/updated, send a refresh signal
                  if (
                    toolName === "create_file" ||
                    toolName === "update_file"
                  ) {
                    resultMessage += `[FILE_UPDATED:${
                      result.file?.path || "unknown"
                    }]\n`;
                  }
                } else {
                  resultMessage = `Error: ${result.error || "Unknown error"}\n`;
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
            const warningMsg = "\n\nReached maximum iterations. Stopping.\n";
            controller.enqueue(encoder.encode(warningMsg));
            fullAssistantResponse += warningMsg;
          }

          // Generate updated summary for the project
          let newSummary = projectSummary;
          try {
            const summaryPrompt = `Based on the user's request and the work completed, generate a concise project summary (max 200 words) that includes:
1. What the user originally requested
2. What was implemented/changed
3. Current project state and key files

Previous summary: ${projectSummary}
User request: ${lastUserMessage.content}
Work completed: ${allToolCalls.filter((tc) => tc.function?.name).map((tc) => tc.function!.name).join(", ")}

Respond with ONLY the updated summary text, no additional formatting.`;

            const summaryResponse = await fetch(
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
                  model: "google/gemini-2.5-flash-lite", // Fast, cheap model for summaries
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
              console.log(
                "[Chat API] Generated new summary:",
                newSummary.substring(0, 100)
              );
            }
          } catch (error) {
            console.error("[Chat API] Failed to generate summary:", error);
          }

          // Save assistant message to database
          // Use cleanAssistantContent (without tool logs) for conversation history
          try {
            await createMessage({
              projectId,
              userId,
              role: "assistant",
              content:
                cleanAssistantContent.trim() || "Task completed successfully.",
              metadata: {
                model,
                toolCalls: allToolCalls as unknown,
                iterations: iterationCount,
              } as Record<string, unknown>,
              sequence: messages.length,
            });

            await updateProject(projectId, {
              summary: newSummary,
              lastMessageAt: new Date().toISOString(),
            });

            console.log("[Chat API] Assistant message and summary saved");
          } catch (error) {
            console.error(
              "[Chat API] Failed to save assistant message:",
              error
            );
          }

          controller.close();
        } catch (error: unknown) {
          console.error("[Chat API] Streaming error:", error);
          controller.enqueue(
            encoder.encode(`\n\nAn error occurred: ${error instanceof Error ? error.message : String(error)}\n`)
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
    console.error("[Chat API] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal Server Error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
