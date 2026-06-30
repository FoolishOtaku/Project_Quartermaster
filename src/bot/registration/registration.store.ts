import { Injectable } from '@nestjs/common';

/** A self-service registration request awaiting main-admin approval. */
export interface RegistrationRequest {
  telegramId: string;
  fullName: string;
  nim: string;
  telegramUsername: string | null;
  requestedAt: Date;
  expiresAt: Date;
}

/** Requests expire 2 minutes after they are submitted. */
export const REGISTRATION_TTL_MS = 2 * 60 * 1000;

/**
 * In-memory store of pending registration requests, keyed by Telegram id.
 *
 * Expiry is lazy: entries are pruned whenever the store is read, so a request
 * simply stops existing 2 minutes after it was made. This mirrors the
 * in-memory ConversationService (Design.md §20) — fine for the short TTL;
 * pending requests are intentionally lost on bot restart.
 */
@Injectable()
export class RegistrationStore {
  private readonly store = new Map<string, RegistrationRequest>();

  /** Create or replace a pending request and (re)start its 2-minute timer. */
  upsert(input: {
    telegramId: string;
    fullName: string;
    nim: string;
    telegramUsername?: string | null;
  }): RegistrationRequest {
    const now = new Date();
    const request: RegistrationRequest = {
      telegramId: input.telegramId,
      fullName: input.fullName,
      nim: input.nim,
      telegramUsername: input.telegramUsername ?? null,
      requestedAt: now,
      expiresAt: new Date(now.getTime() + REGISTRATION_TTL_MS),
    };
    this.store.set(input.telegramId, request);
    return request;
  }

  /** Return a request if it exists and has not expired. */
  get(telegramId: string): RegistrationRequest | undefined {
    this.prune();
    return this.store.get(telegramId);
  }

  has(telegramId: string): boolean {
    return this.get(telegramId) !== undefined;
  }

  /** All non-expired requests, oldest first. */
  list(): RegistrationRequest[] {
    this.prune();
    return [...this.store.values()].sort(
      (a, b) => a.requestedAt.getTime() - b.requestedAt.getTime(),
    );
  }

  remove(telegramId: string): void {
    this.store.delete(telegramId);
  }

  /** Milliseconds left before a request expires (0 if missing/expired). */
  msRemaining(telegramId: string): number {
    const request = this.get(telegramId);
    if (!request) return 0;
    return Math.max(0, request.expiresAt.getTime() - Date.now());
  }

  /** Drop every expired request. */
  private prune(): void {
    const now = Date.now();
    for (const [id, request] of this.store) {
      if (request.expiresAt.getTime() <= now) {
        this.store.delete(id);
      }
    }
  }
}
