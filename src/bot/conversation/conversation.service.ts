import { Injectable } from '@nestjs/common';

export type ConversationFlow = 'ADD_ITEM' | 'UPDATE_ITEM' | 'ARCHIVE_ITEM';

export interface ConversationState {
  flow: ConversationFlow;
  step: number;
  data: Record<string, unknown>;
}

/**
 * In-memory conversation state keyed by Telegram user id.
 * Acceptable for early versions (Design.md §20); replace with a
 * database/Redis-backed store for production.
 */
@Injectable()
export class ConversationService {
  private readonly store = new Map<string, ConversationState>();

  start(
    userId: string,
    flow: ConversationFlow,
    data: Record<string, unknown> = {},
  ): ConversationState {
    const state: ConversationState = { flow, step: 0, data };
    this.store.set(userId, state);
    return state;
  }

  get(userId: string): ConversationState | undefined {
    return this.store.get(userId);
  }

  set(userId: string, state: ConversationState): void {
    this.store.set(userId, state);
  }

  isActive(userId: string): boolean {
    return this.store.has(userId);
  }

  clear(userId: string): void {
    this.store.delete(userId);
  }
}
