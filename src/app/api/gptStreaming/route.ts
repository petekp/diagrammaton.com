import OpenAI from "openai";
import { z } from "zod";
import { headers } from "next/headers";
import { fetchUserByLicenseKey } from "~/app/dataHelpers";
import { functions, generateMessages } from "~/plugins/diagrammaton/lib";

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

const modelMapping = {
  gpt3: "gpt-3.5-turbo",
  gpt4: "gpt-4",
  gpt4turbo: "gpt-4-turbo",
  gpt4omni: "gpt-4o",
} as const;

const isModelAvailable = (
  available_models: any,
  modelKey: keyof typeof modelMapping
) => {
  return available_models.data.some(
    (model: any) => model.id === modelMapping[modelKey]
  );
};

const getPreferredModel = (
  available_models: any,
  model: keyof typeof modelMapping
) => {
  if (model === "gpt4") {
    if (isModelAvailable(available_models, "gpt4omni")) {
      return "gpt4omni";
    }
    if (isModelAvailable(available_models, "gpt4turbo")) {
      return "gpt4turbo";
    }
  }
  return model;
};

const selectGPTModel = ({
  available_models,
  model,
}: {
  available_models: any;
  model: keyof typeof modelMapping;
}) => {
  const selectedModel = getPreferredModel(available_models, model);
  return modelMapping[selectedModel];
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

  const modelMapping = {
    gpt3: "gpt-3.5-turbo-0613",
    gpt4: "gpt-4-0613",
    gpt4turbo: "gpt-4-turbo",
  };

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

    // For now, let's use a direct model mapping without checking availability  
    const modelKey = clientModel as keyof typeof modelMapping;
    const model = modelMapping[modelKey] || modelMapping.gpt3;

    const response = await openai.chat.completions.create({
      model,
      stream: true,
      messages: generateMessages({ action, data: inputData }),
      functions,
    });

    logInfo("Streaming initiated", {
      action,
      ...inputData,
      model,
    });

    // Return a simple streaming response for now - this can be enhanced later
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
            }
            const functionCall = chunk.choices[0]?.delta?.function_call;
            if (functionCall) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ function_call: functionCall })}\n\n`));
            }
          }
        } catch (error) {
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
      },
    });
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
