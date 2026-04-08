export const IPC_CHANNELS = {
  bootstrap: "app:bootstrap",
  createThread: "threads:create",
  listThreads: "threads:list",
  getMessagesByThread: "messages:listByThread",
  setActiveThread: "threads:setActive",
  sendMessage: "chat:sendMessage",
  streamEvent: "chat:streamEvent"
} as const;
