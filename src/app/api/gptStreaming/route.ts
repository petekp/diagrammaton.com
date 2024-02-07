import { OpenAIStream, StreamingTextResponse } from "ai";
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
  };

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

    console.info(user);

    if (!user.openaiApiKey) {
      throw new InvalidApiKey();
    }

    const openai = new OpenAI({
      apiKey: user.openaiApiKey || "",
    });

    const response = await openai.chat.completions.create({
      model: modelMapping[model],
      stream: true,
      messages: generateMessages({ action, data: inputData }),
      functions,
    });

    console.info(response);

    const stream = OpenAIStream(response);

    logInfo("Streaming initiated", {
      action,
      ...inputData,
    });

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
    } else {
      console.error(err);
      logError(err as string);
      return NextResponse.json(
        { type: "error", message: "An unexpected error occurred 🫠" },
        {
          status: 500,
        }
      );
    }
  }
}
