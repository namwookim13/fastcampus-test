import { contextBridge, ipcRenderer } from "electron";
import { IPC_CHANNELS } from "../shared/ipc";
import type { RendererApi, SendMessageInput, StreamEvent } from "../shared/types";

const api: RendererApi = {
  bootstrap: () => ipcRenderer.invoke(IPC_CHANNELS.bootstrap),
  createThread: () => ipcRenderer.invoke(IPC_CHANNELS.createThread),
  listThreads: () => ipcRenderer.invoke(IPC_CHANNELS.listThreads),
  getMessagesByThread: (threadId) =>
    ipcRenderer.invoke(IPC_CHANNELS.getMessagesByThread, threadId),
  setActiveThread: (threadId) =>
    ipcRenderer.invoke(IPC_CHANNELS.setActiveThread, threadId),
  sendMessage: (input: SendMessageInput) =>
    ipcRenderer.invoke(IPC_CHANNELS.sendMessage, input),
  onStreamEvent: (listener) => {
    const wrappedListener = (_event: Electron.IpcRendererEvent, payload: StreamEvent) => {
      listener(payload);
    };
    ipcRenderer.on(IPC_CHANNELS.streamEvent, wrappedListener);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.streamEvent, wrappedListener);
    };
  }
};

contextBridge.exposeInMainWorld("chatApi", api);
