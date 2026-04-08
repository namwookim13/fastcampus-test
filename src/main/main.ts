import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDatabase } from "./database";
import { ThreadRepository } from "./repositories/thread-repository";
import { MessageRepository } from "./repositories/message-repository";
import { AppStateRepository } from "./repositories/app-state-repository";
import { ContextAssembler } from "./context/context-assembler";
import { ModelClient } from "./model/model-client";
import { ChatService } from "./services/chat-service";
import { BootstrapService } from "./services/bootstrap-service";
import { APP_CONFIG } from "./config";
import { IPC_CHANNELS } from "../shared/ipc";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;

function requireOpenAiApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required.");
  }
  return apiKey;
}

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 980,
    minHeight: 680,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.mjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  if (process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void window.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  return window;
}

app.whenReady().then(() => {
  const db = getDatabase();
  const threadRepository = new ThreadRepository(db);
  const messageRepository = new MessageRepository(db);
  const appStateRepository = new AppStateRepository(db);
  const contextAssembler = new ContextAssembler();
  const modelClient = new ModelClient(
    requireOpenAiApiKey(),
    APP_CONFIG.defaultOpenAiModel
  );
  const chatService = new ChatService(
    messageRepository,
    threadRepository,
    contextAssembler,
    modelClient
  );
  const bootstrapService = new BootstrapService(
    threadRepository,
    messageRepository,
    appStateRepository
  );

  mainWindow = createMainWindow();

  chatService.onStreamEvent((event) => {
    mainWindow?.webContents.send(IPC_CHANNELS.streamEvent, event);
  });

  ipcMain.handle(IPC_CHANNELS.bootstrap, () => bootstrapService.bootstrap());
  ipcMain.handle(IPC_CHANNELS.createThread, () => {
    const thread = threadRepository.createThread();
    bootstrapService.setActiveThread(thread.id);
    return thread;
  });
  ipcMain.handle(IPC_CHANNELS.listThreads, () => threadRepository.listThreads());
  ipcMain.handle(IPC_CHANNELS.getMessagesByThread, (_event, threadId: string) =>
    messageRepository.getMessagesByThread(threadId)
  );
  ipcMain.handle(IPC_CHANNELS.setActiveThread, (_event, threadId: string) => {
    bootstrapService.setActiveThread(threadId);
  });
  ipcMain.handle(IPC_CHANNELS.sendMessage, (_event, input) =>
    chatService.sendMessage(input.threadId, input.content)
  );

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
