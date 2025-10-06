import { generateText, generateObject } from "ai";
import { NextRequest } from "next/server";
import { z } from "zod";
import { openrouter, DEFAULT_MODEL } from "@/lib/ai/openrouter";
import {
  PLANNING_PROMPT,
  FILE_PLANNING_PROMPT,
  FINAL_RESPONSE_PROMPT,
} from "@/lib/ai/prompts";
import { aiTools } from "@/lib/ai/tools";
import { createMessage, updateProject } from "@/lib/appwrite/database";

const FileOperationSchema = z.object({
  action: z.enum(["create", "update"]),
  path: z.string().min(2),
  type: z.enum(["file", "folder"]).default("file"),
  encoding: z.enum(["utf-8", "base64"]).default("utf-8"),
  content: z.string().optional(),
  description: z.string().optional(),
});

const FilePlanSchema = z.object({
  operations: z.array(FileOperationSchema),
});

type FileOperation = z.infer<typeof FileOperationSchema>;

type ExecutedOperation = FileOperation & {
  success: boolean;
  error?: string;
};

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

    // Phase 1: produce a plan before any tool usage
    let planText =
      "Plan\n- Unable to generate plan. Proceeding with implementation.";
    try {
      const planningResult = await generateText({
        model: openrouter.languageModel(model),
        messages: [{ role: "system", content: PLANNING_PROMPT }, ...messages],
        maxOutputTokens: 500,
      });

      const rawPlanText = planningResult.text.trim();
      planText = rawPlanText.toLowerCase().startsWith("plan")
        ? rawPlanText
        : `Plan\n${rawPlanText}`;
    } catch (error) {
      console.error("[Chat API] Failed to generate plan:", error);
    }

    const planWithSpacing = planText.endsWith("\n")
      ? `${planText}\n`
      : `${planText}\n\n`;
    const encoder = new TextEncoder();

    // Create user message in database
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

    let operations: FileOperation[] = [];
    try {
      const operationsResult = await generateObject({
        model: openrouter.languageModel(model),
        schema: FilePlanSchema,
        messages: [
          { role: "system", content: FILE_PLANNING_PROMPT },
          ...messages,
          { role: "assistant", content: planText },
        ],
      });
      operations = operationsResult.object.operations || [];
    } catch (error) {
      console.error("[Chat API] Failed to generate file plan:", error);
    }

    console.log("[Chat API] Planned operations:", operations.length);

    const executedOperations: ExecutedOperation[] = [];

    const stream = new ReadableStream<Uint8Array>({
      start: async (controller) => {
        try {
          controller.enqueue(encoder.encode(planWithSpacing));

          if (operations.length === 0) {
            controller.enqueue(
              encoder.encode(
                "No file changes were necessary for this request.\n"
              )
            );
          } else {
            controller.enqueue(
              encoder.encode("Executing file operations...\n")
            );
          }

          for (const [index, operation] of operations.entries()) {
            const position = `${index + 1}/${operations.length}`;
            const header = `${operation.action.toUpperCase()} ${operation.type.toUpperCase()} ${
              operation.path
            } (${position})`;
            controller.enqueue(encoder.encode(`${header}\n`));

            if (!operation.path.startsWith("/")) {
              executedOperations.push({
                ...operation,
                success: false,
                error: "Path must start with /",
              });
              controller.enqueue(
                encoder.encode("❌ Failed: Path must start with /\n")
              );
              continue;
            }

            if (operation.type === "folder") {
              executedOperations.push({
                ...operation,
                success: false,
                error:
                  "Folder creation is not supported in the current workspace.",
              });
              controller.enqueue(
                encoder.encode("❌ Failed: Folder creation is disabled.\n")
              );
              continue;
            }

            if (operation.path.includes("/", 1)) {
              executedOperations.push({
                ...operation,
                success: false,
                error: "Nested paths are not supported. Use root files only.",
              });
              controller.enqueue(
                encoder.encode(
                  "❌ Failed: Nested paths are not supported. Use root files only.\n"
                )
              );
              continue;
            }

            if (
              operation.type === "file" &&
              !operation.path.match(/\.(html|css|js)$/i)
            ) {
              executedOperations.push({
                ...operation,
                success: false,
                error:
                  "Only .html, .css, and .js files are allowed at this stage.",
              });
              controller.enqueue(
                encoder.encode(
                  "❌ Failed: Only .html, .css, and .js files are allowed.\n"
                )
              );
              continue;
            }

            let content = operation.content ?? "";
            if (
              operation.type === "file" &&
              operation.encoding === "base64" &&
              content
            ) {
              try {
                content = Buffer.from(content, "base64").toString("utf-8");
              } catch (error) {
                console.error(
                  "[Chat API] Failed to decode base64 content:",
                  error
                );
                executedOperations.push({
                  ...operation,
                  success: false,
                  error: "Failed to decode base64 content",
                });
                controller.enqueue(
                  encoder.encode("❌ Failed: could not decode base64 content\n")
                );
                continue;
              }
            }

            let result;
            // This check is redundant since we already filter out folders above
            // but keeping for safety - folders should never reach this point

            if (operation.action === "create") {
              result = await aiTools.create_file.execute(
                {
                  path: operation.path,
                  type: operation.type,
                  content: operation.type === "file" ? content : "",
                },
                { projectId, userId }
              );
            } else {
              result = await aiTools.update_file.execute(
                {
                  path: operation.path,
                  content: content,
                },
                { projectId, userId }
              );
            }

            const success = Boolean(result?.success);
            executedOperations.push({
              ...operation,
              success,
              error: success ? undefined : result?.error || "Unknown error",
            });

            if (success) {
              controller.enqueue(encoder.encode("✅ Success\n"));
            } else {
              controller.enqueue(
                encoder.encode(
                  `❌ Failed: ${result?.error || "Unknown error"}\n`
                )
              );
            }
          }

          // Prepare final summary using the model
          const finalSummary = await generateText({
            model: openrouter.languageModel(model),
            messages: [
              { role: "system", content: FINAL_RESPONSE_PROMPT },
              {
                role: "user",
                content: JSON.stringify({
                  userRequest: messages[messages.length - 1],
                  plan: planText,
                  operations: executedOperations,
                }),
              },
            ],
            maxOutputTokens: 800,
          });

          const finalText = finalSummary.text.trim();
          if (finalText) {
            controller.enqueue(encoder.encode(`\n${finalText}\n`));
          }

          // Save assistant message to database
          const assistantContent = [
            planText,
            executedOperations
              .map((op) => {
                const status = op.success ? "success" : `failed: ${op.error}`;
                return `- ${op.action} ${op.type} ${op.path} (${status})`;
              })
              .join("\n"),
            finalText,
          ]
            .filter(Boolean)
            .join("\n\n")
            .trim();

          try {
            await createMessage({
              projectId,
              userId,
              role: "assistant",
              content: assistantContent,
              metadata: {
                model,
                toolCalls: executedOperations.map((op) => ({
                  id: `op_${Date.now()}_${Math.random()
                    .toString(36)
                    .substring(2, 11)}`,
                  name: `${op.action}_file`,
                  arguments: {
                    path: op.path,
                    type: op.type,
                    content: op.content,
                  },
                  result: { success: op.success, error: op.error },
                })),
              },
              sequence: messages.length,
            });

            await updateProject(projectId, {
              lastMessageAt: new Date().toISOString(),
            });
          } catch (error) {
            console.error("Error saving assistant message:", error);
          }

          controller.close();
        } catch (error) {
          console.error("[Chat API] Streaming error:", error);
          controller.enqueue(
            encoder.encode(
              "\nAn error occurred while generating the project.\n"
            )
          );
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error: any) {
    console.error("[Chat API] Error:", error);
    console.error("[Chat API] Error details:", error.message, error.stack);
    return new Response(
      JSON.stringify({ error: error.message || "Internal Server Error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
