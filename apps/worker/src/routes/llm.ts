import { Database } from "@exokortex/database";
import { LLM_TEST_PROMPT, OpenAICompatibleProvider, llmTestPassed } from "@exokortex/llm";
import { decryptString, encryptString, importAesKey } from "@exokortex/security";
import { AppError } from "@exokortex/shared";
import type { Hono } from "hono";
import type { AppBindings } from "../http/types.js";

export function registerLlmRoutes(app: Hono<AppBindings>): void {
  app.get("/api/llm-config", async (c) => {
    const config = await new Database(c.env.DB).llm.get(c.get("userId"));
    return c.json({ config });
  });

  app.put("/api/llm-config", async (c) => {
    const body = await c.req.json<{
      provider?: string;
      baseUrl?: string;
      model?: string;
      apiKey?: string;
    }>();
    if (!body.provider || !body.baseUrl || !body.model || !body.apiKey) {
      throw new AppError("invalid_config", "Provider, base URL, model, and API key are required");
    }
    assertHttpUrl(body.baseUrl);
    await new Database(c.env.DB).llm.save({
      userId: c.get("userId"),
      provider: body.provider,
      baseUrl: body.baseUrl,
      model: body.model,
      encryptedApiKey: await encryptString(await importAesKey(c.env.ENCRYPTION_KEY), body.apiKey),
      keyVersion: 1,
    });
    return c.json({ ok: true });
  });

  app.post("/api/llm-config/test", async (c) => {
    const db = new Database(c.env.DB);
    const userId = c.get("userId");
    const config = await db.llm.get(userId);
    const cipher = await db.llm.ciphertext(userId);
    if (!config || !cipher) throw new AppError("not_configured", "Save an LLM config first", 409);
    const provider = new OpenAICompatibleProvider({
      baseUrl: config.baseUrl,
      apiKey: await decryptString(await importAesKey(c.env.ENCRYPTION_KEY), cipher),
      model: config.model,
    });
    const result = await provider.generate({ user: LLM_TEST_PROMPT });
    return c.json({ ok: llmTestPassed(result.text), model: result.model });
  });
}

function assertHttpUrl(value: string): void {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new AppError("invalid_config", "Base URL must be an http(s) URL");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new AppError("invalid_config", "Base URL must be an http(s) URL");
  }
}
