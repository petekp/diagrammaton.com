import { StreamingTextResponse } from "ai";
import OpenAI from "openai";
import { z } from "zod";
import { headers } from "next/headers";
import { fetchUserByLicenseKey } from "~/app/dataHelpers";
import { generateMessages } from "~/plugins/diagrammaton/lib";

import {
  DiagrammatonError,
  InvalidApiKey,
  InvalidLicenseKey,
} from "~/server/api/routers/errors";
import { logError, logInfo } from "~/utils/log";
import { NextResponse } from "next/server";
import { checkRateLimit } from "~/app/rateLimiter";
import { Action, actionSchemas, ActionDataMap } from "~/app/types";

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204 });
}

// Ensure Node runtime for compatibility with SDK streams
export const runtime = "nodejs";

// Target GPT‑5 for all generation
const resolveTargetModel = (_clientModel: "gpt5" | "gpt3" | "gpt4") => "gpt-5" as const;

// Convert legacy chat messages into a single input string for Responses API
const messagesToInputText = (messages: Array<{ role: string; content: string }>) => {
  return messages
    .map((m) => `${m.role.toUpperCase()}: ${typeof m.content === "string" ? m.content : String(m.content)}`)
    .join("\n\n");
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

  const headersList = headers();
  const ipAddress = headersList.get("x-forwarded-for");
  const identifier = ipAddress ?? licenseKey;

  await checkRateLimit(identifier);

  try {
    if (!licenseKey) {
      throw new InvalidLicenseKey();
    }

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

    const hasResponsesApi = (openai as unknown as { responses?: { create?: unknown } }).responses?.create;
    logInfo("gptStreaming: API availability", {
      path: hasResponsesApi ? "responses" : "chat",
      targetModel,
    });

    if (hasResponsesApi) {
      // Responses API streaming path: emit token deltas in real time
      const inputText = messagesToInputText(
        messages as Array<{ role: string; content: string }>
      );

      try {
        logInfo("gptStreaming: Responses streaming begin", { model: targetModel });
        // Safety: abort streaming if no chunks arrive within timeout
        const abortController = new AbortController();
        const streamingNoDataTimeoutMs = 5000;
        let firstChunkSeen = false;
        let chunksLogged = 0;

        const noDataTimer = setTimeout(() => {
          if (!firstChunkSeen) abortController.abort();
        }, streamingNoDataTimeoutMs);


        const respStream = await openai.responses.create(
          {
            model: targetModel,
            input: inputText,
            stream: true,
          },
          { signal: abortController.signal }
        );

        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const encoder = new TextEncoder();

            // Try async iterator first (SDK Stream is async iterable)
            const iterator = (respStream as any)[Symbol.asyncIterator]?.bind(
              respStream
            );

            const extractText = (event: any): string => {
              try {
                if (!event) return "";
                // Known shapes for Responses deltas
                if (typeof event === "string") return event;
                if (typeof event?.delta === "string") return event.delta;
                if (typeof event?.text_delta === "string") return event.text_delta;
                if (typeof event?.output_text === "string") return event.output_text;
                if (event?.delta?.output_text && typeof event.delta.output_text === "string") {
                  return event.delta.output_text;
                }
                const content = event?.delta?.content || event?.content;
                if (Array.isArray(content)) {
                  let s = "";
                  for (const c of content) {
                    if (typeof c?.text_delta === "string") s += c.text_delta;
                    else if (typeof c?.text === "string") s += c.text;
                  }
                  if (s) return s;
                }
                if (typeof event?.type === "string") {
                  const maybe =
                    (event as any).output_text ||
                    (event as any).text ||
                    (event as any).response?.output_text;
                  if (typeof maybe === "string") return maybe;
                  if (Array.isArray(maybe)) return maybe.join("");
                }
              } catch {
                // ignore parse errors and continue
              }
              return "";
            };

            try {
              if (iterator) {
                const it = iterator();
                while (true) {
                  const { value, done } = await it.next();
                  if (done) break;
                  const text = extractText(value);
                  if (text) {
                    firstChunkSeen = true;
                    if (chunksLogged < 5) {
                      logInfo("gptStreaming: enqueue responses delta", {
                        bytes: text.length,
                        preview: text.slice(0, 60),
                      });
                      chunksLogged++;
                    }
                    controller.enqueue(encoder.encode(text));
                  }
                }
              } else if (typeof (respStream as any).toReadableStream === "function") {
                // Fallback: read newline-delimited JSON and extract text
                const rs: ReadableStream = (respStream as any).toReadableStream();
                const reader = rs.getReader();
                const decoder = new TextDecoder();
                let buf = "";
                while (true) {
                  const { value, done } = await reader.read();
                  if (done) break;
                  buf += decoder.decode(value, { stream: true });
                  let idx;
                  while ((idx = buf.indexOf("\n")) !== -1) {
                    const line = buf.slice(0, idx);
                    buf = buf.slice(idx + 1);
                    if (!line) continue;
                    try {
                      const evt = JSON.parse(line);
                      const text = extractText(evt);
                      if (text) {
                        firstChunkSeen = true;
                        if (chunksLogged < 5) {
                          logInfo("gptStreaming: enqueue responses ndjson", {
                            bytes: text.length,
                            preview: text.slice(0, 60),
                          });
                          chunksLogged++;
                        }
                        controller.enqueue(encoder.encode(text));
                      }
                    } catch {
                      // ignore malformed lines
                    }
                  }
                }
              }
            } finally {
              clearTimeout(noDataTimer);
              logInfo("gptStreaming: responses stream closed", {
                firstChunkSeen,
              });
              controller.close();
            }
          },
        });

        logInfo("Responses API streaming", {
          action,
          ...inputData,
          model: targetModel,
        });

        return new StreamingTextResponse(stream);
      } catch (e: unknown) {
        // If org is not verified for streaming, fall back to non-streaming Responses
        const message = (e as Error)?.message || "";
        logError("gptStreaming: responses streaming error", { message });
        const shouldFallbackToNonStreaming =
          message.includes("must be verified to stream") ||
          message.includes("param: 'stream'") ||
          message.includes("unsupported_value");

        // Prefer a streaming UX for the plugin: jump straight to chat streaming fallback
        const preferStreamingFallback = true;

        if (shouldFallbackToNonStreaming && !preferStreamingFallback) {
          const resp = await openai.responses.create({
            model: targetModel,
            input: inputText,
            stream: false,
          });

          let outputText =
            (resp?.output_text as string | undefined) ??
            (resp?.output?.map?.((o: any) => o?.content?.map?.((c: any) => c?.text).join("")).join("") as string | undefined) ??
            "";

          // Sanitize common wrappers (code fences) and isolate the JSON array if present
          outputText = outputText.replace(/```+json\s*|```+/gi, "");
          const firstBracket = outputText.indexOf("[");
          const lastBracket = outputText.lastIndexOf("]");
          let arraySlice =
            firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket
              ? outputText.slice(firstBracket, lastBracket + 1)
              : outputText;

          let parsedArray: any[] | null = null;
          try {
            const maybe = JSON.parse(arraySlice);
            if (Array.isArray(maybe)) parsedArray = maybe;
          } catch {}

          const stream = new ReadableStream<Uint8Array>({
            async start(controller) {
              const encoder = new TextEncoder();
              // If we could parse, stream object-by-object to mimic live streaming
              if (parsedArray) {
                logInfo("gptStreaming: emit array chunks", {
                  count: parsedArray.length,
                });
                controller.enqueue(encoder.encode("["));
                for (let i = 0; i < parsedArray.length; i++) {
                  const obj = parsedArray[i];
                  const chunk = JSON.stringify(obj);
                  controller.enqueue(encoder.encode(chunk));
                  if (i < parsedArray.length - 1) controller.enqueue(encoder.encode(","));
                  // Yield to the reader loop to allow progressive rendering
                  await new Promise((r) => setTimeout(r, 0));
                }
                controller.enqueue(encoder.encode("]"));
              } else {
                // Fallback: stream whole text
                controller.enqueue(encoder.encode(outputText));
              }
              controller.close();
            },
          });

          logInfo("Responses API non-streaming fallback", {
            action,
            ...inputData,
            model: targetModel,
          });

          return new StreamingTextResponse(stream);
        }
        // Last resort: fall back to chat streaming if Responses API fails otherwise
        const fallbackChatModel = "gpt-4o";
        logInfo("gptStreaming: chat fallback begin (responses failure)", {
          model: fallbackChatModel,
        });
        const chatResponse = await openai.chat.completions.create({
          model: fallbackChatModel,
          stream: true,
          messages: messages as any,
        });

        const iterator = (chatResponse as any)[Symbol.asyncIterator]?.bind(chatResponse);
        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const encoder = new TextEncoder();
            if (!iterator) {
              controller.close();
              return;
            }
            try {
              const it = iterator();
              while (true) {
                const { value, done } = await it.next();
                if (done) break;
                const chunkText =
                  value?.choices?.[0]?.delta?.content ?? value?.choices?.[0]?.text ?? "";
                if (chunkText) controller.enqueue(encoder.encode(chunkText));
              }
            } catch {
            } finally {
              controller.close();
            }
          },
        });

        logInfo("Chat fallback after Responses failure", {
          action,
          ...inputData,
          model: fallbackChatModel,
        });
        return new StreamingTextResponse(stream);
      }
    }

    // Fallback: legacy chat completions streaming for environments without Responses API
    const fallbackChatModel = "gpt-4o";
    logInfo("gptStreaming: chat fallback (no responses API)", {
      model: fallbackChatModel,
    });
    const chatResponse = await openai.chat.completions.create({
      model: fallbackChatModel,
      stream: true,
      messages: messages as any,
    });

    // Avoid importing OpenAIStream; implement minimal passthrough using SDK stream
    const iterator = (chatResponse as any)[Symbol.asyncIterator]?.bind(chatResponse);
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const encoder = new TextEncoder();
        if (!iterator) {
          controller.close();
          return;
        }
        try {
          const it = iterator();
          while (true) {
            const { value, done } = await it.next();
            if (done) break;
            const chunkText =
              value?.choices?.[0]?.delta?.content ?? value?.choices?.[0]?.text ?? "";
            if (chunkText) controller.enqueue(encoder.encode(chunkText));
          }
        } catch (e) {
          // noop; client will receive whatever has been streamed so far
        } finally {
          controller.close();
        }
      },
    });

    logInfo("Streaming initiated (chat fallback)", {
      action,
      ...inputData,
      model: fallbackChatModel,
    });

    return new StreamingTextResponse(stream);
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
