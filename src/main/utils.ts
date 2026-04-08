import { randomUUID } from "node:crypto";

export function createId(): string {
  return randomUUID();
}

export function nowUtcIso(): string {
  return new Date().toISOString();
}
