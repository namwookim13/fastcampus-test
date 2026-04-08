import type { ChatMessage } from "../../shared/types";

export type ModelInputMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export class ContextAssembler {
  assemble(input: {
    systemPrompt: string;
    recentMessages: ChatMessage[];
  }): ModelInputMessage[] {
    return [
      {
        role: "system",
        content: input.systemPrompt
      },
      ...input.recentMessages.map((message) => ({
        role: message.role,
        content: message.content
      }))
    ];
  }
}
