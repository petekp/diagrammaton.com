import { OpenAIStream, StreamingTextResponse } from "ai";
import OpenAI from "openai";
import {
  functions,
  createMessages,
  GPTModels,
} from "~/plugins/diagrammaton/lib";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export const runtime = "edge";

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204 });
}

export async function POST(req: Request) {
  const { input, model = "gpt4" } = (await req.json()) as {
    input: string;
    model: keyof typeof GPTModels;
  };

  console.log("Input: ", input);

  const response = await openai.chat.completions.create({
    model: GPTModels[model],
    stream: true,
    messages: createMessages(input),
    functions,
  });

  const stream = OpenAIStream(response);

  return new StreamingTextResponse(stream);
}
