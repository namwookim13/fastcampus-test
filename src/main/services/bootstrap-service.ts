import type { AppBootstrap } from "../../shared/types";
import { ThreadRepository } from "../repositories/thread-repository";
import { MessageRepository } from "../repositories/message-repository";
import { AppStateRepository } from "../repositories/app-state-repository";

const ACTIVE_THREAD_KEY = "activeThreadId";

export class BootstrapService {
  constructor(
    private readonly threadRepository: ThreadRepository,
    private readonly messageRepository: MessageRepository,
    private readonly appStateRepository: AppStateRepository
  ) {}

  bootstrap(): AppBootstrap {
    let threads = this.threadRepository.listThreads();

    if (threads.length === 0) {
      const thread = this.threadRepository.createThread();
      this.appStateRepository.set(ACTIVE_THREAD_KEY, thread.id);
      threads = [thread];
    }

    const savedActiveThreadId = this.appStateRepository.get(ACTIVE_THREAD_KEY);
    const activeThread =
      (savedActiveThreadId &&
        this.threadRepository.getThreadById(savedActiveThreadId)) ||
      threads[0];

    if (!activeThread) {
      const thread = this.threadRepository.createThread();
      this.appStateRepository.set(ACTIVE_THREAD_KEY, thread.id);
      return {
        threads: [thread],
        activeThreadId: thread.id,
        messages: []
      };
    }

    this.appStateRepository.set(ACTIVE_THREAD_KEY, activeThread.id);

    return {
      threads: this.threadRepository.listThreads(),
      activeThreadId: activeThread.id,
      messages: this.messageRepository.getMessagesByThread(activeThread.id)
    };
  }

  setActiveThread(threadId: string): void {
    const thread = this.threadRepository.getThreadById(threadId);
    if (!thread) {
      throw new Error("Thread not found.");
    }
    this.appStateRepository.set(ACTIVE_THREAD_KEY, threadId);
  }
}
