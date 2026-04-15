type AnthropicMessageContent = Array<{ type: 'text'; text: string }>;

export type AnthropicJsonOptions = {
  model?: string;
  maxTokens?: number;
  system?: string;
  temperature?: number;
};

function getAnthropicKey() {
  const key = Deno.env.get('ANTHROPIC_API_KEY');
  if (!key) throw new Error('Missing ANTHROPIC_API_KEY');
  return key;
}

async function anthropicMessages(body: Record<string, unknown>) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': getAnthropicKey(),
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || `Anthropic request failed with status ${response.status}`);
  }

  const text = Array.isArray(data?.content)
    ? data.content.map((chunk: AnthropicMessageContent[number]) => chunk.text).join('')
    : '';
  return text as string;
}

export async function anthropicText(prompt: string, options: AnthropicJsonOptions = {}) {
  return anthropicMessages({
    model: options.model ?? 'claude-sonnet-4-20250514',
    max_tokens: options.maxTokens ?? 4096,
    temperature: options.temperature ?? 0.3,
    system: options.system,
    messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
  });
}

export async function anthropicJson<T = unknown>(prompt: string, options: AnthropicJsonOptions = {}) {
  const text = await anthropicText(prompt, options);
  const match = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);
  const jsonText = match ? (match[1] ?? match[0]) : text;
  return JSON.parse(jsonText) as T;
}

export async function anthropicImageJson<T = unknown>(prompt: string, imageBase64: string, mediaType: string, options: AnthropicJsonOptions = {}) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': getAnthropicKey(),
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: options.model ?? 'claude-sonnet-4-20250514',
      max_tokens: options.maxTokens ?? 4096,
      temperature: options.temperature ?? 0.2,
      system: options.system,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
        ],
      }],
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || `Anthropic request failed with status ${response.status}`);
  }

  const text = Array.isArray(data?.content)
    ? data.content.map((chunk: AnthropicMessageContent[number]) => chunk.text).join('')
    : '';
  const match = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);
  const jsonText = match ? (match[1] ?? match[0]) : text;
  return JSON.parse(jsonText) as T;
}
