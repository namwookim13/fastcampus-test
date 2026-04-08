export type MessageRole = "user" | "assistant";

export interface ChatThread {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

export interface AppBootstrap {
  threads: ChatThread[];
  activeThreadId: string;
  messages: ChatMessage[];
}

export interface SendMessageInput {
  threadId: string;
  content: string;
}

export interface SendMessageResult {
  requestId: string;
  threadId: string;
  userMessage: ChatMessage;
}

export interface StreamDeltaEvent {
  type: "delta";
  requestId: string;
  threadId: string;
  delta: string;
}

export interface StreamCompletedEvent {
  type: "completed";
  requestId: string;
  threadId: string;
  messageId: string;
}

export interface StreamErrorEvent {
  type: "error";
  requestId: string;
  threadId: string;
  error: string;
}

export type StreamEvent =
  | StreamDeltaEvent
  | StreamCompletedEvent
  | StreamErrorEvent;

export interface RendererApi {
  bootstrap(): Promise<AppBootstrap>;
  createThread(): Promise<ChatThread>;
  listThreads(): Promise<ChatThread[]>;
  getMessagesByThread(threadId: string): Promise<ChatMessage[]>;
  setActiveThread(threadId: string): Promise<void>;
  sendMessage(input: SendMessageInput): Promise<SendMessageResult>;
  onStreamEvent(listener: (event: StreamEvent) => void): () => void;
}
