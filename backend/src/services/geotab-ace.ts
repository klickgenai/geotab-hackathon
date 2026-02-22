/**
 * Geotab Ace API (Natural Language Analytics) Wrapper
 * Uses GetAceResults JSON-RPC method via the MyGeotab API.
 * 3-step polling: create-chat -> send-prompt -> get-message-group.
 */

import { geotabAuth } from './geotab-auth.js';

export class GeotabAce {
  /** Make a GetAceResults JSON-RPC call */
  private async callAce(functionName: string, functionParameters: Record<string, unknown> = {}): Promise<unknown> {
    const sessionCreds = await geotabAuth.getSessionCredentials();
    const apiUrl = await geotabAuth.getApiUrl();

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'GetAceResults',
        params: {
          credentials: sessionCreds,
          serviceName: 'dna-planet-orchestration',
          functionName,
          customerData: true,
          functionParameters,
        },
      }),
    });

    if (!res.ok) throw new Error(`Ace ${functionName} failed: ${res.status}`);
    const data = await res.json() as { result?: unknown; error?: { message: string } };
    if (data.error) throw new Error(`Ace ${functionName}: ${data.error.message}`);
    return data.result;
  }

  /** Extract the first result from the nested Ace response structure */
  private extractResult(raw: unknown): Record<string, unknown> {
    const r = raw as { apiResult?: { results?: Record<string, unknown>[] } };
    return r?.apiResult?.results?.[0] || (raw as Record<string, unknown>) || {};
  }

  /** Step 1: Create a new Ace chat session */
  async createChat(): Promise<string> {
    const raw = await this.callAce('create-chat', {});
    const result = this.extractResult(raw);
    return (result.chat_id || result.chatId || '') as string;
  }

  /** Step 2: Send a natural language prompt */
  async sendPrompt(chatId: string, prompt: string): Promise<string> {
    const raw = await this.callAce('send-prompt', { chat_id: chatId, prompt });
    const result = this.extractResult(raw);
    // message_group_id can be at result.message_group.id or result.message_group_id
    const mg = result.message_group as Record<string, unknown> | undefined;
    return (mg?.id || result.message_group_id || result.messageGroupId || '') as string;
  }

  /** Step 3: Poll for result with exponential backoff */
  async pollResult(chatId: string, messageGroupId: string, maxWaitMs: number = 60000): Promise<AceResult> {
    const startTime = Date.now();
    let delay = 3000;

    while (Date.now() - startTime < maxWaitMs) {
      const raw = await this.callAce('get-message-group', { chat_id: chatId, message_group_id: messageGroupId });
      const result = this.extractResult(raw) as Record<string, unknown>;

      // Response is nested: result.message_group.status.status
      const messageGroup = result.message_group as Record<string, unknown> | undefined;
      const statusObj = messageGroup?.status as Record<string, unknown> | undefined;
      const status = ((statusObj?.status || '') as string).toUpperCase();

      if (status === 'DONE' || status === 'COMPLETED') {
        // Messages is an object keyed by ID — find the UserDataReference or assistant message
        const messages = messageGroup?.messages as Record<string, Record<string, unknown>> | undefined;
        let text = '';
        let data: unknown = null;

        if (messages) {
          const msgValues = Object.values(messages);
          // Find the data reference message (has reasoning + preview_array)
          const dataMsg = msgValues.find(m => m.type === 'UserDataReference');
          if (dataMsg) {
            const reasoning = dataMsg.reasoning as string || '';
            const preview = dataMsg.preview_array as unknown[];
            const insight = dataMsg.insight as string || '';
            // Build a readable response from the structured data
            const parts: string[] = [];
            if (reasoning) parts.push(reasoning);
            if (insight) parts.push(insight);
            if (preview?.length) parts.push('\nData: ' + JSON.stringify(preview, null, 2));
            text = parts.join('\n\n') || 'Analysis complete';
            data = preview || null;
          } else {
            // Fallback: find assistant message
            const assistantMsg = msgValues.find(m => m.role === 'assistant');
            text = (assistantMsg?.content || assistantMsg?.text || 'Analysis complete') as string;
          }
        }

        return { text, data, charts: [], status: 'completed' };
      }

      if (status === 'FAILED' || status === 'ERROR') {
        return {
          text: (statusObj?.message || 'Ace query failed') as string,
          data: null,
          charts: [],
          status: 'failed',
        };
      }

      // Wait with exponential backoff (3s → 4.5s → 5s max)
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * 1.5, 5000);
    }

    return { text: 'Ace query timed out', data: null, charts: [], status: 'timeout' };
  }

  /** One-shot: create chat, send prompt, wait for result */
  async query(prompt: string): Promise<AceResult> {
    try {
      const chatId = await this.createChat();
      if (!chatId) throw new Error('Failed to create Ace chat session');

      const messageGroupId = await this.sendPrompt(chatId, prompt);
      if (!messageGroupId) throw new Error('Failed to send prompt to Ace');

      return await this.pollResult(chatId, messageGroupId);
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
