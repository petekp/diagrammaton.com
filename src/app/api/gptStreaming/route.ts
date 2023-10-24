import { OpenAIStream, StreamingTextResponse } from "ai";
import OpenAI from "openai";
import { z } from "zod";
import { headers } from "next/headers";
import { fetchUserByLicenseKey } from "~/app/dataHelpers";
import {
  functions,
  createMessages,
  GPTModels,
} from "~/plugins/diagrammaton/lib";

import {
  DiagrammatonError,
  InvalidApiKey,
  InvalidLicenseKey,
  NoDescriptionProvided,
} from "~/server/api/routers/errors";
import { logError, logInfo } from "~/utils/log";
import { NextResponse } from "next/server";
import { checkRateLimit } from "~/app/rateLimiter";

const generateInputSchema = z.object({
  licenseKey: z.string(),
  diagramDescription: z.string(),
  model: z
    .union([z.literal("gpt3"), z.literal("gpt4")])
    .optional()
    .default("gpt3"),
});

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204 });
}

export async function POST(req: Request) {
  const {
    diagramDescription,
    licenseKey,
    model = "gpt4",
  } = (await req.json()) as z.infer<typeof generateInputSchema>;
  logInfo("Generate endpoint called: ", {
    diagramDescription,
    licenseKey,
    model,
  });

  const headersList = headers();
  const ipAddress = headersList.get("x-forwarded-for");
  const identifier = ipAddress ?? licenseKey;

  await checkRateLimit(identifier);

  if (!diagramDescription) {
    throw new NoDescriptionProvided({ diagramDescription });
  }

  const timeout = setTimeout(() => {
    logError("Function is about to timeout", {
      diagramDescription,
    });
  }, 55000);

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
      model: GPTModels[model],
      stream: true,
      messages: createMessages(diagramDescription),
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

    console.error(err);
  } finally {
    clearTimeout(timeout);
  }
}
