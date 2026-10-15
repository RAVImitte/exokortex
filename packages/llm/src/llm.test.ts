import { describe, expect, it } from "vitest";
import { LLM_TEST_PROMPT, OpenAICompatibleProvider, llmTestPassed } from "./index.js";

describe("OpenAICompatibleProvider", () => {
  it("calls a chat-completions endpoint and reads the message", async () => {
    const seen: { url: string; authorization: string | null }[] = [];
    const fetchMock: typeof fetch = async (input, init) => {
      const headers = new Headers(init?.headers);
      seen.push({ url: String(input), authorization: headers.get("authorization") });
      return new Response(
        JSON.stringify({ model: "grok-test", choices: [{ message: { content: "pong" } }] }),
        { status: 200 },
      );
    };
    const provider = new OpenAICompatibleProvider({
      baseUrl: "https://api.example.test/v1/",
      apiKey: "sk-test",
      model: "grok-test",
      fetch: fetchMock,
    });
    const result = await provider.generate({ user: LLM_TEST_PROMPT });
    expect(result).toEqual({ text: "pong", model: "grok-test" });
    expect(llmTestPassed(result.text)).toBe(true);
    expect(seen[0]?.url).toBe("https://api.example.test/v1/chat/completions");
    expect(seen[0]?.authorization).toBe("Bearer sk-test");
  });

  it("fails when the endpoint rejects the call", async () => {
    const provider = new OpenAICompatibleProvider({
      baseUrl: "https://api.example.test/v1",
      apiKey: "sk-test",
      model: "m",
      fetch: async () => new Response("no", { status: 401 }),
    });
    await expect(provider.generate({ user: "hi" })).rejects.toThrow(/401/);
  });
});
