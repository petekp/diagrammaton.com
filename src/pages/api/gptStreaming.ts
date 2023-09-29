import OpenAI from "openai";
import { OpenAIStream, StreamingTextResponse } from "ai";
import {
  GPTModels,
  functions,
  createMessages,
} from "~/plugins/diagrammaton/lib";

// Create an OpenAI API client (that's edge friendly!)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// IMPORTANT! Set the runtime to edge
export const runtime = "edge";

export async function POST(req: Request) {
  // Extract the `messages` from the body of the request
  const { input } = await req.json();

  console.log("req", req);

  console.log("input", input);

  // Ask OpenAI for a streaming chat completion given the prompt
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    stream: true,
    messages: createMessages(input),
    functions,
  });

  // Convert the response into a friendly text-stream
  const stream = OpenAIStream(response);
  // Respond with the stream
  return new StreamingTextResponse(stream);
}

export default POST;
