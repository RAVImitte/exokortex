export interface LLMRequest {
  system?: string;
  user: string;
}

export interface LLMResponse {
  text: string;
  model: string;
}

export interface LLMProvider {
  generate(request: LLMRequest): Promise<LLMResponse>;
}

export interface OpenAICompatibleConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  fetch?: typeof fetch;
}

interface ChatCompletion {
  model?: string;
  choices?: { message?: { content?: string | null } }[];
}

export class OpenAICompatibleProvider implements LLMProvider {
  constructor(private readonly config: OpenAICompatibleConfig) {}

  async generate(request: LLMRequest): Promise<LLMResponse> {
    const base = this.config.baseUrl.replace(/\/+$/, "");
    const response = await (this.config.fetch ?? fetch)(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          ...(request.system ? [{ role: "system", content: request.system }] : []),
          { role: "user", content: request.user },
        ],
      }),
    });
    if (!response.ok) {
      throw new Error(`LLM request failed with status ${response.status}`);
    }
    const data = (await response.json()) as ChatCompletion;
    return {
      text: data.choices?.[0]?.message?.content ?? "",
      model: data.model ?? this.config.model,
    };
  }
}

export const LLM_TEST_PROMPT = "Reply with the single word pong.";

export function llmTestPassed(text: string): boolean {
  return text.trim().toLowerCase().includes("pong");
}
