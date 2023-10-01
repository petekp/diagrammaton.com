import { OpenAIStream, StreamingTextResponse } from "ai";
import OpenAI from "openai";
import type { ChatCompletionChunk } from "openai/resources/chat";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export const runtime = "edge";
export const dynamic = "force-dynamic";

const payloadChunks = [
  '{"text":"Hello, world!"}',
  '{"text":"How are you doing?"}',
  '{"function_call":{"name":"new_function","arguments":"{}"}}',
  '{"text":"What are your hobbies?"}',
  '{"text":"Do you have any pets?"}',
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function* generateChatCompletionChunk(): AsyncGenerator<ChatCompletionChunk> {
  // Concatenate the payload chunks into a single string
  const payloadString = payloadChunks.join("");

  // Splitting payload string into smaller chunks for demonstration
  // This assumes each chunk is a valid piece of content as per your application's requirements
  const contentChunks = payloadString.match(/.{1,20}/g) || [];

  for (let i = 0; i < contentChunks.length; i++) {
    const isLastChunk = i === contentChunks.length - 1;

    console.log(contentChunks[i]);

    yield {
      choices: [
        {
          delta: {
            content: contentChunks[i],
            // Assuming role and function_call are not applicable for this example
          },
          finish_reason: isLastChunk ? "stop" : "length",
          index: i,
        },
      ],
      id: `${i}`,
      created: Date.now(),
      model: "gpt-3.5-turbo",
      object: "text_completion",
    };

    // Simulate a delay between chunks
    await delay(500);
  }
}

async function* mockOpenAIChatCompletion(): AsyncGenerator<ChatCompletionChunk> {
  let messageIndex = 0;

  for (let i = 0; i < payloadChunks.length; i++) {
    const isLastChunk = i === payloadChunks.length - 1;
    const parsedChunk = JSON.parse(payloadChunks[i] || "{}");

    const baseChunk = {
      created: Date.now(),
      id: `chunk${i}`,
      model: "text-davinci-002",
      object: "text_completion",
    };

    if (parsedChunk.text) {
      const textChunk: ChatCompletionChunk = {
        ...baseChunk,
        choices: [
          {
            delta: { content: parsedChunk.text, role: "system" },
            index: messageIndex,
            finish_reason: isLastChunk ? "stop" : "length",
          },
        ],
      };

      // Increment message index
      messageIndex++;

      // Yield the text chunk
      yield textChunk;
    } else if (parsedChunk.function_call) {
      console.log("function_call", parsedChunk.function_call);

      const functionCallChunk: ChatCompletionChunk = {
        ...baseChunk,
        choices: [
          {
            delta: {
              function_call: {
                name: parsedChunk.function_call.name,
                arguments: parsedChunk.function_call.arguments,
              },
              role: "system",
            },
            index: messageIndex,
            finish_reason: "function_call",
          },
        ],
      };

      // Increment message index
      messageIndex++;

      // Yield the function call chunk
      yield functionCallChunk;
    }

    // Simulate a delay between chunks
    await delay(500);
  }
}

const chatCompletionChunkAsyncIterable: AsyncIterable<ChatCompletionChunk> = {
  [Symbol.asyncIterator]: mockOpenAIChatCompletion,
};

// Usage
export async function POST(req: Request) {
  const { input } = await req.json();

  // The following part of your code remains largely unchanged
  const stream = OpenAIStream(chatCompletionChunkAsyncIterable, {
    experimental_onFunctionCall: async (
      { name, arguments: args },
      createFunctionCallMessages
    ) => {
      console.log("onFunctionCall", name, args);
      return;
      // ... rest of your code
    },
    onCompletion(completion) {
      console.log("completion", completion);
    },
    onFinal(completion) {
      console.log("final", completion);
    },
    experimental_streamData: true,
  });

  return new StreamingTextResponse(stream);
}
