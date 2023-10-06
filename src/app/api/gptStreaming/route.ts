import { OpenAIStream, StreamingTextResponse } from "ai";
import OpenAI from "openai";
import { z } from "zod";
import { fetchUserByLicenseKey } from "~/app/dataHelpers";
import {
  functions,
  createMessages,
  GPTModels,
} from "~/plugins/diagrammaton/lib";
import { generateInputSchema } from "~/server/api/routers/diagrammaton";
import {
  DiagrammatonError,
  InvalidApiKey,
  InvalidLicenseKey,
} from "~/server/api/routers/errors";
import { logError } from "~/utils/log";
import { NextResponse } from "next/server";

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204 });
}

export async function POST(req: Request) {
  const {
    diagramDescription,
    licenseKey,
    model = "gpt4",
  } = (await req.json()) as z.infer<typeof generateInputSchema>;

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
  }
}
