/**
 * Geotab Ace API (Natural Language Analytics) Wrapper
 * Uses 3-step polling: create-chat -> send-prompt -> poll for result.
 */

import { geotabAuth } from './geotab-auth.js';

const ACE_BASE = 'https://ace.geotab.com/api/v1';

export class GeotabAce {
  private async getHeaders(): Promise<Record<string, string>> {
    const session = await geotabAuth.authenticate();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.sessionId}`,
    };
  }

  /** Create a new Ace chat session */
  async createChat(): Promise<string> {
    const headers = await this.getHeaders();
    const creds = geotabAuth.getCredentials();
    if (!creds) throw new Error('Geotab credentials not configured');

    const res = await fetch(`${ACE_BASE}/chats`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        database: creds.database,
        customerData: true,
      }),
    });

    if (!res.ok) throw new Error(`Ace createChat failed: ${res.status}`);
    const data = await res.json() as { chatId?: string; id?: string };
    return data.chatId || data.id || '';
  }

  /** Send a natural language prompt to an Ace chat */
  async sendPrompt(chatId: string, prompt: string): Promise<string> {
    const headers = await this.getHeaders();

    const res = await fetch(`${ACE_BASE}/chats/${chatId}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ content: prompt }),
    });

    if (!res.ok) throw new Error(`Ace sendPrompt failed: ${res.status}`);
    const data = await res.json() as { messageId?: string; id?: string };
    return data.messageId || data.id || '';
  }

  /** Poll for Ace response with exponential backoff */
  async pollResult(chatId: string, messageId: string, maxWaitMs: number = 30000): Promise<AceResult> {
    const headers = await this.getHeaders();
    const startTime = Date.now();
    let delay = 1000;

    while (Date.now() - startTime < maxWaitMs) {
      const res = await fetch(`${ACE_BASE}/chats/${chatId}/messages/${messageId}`, {
        headers,
      });

      if (!res.ok) throw new Error(`Ace poll failed: ${res.status}`);
      const data = await res.json() as { status?: string; state?: string; content?: string; text?: string; data?: unknown; result?: unknown; charts?: unknown[]; error?: string };

      if (data.status === 'completed' || data.state === 'completed') {
        return {
          text: data.content || data.text || '',
          data: data.data || data.result || null,
          charts: data.charts || [],
          status: 'completed',
        };
      }

      if (data.status === 'failed' || data.state === 'failed') {
        return {
          text: data.error || 'Ace query failed',
          data: null,
          charts: [],
          status: 'failed',
        };
      }

      // Wait with exponential backoff
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * 1.5, 5000);
    }

    return { text: 'Ace query timed out', data: null, charts: [], status: 'timeout' };
  }

  /** One-shot: create chat, send prompt, wait for result */
  async query(prompt: string): Promise<AceResult> {
    try {
      const chatId = await this.createChat();
      const messageId = await this.sendPrompt(chatId, prompt);
      return await this.pollResult(chatId, messageId);
    } catch (error) {
      return {
        text: `Ace query error: ${error instanceof Error ? error.message : String(error)}`,
        data: null,
        charts: [],
        status: 'failed',
      };
    }
  }
}

export interface AceResult {
  text: string;
  data: unknown;
  charts: unknown[];
  status: 'completed' | 'failed' | 'timeout';
}

export const geotabAce = new GeotabAce();
