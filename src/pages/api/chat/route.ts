import {
  OpenAIStream,
  StreamingTextResponse,
  experimental_StreamData,
} from "ai";
import OpenAI from "openai";
import { functions, createMessages } from "~/plugins/diagrammaton/lib";
import type { ChatCompletionCreateParams } from "openai/resources/chat";
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export const runtime = "edge";

export async function POST(req: Request) {
  const { input } = await req.json();

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo-0613",
    stream: true,
    messages: createMessages(input),
    functions,
  });

  const data = new experimental_StreamData();
  const stream = OpenAIStream(response, {
    experimental_onFunctionCall: async (
      { name, arguments: args },
      createFunctionCallMessages
    ) => {
      if (name === "print_diagram") {
        // Call a weather API here
        const weatherData = {
          temperature: 20,
          unit: args.format === "celsius" ? "C" : "F",
        };

        data.append({
          text: "Some custom data",
        });

        const newMessages = createFunctionCallMessages(weatherData);
        return openai.chat.completions.create({
          messages: createMessages(input),
          stream: true,
          model: "gpt-3.5-turbo-0613",
        });
      }
    },
    onCompletion(completion) {
      console.log("completion", completion);
    },
    onFinal(completion) {
      data.close();
    },
    experimental_streamData: true,
  });

  //   data.append({
  //     text: "Hello, how are you?",
  //   });

  return new StreamingTextResponse(stream, {}, data);
}
