import path from "node:path";
import { app } from "electron";

export const APP_CONFIG = {
  defaultThreadTitle: "New Chat",
  defaultRecentMessageLimit: 20,
  defaultOpenAiModel: process.env.OPENAI_MODEL?.trim() || "gpt-5.4",
  systemPrompt:
    "You are a helpful local chat assistant. Answer clearly and directly.",
  get databaseFilePath(): string {
    return path.join(app.getPath("userData"), "backbone-chat.sqlite");
  }
} as const;
