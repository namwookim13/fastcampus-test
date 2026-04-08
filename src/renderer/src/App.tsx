import { useEffect, useMemo, useState } from "react";
import type { ChatMessage, ChatThread, StreamEvent } from "../../shared/types";

declare global {
  interface Window {
    chatApi: import("../../shared/types").RendererApi;
  }
}

type StreamDraft = {
  requestId: string;
  threadId: string;
  content: string;
  error: string | null;
};

export default function App() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string>("");
  const [messagesByThread, setMessagesByThread] = useState<Record<string, ChatMessage[]>>({});
  const [streamDrafts, setStreamDrafts] = useState<Record<string, StreamDraft>>({});
  const [composer, setComposer] = useState("");
  const [appError, setAppError] = useState<string | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    let dispose = () => {};

    void (async () => {
      try {
        const bootstrap = await window.chatApi.bootstrap();
        setThreads(bootstrap.threads);
        setActiveThreadId(bootstrap.activeThreadId);
        setMessagesByThread({
          [bootstrap.activeThreadId]: bootstrap.messages
        });

        dispose = window.chatApi.onStreamEvent((event) => {
          void handleStreamEvent(event);
        });
        setBootstrapped(true);
      } catch (error) {
        setAppError(error instanceof Error ? error.message : "Failed to bootstrap app.");
      }
    })();

    return () => dispose();
  }, []);

  async function refreshThreads(): Promise<void> {
    const nextThreads = await window.chatApi.listThreads();
    setThreads(nextThreads);
  }

  async function loadMessages(threadId: string): Promise<void> {
    const messages = await window.chatApi.getMessagesByThread(threadId);
    setMessagesByThread((current) => ({
      ...current,
      [threadId]: messages
    }));
  }

  async function handleStreamEvent(event: StreamEvent): Promise<void> {
    setStreamDrafts((current) => {
      const existing = current[event.threadId];
      if (existing && existing.requestId !== event.requestId) {
        return current;
      }

      if (event.type === "delta") {
        return {
          ...current,
          [event.threadId]: {
            requestId: event.requestId,
            threadId: event.threadId,
            content: (existing?.content ?? "") + event.delta,
            error: null
          }
        };
      }

      if (event.type === "error") {
        return {
          ...current,
          [event.threadId]: {
            requestId: event.requestId,
            threadId: event.threadId,
            content: existing?.content ?? "",
            error: event.error
          }
        };
      }

      const nextState = { ...current };
      delete nextState[event.threadId];
      return nextState;
    });

    if (event.type !== "delta") {
      await refreshThreads();
      await loadMessages(event.threadId);
    }
  }

  async function handleCreateThread(): Promise<void> {
    setAppError(null);
    const thread = await window.chatApi.createThread();
    setThreads((current) => [thread, ...current]);
    setActiveThreadId(thread.id);
    setMessagesByThread((current) => ({ ...current, [thread.id]: [] }));
    setComposer("");
  }

  async function handleSelectThread(threadId: string): Promise<void> {
    if (threadId === activeThreadId) {
      return;
    }

    setAppError(null);
    await window.chatApi.setActiveThread(threadId);
    setActiveThreadId(threadId);
    if (!messagesByThread[threadId]) {
      await loadMessages(threadId);
    }
  }

  async function handleSendMessage(): Promise<void> {
    if (!activeThreadId) {
      setAppError("No active thread selected.");
      return;
    }

    const content = composer.trim();
    if (!content) {
      return;
    }

    setAppError(null);

    try {
      const result = await window.chatApi.sendMessage({
        threadId: activeThreadId,
        content
      });
      setMessagesByThread((current) => ({
        ...current,
        [activeThreadId]: [...(current[activeThreadId] ?? []), result.userMessage]
      }));
      setStreamDrafts((current) => ({
        ...current,
        [activeThreadId]: {
          requestId: result.requestId,
          threadId: activeThreadId,
          content: "",
          error: null
        }
      }));
      setComposer("");
      await refreshThreads();
    } catch (error) {
      setAppError(error instanceof Error ? error.message : "Failed to send message.");
    }
  }

  const activeMessages = useMemo(
    () => messagesByThread[activeThreadId] ?? [],
    [messagesByThread, activeThreadId]
  );
  const activeDraft = streamDrafts[activeThreadId];
  const isSending = Boolean(activeDraft && !activeDraft.error);

  return (
    <div className="app-shell">
      <aside className="thread-panel">
        <div className="thread-panel-header">
          <div>
            <p className="eyebrow">Local SQLite Chat</p>
            <h1>Backbone Chat</h1>
          </div>
          <button className="primary-button" onClick={() => void handleCreateThread()}>
            New Chat
          </button>
        </div>
        <div className="thread-list">
          {threads.map((thread) => (
            <button
              key={thread.id}
              className={`thread-item ${thread.id === activeThreadId ? "active" : ""}`}
              onClick={() => void handleSelectThread(thread.id)}
            >
              <span className="thread-title">{thread.title}</span>
              <span className="thread-date">
                {new Date(thread.updatedAt).toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      </aside>

      <main className="chat-panel">
        <div className="chat-header">
          <div>
            <p className="eyebrow">Active Thread</p>
            <h2>
              {threads.find((thread) => thread.id === activeThreadId)?.title ?? "New Chat"}
            </h2>
          </div>
          <span className="status-badge">
            {bootstrapped ? "SQLite Local State" : "Loading"}
          </span>
        </div>

        <div className="message-list">
          {activeMessages.map((message) => (
            <article key={message.id} className={`message-card ${message.role}`}>
              <p className="message-role">{message.role}</p>
              <p>{message.content}</p>
            </article>
          ))}

          {activeDraft && (
            <article className="message-card assistant draft">
              <p className="message-role">assistant</p>
              <p>{activeDraft.content || " "}</p>
              {activeDraft.error && <p className="message-error">{activeDraft.error}</p>}
            </article>
          )}
        </div>

        <div className="composer-panel">
          {appError && <p className="message-error">{appError}</p>}
          <textarea
            value={composer}
            onChange={(event) => setComposer(event.target.value)}
            placeholder="Send a message to the active thread"
            rows={4}
            disabled={!activeThreadId || isSending}
          />
          <button
            className="primary-button"
            onClick={() => void handleSendMessage()}
            disabled={!activeThreadId || !composer.trim() || isSending}
          >
            {isSending ? "Streaming..." : "Send"}
          </button>
        </div>
      </main>
    </div>
  );
}
