import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat";
import type {
  ResponseInput,
  ResponseInputText,
  ResponseStreamEvent,
} from "openai/resources/responses/responses";
import { zodResponseFormat, zodTextFormat } from "openai/helpers/zod";
import { type z } from "zod";
import { headers } from "next/headers";
import { fetchUserByLicenseKey } from "~/app/dataHelpers";
import {
  diagramResponseSchema,
  generateMessages,
} from "~/plugins/diagrammaton/lib";

import {
  DiagrammatonError,
  InvalidApiKey,
} from "~/server/api/routers/errors";
import { logError, logInfo } from "~/utils/log";
import { NextResponse } from "next/server";
import { checkRateLimit } from "~/app/rateLimiter";
import { type Action, actionSchemas, type ActionDataMap } from "~/app/types";


export function OPTIONS(_req: Request) {
  return new Response(null, { status: 204 });
}

export const runtime = "nodejs";

const resolveTargetModel = (_clientModel: "gpt5" | "gpt3" | "gpt4") =>
  "gpt-5" as const;

const diagramResponsesTextFormat = zodTextFormat(
  diagramResponseSchema,
  "diagram_response"
);

const diagramChatResponseFormat = zodResponseFormat(
  diagramResponseSchema,
  "diagram_response"
);

const normalizeMessageContent = (
  content: ChatCompletionMessageParam["content"]
): string => {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }
        const candidate = (part as { text?: unknown }).text;
        return typeof candidate === "string" ? candidate : "";
      })
      .join("");
  }

  if (content && typeof content === "object") {
    const candidate = (content as { text?: unknown }).text;
    if (typeof candidate === "string") {
      return candidate;
    }
  }

  return content ? String(content) : "";
};

const messagesToResponsesInput = (
  messages: ChatCompletionMessageParam[]
): ResponseInput => {
  const responseInput: ResponseInput = [];

  for (const message of messages) {
    if (message.role !== "system" && message.role !== "user") {
      continue;
    }

    const text = normalizeMessageContent(message.content);
    const content: ResponseInputText = {
      type: "input_text",
      text,
    };

    responseInput.push({
      type: "message",
      role: message.role,
      content: [content],
    });
  }

  return responseInput;
};

const extractOutputText = (response: unknown): string => {
  if (!response || typeof response !== "object") {
    return "";
  }

  const outputText = (response as { output_text?: unknown }).output_text;
  if (typeof outputText === "string" && outputText.length > 0) {
    return outputText;
  }

  const output = (response as { output?: unknown }).output;
  if (Array.isArray(output)) {
    let combined = "";
    for (const item of output) {
      if (item && typeof item === "object") {
        const type = (item as { type?: unknown }).type;
        if (
          type === "message" &&
          Array.isArray((item as { content?: unknown }).content)
        ) {
          for (const part of (item as { content: unknown[] }).content) {
            if (part && typeof part === "object") {
              const partText = (part as { text?: unknown }).text;
              if (typeof partText === "string") {
                combined += partText;
              }
            }
          }
        }
      }
    }
    return combined;
  }

  return "";
};
export async function POST(req: Request) {
  const { action, data } = (await req.json()) as {
    action: z.infer<typeof Action>;
    data: ActionDataMap[z.infer<typeof Action>];
  };

  const schema = actionSchemas[action];

  if (!schema) {
    throw new Error("Invalid action");
  }

  const inputData = schema.parse(data);

  const { licenseKey, model: clientModel } = inputData;

  console.info("Generate endpoint called: ", {
    action,
    data: inputData,
  });

  if (!licenseKey) {
    return NextResponse.json(
      { type: "error", message: "License key is required" },
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }

  const headersList = headers();
  const ipAddress = headersList.get("x-forwarded-for");
  const identifier = ipAddress ?? licenseKey;

  await checkRateLimit(identifier);

  try {

    const { user } = await fetchUserByLicenseKey(licenseKey);

    if (!user.openaiApiKey) {
      throw new InvalidApiKey();
    }

    const openai = new OpenAI({
      apiKey: user.openaiApiKey || "",
    });

    // Prefer the Responses API (GPT‑5) if available in the SDK; otherwise fall back to chat streaming.
    const targetModel = resolveTargetModel(clientModel);

    const messages = generateMessages({ action, data: inputData });

    const responsesInput = messagesToResponsesInput(messages);
    const responsesAvailable =
      typeof (openai as unknown as { responses?: { create?: unknown } })
        .responses?.create === "function";

    logInfo("gptStreaming: API availability", {
      path: responsesAvailable ? "responses" : "chat",
      targetModel,
    });

    const fallbackChatModel = "gpt-4o";

    const buildChatFallbackResponse = async (reason: string) => {
      logInfo("gptStreaming: chat fallback", {
        reason,
        action,
        ...inputData,
        model: fallbackChatModel,
      });

      const chatResponse = await openai.chat.completions.create({
        model: fallbackChatModel,
        stream: true,
        response_format: diagramChatResponseFormat,
        messages: messages,
      });

      const iterator = chatResponse[Symbol.asyncIterator]?.bind(chatResponse);
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          const encoder = new TextEncoder();
          if (!iterator) {
            controller.close();
            return;
          }
          try {
            const it = iterator() as AsyncIterableIterator<{
              choices: Array<{
                delta: { content?: string | null };
                text?: string;
              }>;
            }>;
            while (true) {
              const result = await it.next();
              if (result.done) break;
              const chunkText =
                result.value?.choices?.[0]?.delta?.content ??
                result.value?.choices?.[0]?.text ??
                "";
              if (chunkText) controller.enqueue(encoder.encode(chunkText));
            }
          } catch (error) {
            if (!(error instanceof Error) || error.name !== "AbortError") {
              // Ignore downstream connection issues, partial results may already be delivered.
              logError("gptStreaming: chat fallback iterator error", {
                message: (error as Error)?.message,
              });
            }
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
          "Access-Control-Allow-Origin": "*",
        },
      });
    };

    if (responsesAvailable) {
      try {
        logInfo("gptStreaming: Responses streaming begin", {
          model: targetModel,
        });
        const abortController = new AbortController();
        const streamingFirstChunkTimeoutMs = 60000;
        const respStream = openai.responses.stream(
          {
            model: targetModel,
            input: responsesInput,
            reasoning: { effort: "low" },
            text: {
              format: diagramResponsesTextFormat,
              verbosity: "low",
            },
            store: false,
          },
          { signal: abortController.signal }
        );

        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const encoder = new TextEncoder();
            let firstChunkSeen = false;
            let eventsLogged = 0;
            let deltasLogged = 0;
            let streamErrored = false;
            let noDataTimer: ReturnType<typeof setTimeout> | null = null;

            const resetNoDataTimer = () => {
              if (noDataTimer) clearTimeout(noDataTimer);
              if (firstChunkSeen) {
                noDataTimer = null;
                return;
              }
              noDataTimer = setTimeout(() => {
                logError("gptStreaming: responses stream no-data timeout", {
                  timeoutMs: streamingFirstChunkTimeoutMs,
                });
                abortController.abort();
                respStream.abort();
              }, streamingFirstChunkTimeoutMs);
            };

            const emit = (text: string) => {
              if (!text) return;
              firstChunkSeen = true;
              if (deltasLogged < 5) {
                logInfo("gptStreaming: emit responses delta", {
                  bytes: text.length,
                  preview: text.slice(0, 60),
                });
                deltasLogged++;
              }
              controller.enqueue(encoder.encode(text));
            };

            const handleEvent = (event: ResponseStreamEvent) => {
              if (event.type === "response.output_text.delta") {
                emit(event.delta ?? "");
                return;
              }

              if (!firstChunkSeen) {
                if (event.type === "response.content_part.added") {
                  const part = event.part;
                  if (
                    part?.type === "output_text" &&
                    typeof part.text === "string" &&
                    part.text
                  ) {
                    emit(part.text);
                    return;
                  }
                }
                if (event.type === "response.output_item.added") {
                  const text = extractOutputText({ output: [event.item] });
                  if (text) {
                    emit(text);
                  }
                }
              }
            };

            resetNoDataTimer();

            try {
              for await (const event of respStream) {
                resetNoDataTimer();

                if (eventsLogged < 10) {
                  logInfo("gptStreaming: responses event", {
                    type: event.type,
                  });
                  eventsLogged++;
                }

                if (event.type === "error") {
                  throw new Error(event.message ?? "Responses API error");
                }

                if (event.type === "response.failed") {
                  throw new Error(
                    event.response.error?.message ?? "Responses API failure"
                  );
                }

                handleEvent(event);
              }

              const finalResp = await respStream
                .finalResponse()
                .catch((err) => {
                  logError("gptStreaming: finalResponse retrieval failed", {
                    message: (err as Error)?.message,
                  });
                  return null;
                });

              if (!firstChunkSeen) {
                const fallbackText = extractOutputText(finalResp);
                if (fallbackText) {
                  emit(fallbackText);
                }
              }
            } catch (error) {
              streamErrored = true;
              logError("gptStreaming: responses stream error", {
                message: (error as Error)?.message,
              });
              respStream.abort();
              controller.error(error as Error);
            } finally {
              if (noDataTimer) clearTimeout(noDataTimer);
              logInfo("gptStreaming: responses stream closed", {
                firstChunkSeen,
              });
              if (!streamErrored) {
                controller.close();
              }
            }
          },
          cancel() {
            abortController.abort();
            respStream.abort();
          },
        });

        logInfo("Responses API streaming", {
          action,
          ...inputData,
          model: targetModel,
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
            "Access-Control-Allow-Origin": "*",
          },
        });
      } catch (error) {
        const message = (error as Error)?.message || "";
        logError("gptStreaming: responses streaming failed", { message });
        return await buildChatFallbackResponse("responses failure");
      }
    }

    return await buildChatFallbackResponse("responses unavailable");
  } catch (err) {
    console.error(err);
    logError(err as string);
    const message =
      err instanceof DiagrammatonError || err instanceof Error
        ? err.message
        : "An unexpected error occurred 🫠";
    return NextResponse.json(
      { type: "error", message },
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}
