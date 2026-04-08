import OpenAI from "openai";
import type { ModelInputMessage } from "../context/context-assembler";

type StreamHandlers = {
  onDelta(delta: string): void;
};

export class ModelClient {
  private readonly client: OpenAI;

  constructor(
    private readonly apiKey: string,
    private readonly model: string
  ) {
    this.client = new OpenAI({ apiKey: this.apiKey });
  }

  async streamText(
    messages: ModelInputMessage[],
    handlers: StreamHandlers
  ): Promise<string> {
    const stream = await this.client.responses.create({
      model: this.model,
      input: messages.map((message) => ({
        role: message.role,
        content: [{ type: "input_text", text: message.content }]
      })),
      stream: true
    });

    let fullText = "";

    for await (const event of stream) {
      if (event.type === "response.output_text.delta") {
        fullText += event.delta;
        handlers.onDelta(event.delta);
      }

      if (event.type === "response.output_text.done" && fullText.length === 0) {
        fullText = event.text;
      }

      if (event.type === "error") {
        throw new Error(event.message);
      }
    }

    return fullText;
  }
}
