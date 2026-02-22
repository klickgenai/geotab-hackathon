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

  /** Build a brief summary of data results */
  private summarizeData(preview: unknown[]): string {
    if (!preview?.length) return '';
    const rows = preview as Record<string, unknown>[];
    return `Found ${rows.length} result${rows.length === 1 ? '' : 's'} from your fleet data.`;
  }

  /** Extract a concise finding from verbose reasoning text */
  private cleanReasoning(reasoning: string): string {
    // The reasoning field often has markdown headers like **Outcome**, **Process**
    // Try to extract just the Outcome section
    const outcomeMatch = reasoning.match(/\*\*Outcome\*\*\s*([\s\S]*?)(?:\*\*Process\*\*|$)/i);
    if (outcomeMatch) {
      return outcomeMatch[1].trim().replace(/\*\*/g, '');
    }
    // Strip markdown bold markers and return first 2 sentences max
    const cleaned = reasoning.replace(/\*\*/g, '').trim();
    const sentences = cleaned.split(/\.\s+/);
    return sentences.slice(0, 2).join('. ') + (sentences.length > 2 ? '.' : '');
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

            // Priority: insight > summary of data > cleaned reasoning
            // When data rows exist, the frontend renders them as a table —
            // so text should be a brief summary, NOT a text dump of the data.
            if (insight) {
              text = insight;
            } else if (preview?.length) {
              // Data exists but no insight — provide a brief summary + let table show details
              const summary = this.summarizeData(preview);
              if (reasoning) {
                text = this.cleanReasoning(reasoning) + '\n\n' + summary;
              } else {
                text = summary;
              }
            } else if (reasoning) {
              text = this.cleanReasoning(reasoning);
            } else {
              text = 'Analysis complete — no specific data found for this query.';
            }
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
