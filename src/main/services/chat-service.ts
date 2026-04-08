import { EventEmitter } from "node:events";
import { APP_CONFIG } from "../config";
import type { StreamEvent } from "../../shared/types";
import { createId, nowUtcIso } from "../utils";
import { ContextAssembler } from "../context/context-assembler";
import { MessageRepository } from "../repositories/message-repository";
import { ThreadRepository } from "../repositories/thread-repository";
import { ModelClient } from "../model/model-client";

type ActiveStream = {
  requestId: string;
  threadId: string;
};

export class ChatService {
  private readonly events = new EventEmitter();
  private readonly activeStreams = new Map<string, ActiveStream>();

  constructor(
    private readonly messageRepository: MessageRepository,
    private readonly threadRepository: ThreadRepository,
    private readonly contextAssembler: ContextAssembler,
    private readonly modelClient: ModelClient
  ) {}

  onStreamEvent(listener: (event: StreamEvent) => void): () => void {
    this.events.on("stream-event", listener);
    return () => this.events.off("stream-event", listener);
  }

  isThreadStreaming(threadId: string): boolean {
    return this.activeStreams.has(threadId);
  }

  async sendMessage(threadId: string, content: string) {
    const thread = this.threadRepository.getThreadById(threadId);
    if (!thread) {
      throw new Error("Active thread not found.");
    }

    if (this.isThreadStreaming(threadId)) {
      throw new Error("This thread is already streaming.");
    }

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      throw new Error("Message content is empty.");
    }

    const userMessage = this.messageRepository.addMessage({
      threadId,
      role: "user",
      content: trimmedContent
    });
    this.threadRepository.touchThread(threadId, nowUtcIso());

    const recentMessages = this.messageRepository.getRecentMessages(
      threadId,
      APP_CONFIG.defaultRecentMessageLimit
    );
    const modelInput = this.contextAssembler.assemble({
      systemPrompt: APP_CONFIG.systemPrompt,
      recentMessages
    });

    const requestId = createId();
    this.activeStreams.set(threadId, { requestId, threadId });

    void this.streamAssistantResponse({ requestId, threadId, modelInput });

    return {
      requestId,
      threadId,
      userMessage
    };
  }

  private async streamAssistantResponse(input: {
    requestId: string;
    threadId: string;
    modelInput: ReturnType<ContextAssembler["assemble"]>;
  }): Promise<void> {
    try {
      const text = await this.modelClient.streamText(input.modelInput, {
        onDelta: (delta) => {
          const active = this.activeStreams.get(input.threadId);
          if (!active || active.requestId !== input.requestId) {
            return;
          }

          this.emit({
            type: "delta",
            requestId: input.requestId,
            threadId: input.threadId,
            delta
          });
        }
      });

      const active = this.activeStreams.get(input.threadId);
      if (!active || active.requestId !== input.requestId) {
        return;
      }

      const assistantMessage = this.messageRepository.addMessage({
        threadId: input.threadId,
        role: "assistant",
        content: text
      });
      this.threadRepository.touchThread(input.threadId, nowUtcIso());

      this.emit({
        type: "completed",
        requestId: input.requestId,
        threadId: input.threadId,
        messageId: assistantMessage.id
      });
    } catch (error) {
      const active = this.activeStreams.get(input.threadId);
      if (!active || active.requestId !== input.requestId) {
        return;
      }

      this.emit({
        type: "error",
        requestId: input.requestId,
        threadId: input.threadId,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error during model streaming."
      });
    } finally {
      const active = this.activeStreams.get(input.threadId);
      if (active?.requestId === input.requestId) {
        this.activeStreams.delete(input.threadId);
      }
    }
  }

  private emit(event: StreamEvent): void {
    this.events.emit("stream-event", event);
  }
}
