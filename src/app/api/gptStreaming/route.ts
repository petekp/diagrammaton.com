import { OpenAIStream, StreamingTextResponse } from "ai";
import OpenAI from "openai";
import { z } from "zod";
import { headers } from "next/headers";
import { fetchUserByLicenseKey } from "~/app/dataHelpers";
import {
  functions,
  generateMessages,
  GPTModels,
} from "~/plugins/diagrammaton/lib";

import {
  DiagrammatonError,
  InvalidApiKey,
  InvalidLicenseKey,
} from "~/server/api/routers/errors";
import { logError, logInfo } from "~/utils/log";
import { NextResponse } from "next/server";
import { checkRateLimit } from "~/app/rateLimiter";

export const Action = z.union([z.literal("generate"), z.literal("modify")]);

export const generateInputSchema = z.object({
  licenseKey: z.string(),
  diagramDescription: z.string(),
  model: z
    .union([z.literal("gpt3"), z.literal("gpt4")])
    .optional()
    .default("gpt3"),
});

// diagramId
// diagramNodeId
// diagramData
// instructions
// licenseKey
// model

export const modifyInputSchema = z.object({
  diagramId: z.string(),
  diagramNodeId: z.string(),
  diagramData: z.any(),
  licenseKey: z.string(),
  instructions: z.string(),
  model: z
    .union([z.literal("gpt3"), z.literal("gpt4")])
    .optional()
    .default("gpt3"),
});

export const actionSchemas: Record<
  z.infer<typeof Action>,
  z.ZodSchema<any, any>
> = {
  generate: generateInputSchema,
  modify: modifyInputSchema,
  // add more actions here in the future
};

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204 });
}

export async function POST(req: Request) {
  const { action, data } = (await req.json()) as {
    action: z.infer<typeof Action>;
    data: any;
  };

  const schema = actionSchemas[action];
  if (!schema) {
    throw new Error("Invalid action");
  }

  const inputData = schema.parse(data);
  const { licenseKey, model } = inputData;

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

    const response = await openai.chat.completions.create({
      model: GPTModels[model as keyof typeof GPTModels],
      stream: true,
      messages: generateMessages({ action, data: inputData }),
      functions,
    });

    const stream = OpenAIStream(response);

    return new StreamingTextResponse(stream);
  } catch (err) {
    if (err instanceof DiagrammatonError) {
      console.error(err);
      logError(err.message, err.logArgs);
      return NextResponse.json(
        { type: "error", message: err.message },
        {
          status: 500,
        }
      );
    }

    return err;
  }
}
