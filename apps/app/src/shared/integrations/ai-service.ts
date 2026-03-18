// AI Service for Next.js
// Handles asynchronous AI requests

interface AIAskRequest {
  model: string;
  prompt: unknown;
}

interface AIAskResponse {
  requestId: string;
  model?: string;
  content?: string;
}

interface AIResultResponse {
  requestId: string;
  status: string;
  provider?: string;
  model?: string;
  cost?: number;
  promptTokens?: number;
  completionTokens?: number;
  latencyMs?: number;
  createdAt?: string;
  content?: string;
  error?: string | null;
}

export class AIService {
  private apiUrl: string;
  private apiToken: string;

  constructor(apiUrl: string, apiToken: string) {
    this.apiUrl = apiUrl;
    this.apiToken = apiToken;
  }

  async ask(model: string, prompt: unknown): Promise<string> {
    try {
      const requestBody: AIAskRequest = {
        model,
        prompt,
      };

      const headers = new Headers();
      headers.append('Content-Type', 'application/json');
      headers.append('Authorization', `Bearer ${this.apiToken}`);

      const url = `${this.apiUrl}/ask`;
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        redirect: 'follow',
      });

      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
        } catch {
          errorText = `Unable to read error`;
        }
        throw new Error(`AI API error: ${response.status} - ${errorText}`);
      }

      const data: AIAskResponse = await response.json();

      if (data.content) {
        return data.content;
      }

      return await this.getResult(data.requestId);
    } catch (error) {
      console.error('Error in AI service ask:', error);
      throw error;
    }
  }

  async upload(model: string, file: Blob, filename: string): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', file, filename);
      formData.append('model', model);

      const headers = new Headers();
      headers.append('Authorization', `Bearer ${this.apiToken}`);

      const url = `${this.apiUrl}/upload`;
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
        } catch {
          errorText = `Unable to read error`;
        }
        throw new Error(`AI upload error: ${response.status} - ${errorText}`);
      }

      const data: AIAskResponse = await response.json();

      if (data.content) {
        return data.content;
      }

      return await this.getResult(data.requestId);
    } catch (error) {
      console.error('Error in AI service upload:', error);
      throw error;
    }
  }

  private async getResult(requestId: string, maxAttempts = 10): Promise<string> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await new Promise((r) => setTimeout(r, 1000));

        const response = await fetch(`${this.apiUrl}/result/${requestId}`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${this.apiToken}` },
        });

        if (!response.ok) continue;

        const data: AIResultResponse = await response.json();

        if (data.status === 'SUCCESS' && data.content) {
          return data.content;
        }

        if (data.status === 'FAILED' || data.error) {
          throw new Error(data.error || 'AI request failed');
        }
      } catch (error) {
        if (attempt === maxAttempts) throw error;
      }
    }

    throw new Error('AI request timeout');
  }

  validateAndFixHTML(html: string): string {
    const allowedTags = ['b', 'i', 'u', 'code', 'a'];
    interface TagInfo {
      type: 'open' | 'close';
      tag: string;
      fullTag: string;
      position: number;
    }

    const tags: TagInfo[] = [];
    const tagRegex = /<\/?(\w+)(?:\s+[^>]*)?>/g;
    let match;

    while ((match = tagRegex.exec(html)) !== null) {
      const tagName = match[1].toLowerCase();
      if (allowedTags.includes(tagName)) {
        tags.push({
          type: match[0].startsWith('</') ? 'close' : 'open',
          tag: tagName,
          fullTag: match[0],
          position: match.index,
        });
      }
    }

    const keepTags = new Set<number>();
    const openTagsStack: Array<{ tag: string; index: number }> = [];

    for (let i = 0; i < tags.length; i++) {
      const tagInfo = tags[i];
      if (tagInfo.type === 'open') {
        openTagsStack.push({ tag: tagInfo.tag, index: i });
        keepTags.add(i);
      } else {
        let found = false;
        for (let j = openTagsStack.length - 1; j >= 0; j--) {
          if (openTagsStack[j].tag === tagInfo.tag) {
            keepTags.add(i);
            openTagsStack.splice(j, 1);
            found = true;
            break;
          }
        }
        if (!found) keepTags.delete(i);
      }
    }

    for (const { index } of openTagsStack) {
      keepTags.delete(index);
    }

    const result: string[] = [];
    let lastPos = 0;
    for (let i = 0; i < tags.length; i++) {
      const tagInfo = tags[i];
      if (keepTags.has(i)) {
        result.push(html.substring(lastPos, tagInfo.position));
        result.push(tagInfo.fullTag);
        lastPos = tagInfo.position + tagInfo.fullTag.length;
      } else {
        result.push(html.substring(lastPos, tagInfo.position));
        lastPos = tagInfo.position + tagInfo.fullTag.length;
      }
    }
    result.push(html.substring(lastPos));
    return result.join('');
  }
}
