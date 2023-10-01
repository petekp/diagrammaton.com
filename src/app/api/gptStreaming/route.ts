import {
  OpenAIStream,
  StreamingTextResponse,
  experimental_StreamData,
} from "ai";
import OpenAI from "openai";
import {
  functions,
  createMessages,
  GPTModels,
} from "~/plugins/diagrammaton/lib";
import type { ChatCompletionCreateParams } from "openai/resources/chat";
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export const runtime = "edge";

export async function OPTIONS(req: Request) {
  const response = new Response(null, { status: 204 });
  return response;
}

export async function POST(req: Request) {
  // Extract the `messages` from the body of the request
  const { input } = await req.json();

  // Request the OpenAI API for the response based on the prompt
  const response = await openai.chat.completions.create({
    model: GPTModels["gpt3"],
    stream: true,
    messages: createMessages(input),
    functions,
  });

  // Convert the response into a friendly text-stream
  const stream = OpenAIStream(response);

  // Respond with the stream
  return new StreamingTextResponse(stream);
}
